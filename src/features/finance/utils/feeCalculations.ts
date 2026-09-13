import { LateFeeRule, FeeItem, FeeStructure, FeeItemStatus } from '../../../types';
import { roundINR, subINR, addINR, mulINR } from './currencyUtils';

/**
 * Calculate the number of calendar days a due date is past due, taking into account grace period.
 */
export function getDaysOverdue(dueDateStr: string, gracePeriodDays: number = 0, compareDateStr?: string): number {
  if (!dueDateStr) return 0;
  const targetDate = compareDateStr ? new Date(compareDateStr) : new Date();
  targetDate.setHours(0, 0, 0, 0);

  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);

  const diffMs = targetDate.getTime() - due.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= gracePeriodDays) {
    return 0; // Within grace period
  }

  return diffDays;
}

/**
 * Calculates late fee amount based on configured rule and overdue days.
 */
export function calculateLateFee(
  baseAmount: number,
  dueDateStr: string,
  rule?: LateFeeRule,
  compareDateStr?: string
): number {
  if (!rule || rule.type === 'NONE' || !rule.amount || rule.amount <= 0) {
    return 0;
  }

  const gracePeriod = rule.gracePeriodDays || 0;
  const daysOverdue = getDaysOverdue(dueDateStr, gracePeriod, compareDateStr);

  if (daysOverdue <= 0) {
    return 0;
  }

  switch (rule.type) {
    case 'FIXED':
    case 'ONE_TIME':
      return roundINR(rule.amount);

    case 'PERCENTAGE':
      return roundINR((baseAmount * rule.amount) / 100);

    case 'PER_DAY':
      return roundINR(rule.amount * daysOverdue);

    case 'PER_WEEK':
      const weeks = Math.ceil(daysOverdue / 7);
      return roundINR(rule.amount * weeks);

    default:
      return 0;
  }
}

/**
 * Calculates current status for a fee item based on due date and balances.
 */
export function determineFeeItemStatus(item: {
  dueDate: string;
  netPayable: number;
  paidAmount: number;
  waiverReason?: string;
}): FeeItemStatus {
  if (item.waiverReason) {
    return 'WAIVED';
  }

  const outstanding = subINR(item.netPayable, item.paidAmount);
  if (outstanding <= 0) {
    return 'PAID';
  }

  if (item.paidAmount > 0) {
    return 'PARTIAL';
  }

  const isPastDue = getDaysOverdue(item.dueDate, 0) > 0;
  return isPastDue ? 'OVERDUE' : 'PENDING';
}

/**
 * Computes summary statistics for a fee structure definition.
 */
export function calculateStructureTotals(
  structures: FeeStructure[],
  monthsInSession: number = 12
): {
  totalRecurringPerMonth: number;
  totalAnnualRecurring: number;
  totalOneTimeAndAnnual: number;
  totalPossibleAnnualLiability: number;
} {
  let totalRecurringPerMonth = 0;
  let totalAnnualRecurring = 0;
  let totalOneTimeAndAnnual = 0;

  for (const s of structures) {
    if (s.status !== 'ACTIVE') continue;
    const amt = s.amount || 0;

    switch (s.frequency) {
      case 'MONTHLY':
        totalRecurringPerMonth = addINR(totalRecurringPerMonth, amt);
        const applicableCount = s.applicableMonths?.length || monthsInSession;
        totalAnnualRecurring = addINR(totalAnnualRecurring, mulINR(amt, applicableCount));
        break;

      case 'QUARTERLY':
        totalAnnualRecurring = addINR(totalAnnualRecurring, mulINR(amt, 4));
        break;

      case 'HALF_YEARLY':
        totalAnnualRecurring = addINR(totalAnnualRecurring, mulINR(amt, 2));
        break;

      case 'ANNUAL':
      case 'ONE_TIME':
      case 'CUSTOM':
      default:
        totalOneTimeAndAnnual = addINR(totalOneTimeAndAnnual, amt);
        break;
    }
  }

  const totalPossibleAnnualLiability = addINR(totalAnnualRecurring, totalOneTimeAndAnnual);

  return {
    totalRecurringPerMonth,
    totalAnnualRecurring,
    totalOneTimeAndAnnual,
    totalPossibleAnnualLiability,
  };
}

/**
 * Multi-item payment allocation.
 * If student pays e.g. ₹4,000 for Tuition (₹1,500), Annual (₹3,000), Exam (₹1,000):
 * Allows precise allocation item by item.
 */
export interface ItemAllocation {
  feeItemId: string;
  allocatedAmount: number;
  discountApplied: number;
  lateFeeApplied: number;
  previousBalance: number;
  remainingBalance: number;
}

export function autoAllocatePayment(
  items: FeeItem[],
  amountReceived: number
): {
  allocations: ItemAllocation[];
  totalAllocated: number;
  surplusAdvance: number;
} {
  let remainingPay = roundINR(amountReceived);
  const allocations: ItemAllocation[] = [];
  let totalAllocated = 0;

  for (const item of items) {
    if (remainingPay <= 0) {
      allocations.push({
        feeItemId: item.id,
        allocatedAmount: 0,
        discountApplied: item.discountAmount || 0,
        lateFeeApplied: item.lateFeeAmount || 0,
        previousBalance: item.balance,
        remainingBalance: item.balance,
      });
      continue;
    }

    const itemDue = roundINR(item.balance);
    const payThisItem = Math.min(remainingPay, itemDue);

    allocations.push({
      feeItemId: item.id,
      allocatedAmount: payThisItem,
      discountApplied: item.discountAmount || 0,
      lateFeeApplied: item.lateFeeAmount || 0,
      previousBalance: item.balance,
      remainingBalance: subINR(item.balance, payThisItem),
    });

    totalAllocated = addINR(totalAllocated, payThisItem);
    remainingPay = subINR(remainingPay, payThisItem);
  }

  return {
    allocations,
    totalAllocated,
    surplusAdvance: remainingPay > 0 ? remainingPay : 0,
  };
}

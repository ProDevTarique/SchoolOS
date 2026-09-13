import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../../services/firebase';
import {
  FeePayment,
  FeeItem,
  Expense,
  CashBookEntry,
  Student,
  ClassItem,
  SectionItem,
} from '../../../types';
import { getStudents } from '../../../services/studentService';
import { getClasses, getSections } from '../../../services/academicService';
import { getAllFeeItems } from './feeAssignmentService';
import { roundINR, subINR, addINR } from '../utils/currencyUtils';
import { getDaysOverdue } from '../utils/feeCalculations';

const FEE_PAYMENTS_COLLECTION = 'feePayments';
const FEE_ITEMS_COLLECTION = 'feeItems';
const EXPENSES_COLLECTION = 'expenses';
const CASH_BOOK_COLLECTION = 'cashBook';

export interface FinanceDashboardMetrics {
  todayCollection: number;
  monthCollection: number;
  yearCollection: number;
  outstandingFees: number;
  todayExpenses: number;
  monthExpenses: number;
  netIncome: number;
  pendingExpenseApprovals: number;
  paymentMethodDistribution: Record<string, number>;
  collectionTrend: { month: string; collection: number; expense: number }[];
  classCollectionSummary: {
    className: string;
    billed: number;
    collected: number;
    outstanding: number;
    collectionPercentage: number;
  }[];
}

export async function getFinanceDashboardMetrics(
  schoolId: string,
  academicSessionId?: string,
  financialYear?: string
): Promise<FinanceDashboardMetrics> {
  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMonthStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const currentYearStr = now.getFullYear().toString();

    // 1. Fetch payments
    const payQuery = query(
      collection(db, FEE_PAYMENTS_COLLECTION),
      where('schoolId', '==', schoolId),
      where('status', '==', 'COMPLETED')
    );
    const paySnap = await getDocs(payQuery);
    const payments = paySnap.docs.map((d) => d.data() as FeePayment);

    // 2. Fetch fee items
    const itemsQuery = query(
      collection(db, FEE_ITEMS_COLLECTION),
      where('schoolId', '==', schoolId)
    );
    const itemsSnap = await getDocs(itemsQuery);
    const feeItems = itemsSnap.docs.map((d) => d.data() as FeeItem);

    // 3. Fetch expenses
    const expQuery = query(
      collection(db, EXPENSES_COLLECTION),
      where('schoolId', '==', schoolId)
    );
    const expSnap = await getDocs(expQuery);
    const expenses = expSnap.docs.map((d) => d.data() as Expense);

    // 4. Fetch classes
    const classes = await getClasses(schoolId);

    // Calculate Collection KPIs
    let todayCollection = 0;
    let monthCollection = 0;
    let yearCollection = 0;
    const paymentMethodDistribution: Record<string, number> = {
      CASH: 0,
      UPI: 0,
      BANK_TRANSFER: 0,
      CHEQUE: 0,
      CARD: 0,
      OTHER: 0,
    };

    payments.forEach((p) => {
      const amt = roundINR(p.amountReceived || p.netPayable);
      if (p.paymentDate === todayStr) {
        todayCollection = addINR(todayCollection, amt);
      }
      if (p.paymentDate.startsWith(currentMonthStr)) {
        monthCollection = addINR(monthCollection, amt);
      }
      if (p.paymentDate.startsWith(currentYearStr)) {
        yearCollection = addINR(yearCollection, amt);
      }

      const mode = p.paymentMode in paymentMethodDistribution ? p.paymentMode : 'OTHER';
      paymentMethodDistribution[mode] = addINR(paymentMethodDistribution[mode] || 0, amt);
    });

    // Calculate Outstanding Fees
    let outstandingFees = 0;
    feeItems.forEach((item) => {
      if (item.status !== 'WAIVED' && item.status !== 'PAID') {
        outstandingFees = addINR(outstandingFees, item.balance);
      }
    });

    // Calculate Expenses KPIs
    let todayExpenses = 0;
    let monthExpenses = 0;
    let pendingApprovals = 0;

    expenses.forEach((e) => {
      if (e.status === 'PENDING_APPROVAL') {
        pendingApprovals++;
      }
      if (e.status === 'PAID' || e.status === 'APPROVED') {
        const amt = roundINR(e.amount);
        if (e.date === todayStr) {
          todayExpenses = addINR(todayExpenses, amt);
        }
        if (e.date.startsWith(currentMonthStr)) {
          monthExpenses = addINR(monthExpenses, amt);
        }
      }
    });

    const netIncome = subINR(monthCollection, monthExpenses);

    // Class Collection Summary
    // We group students by class and calculate billed vs collected
    const classCollectionSummary = classes.map((cls) => {
      // Find items for this class by cross-referencing students or structures
      // For precision, fetch students in this class
      return {
        className: cls.name,
        billed: 0,
        collected: 0,
        outstanding: 0,
        collectionPercentage: 0,
      };
    });

    // Compute monthly trend for the last 6 months
    const trendMonths: { month: string; collection: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      const mLabel = d.toLocaleString('en-US', { month: 'short' });

      let mColl = 0;
      payments.forEach((p) => {
        if (p.paymentDate.startsWith(mStr)) mColl = addINR(mColl, p.amountReceived);
      });

      let mExp = 0;
      expenses.forEach((e) => {
        if (e.date.startsWith(mStr) && (e.status === 'PAID' || e.status === 'APPROVED')) {
          mExp = addINR(mExp, e.amount);
        }
      });

      trendMonths.push({
        month: mLabel,
        collection: mColl,
        expense: mExp,
      });
    }

    return {
      todayCollection,
      monthCollection,
      yearCollection,
      outstandingFees,
      todayExpenses,
      monthExpenses,
      netIncome,
      pendingExpenseApprovals: pendingApprovals,
      paymentMethodDistribution,
      collectionTrend: trendMonths,
      classCollectionSummary,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, FEE_PAYMENTS_COLLECTION);
  }
}

export interface DailyCollectionReportRow {
  date: string;
  cash: number;
  upi: number;
  bank: number;
  cheque: number;
  card: number;
  other: number;
  total: number;
  receiptsCount: number;
  cancelledCount: number;
  netCollection: number;
}

export async function getDailyCollectionReport(
  schoolId: string,
  startDate?: string,
  endDate?: string
): Promise<DailyCollectionReportRow[]> {
  try {
    const q = query(
      collection(db, FEE_PAYMENTS_COLLECTION),
      where('schoolId', '==', schoolId)
    );
    const snap = await getDocs(q);
    const payments = snap.docs.map((d) => d.data() as FeePayment);

    const dateMap: Record<string, DailyCollectionReportRow> = {};

    payments.forEach((p) => {
      if (startDate && p.paymentDate < startDate) return;
      if (endDate && p.paymentDate > endDate) return;

      const d = p.paymentDate;
      if (!dateMap[d]) {
        dateMap[d] = {
          date: d,
          cash: 0,
          upi: 0,
          bank: 0,
          cheque: 0,
          card: 0,
          other: 0,
          total: 0,
          receiptsCount: 0,
          cancelledCount: 0,
          netCollection: 0,
        };
      }

      if (p.status === 'CANCELLED') {
        dateMap[d].cancelledCount++;
        return;
      }

      dateMap[d].receiptsCount++;
      const amt = roundINR(p.amountReceived);

      switch (p.paymentMode) {
        case 'CASH':
          dateMap[d].cash = addINR(dateMap[d].cash, amt);
          break;
        case 'UPI':
          dateMap[d].upi = addINR(dateMap[d].upi, amt);
          break;
        case 'BANK_TRANSFER':
          dateMap[d].bank = addINR(dateMap[d].bank, amt);
          break;
        case 'CHEQUE':
          dateMap[d].cheque = addINR(dateMap[d].cheque, amt);
          break;
        case 'CARD':
          dateMap[d].card = addINR(dateMap[d].card, amt);
          break;
        default:
          dateMap[d].other = addINR(dateMap[d].other, amt);
          break;
      }

      dateMap[d].total = addINR(dateMap[d].total, amt);
      dateMap[d].netCollection = addINR(dateMap[d].netCollection, amt);
    });

    return Object.values(dateMap).sort((a, b) => b.date.localeCompare(a.date));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, FEE_PAYMENTS_COLLECTION);
  }
}

export interface DefaulterRow {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  rollNumber?: string;
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  parentName: string;
  parentPhone: string;
  totalDue: number;
  overdueAmount: number;
  daysOverdue: number;
  oldestDueDate: string;
}

export async function getFeeDefaultersReport(
  schoolId: string,
  filters?: {
    classId?: string;
    sectionId?: string;
    minOutstanding?: number;
    feeType?: string;
  }
): Promise<DefaulterRow[]> {
  try {
    const [students, classes, sections, feeItems] = await Promise.all([
      getStudents(schoolId, { classId: filters?.classId, sectionId: filters?.sectionId }),
      getClasses(schoolId),
      getSections(schoolId),
      getDocs(query(collection(db, FEE_ITEMS_COLLECTION), where('schoolId', '==', schoolId))),
    ]);

    const classMap = new Map(classes.map((c) => [c.id, c.name]));
    const sectionMap = new Map(sections.map((s) => [s.id, s.name]));

    const items = feeItems.docs
      .map((d) => d.data() as FeeItem)
      .filter((i) => i.status !== 'WAIVED' && i.status !== 'PAID' && i.balance > 0);

    const studentItemMap = new Map<string, FeeItem[]>();
    items.forEach((item) => {
      if (filters?.feeType && item.feeCategory !== filters.feeType) return;
      const list = studentItemMap.get(item.studentId) || [];
      list.push(item);
      studentItemMap.set(item.studentId, list);
    });

    const defaulters: DefaulterRow[] = [];

    students.forEach((s) => {
      const studentItems = studentItemMap.get(s.id);
      if (!studentItems || studentItems.length === 0) return;

      let totalDue = 0;
      let overdueAmount = 0;
      let maxDaysOverdue = 0;
      let oldestDueDate = '';

      studentItems.forEach((item) => {
        totalDue = addINR(totalDue, item.balance);
        const days = getDaysOverdue(item.dueDate, 0);
        if (days > 0) {
          overdueAmount = addINR(overdueAmount, item.balance);
          if (days > maxDaysOverdue) {
            maxDaysOverdue = days;
            oldestDueDate = item.dueDate;
          }
        }
      });

      if (filters?.minOutstanding && totalDue < filters.minOutstanding) {
        return;
      }

      if (totalDue > 0) {
        defaulters.push({
          studentId: s.id,
          studentName: s.fullName,
          admissionNumber: s.admissionNumber,
          rollNumber: s.rollNumber,
          classId: s.classId,
          className: classMap.get(s.classId) || 'Class',
          sectionId: s.sectionId,
          sectionName: sectionMap.get(s.sectionId) || '',
          parentName: s.fatherName || s.motherName || s.guardianName || 'Parent',
          parentPhone: s.fatherPhone || s.motherPhone || s.guardianPhone || '',
          totalDue,
          overdueAmount,
          daysOverdue: maxDaysOverdue,
          oldestDueDate,
        });
      }
    });

    return defaulters.sort((a, b) => b.totalDue - a.totalDue);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, FEE_ITEMS_COLLECTION);
  }
}

export interface StudentLedgerEntry {
  date: string;
  description: string;
  referenceNumber?: string;
  debit: number; // + due
  credit: number; // - paid
  balance: number; // running
}

export async function getStudentLedger(
  schoolId: string,
  studentId: string
): Promise<{
  entries: StudentLedgerEntry[];
  totalDebit: number;
  totalCredit: number;
  finalBalance: number;
}> {
  try {
    const [itemsSnap, paySnap] = await Promise.all([
      getDocs(
        query(
          collection(db, FEE_ITEMS_COLLECTION),
          where('schoolId', '==', schoolId),
          where('studentId', '==', studentId)
        )
      ),
      getDocs(
        query(
          collection(db, FEE_PAYMENTS_COLLECTION),
          where('schoolId', '==', schoolId),
          where('studentId', '==', studentId)
        )
      ),
    ]);

    const items = itemsSnap.docs.map((d) => d.data() as FeeItem);
    const payments = paySnap.docs.map((d) => d.data() as FeePayment);

    // Combine into chronological events
    interface EventItem {
      date: string;
      description: string;
      referenceNumber?: string;
      debit: number;
      credit: number;
      order: number; // 0 for charge/debit, 1 for credit/payment
    }

    const events: EventItem[] = [];

    items.forEach((item) => {
      events.push({
        date: item.createdAt ? item.createdAt.split('T')[0] : item.dueDate,
        description: `Fee Assessed: ${item.name} (${item.feeCategory})`,
        debit: item.netPayable,
        credit: 0,
        order: 0,
      });

      if (item.concessionAmount && item.concessionAmount > 0) {
        events.push({
          date: item.createdAt ? item.createdAt.split('T')[0] : item.dueDate,
          description: `Fee Concession: ${item.name}`,
          debit: 0,
          credit: item.concessionAmount,
          order: 1,
        });
      }
    });

    payments.forEach((pay) => {
      if (pay.status === 'CANCELLED') {
        events.push({
          date: pay.paymentDate,
          description: `Cancelled Payment [Rcpt #${pay.receiptNumber}] - Reversal`,
          referenceNumber: pay.receiptNumber,
          debit: pay.amountReceived,
          credit: 0,
          order: 2,
        });
      } else {
        events.push({
          date: pay.paymentDate,
          description: `Fee Payment Received (${pay.paymentMode}) [Rcpt #${pay.receiptNumber}]`,
          referenceNumber: pay.receiptNumber,
          debit: 0,
          credit: pay.amountReceived,
          order: 1,
        });
      }
    });

    events.sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
      return a.order - b.order;
    });

    let running = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    const entries: StudentLedgerEntry[] = events.map((e) => {
      running = roundINR(running + e.debit - e.credit);
      totalDebit = addINR(totalDebit, e.debit);
      totalCredit = addINR(totalCredit, e.credit);

      return {
        date: e.date,
        description: e.description,
        referenceNumber: e.referenceNumber,
        debit: e.debit,
        credit: e.credit,
        balance: running,
      };
    });

    return {
      entries,
      totalDebit,
      totalCredit,
      finalBalance: running,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, FEE_ITEMS_COLLECTION);
  }
}

export async function getCashBookEntries(
  schoolId: string,
  filters?: {
    startDate?: string;
    endDate?: string;
    type?: 'INCOME' | 'EXPENSE';
  }
): Promise<{
  entries: CashBookEntry[];
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
}> {
  try {
    let q = query(collection(db, CASH_BOOK_COLLECTION), where('schoolId', '==', schoolId));
    const snap = await getDocs(q);

    let list = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<CashBookEntry, 'id'>),
    }));

    if (filters?.type) {
      list = list.filter((e) => e.type === filters.type);
    }
    if (filters?.startDate) {
      list = list.filter((e) => e.date >= filters.startDate!);
    }
    if (filters?.endDate) {
      list = list.filter((e) => e.date <= filters.endDate!);
    }

    // Sort chronologically ascending to compute exact running balance
    list.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));

    let running = 0;
    let totalIncome = 0;
    let totalExpense = 0;

    const calculatedEntries = list.map((item) => {
      const inc = item.income || 0;
      const exp = item.expense || 0;
      running = roundINR(running + inc - exp);
      totalIncome = addINR(totalIncome, inc);
      totalExpense = addINR(totalExpense, exp);

      return {
        ...item,
        runningBalance: running,
      };
    });

    // Return newest first for display
    return {
      entries: calculatedEntries.reverse(),
      totalIncome,
      totalExpense,
      netCashFlow: subINR(totalIncome, totalExpense),
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, CASH_BOOK_COLLECTION);
  }
}

export async function getClassWiseCollectionReport(
  schoolId: string,
  academicSessionId?: string
): Promise<{
  className: string;
  classId: string;
  totalStudents: number;
  totalBilled: number;
  totalCollected: number;
  totalDiscount: number;
  totalOutstanding: number;
  collectionPercentage: number;
}[]> {
  try {
    const [classes, students, feeItems] = await Promise.all([
      getClasses(schoolId),
      getStudents(schoolId),
      getAllFeeItems(schoolId, { academicSessionId }),
    ]);

    const studentClassMap = new Map(students.map((s) => [s.id, s.classId]));
    const studentCountMap = new Map<string, number>();
    students.forEach((s) => {
      studentCountMap.set(s.classId, (studentCountMap.get(s.classId) || 0) + 1);
    });

    const classStats = new Map<string, {
      billed: number;
      collected: number;
      discount: number;
      outstanding: number;
    }>();

    classes.forEach((c) => {
      classStats.set(c.id, { billed: 0, collected: 0, discount: 0, outstanding: 0 });
    });

    feeItems.forEach((item) => {
      const classId = studentClassMap.get(item.studentId);
      if (!classId || !classStats.has(classId)) return;

      const stat = classStats.get(classId)!;
      stat.billed = addINR(stat.billed, item.netPayable);
      stat.collected = addINR(stat.collected, item.paidAmount);
      stat.discount = addINR(stat.discount, (item.discountAmount || 0) + (item.concessionAmount || 0));
      stat.outstanding = addINR(stat.outstanding, item.balance);
    });

    return classes.map((c) => {
      const stat = classStats.get(c.id) || { billed: 0, collected: 0, discount: 0, outstanding: 0 };
      const pct = stat.billed > 0 ? Math.round((stat.collected / stat.billed) * 100) : 0;

      return {
        className: c.name,
        classId: c.id,
        totalStudents: studentCountMap.get(c.id) || 0,
        totalBilled: stat.billed,
        totalCollected: stat.collected,
        totalDiscount: stat.discount,
        totalOutstanding: stat.outstanding,
        collectionPercentage: pct,
      };
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, FEE_ITEMS_COLLECTION);
  }
}

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  writeBatch,
  runTransaction,
} from 'firebase/firestore';
import { db, cleanFirestoreData, handleFirestoreError, OperationType } from '../../../services/firebase';
import {
  FeePayment,
  FeePaymentItem,
  Receipt,
  ReceiptItem,
  FeeItem,
  FeeAdvance,
  CashBookEntry,
  FinancialSettings,
  PaymentMode,
  ChequeDetails,
} from '../../../types';
import { getDefaultFinancialSettings, getFinancialSettings } from './financeSettingsService';
import { logAuditEvent } from '../../../services/auditService';
import { roundINR, subINR, addINR } from '../utils/currencyUtils';
import { determineFeeItemStatus } from '../utils/feeCalculations';

const FEE_PAYMENTS_COLLECTION = 'feePayments';
const FEE_PAYMENT_ITEMS_COLLECTION = 'feePaymentItems';
const RECEIPTS_COLLECTION = 'receipts';
const FEE_ITEMS_COLLECTION = 'feeItems';
const FEE_ADVANCES_COLLECTION = 'feeAdvances';
const CASH_BOOK_COLLECTION = 'cashBook';

export interface RecordPaymentParams {
  schoolId: string;
  academicSessionId: string;
  financialYear: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  parentName: string;
  parentPhone?: string;
  paymentDate: string; // YYYY-MM-DD
  paymentMode: PaymentMode;
  referenceNumber?: string;
  chequeDetails?: ChequeDetails;
  remarks?: string;
  amountReceived: number;
  idempotencyKey: string;
  itemAllocations: {
    feeItemId: string;
    allocatedAmount: number;
    discountApplied?: number;
    lateFeeApplied?: number;
  }[];
  advanceToCredit?: number; // Optional surplus
  userId: string;
  userName: string;
  userRole: string;
}

/**
 * Atomically records a fee payment, its allocations, and fee-item state.
 */
export async function recordFeePayment(params: RecordPaymentParams): Promise<{
  payment: FeePayment;
  receipt: Receipt;
}> {
  try {
    const {
      schoolId,
      academicSessionId,
      financialYear,
      studentId,
      studentName,
      admissionNumber,
      className,
      sectionName,
      parentName,
      parentPhone,
      paymentDate,
      paymentMode,
      referenceNumber,
      chequeDetails,
      remarks,
      amountReceived,
      itemAllocations,
      advanceToCredit,
      userId,
      userName,
      userRole,
    } = params;

    if (!params.idempotencyKey.trim()) throw new Error('A payment idempotency key is required.');
    if (!Number.isFinite(amountReceived) || amountReceived <= 0) {
      throw new Error('Payment amount must be a finite positive number.');
    }
    const settings = await getFinancialSettings(schoolId);
    if (!settings.enabledPaymentMethods?.includes(paymentMode)) {
      throw new Error(`Payment method ${paymentMode} is disabled for this school.`);
    }
    const paymentId = `pay_${schoolId}_${params.idempotencyKey}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const receiptId = `receipt_${schoolId}_${paymentId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const now = new Date().toISOString();
    const allocationFingerprint = itemAllocations
      .map((allocation) => `${allocation.feeItemId}:${roundINR(allocation.allocatedAmount)}`)
      .sort()
      .join('|');
    const transactionResult = await runTransaction(db, async (transaction) => {
      const paymentRef = doc(db, FEE_PAYMENTS_COLLECTION, paymentId);
      const receiptRef = doc(db, RECEIPTS_COLLECTION, receiptId);
      const settingsRef = doc(db, 'financialSettings', schoolId);
      const existingPayment = await transaction.get(paymentRef);
      if (existingPayment.exists()) {
        const existing = existingPayment.data() as FeePayment;
        if (existing.idempotencyKey !== params.idempotencyKey
          || existing.amountReceived !== roundINR(amountReceived)
          || existing.paymentMode !== paymentMode
          || existing.studentId !== studentId
          || existing.allocationFingerprint !== allocationFingerprint) {
          throw new Error('Payment idempotency key conflicts with existing payment details.');
        }
        const existingReceipt = await transaction.get(receiptRef);
        if (!existingReceipt.exists()) {
          throw new Error('Payment exists without a receipt; receipt recovery is required.');
        }
        return {
          payment: existing,
          receipt: { id: existingReceipt.id, ...(existingReceipt.data() as Omit<Receipt, 'id'>) },
        };
      }
      if (advanceToCredit && advanceToCredit > 0) {
        throw new Error('Overpayment and advance credit are not supported in this milestone.');
      }
      const [studentSnapshot, sessionSnapshot] = await Promise.all([
        transaction.get(doc(db, 'students', studentId)),
        transaction.get(doc(db, 'academicSessions', academicSessionId)),
      ]);
      const settingsSnapshot = await transaction.get(settingsRef);
      if (!studentSnapshot.exists() || !sessionSnapshot.exists()
        || studentSnapshot.data().schoolId !== schoolId
        || sessionSnapshot.data().schoolId !== schoolId) {
        throw new Error('Student and academic session must belong to the selected school.');
      }
      const student = studentSnapshot.data();
      const classSnapshot = student.classId
        ? await transaction.get(doc(db, 'classes', student.classId))
        : null;
      const sectionSnapshot = student.sectionId
        ? await transaction.get(doc(db, 'sections', student.sectionId))
        : null;
      if (!classSnapshot?.exists() || classSnapshot.data().schoolId !== schoolId
        || (student.sectionId && (!sectionSnapshot?.exists()
          || sectionSnapshot.data().schoolId !== schoolId
          || sectionSnapshot.data().classId !== student.classId))) {
        throw new Error('Student class and section references are invalid.');
      }
      const uniqueAllocations = new Map<string, number>();
      for (const allocation of itemAllocations) {
        const value = roundINR(allocation.allocatedAmount);
        if (!Number.isFinite(value) || value <= 0) throw new Error('Every allocation must be positive.');
        if (uniqueAllocations.has(allocation.feeItemId)) throw new Error('A fee item cannot be allocated twice in one payment.');
        uniqueAllocations.set(allocation.feeItemId, value);
      }
      const itemSnapshots = await Promise.all([...uniqueAllocations.keys()].map((id) =>
        transaction.get(doc(db, FEE_ITEMS_COLLECTION, id))));
      const itemData = itemSnapshots
        .filter((snapshot) => snapshot.exists())
        .map((snapshot) => snapshot.data() as FeeItem);
      const [structureSnapshots, assignmentSnapshots] = await Promise.all([
        Promise.all([...new Set(itemData.map((item) => item.feeStructureId))]
          .map((id) => transaction.get(doc(db, 'feeStructures', id)))),
        Promise.all([...new Set(itemData.map((item) => item.feeAssignmentId))]
          .map((id) => transaction.get(doc(db, 'feeAssignments', id)))),
      ]);
      const structures = new Map(structureSnapshots.map((snapshot) => [snapshot.id, snapshot]));
      const assignments = new Map(assignmentSnapshots.map((snapshot) => [snapshot.id, snapshot]));
      let totalAllocated = 0;
      let totalGross = 0;
      let totalDiscount = 0;
      let totalLateFee = 0;
      let previousBalance = 0;
      const allocationRecords: FeePaymentItem[] = [];
      const receiptItems: ReceiptItem[] = [];
      const feeUpdates: { ref: ReturnType<typeof doc>; data: Partial<FeeItem> }[] = [];
      itemSnapshots.forEach((snapshot, index) => {
        if (!snapshot.exists()) throw new Error('A selected fee item no longer exists.');
        const item = { id: snapshot.id, ...(snapshot.data() as Omit<FeeItem, 'id'>) };
        const allocated = [...uniqueAllocations.values()][index];
        const effectiveAmount = roundINR(item.effectiveAmount ?? item.netPayable);
        const remaining = roundINR(Math.max(0, effectiveAmount - item.paidAmount));
        if (item.schoolId !== schoolId || item.studentId !== studentId
          || item.academicSessionId !== academicSessionId
          || item.classId !== student.classId
          || (student.sectionId && item.sectionId !== student.sectionId)
          || !structures.get(item.feeStructureId)?.exists()
          || structures.get(item.feeStructureId)?.data().schoolId !== schoolId
          || structures.get(item.feeStructureId)?.data().academicSessionId !== academicSessionId
          || structures.get(item.feeStructureId)?.data().classId !== student.classId
          || !assignments.get(item.feeAssignmentId)?.exists()
          || assignments.get(item.feeAssignmentId)?.data().schoolId !== schoolId
          || assignments.get(item.feeAssignmentId)?.data().studentId !== studentId
          || assignments.get(item.feeAssignmentId)?.data().academicSessionId !== academicSessionId
          || assignments.get(item.feeAssignmentId)?.data().classId !== student.classId
          || (student.sectionId && assignments.get(item.feeAssignmentId)?.data().sectionId !== student.sectionId)) {
          throw new Error('All fee items must belong to the selected school, student, and session.');
        }
        if (remaining <= 0 || allocated > remaining) throw new Error(`Allocation exceeds remaining amount for ${item.name}.`);
        const paidAmount = addINR(item.paidAmount, allocated);
        const newBalance = roundINR(Math.max(0, effectiveAmount - paidAmount));
        totalAllocated = addINR(totalAllocated, allocated);
        totalGross = addINR(totalGross, item.grossAmount);
        totalDiscount = addINR(totalDiscount, item.discountAmount || 0);
        totalLateFee = addINR(totalLateFee, item.lateFeeAmount || 0);
        previousBalance = addINR(previousBalance, remaining);
        const paymentItemId = `pay_item_${paymentId}_${item.id}`;
        feeUpdates.push({ ref: doc(db, FEE_ITEMS_COLLECTION, item.id), data: {
          paidAmount, balance: newBalance, status: determineFeeItemStatus({ dueDate: item.dueDate, netPayable: effectiveAmount, paidAmount }), lastPaymentId: paymentId, lastPaymentItemId: paymentItemId, updatedAt: now, updatedBy: userId,
        }});
        allocationRecords.push({
          id: paymentItemId, schoolId, paymentId, feeItemId: item.id, studentId,
          feePaymentId: paymentId,
          academicSessionId, feeCategoryId: item.feeCategoryId, feeStructureId: item.feeStructureId, feeAssignmentId: item.feeAssignmentId,
          allocatedAmount: allocated, discountApplied: 0, lateFeeApplied: 0, previousItemBalance: remaining, remainingItemBalance: newBalance, createdAt: now,
        });
        receiptItems.push({ feeItemId: item.id, feeType: item.name, period: item.period, amount: item.grossAmount, discount: item.discountAmount || 0, lateFee: item.lateFeeAmount || 0, paid: allocated, remaining: newBalance });
      });
      if (roundINR(totalAllocated) !== roundINR(amountReceived)) throw new Error('Payment amount must equal the allocation total.');
      const settings = settingsSnapshot.exists()
        ? settingsSnapshot.data() as FinancialSettings
        : getDefaultFinancialSettings(schoolId);
      const receiptCounter = Math.max(
        (settings.currentReceiptCounter || 0) + 1,
        settings.receiptStartingNumber || 1,
      );
      const receiptPattern = settings.receiptNumberPattern || '{PREFIX}-{YEAR}-{NUM6}';
      const receiptNumber = receiptPattern
        .replace('{PREFIX}', settings.receiptPrefix || 'SCH')
        .replace('{YEAR}', financialYear || settings.financialYear)
        .replace('{NUM6}', receiptCounter.toString().padStart(6, '0'))
        .replace('{NUM5}', receiptCounter.toString().padStart(5, '0'))
        .replace('{NUM4}', receiptCounter.toString().padStart(4, '0'));
      const paymentRecord: FeePayment = {
        id: paymentId, schoolId, academicSessionId, financialYear, studentId, idempotencyKey: params.idempotencyKey, allocationFingerprint,
        receiptId, receiptNumber, paymentDate, grossAmount: totalGross, discountAmount: totalDiscount, lateFeeAmount: totalLateFee,
        netPayable: totalAllocated, amountReceived: roundINR(amountReceived), allocatedAmount: totalAllocated, advanceAmount: 0,
        previousBalance, remainingBalance: Math.max(0, subINR(previousBalance, totalAllocated)), paymentMode,
        referenceNumber: referenceNumber || '', chequeDetails, remarks: remarks || '', status: 'COMPLETED',
        collectedBy: userId, collectedByName: userName, createdAt: now, updatedAt: now,
      };
      const receiptRecord: Receipt = {
        id: receiptId,
        schoolId,
        academicSessionId,
        financialYear,
        receiptNumber,
        paymentId,
        paymentDate,
        receiptDate: now,
        studentId,
        studentName,
        admissionNumber,
        classId: student.classId,
        sectionId: student.sectionId,
        className,
        sectionName,
        parentName,
        parentPhone,
        items: receiptItems,
        grossAmount: totalGross,
        discountAmount: totalDiscount,
        lateFeeAmount: totalLateFee,
        netPaid: roundINR(amountReceived),
        advanceAmount: 0,
        previousBalance,
        remainingBalance: Math.max(0, subINR(previousBalance, totalAllocated)),
        paymentMode,
        referenceNumber: referenceNumber || '',
        remarks: remarks || '',
        status: 'ACTIVE',
        createdAt: now,
        createdBy: userId,
        updatedAt: now,
      };
      transaction.set(settingsRef, cleanFirestoreData({
        ...settings,
        id: schoolId,
        schoolId,
        currentReceiptCounter: receiptCounter,
        updatedAt: now,
      }));
      transaction.set(paymentRef, cleanFirestoreData(paymentRecord));
      transaction.set(receiptRef, cleanFirestoreData(receiptRecord));
      allocationRecords.forEach((allocation) => transaction.set(doc(db, FEE_PAYMENT_ITEMS_COLLECTION, allocation.id), cleanFirestoreData(allocation)));
      feeUpdates.forEach((update) => transaction.update(update.ref, cleanFirestoreData(update.data)));
      return { payment: paymentRecord, receipt: receiptRecord };
    });
    const { payment: paymentRecord, receipt: receiptRecord } = transactionResult;
    /*
    // 3. Construct FeePayment record
    const paymentRecord: FeePayment = {
      id: paymentId,
      schoolId,
      academicSessionId,
      financialYear,
      studentId,
      receiptId,
      receiptNumber,
      paymentDate,
      grossAmount: totalGross,
      discountAmount: totalDiscount,
      lateFeeAmount: totalLateFee,
      netPayable: totalAllocated,
      amountReceived: roundINR(amountReceived),
      allocatedAmount: totalAllocated,
      advanceAmount: surplusAdvance,
      previousBalance: previousTotalBalance,
      remainingBalance: remainingTotalBalance,
      paymentMode,
      referenceNumber: referenceNumber || '',
      chequeDetails: chequeDetails || undefined,
      remarks: remarks || '',
      status: 'COMPLETED',
      collectedBy: userId,
      collectedByName: userName,
      createdAt: now,
      updatedAt: now,
    };

    // 4. Construct Receipt record
    const receiptRecord: Receipt = {
      id: receiptId,
      schoolId,
      academicSessionId,
      financialYear,
      receiptNumber,
      paymentId,
      paymentDate,
      studentId,
      studentName,
      admissionNumber,
      className,
      sectionName,
      parentName,
      parentPhone,
      items: receiptItems,
      grossAmount: totalGross,
      discountAmount: totalDiscount,
      lateFeeAmount: totalLateFee,
      netPaid: roundINR(amountReceived),
      advanceAmount: surplusAdvance,
      previousBalance: previousTotalBalance,
      remainingBalance: remainingTotalBalance,
      paymentMode,
      referenceNumber: referenceNumber || '',
      remarks: remarks || '',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };

    // 5. Batched write all financial records together
    const batch = writeBatch(db);

    // Save payment
    batch.set(doc(db, FEE_PAYMENTS_COLLECTION, paymentId), cleanFirestoreData(paymentRecord));

    // Save receipt
    batch.set(doc(db, RECEIPTS_COLLECTION, receiptId), cleanFirestoreData(receiptRecord));

    // Save item allocations
    for (const pItem of paymentItemRecords) {
      batch.set(doc(db, FEE_PAYMENT_ITEMS_COLLECTION, pItem.id), cleanFirestoreData(pItem));
    }

    // Update fee items
    for (const uItem of updatedFeeItems) {
      batch.update(uItem.ref, cleanFirestoreData(uItem.data));
    }

    // Record advance if surplus
    if (surplusAdvance > 0) {
      const advId = `adv_${Date.now()}_${studentId}`;
      const advRecord: FeeAdvance = {
        id: advId,
        schoolId,
        studentId,
        paymentId,
        amount: surplusAdvance,
        utilizedAmount: 0,
        remainingAmount: surplusAdvance,
        date: paymentDate,
        status: 'AVAILABLE',
        createdAt: now,
        updatedAt: now,
      };
      batch.set(doc(db, FEE_ADVANCES_COLLECTION, advId), cleanFirestoreData(advRecord));
    }

    // Cash Book entry
    const cashBookId = `cb_${Date.now()}_${paymentId}`;
    const cashEntry: CashBookEntry = {
      id: cashBookId,
      schoolId,
      financialYear,
      date: paymentDate,
      description: `Fee Collection - ${studentName} (${admissionNumber}) [Receipt #${receiptNumber}]`,
      type: 'INCOME',
      referenceType: 'PAYMENT',
      referenceId: paymentId,
      receiptPaymentNumber: receiptNumber,
      income: roundINR(amountReceived),
      expense: 0,
      runningBalance: roundINR(amountReceived), // Aggregated in reports
      paymentMode,
      createdAt: now,
    };
    batch.set(doc(db, CASH_BOOK_COLLECTION, cashBookId), cleanFirestoreData(cashEntry));

    await batch.commit();

    */
    await logAuditEvent({
      schoolId,
      userId,
      userName,
      userRole,
      action: 'PAYMENT_RECORDED',
      module: 'Finance',
      affectedRecord: paymentRecord.id,
      description: `Collected ${paymentRecord.amountReceived} (${paymentMode}) for ${studentName}`,
    });
    return { payment: paymentRecord, receipt: receiptRecord };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, FEE_PAYMENTS_COLLECTION);
  }
}

/**
 * Cancels a receipt and rolls back all payment allocations to student fee items,
 * reverses cash book entry, and records detailed audit log.
 */
export async function cancelReceipt(params: {
  schoolId: string;
  receiptId: string;
  reason: string;
  userId: string;
  userName: string;
  userRole: string;
}): Promise<void> {
  try {
    const { schoolId, receiptId, reason, userId, userName, userRole } = params;

    const receiptRef = doc(db, RECEIPTS_COLLECTION, receiptId);
    const receiptSnap = await getDoc(receiptRef);
    if (!receiptSnap.exists()) throw new Error('Receipt not found');

    const receipt = receiptSnap.data() as Receipt;
    if (receipt.status === 'CANCELLED') {
      throw new Error('Receipt is already cancelled');
    }

    const now = new Date().toISOString();

    // 1. Fetch payment
    const paymentRef = doc(db, FEE_PAYMENTS_COLLECTION, receipt.paymentId);
    const paymentSnap = await getDoc(paymentRef);
    const payment = paymentSnap.exists() ? (paymentSnap.data() as FeePayment) : null;

    // 2. Fetch payment item allocations to revert balances
    const pItemsQuery = query(
      collection(db, FEE_PAYMENT_ITEMS_COLLECTION),
      where('receiptId', '==', receiptId)
    );
    const pItemsSnap = await getDocs(pItemsQuery);
    const pItems = pItemsSnap.docs.map((d) => d.data() as FeePaymentItem);

    const batch = writeBatch(db);

    // Revert fee items
    for (const pItem of pItems) {
      const fItemRef = doc(db, FEE_ITEMS_COLLECTION, pItem.feeItemId);
      const fItemSnap = await getDoc(fItemRef);
      if (!fItemSnap.exists()) continue;

      const fItem = fItemSnap.data() as FeeItem;
      const revertedPaid = Math.max(0, subINR(fItem.paidAmount, pItem.allocatedAmount));
      const revertedBalance = roundINR(Math.max(0, subINR(fItem.netPayable, revertedPaid)));

      batch.update(fItemRef, cleanFirestoreData({
        paidAmount: revertedPaid,
        balance: revertedBalance,
        status: determineFeeItemStatus({
          dueDate: fItem.dueDate,
          netPayable: fItem.netPayable,
          paidAmount: revertedPaid,
        }),
        updatedAt: now,
        updatedBy: userId,
      }));
    }

    // 3. Mark Receipt as CANCELLED (Never delete!)
    batch.update(receiptRef, cleanFirestoreData({
      status: 'CANCELLED',
      cancelledAt: now,
      cancelledBy: userId,
      cancelledByName: userName,
      cancellationReason: reason,
      updatedAt: now,
    }));

    // 4. Mark Payment as CANCELLED
    if (paymentRef) {
      batch.update(paymentRef, cleanFirestoreData({
        status: 'CANCELLED',
        cancelledAt: now,
        cancelledBy: userId,
        cancellationReason: reason,
        updatedAt: now,
      }));
    }

    // 5. Reversing Cash Book entry
    const cbReversalId = `cb_rev_${Date.now()}_${receiptId}`;
    const cbReversal: CashBookEntry = {
      id: cbReversalId,
      schoolId,
      financialYear: receipt.financialYear,
      date: now.split('T')[0],
      description: `REVERSAL - Cancelled Receipt #${receipt.receiptNumber} (${reason})`,
      type: 'EXPENSE', // Outflow to offset the previous collection
      referenceType: 'PAYMENT',
      referenceId: receipt.paymentId,
      receiptPaymentNumber: receipt.receiptNumber,
      income: 0,
      expense: receipt.netPaid,
      runningBalance: 0,
      paymentMode: receipt.paymentMode,
      createdAt: now,
    };
    batch.set(doc(db, CASH_BOOK_COLLECTION, cbReversalId), cleanFirestoreData(cbReversal));

    await batch.commit();

    await logAuditEvent({
      schoolId,
      userId,
      userName,
      userRole,
      action: 'RECEIPT_CANCELLED',
      module: 'Finance',
      affectedRecord: receiptId,
      description: `Cancelled Receipt #${receipt.receiptNumber} (Amount: ₹${receipt.netPaid}). Reason: ${reason}`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, RECEIPTS_COLLECTION);
  }
}

/**
 * Fetch payments for a school with filters
 */
export async function getFeePayments(
  schoolId: string,
  filters?: {
    academicSessionId?: string;
    studentId?: string;
    status?: 'COMPLETED' | 'CANCELLED';
    startDate?: string;
    endDate?: string;
    paymentMode?: PaymentMode;
  }
): Promise<FeePayment[]> {
  try {
    let q = query(collection(db, FEE_PAYMENTS_COLLECTION), where('schoolId', '==', schoolId));

    if (filters?.academicSessionId) {
      q = query(q, where('academicSessionId', '==', filters.academicSessionId));
    }
    if (filters?.studentId) {
      q = query(q, where('studentId', '==', filters.studentId));
    }
    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }

    const snap = await getDocs(q);
    let list = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<FeePayment, 'id'>),
    }));

    if (filters?.paymentMode) {
      list = list.filter((p) => p.paymentMode === filters.paymentMode);
    }
    if (filters?.startDate) {
      list = list.filter((p) => p.paymentDate >= filters.startDate!);
    }
    if (filters?.endDate) {
      list = list.filter((p) => p.paymentDate <= filters.endDate!);
    }

    return list.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, FEE_PAYMENTS_COLLECTION);
  }
}

/**
 * Fetch receipts for a school
 */
export async function getReceipts(
  schoolId: string,
  filters?: {
    studentId?: string;
    status?: 'ACTIVE' | 'CANCELLED';
    search?: string;
  }
): Promise<Receipt[]> {
  try {
    let q = query(collection(db, RECEIPTS_COLLECTION), where('schoolId', '==', schoolId));

    if (filters?.studentId) {
      q = query(q, where('studentId', '==', filters.studentId));
    }
    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }

    const snap = await getDocs(q);
    let list = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Receipt, 'id'>),
    }));

    if (filters?.search && filters.search.trim()) {
      const term = filters.search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.receiptNumber.toLowerCase().includes(term) ||
          r.studentName.toLowerCase().includes(term) ||
          r.admissionNumber.toLowerCase().includes(term) ||
          (r.parentName && r.parentName.toLowerCase().includes(term)) ||
          (r.referenceNumber && r.referenceNumber.toLowerCase().includes(term))
      );
    }

    return list.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, RECEIPTS_COLLECTION);
  }
}

export async function getReceiptById(id: string): Promise<Receipt | null> {
  try {
    const snap = await getDoc(doc(db, RECEIPTS_COLLECTION, id));
    if (!snap.exists()) return null;
    return {
      id: snap.id,
      ...(snap.data() as Omit<Receipt, 'id'>),
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, RECEIPTS_COLLECTION);
  }
}

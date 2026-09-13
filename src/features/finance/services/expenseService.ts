import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, cleanFirestoreData, handleFirestoreError, OperationType } from '../../../services/firebase';
import {
  Expense,
  ExpenseCategory,
  ExpenseStatus,
  CashBookEntry,
  STANDARD_EXPENSE_CATEGORIES,
} from '../../../types';
import { logAuditEvent } from '../../../services/auditService';
import { roundINR } from '../utils/currencyUtils';

const EXPENSES_COLLECTION = 'expenses';
const EXPENSE_CATEGORIES_COLLECTION = 'expenseCategories';
const CASH_BOOK_COLLECTION = 'cashBook';

export async function getExpenses(
  schoolId: string,
  filters?: {
    financialYear?: string;
    category?: string;
    status?: ExpenseStatus;
    startDate?: string;
    endDate?: string;
  }
): Promise<Expense[]> {
  try {
    let q = query(collection(db, EXPENSES_COLLECTION), where('schoolId', '==', schoolId));

    if (filters?.financialYear) {
      q = query(q, where('financialYear', '==', filters.financialYear));
    }
    if (filters?.category) {
      q = query(q, where('category', '==', filters.category));
    }
    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }

    const snap = await getDocs(q);
    let list = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Expense, 'id'>),
    }));

    if (filters?.startDate) {
      list = list.filter((e) => e.date >= filters.startDate!);
    }
    if (filters?.endDate) {
      list = list.filter((e) => e.date <= filters.endDate!);
    }

    return list.sort((a, b) => b.date.localeCompare(a.date));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, EXPENSES_COLLECTION);
  }
}

export async function createExpense(
  data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string,
  userName: string,
  userRole: string
): Promise<Expense> {
  try {
    const id = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const record: Expense = {
      ...data,
      id,
      amount: roundINR(data.amount),
      createdAt: now,
      updatedAt: now,
    };

    const batch = writeBatch(db);
    batch.set(doc(db, EXPENSES_COLLECTION, id), cleanFirestoreData(record));

    // If initially created with PAID status, also record Cash Book entry
    if (record.status === 'PAID') {
      const cbId = `cb_exp_${id}`;
      const cbEntry: CashBookEntry = {
        id: cbId,
        schoolId: data.schoolId,
        financialYear: data.financialYear,
        date: data.date,
        description: `Expense - ${data.category} (${data.description}) to ${data.vendorPayee}`,
        type: 'EXPENSE',
        referenceType: 'EXPENSE',
        referenceId: id,
        receiptPaymentNumber: data.referenceNumber || id,
        income: 0,
        expense: record.amount,
        runningBalance: 0,
        paymentMode: data.paymentMode,
        createdAt: now,
      };
      batch.set(doc(db, CASH_BOOK_COLLECTION, cbId), cleanFirestoreData(cbEntry));
    }

    await batch.commit();

    await logAuditEvent({
      schoolId: data.schoolId,
      userId,
      userName,
      userRole,
      action: 'EXPENSE_CREATED',
      module: 'Finance',
      affectedRecord: id,
      description: `Created expense voucher for ₹${record.amount} [${data.category}: ${data.description}] Status: ${record.status}`,
    });

    return record;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, EXPENSES_COLLECTION);
  }
}

export async function approveExpense(params: {
  schoolId: string;
  expenseId: string;
  markAsPaid?: boolean;
  userId: string;
  userName: string;
  userRole: string;
}): Promise<void> {
  try {
    const { schoolId, expenseId, markAsPaid, userId, userName, userRole } = params;

    const expRef = doc(db, EXPENSES_COLLECTION, expenseId);
    const snap = await getDoc(expRef);
    if (!snap.exists()) throw new Error('Expense not found');

    const exp = snap.data() as Expense;
    const now = new Date().toISOString();
    const newStatus: ExpenseStatus = markAsPaid ? 'PAID' : 'APPROVED';

    const batch = writeBatch(db);
    batch.update(expRef, cleanFirestoreData({
      status: newStatus,
      approvedBy: userId,
      approvedByName: userName,
      approvedAt: now,
      paidAt: markAsPaid ? now : undefined,
      updatedAt: now,
    }));

    if (markAsPaid) {
      const cbId = `cb_exp_${expenseId}`;
      const cbEntry: CashBookEntry = {
        id: cbId,
        schoolId,
        financialYear: exp.financialYear,
        date: now.split('T')[0],
        description: `Expense Paid - ${exp.category} (${exp.description}) to ${exp.vendorPayee}`,
        type: 'EXPENSE',
        referenceType: 'EXPENSE',
        referenceId: expenseId,
        receiptPaymentNumber: exp.referenceNumber || expenseId,
        income: 0,
        expense: exp.amount,
        runningBalance: 0,
        paymentMode: exp.paymentMode,
        createdAt: now,
      };
      batch.set(doc(db, CASH_BOOK_COLLECTION, cbId), cleanFirestoreData(cbEntry));
    }

    await batch.commit();

    await logAuditEvent({
      schoolId,
      userId,
      userName,
      userRole,
      action: markAsPaid ? 'EXPENSE_PAID' : 'EXPENSE_APPROVED',
      module: 'Finance',
      affectedRecord: expenseId,
      description: `${markAsPaid ? 'Approved & marked paid' : 'Approved'} expense ₹${exp.amount} [${exp.category}] for ${exp.vendorPayee}`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, EXPENSES_COLLECTION);
  }
}

export async function rejectExpense(params: {
  schoolId: string;
  expenseId: string;
  reason: string;
  userId: string;
  userName: string;
  userRole: string;
}): Promise<void> {
  try {
    const { schoolId, expenseId, reason, userId, userName, userRole } = params;

    const expRef = doc(db, EXPENSES_COLLECTION, expenseId);
    const snap = await getDoc(expRef);
    if (!snap.exists()) throw new Error('Expense not found');

    const exp = snap.data() as Expense;
    const now = new Date().toISOString();

    await updateDoc(expRef, cleanFirestoreData({
      status: 'REJECTED',
      rejectionReason: reason,
      updatedAt: now,
    }));

    await logAuditEvent({
      schoolId,
      userId,
      userName,
      userRole,
      action: 'EXPENSE_REJECTED',
      module: 'Finance',
      affectedRecord: expenseId,
      description: `Rejected expense ₹${exp.amount} [${exp.category}]. Reason: ${reason}`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, EXPENSES_COLLECTION);
  }
}

export async function getExpenseCategories(schoolId: string): Promise<string[]> {
  try {
    const q = query(collection(db, EXPENSE_CATEGORIES_COLLECTION), where('schoolId', '==', schoolId));
    const snap = await getDocs(q);
    const set = new Set<string>();
    STANDARD_EXPENSE_CATEGORIES.forEach((c) => set.add(c));
    snap.docs.forEach((d) => set.add(d.data().name));
    return Array.from(set);
  } catch {
    return Array.from(STANDARD_EXPENSE_CATEGORIES);
  }
}

export async function addExpenseCategory(schoolId: string, name: string): Promise<void> {
  try {
    const id = `exp_cat_${Date.now()}`;
    await setDoc(doc(db, EXPENSE_CATEGORIES_COLLECTION, id), cleanFirestoreData({
      id,
      schoolId,
      name,
      isDefault: false,
      createdAt: new Date().toISOString(),
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, EXPENSE_CATEGORIES_COLLECTION);
  }
}

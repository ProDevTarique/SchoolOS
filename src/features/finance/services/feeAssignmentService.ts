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
  FeeAssignment,
  FeeItem,
  FeeStructure,
  Student,
  FeeDiscount,
  FeeConcession,
} from '../../../types';
import { getStudents } from '../../../services/studentService';
import { logAuditEvent } from '../../../services/auditService';
import { roundINR } from '../utils/currencyUtils';

const FEE_ASSIGNMENTS_COLLECTION = 'feeAssignments';
const FEE_ITEMS_COLLECTION = 'feeItems';
const FEE_DISCOUNTS_COLLECTION = 'feeDiscounts';
const FEE_CONCESSIONS_COLLECTION = 'feeConcessions';

/**
 * Standard months for Indian academic year (April to March)
 */
export const DEFAULT_INDIAN_ACADEMIC_MONTHS = [
  'April', 'May', 'June', 'July', 'August', 'September',
  'October', 'November', 'December', 'January', 'February', 'March'
];

const identifier = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '_');

function calculateConcession(baseAmount: number, type: 'FIXED_AMOUNT' | 'PERCENTAGE', value: number) {
  if (!Number.isFinite(baseAmount) || baseAmount < 0) throw new Error('Base amount must be a finite, non-negative number.');
  if (!Number.isFinite(value) || value < 0) throw new Error('Concession value must be finite and non-negative.');
  if (type === 'PERCENTAGE' && value > 100) throw new Error('Percentage concession cannot exceed 100%.');
  const amount = roundINR(type === 'PERCENTAGE' ? baseAmount * (value / 100) : value);
  const concessionAmount = Math.min(baseAmount, amount);
  return { concessionAmount, effectiveAmount: roundINR(Math.max(0, baseAmount - concessionAmount)) };
}

function buildPeriods(feeStructure: FeeStructure): { key: string; name: string; dueDate: string }[] {
  const currentYear = new Date().getFullYear();
  const dueDay = Math.min(31, Math.max(1, feeStructure.dueDateDay || 10));
  const monthMap: Record<string, number> = {
    January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
    July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
  };
  const dateForMonth = (month: number) => {
    const year = month < 4 ? currentYear + 1 : currentYear;
    return `${year}-${month.toString().padStart(2, '0')}-${dueDay.toString().padStart(2, '0')}`;
  };

  if (feeStructure.frequency === 'PER_DAY') return [];
  if (feeStructure.frequency === 'MONTHLY') {
    const months = feeStructure.applicableMonths?.length
      ? feeStructure.applicableMonths
      : DEFAULT_INDIAN_ACADEMIC_MONTHS;
    return months.map((month, index) => {
      const monthNumber = monthMap[month] || ((index + 4) > 12 ? index - 8 : index + 4);
      return { key: `month_${monthNumber}`, name: `${feeStructure.feeCategory} - ${month}`, dueDate: dateForMonth(monthNumber) };
    });
  }
  if (feeStructure.frequency === 'QUARTERLY') {
    return ['Q1 (Apr-Jun)', 'Q2 (Jul-Sep)', 'Q3 (Oct-Dec)', 'Q4 (Jan-Mar)'].map((name, index) => ({
      key: `quarter_${index + 1}`,
      name: `${feeStructure.feeCategory} - ${name}`,
      dueDate: dateForMonth([4, 7, 10, 1][index]),
    }));
  }
  if (feeStructure.frequency === 'HALF_YEARLY') {
    return ['H1 (Apr-Sep)', 'H2 (Oct-Mar)'].map((name, index) => ({
      key: `half_${index + 1}`,
      name: `${feeStructure.feeCategory} - ${name}`,
      dueDate: dateForMonth(index === 0 ? 4 : 10),
    }));
  }
  return [{
    key: 'annual',
    name: feeStructure.feeCategory,
    dueDate: feeStructure.dueDate || `${currentYear}-05-${dueDay.toString().padStart(2, '0')}`,
  }];
}

/**
 * Assigns one structure to each eligible student and idempotently generates
 * non-payment fee items for the applicable academic periods.
 */
export async function assignFeeStructure(params: {
  schoolId: string;
  academicSessionId: string;
  feeStructure: FeeStructure;
  assignmentType: 'CLASS' | 'SECTION' | 'STUDENT';
  classId: string;
  sectionId?: string;
  studentIds?: string[];
  studentOverrides?: Record<string, number>; // studentId -> custom amount
  userId: string;
  userName: string;
  userRole: string;
}): Promise<{ assignmentCount: number; itemsGenerated: number }> {
  try {
    const {
      schoolId,
      academicSessionId,
      feeStructure,
      assignmentType,
      classId,
      sectionId,
      studentIds,
      studentOverrides,
      userId,
      userName,
      userRole,
    } = params;

    if (!Number.isFinite(feeStructure.amount) || feeStructure.amount < 0) {
      throw new Error('Fee structure amount must be a finite, non-negative number.');
    }
    if (feeStructure.status !== 'ACTIVE') {
      throw new Error('Inactive fee structures cannot be assigned.');
    }
    if (feeStructure.schoolId !== schoolId || feeStructure.academicSessionId !== academicSessionId
      || feeStructure.classId !== classId
      || (feeStructure.sectionId && feeStructure.sectionId !== sectionId)) {
      throw new Error('Fee structure is not applicable to the selected target.');
    }

    let targetStudents: Student[] = [];
    if (assignmentType === 'STUDENT' && studentIds && studentIds.length > 0) {
      const allClassStudents = await getStudents(schoolId, { classId });
      targetStudents = allClassStudents.filter((s) => studentIds.includes(s.id));
    } else if (assignmentType === 'SECTION' && sectionId) {
      targetStudents = await getStudents(schoolId, { classId, sectionId });
    } else {
      targetStudents = await getStudents(schoolId, { classId });
    }

    const periods = buildPeriods(feeStructure);
    let itemsGenerated = 0;
    const now = new Date().toISOString();
    for (const student of targetStudents) {
      if (student.schoolId !== schoolId || student.classId !== classId
        || (feeStructure.sectionId && student.sectionId !== feeStructure.sectionId)) {
        continue;
      }
      const assignmentId = `fee_assign_${identifier(schoolId)}_${identifier(academicSessionId)}_${identifier(student.id)}_${identifier(feeStructure.id)}`;
      const assignmentRef = doc(db, FEE_ASSIGNMENTS_COLLECTION, assignmentId);
      const amount = roundINR(studentOverrides?.[student.id] ?? feeStructure.amount);
      if (!Number.isFinite(amount) || amount < 0) throw new Error('Assignment amount must be finite and non-negative.');

      await runTransaction(db, async (transaction) => {
        const existing = await transaction.get(assignmentRef);
        const periodRefs = periods.map((period) => ({
          period,
          ref: doc(db, FEE_ITEMS_COLLECTION, `fee_item_${identifier(assignmentId)}_${identifier(period.key)}`),
        }));
        const existingItems = await Promise.all(periodRefs.map(({ ref }) => transaction.get(ref)));
        const assignment: FeeAssignment = {
          id: assignmentId, schoolId, academicSessionId, feeStructureId: feeStructure.id,
          feeCategoryId: feeStructure.feeCategoryId, amount, frequency: feeStructure.frequency,
          assignmentType: 'STUDENT', classId, sectionId: student.sectionId, studentId: student.id,
          isActive: true, createdAt: existing.exists() ? (existing.data().createdAt as string) : now,
          updatedAt: now, createdBy: existing.exists() ? (existing.data().createdBy as string) : userId,
        };
        transaction.set(assignmentRef, cleanFirestoreData(assignment), { merge: true });
        for (const [index, { period, ref: itemRef }] of periodRefs.entries()) {
          const itemId = itemRef.id;
          const item = {
            id: itemId, schoolId, academicSessionId, studentId: student.id,
            classId, sectionId: student.sectionId, feeAssignmentId: assignmentId,
            feeStructureId: feeStructure.id, feeCategoryId: feeStructure.feeCategoryId,
            feeCategory: feeStructure.feeCategory, frequency: feeStructure.frequency,
            name: period.name, period: period.key, dueDate: period.dueDate,
            grossAmount: amount, baseAmount: amount, discountAmount: 0, concessionAmount: 0,
            effectiveAmount: amount,
            lateFeeAmount: 0, netPayable: amount, paidAmount: 0, balance: amount,
            status: 'PENDING' as const, createdAt: now, updatedAt: now, createdBy: userId,
          };
          if (!existingItems[index].exists()) {
            transaction.set(itemRef, cleanFirestoreData(item));
            itemsGenerated++;
          }
        }
      });
    }

    await logAuditEvent({
      schoolId,
      userId,
      userName,
      userRole,
      action: 'FEE_ASSIGNED',
      module: 'Finance',
      affectedRecord: feeStructure.id,
      description: `Assigned fee structure "${feeStructure.name}" to ${targetStudents.length} students (${itemsGenerated} fee items generated)`,
    });

    return { assignmentCount: targetStudents.length, itemsGenerated };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, FEE_ASSIGNMENTS_COLLECTION);
  }
}

/**
 * Get all scheduled fee items for a student
 */
export async function getStudentFeeItems(schoolId: string, studentId: string): Promise<FeeItem[]> {
  try {
    const q = query(
      collection(db, FEE_ITEMS_COLLECTION),
      where('schoolId', '==', schoolId),
      where('studentId', '==', studentId)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({
        id: d.id,
        ...(d.data() as Omit<FeeItem, 'id'>),
      }))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, FEE_ITEMS_COLLECTION);
  }
}

/**
 * Applies one active discount definition to one fee item. The applied value is
 * snapshotted by grantFeeConcession so later definition changes are not retroactive.
 */
export async function applyFeeDiscountToItem(params: {
    discountId: string;
    feeItemId: string;
    schoolId: string;
    userId: string;
    userName: string;
    userRole: string;
  }): Promise<FeeConcession> {
    const discountSnap = await getDoc(doc(db, FEE_DISCOUNTS_COLLECTION, params.discountId));
    if (!discountSnap.exists()) throw new Error('Discount definition not found.');
    const discount = discountSnap.data() as FeeDiscount;
    if (discount.schoolId !== params.schoolId || !discount.isActive) {
      throw new Error('This discount is not active for the selected school.');
    }

    const itemSnap = await getDoc(doc(db, FEE_ITEMS_COLLECTION, params.feeItemId));
    if (!itemSnap.exists()) throw new Error('Fee item not found.');
    const item = { id: itemSnap.id, ...(itemSnap.data() as Omit<FeeItem, 'id'>) };
    if (item.schoolId !== params.schoolId || item.academicSessionId !== discount.academicSessionId) {
      throw new Error('Discount and fee item must belong to the same school and academic session.');
    }
    if (discount.discountScope === 'STUDENT' && discount.studentId !== item.studentId) {
      throw new Error('This discount is not applicable to the selected student.');
    }
    if (discount.feeCategoryId && discount.feeCategoryId !== item.feeCategoryId) {
      throw new Error('This discount is not applicable to the selected fee category.');
    }
    if (discount.feeStructureId && discount.feeStructureId !== item.feeStructureId) {
      throw new Error('This discount is not applicable to the selected fee structure.');
    }

    const concessionType = discount.type === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED_AMOUNT';
    return grantFeeConcession({
      schoolId: params.schoolId,
      academicSessionId: item.academicSessionId,
      studentId: item.studentId,
      feeItemId: item.id,
      concessionAmount: discount.value,
      concessionType,
      reason: discount.reason,
      userId: params.userId,
      userName: params.userName,
      userRole: params.userRole,
    });
}

/**
 * Get all fee items for a school with optional filters
 */
export async function getAllFeeItems(
  schoolId: string,
  filters?: {
    academicSessionId?: string;
    studentId?: string;
    feeCategory?: string;
    status?: string;
  }
): Promise<FeeItem[]> {
  try {
    let q = query(collection(db, FEE_ITEMS_COLLECTION), where('schoolId', '==', schoolId));

    if (filters?.academicSessionId) {
      q = query(q, where('academicSessionId', '==', filters.academicSessionId));
    }
    if (filters?.studentId) {
      q = query(q, where('studentId', '==', filters.studentId));
    }

    const snap = await getDocs(q);
    let list = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<FeeItem, 'id'>),
    }));

    if (filters?.feeCategory) {
      list = list.filter((i) => i.feeCategory === filters.feeCategory);
    }
    if (filters?.status) {
      list = list.filter((i) => i.status === filters.status);
    }

    return list.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, FEE_ITEMS_COLLECTION);
  }
}

/**
 * Grant a Fee Concession on a specific fee item
 */
export async function grantFeeConcession(params: {
  schoolId: string;
  academicSessionId: string;
  studentId: string;
  feeItemId: string;
  concessionAmount: number;
  concessionType?: 'FIXED_AMOUNT' | 'PERCENTAGE';
  reason: string;
  userId: string;
  userName: string;
  userRole: string;
}): Promise<FeeConcession> {
  try {
    const {
      schoolId,
      academicSessionId,
      studentId,
      feeItemId,
      concessionAmount,
      reason,
      userId,
      userName,
      userRole,
    } = params;

    const itemRef = doc(db, FEE_ITEMS_COLLECTION, feeItemId);
    const itemSnap = await getDoc(itemRef);
    if (!itemSnap.exists()) throw new Error('Fee item not found');

    const item = itemSnap.data() as FeeItem;
    if (item.schoolId !== schoolId || item.academicSessionId !== academicSessionId || item.studentId !== studentId) {
      throw new Error('Fee item does not belong to the selected school, session, or student.');
    }
    if (item.appliedConcessionId || item.concessionAmount > 0) {
      throw new Error('A concession is already applied to this fee item.');
    }
    const concessionId = `concession_${identifier(schoolId)}_${identifier(feeItemId)}`;
    const now = new Date().toISOString();
    const type = params.concessionType || 'FIXED_AMOUNT';
    const baseAmount = roundINR(item.baseAmount ?? item.grossAmount);
    const { concessionAmount: concVal, effectiveAmount: payable } = calculateConcession(baseAmount, type, concessionAmount);

    const concession: FeeConcession = {
      id: concessionId,
      schoolId,
      academicSessionId,
      studentId,
      feeItemId,
      feeAssignmentId: item.feeAssignmentId,
      feeCategoryId: item.feeCategoryId,
      feeStructureId: item.feeStructureId,
      classId: item.classId,
      sectionId: item.sectionId,
      type,
      value: roundINR(concessionAmount),
      originalAmount: baseAmount,
      concessionAmount: concVal,
      payableAmount: payable,
      reason,
      approvedBy: userId,
      approvedByName: userName,
      date: now.split('T')[0],
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
    };

    // Calculate new net payable & balance
    const newNetPayable = roundINR(payable - (item.discountAmount || 0) + (item.lateFeeAmount || 0));

    const batch = writeBatch(db);
    batch.set(doc(db, FEE_CONCESSIONS_COLLECTION, concessionId), cleanFirestoreData(concession));
    batch.update(itemRef, cleanFirestoreData({
      concessionAmount: concVal,
      baseAmount,
      effectiveAmount: payable,
      appliedConcessionId: concessionId,
      appliedConcessionType: type,
      appliedConcessionValue: roundINR(concessionAmount),
      netPayable: newNetPayable,
      updatedAt: now,
      updatedBy: userId,
    }));

    await batch.commit();

    await logAuditEvent({
      schoolId,
      userId,
      userName,
      userRole,
      action: 'CONCESSION_APPROVED',
      module: 'Finance',
      affectedRecord: concessionId,
      description: `Granted concession of ₹${concVal} on ${item.name} for student. Payable reduced to ₹${payable}`,
    });

    return concession;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, FEE_CONCESSIONS_COLLECTION);
  }
}

/**
 * Create a Fee Discount / Scholarship
 */
export async function createFeeDiscount(
  data: Omit<FeeDiscount, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string,
  userName: string,
  userRole: string
): Promise<FeeDiscount> {
  try {
    const id = `discount_${identifier(data.schoolId)}_${identifier(data.code || data.name)}`;
    const now = new Date().toISOString();

    const discount: FeeDiscount = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    await runTransaction(db, async (transaction) => {
      const ref = doc(db, FEE_DISCOUNTS_COLLECTION, id);
      const existing = await transaction.get(ref);
      if (existing.exists() && existing.data().isActive) {
        throw new Error('An active discount with this code or name already exists.');
      }
      transaction.set(ref, cleanFirestoreData(discount), { merge: true });
    });

    await logAuditEvent({
      schoolId: data.schoolId,
      userId,
      userName,
      userRole,
      action: 'DISCOUNT_CREATED',
      module: 'Finance',
      affectedRecord: id,
      description: `Created discount/scholarship "${data.name}" (${data.type}: ${data.value})`,
    });

    return discount;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, FEE_DISCOUNTS_COLLECTION);
  }
}

export async function getFeeDiscounts(schoolId: string): Promise<FeeDiscount[]> {
  try {
    const q = query(collection(db, FEE_DISCOUNTS_COLLECTION), where('schoolId', '==', schoolId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<FeeDiscount, 'id'>),
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, FEE_DISCOUNTS_COLLECTION);
  }
}

export async function deleteFeeDiscount(
  id: string,
  schoolId: string,
  userId: string,
  userName: string,
  userRole: string
): Promise<void> {
  try {
    await updateDoc(doc(db, FEE_DISCOUNTS_COLLECTION, id), {
      isActive: false,
      status: 'INACTIVE',
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    });
    await logAuditEvent({
      schoolId,
      userId,
      userName,
      userRole,
      action: 'DISCOUNT_DEACTIVATED',
      module: 'Finance',
      affectedRecord: id,
      description: `Deleted discount rule ${id}`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, FEE_DISCOUNTS_COLLECTION);
  }
}

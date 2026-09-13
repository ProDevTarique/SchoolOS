import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
} from 'firebase/firestore';
import { db, cleanFirestoreData, handleFirestoreError, OperationType } from '../../../services/firebase';
import { FeeStructure, STANDARD_FEE_CATEGORIES } from '../../../types';
import { logAuditEvent } from '../../../services/auditService';

const FEE_STRUCTURES_COLLECTION = 'feeStructures';

export async function getFeeStructures(
  schoolId: string,
  filters?: {
    academicSessionId?: string;
    classId?: string;
    sectionId?: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  }
): Promise<FeeStructure[]> {
  try {
    let q = query(collection(db, FEE_STRUCTURES_COLLECTION), where('schoolId', '==', schoolId));

    if (filters?.academicSessionId) {
      q = query(q, where('academicSessionId', '==', filters.academicSessionId));
    }
    if (filters?.classId) {
      q = query(q, where('classId', '==', filters.classId));
    }
    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }

    const snap = await getDocs(q);
    let list = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<FeeStructure, 'id'>),
    }));

    if (filters?.sectionId) {
      list = list.filter((s) => !s.sectionId || s.sectionId === filters.sectionId);
    }

    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, FEE_STRUCTURES_COLLECTION);
  }
}

export async function getFeeStructureById(id: string): Promise<FeeStructure | null> {
  try {
    const snap = await getDoc(doc(db, FEE_STRUCTURES_COLLECTION, id));
    if (!snap.exists()) return null;
    return {
      id: snap.id,
      ...(snap.data() as Omit<FeeStructure, 'id'>),
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, FEE_STRUCTURES_COLLECTION);
  }
}

export async function createFeeStructure(
  data: Omit<FeeStructure, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string,
  userName: string,
  userRole: string
): Promise<FeeStructure> {
  try {
    const id = `fee_struct_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const record: FeeStructure = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, FEE_STRUCTURES_COLLECTION, id), cleanFirestoreData(record));

    await logAuditEvent({
      schoolId: data.schoolId,
      userId,
      userName,
      userRole,
      action: 'FEE_STRUCTURE_CREATED',
      module: 'Finance',
      affectedRecord: id,
      description: `Created fee structure "${data.name}" (${data.feeCategory} - ₹${data.amount}/${data.frequency})`,
    });

    return record;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, FEE_STRUCTURES_COLLECTION);
  }
}

export async function updateFeeStructure(
  id: string,
  updates: Partial<FeeStructure>,
  userId: string,
  userName: string,
  userRole: string
): Promise<void> {
  try {
    const docRef = doc(db, FEE_STRUCTURES_COLLECTION, id);
    const existing = await getFeeStructureById(id);
    if (!existing) throw new Error('Fee structure not found');

    const now = new Date().toISOString();
    await updateDoc(docRef, cleanFirestoreData({
      ...updates,
      updatedAt: now,
      updatedBy: userId,
    }));

    await logAuditEvent({
      schoolId: existing.schoolId,
      userId,
      userName,
      userRole,
      action: 'FEE_STRUCTURE_MODIFIED',
      module: 'Finance',
      affectedRecord: id,
      description: `Modified fee structure "${existing.name}". New amount: ₹${updates.amount ?? existing.amount}`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, FEE_STRUCTURES_COLLECTION);
  }
}

export async function deleteFeeStructure(
  id: string,
  userId: string,
  userName: string,
  userRole: string
): Promise<void> {
  try {
    const existing = await getFeeStructureById(id);
    if (!existing) return;

    await updateDoc(doc(db, FEE_STRUCTURES_COLLECTION, id), {
      status: 'INACTIVE',
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    });

    await logAuditEvent({
      schoolId: existing.schoolId,
      userId,
      userName,
      userRole,
      action: 'FEE_STRUCTURE_DEACTIVATED',
      module: 'Finance',
      affectedRecord: id,
      description: `Deactivated fee structure "${existing.name}"`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, FEE_STRUCTURES_COLLECTION);
  }
}

export async function getAllFeeCategories(schoolId: string): Promise<string[]> {
  const structures = await getFeeStructures(schoolId);
  const custom = new Set<string>();
  STANDARD_FEE_CATEGORIES.forEach((c) => custom.add(c));
  structures.forEach((s) => {
    if (s.feeCategory) custom.add(s.feeCategory);
  });
  return Array.from(custom);
}

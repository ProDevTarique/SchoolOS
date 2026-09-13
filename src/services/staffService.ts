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
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, cleanFirestoreData } from './firebase';
import { StaffMember, StaffCategory, EmploymentStatus } from '../types';

const STAFF_COLLECTION = 'staff';

export async function getStaffList(
  schoolId: string,
  filters?: { category?: StaffCategory; status?: EmploymentStatus; search?: string }
): Promise<StaffMember[]> {
  try {
    let q = query(collection(db, STAFF_COLLECTION), where('schoolId', '==', schoolId));

    if (filters?.category) {
      q = query(q, where('category', '==', filters.category));
    }
    if (filters?.status) {
      q = query(q, where('employmentStatus', '==', filters.status));
    }

    const snap = await getDocs(q);
    let staff = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<StaffMember, 'id'>),
    }));

    if (filters?.search && filters.search.trim()) {
      const term = filters.search.trim().toLowerCase();
      staff = staff.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.employeeId.toLowerCase().includes(term) ||
          s.designation.toLowerCase().includes(term) ||
          (s.department && s.department.toLowerCase().includes(term)) ||
          (s.email && s.email.toLowerCase().includes(term)) ||
          (s.phone && s.phone.toLowerCase().includes(term))
      );
    }

    return staff;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, STAFF_COLLECTION);
  }
}

export async function getStaffById(id: string): Promise<StaffMember | null> {
  try {
    const snap = await getDoc(doc(db, STAFF_COLLECTION, id));
    if (!snap.exists()) return null;
    return {
      id: snap.id,
      ...(snap.data() as Omit<StaffMember, 'id'>),
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `${STAFF_COLLECTION}/${id}`);
  }
}

export async function isEmployeeIdUnique(
  schoolId: string,
  employeeId: string,
  excludeStaffId?: string
): Promise<boolean> {
  try {
    const q = query(
      collection(db, STAFF_COLLECTION),
      where('schoolId', '==', schoolId),
      where('employeeId', '==', employeeId.trim())
    );
    const snap = await getDocs(q);
    if (snap.empty) return true;
    if (excludeStaffId) {
      return snap.docs.every((d) => d.id === excludeStaffId);
    }
    return false;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, STAFF_COLLECTION);
  }
}

export async function createStaffMember(
  member: Omit<StaffMember, 'id' | 'createdAt' | 'updatedAt'>
): Promise<StaffMember> {
  const isUnique = await isEmployeeIdUnique(member.schoolId, member.employeeId);
  if (!isUnique) {
    throw new Error(`Employee ID "${member.employeeId}" is already assigned to another staff member.`);
  }

  try {
    const id = `staff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const ref = doc(db, STAFF_COLLECTION, id);
    const payload: StaffMember = {
      ...member,
      id,
      employeeId: member.employeeId.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(ref, cleanFirestoreData(payload));
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, STAFF_COLLECTION);
  }
}

export async function updateStaffMember(id: string, updates: Partial<StaffMember>): Promise<void> {
  if (updates.employeeId && updates.schoolId) {
    const isUnique = await isEmployeeIdUnique(updates.schoolId, updates.employeeId, id);
    if (!isUnique) {
      throw new Error(`Employee ID "${updates.employeeId}" is already in use.`);
    }
  }

  try {
    const ref = doc(db, STAFF_COLLECTION, id);
    await updateDoc(ref, cleanFirestoreData({
      ...updates,
      updatedAt: new Date().toISOString(),
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${STAFF_COLLECTION}/${id}`);
  }
}

export async function deleteStaffMember(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, STAFF_COLLECTION, id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${STAFF_COLLECTION}/${id}`);
  }
}

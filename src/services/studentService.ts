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
import { db, handleFirestoreError, OperationType, cleanFirestoreData } from './firebase';
import { Student, StudentStatus } from '../types';

const STUDENTS_COLLECTION = 'students';

export async function getStudents(schoolId: string, filters?: {
  classId?: string;
  sectionId?: string;
  sessionId?: string;
  status?: StudentStatus;
  search?: string;
}): Promise<Student[]> {
  try {
    let q = query(collection(db, STUDENTS_COLLECTION), where('schoolId', '==', schoolId));

    if (filters?.classId) {
      q = query(q, where('classId', '==', filters.classId));
    }
    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }

    const snap = await getDocs(q);
    let students = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Student, 'id'>),
    }));

    if (filters?.sectionId) {
      students = students.filter((s) => s.sectionId === filters.sectionId);
    }
    if (filters?.sessionId) {
      students = students.filter((s) => s.sessionId === filters.sessionId);
    }

    if (filters?.search && filters.search.trim()) {
      const term = filters.search.trim().toLowerCase();
      students = students.filter(
        (s) =>
          s.fullName.toLowerCase().includes(term) ||
          s.admissionNumber.toLowerCase().includes(term) ||
          (s.rollNumber && s.rollNumber.toLowerCase().includes(term)) ||
          (s.fatherName && s.fatherName.toLowerCase().includes(term)) ||
          (s.motherName && s.motherName.toLowerCase().includes(term)) ||
          (s.fatherPhone && s.fatherPhone.toLowerCase().includes(term)) ||
          (s.motherPhone && s.motherPhone.toLowerCase().includes(term))
      );
    }

    return students;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, STUDENTS_COLLECTION);
  }
}

export async function getStudentById(id: string): Promise<Student | null> {
  try {
    const snap = await getDoc(doc(db, STUDENTS_COLLECTION, id));
    if (!snap.exists()) return null;
    return {
      id: snap.id,
      ...(snap.data() as Omit<Student, 'id'>),
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `${STUDENTS_COLLECTION}/${id}`);
  }
}

export async function isAdmissionNumberUnique(
  schoolId: string,
  admissionNumber: string,
  excludeStudentId?: string
): Promise<boolean> {
  try {
    const q = query(
      collection(db, STUDENTS_COLLECTION),
      where('schoolId', '==', schoolId),
      where('admissionNumber', '==', admissionNumber.trim())
    );
    const snap = await getDocs(q);
    if (snap.empty) return true;
    if (excludeStudentId) {
      return snap.docs.every((d) => d.id === excludeStudentId);
    }
    return false;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, STUDENTS_COLLECTION);
  }
}

export async function createStudent(
  student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Student> {
  const isUnique = await isAdmissionNumberUnique(student.schoolId, student.admissionNumber);
  if (!isUnique) {
    throw new Error(`Admission number "${student.admissionNumber}" already exists in the school.`);
  }

  try {
    const id = `student_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const ref = doc(db, STUDENTS_COLLECTION, id);
    const payload: Student = {
      ...student,
      admissionNumber: student.admissionNumber.trim(),
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(ref, cleanFirestoreData(payload));
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, STUDENTS_COLLECTION);
  }
}

export async function updateStudent(id: string, updates: Partial<Student>): Promise<void> {
  if (updates.admissionNumber && updates.schoolId) {
    const isUnique = await isAdmissionNumberUnique(updates.schoolId, updates.admissionNumber, id);
    if (!isUnique) {
      throw new Error(`Admission number "${updates.admissionNumber}" is already in use by another student.`);
    }
  }

  try {
    const ref = doc(db, STUDENTS_COLLECTION, id);
    await updateDoc(ref, cleanFirestoreData({
      ...updates,
      updatedAt: new Date().toISOString(),
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${STUDENTS_COLLECTION}/${id}`);
  }
}

export async function updateStudentStatus(id: string, status: StudentStatus): Promise<void> {
  try {
    const ref = doc(db, STUDENTS_COLLECTION, id);
    await updateDoc(ref, {
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${STUDENTS_COLLECTION}/${id}`);
  }
}

export async function deleteStudentPermanently(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, STUDENTS_COLLECTION, id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${STUDENTS_COLLECTION}/${id}`);
  }
}

export const deleteStudent = deleteStudentPermanently;

export interface CSVImportError {
  row: number;
  admissionNumber: string;
  studentName: string;
  reason: string;
}

export interface CSVImportValidationResult {
  validRows: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[];
  errors: CSVImportError[];
}

export async function validateStudentCSVData(
  rows: Record<string, string>[],
  schoolId: string,
  classMap: Map<string, string>, // className/code -> classId
  sectionMap: Map<string, string>, // "classId:sectionName" -> sectionId
  sessionId?: string
): Promise<CSVImportValidationResult> {
  const validRows: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  const errors: CSVImportError[] = [];
  const seenAdmissionNumbers = new Set<string>();

  // Fetch all existing admission numbers for school
  const existingStudents = await getStudents(schoolId);
  const existingAdmissionNumbers = new Set(existingStudents.map((s) => s.admissionNumber.toLowerCase()));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // header is row 1
    const adm = (row.admissionNumber || '').trim();
    const name = (row.studentName || '').trim();
    const className = (row.class || '').trim();
    const sectionName = (row.section || '').trim();
    const gender = (row.gender || 'OTHER').trim().toUpperCase() as 'MALE' | 'FEMALE' | 'OTHER';

    if (!adm) {
      errors.push({ row: rowNum, admissionNumber: adm, studentName: name, reason: 'Admission number is required' });
      continue;
    }
    if (seenAdmissionNumbers.has(adm.toLowerCase())) {
      errors.push({ row: rowNum, admissionNumber: adm, studentName: name, reason: `Duplicate admission number in file: "${adm}"` });
      continue;
    }
    if (existingAdmissionNumbers.has(adm.toLowerCase())) {
      errors.push({ row: rowNum, admissionNumber: adm, studentName: name, reason: `Admission number already registered in school: "${adm}"` });
      continue;
    }
    seenAdmissionNumbers.add(adm.toLowerCase());

    if (!name) {
      errors.push({ row: rowNum, admissionNumber: adm, studentName: name, reason: 'Student full name is required' });
      continue;
    }

    const classId = classMap.get(className.toLowerCase());
    if (!classId) {
      errors.push({ row: rowNum, admissionNumber: adm, studentName: name, reason: `Class "${className}" does not exist in the school` });
      continue;
    }

    const sectionKey = `${classId}:${sectionName.toLowerCase()}`;
    const sectionId = sectionMap.get(sectionKey);
    if (!sectionId) {
      errors.push({ row: rowNum, admissionNumber: adm, studentName: name, reason: `Section "${sectionName}" not found in class "${className}"` });
      continue;
    }

    validRows.push({
      schoolId,
      admissionNumber: adm,
      rollNumber: (row.rollNumber || '').trim(),
      fullName: name,
      gender: ['MALE', 'FEMALE'].includes(gender) ? gender : 'OTHER',
      dateOfBirth: (row.dateOfBirth || '').trim(),
      classId,
      sectionId,
      sessionId: sessionId || '',
      admissionDate: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
      fatherName: (row.fatherName || '').trim(),
      motherName: (row.motherName || '').trim(),
      guardianName: (row.guardianName || '').trim(),
      fatherPhone: (row.fatherPhone || '').trim(),
      motherPhone: (row.motherPhone || '').trim(),
      guardianPhone: (row.guardianPhone || '').trim(),
      address: (row.address || '').trim(),
      city: (row.city || '').trim(),
      state: (row.state || '').trim(),
      pinCode: (row.pinCode || '').trim(),
    });
  }

  return { validRows, errors };
}

export async function commitBulkImport(
  students: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<number> {
  if (students.length === 0) return 0;
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  students.forEach((s) => {
    const id = `student_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const ref = doc(db, STUDENTS_COLLECTION, id);
    batch.set(ref, cleanFirestoreData({
      ...s,
      id,
      createdAt: now,
      updatedAt: now,
    }));
  });

  await batch.commit();
  return students.length;
}

export async function bulkImportStudents(
  schoolId: string,
  students: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<{ imported: number; failed: number; errors: string[] }> {
  const existing = await getStudents(schoolId);
  const existingAdmissions = new Set(existing.map((s) => s.admissionNumber.toLowerCase()));
  const valid: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  const errors: string[] = [];
  const seenInBatch = new Set<string>();

  for (const s of students) {
    const adm = s.admissionNumber.trim().toLowerCase();
    if (existingAdmissions.has(adm) || seenInBatch.has(adm)) {
      errors.push(`Admission number "${s.admissionNumber}" is already in use.`);
    } else {
      seenInBatch.add(adm);
      valid.push(s);
    }
  }

  const imported = await commitBulkImport(valid);
  return {
    imported,
    failed: errors.length,
    errors,
  };
}

export function generateCSVTemplate(): string {
  const headers = [
    'admissionNumber',
    'studentName',
    'dateOfBirth',
    'gender',
    'class',
    'section',
    'rollNumber',
    'fatherName',
    'motherName',
    'guardianName',
    'fatherPhone',
    'motherPhone',
    'guardianPhone',
    'address',
    'city',
    'state',
    'pinCode',
  ];
  const sampleRow = [
    'ADM-2025-001',
    'Aarav Sharma',
    '2010-05-15',
    'MALE',
    'Class 10',
    'A',
    '101',
    'Rajesh Sharma',
    'Pooja Sharma',
    '',
    '+91 9876543210',
    '+91 9876543211',
    '',
    '123 Gandhi Nagar',
    'New Delhi',
    'Delhi',
    '110001',
  ];
  return [headers.join(','), sampleRow.join(',')].join('\n');
}

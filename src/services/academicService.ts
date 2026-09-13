import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, cleanFirestoreData } from './firebase';
import { AcademicSession, ClassItem, SectionItem, SubjectItem } from '../types';

const SESSIONS_COLLECTION = 'academicSessions';
const CLASSES_COLLECTION = 'classes';
const SECTIONS_COLLECTION = 'sections';
const SUBJECTS_COLLECTION = 'subjects';

// ================= ACADEMIC SESSIONS =================

export async function getAcademicSessions(schoolId: string): Promise<AcademicSession[]> {
  try {
    const q = query(collection(db, SESSIONS_COLLECTION), where('schoolId', '==', schoolId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<AcademicSession, 'id'>),
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, SESSIONS_COLLECTION);
  }
}

export async function createAcademicSession(session: Omit<AcademicSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<AcademicSession> {
  try {
    const id = `session_${Date.now()}`;
    const batch = writeBatch(db);

    // If this session is marked active, deactivate any existing active session in this school
    if (session.isActive) {
      const existing = await getAcademicSessions(session.schoolId);
      for (const s of existing) {
        if (s.isActive) {
          const sRef = doc(db, SESSIONS_COLLECTION, s.id);
          batch.update(sRef, { isActive: false, updatedAt: new Date().toISOString() });
        }
      }
    }

    const newDocRef = doc(db, SESSIONS_COLLECTION, id);
    const newSession: AcademicSession = {
      ...session,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    batch.set(newDocRef, cleanFirestoreData(newSession));
    await batch.commit();
    return newSession;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, SESSIONS_COLLECTION);
  }
}

export async function updateAcademicSession(id: string, updates: Partial<AcademicSession>, schoolId: string): Promise<void> {
  try {
    const batch = writeBatch(db);
    if (updates.isActive) {
      const existing = await getAcademicSessions(schoolId);
      for (const s of existing) {
        if (s.id !== id && s.isActive) {
          const sRef = doc(db, SESSIONS_COLLECTION, s.id);
          batch.update(sRef, { isActive: false, updatedAt: new Date().toISOString() });
        }
      }
    }
    const targetRef = doc(db, SESSIONS_COLLECTION, id);
    batch.update(targetRef, cleanFirestoreData({
      ...updates,
      updatedAt: new Date().toISOString(),
    }));
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${SESSIONS_COLLECTION}/${id}`);
  }
}

// ================= CLASSES =================

export async function getClasses(schoolId: string): Promise<ClassItem[]> {
  try {
    const q = query(collection(db, CLASSES_COLLECTION), where('schoolId', '==', schoolId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ClassItem, 'id'>),
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, CLASSES_COLLECTION);
  }
}

export async function createClass(classItem: Omit<ClassItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClassItem> {
  try {
    const id = `class_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newRef = doc(db, CLASSES_COLLECTION, id);
    const payload: ClassItem = {
      ...classItem,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(newRef, cleanFirestoreData(payload));
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, CLASSES_COLLECTION);
  }
}

export async function updateClass(id: string, updates: Partial<ClassItem>): Promise<void> {
  try {
    const ref = doc(db, CLASSES_COLLECTION, id);
    await updateDoc(ref, cleanFirestoreData({
      ...updates,
      updatedAt: new Date().toISOString(),
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${CLASSES_COLLECTION}/${id}`);
  }
}

// ================= SECTIONS =================

export async function getSections(schoolId: string, classId?: string): Promise<SectionItem[]> {
  try {
    let q = query(collection(db, SECTIONS_COLLECTION), where('schoolId', '==', schoolId));
    if (classId) {
      q = query(collection(db, SECTIONS_COLLECTION), where('schoolId', '==', schoolId), where('classId', '==', classId));
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<SectionItem, 'id'>),
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, SECTIONS_COLLECTION);
  }
}

export async function createSection(section: Omit<SectionItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<SectionItem> {
  try {
    // Check for duplicate section name in same class and session
    const existing = await getSections(section.schoolId, section.classId);
    const isDup = existing.some(
      (s) => s.name.trim().toLowerCase() === section.name.trim().toLowerCase() && s.sessionId === section.sessionId && s.status === 'ACTIVE'
    );
    if (isDup) {
      throw new Error(`Section "${section.name}" already exists for this class.`);
    }

    const id = `section_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newRef = doc(db, SECTIONS_COLLECTION, id);
    const payload: SectionItem = {
      ...section,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(newRef, cleanFirestoreData(payload));
    return payload;
  } catch (err) {
    if (err instanceof Error && err.message.includes('already exists')) {
      throw err;
    }
    handleFirestoreError(err, OperationType.CREATE, SECTIONS_COLLECTION);
  }
}

export async function updateSection(id: string, updates: Partial<SectionItem>): Promise<void> {
  try {
    const ref = doc(db, SECTIONS_COLLECTION, id);
    await updateDoc(ref, cleanFirestoreData({
      ...updates,
      updatedAt: new Date().toISOString(),
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${SECTIONS_COLLECTION}/${id}`);
  }
}

// ================= SUBJECTS =================

export async function getSubjects(schoolId: string): Promise<SubjectItem[]> {
  try {
    const q = query(collection(db, SUBJECTS_COLLECTION), where('schoolId', '==', schoolId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<SubjectItem, 'id'>),
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, SUBJECTS_COLLECTION);
  }
}

export async function createSubject(subject: Omit<SubjectItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubjectItem> {
  try {
    const id = `subject_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newRef = doc(db, SUBJECTS_COLLECTION, id);
    const payload: SubjectItem = {
      ...subject,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(newRef, cleanFirestoreData(payload));
    return payload;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, SUBJECTS_COLLECTION);
  }
}

export async function updateSubject(id: string, updates: Partial<SubjectItem>): Promise<void> {
  try {
    const ref = doc(db, SUBJECTS_COLLECTION, id);
    await updateDoc(ref, cleanFirestoreData({
      ...updates,
      updatedAt: new Date().toISOString(),
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${SUBJECTS_COLLECTION}/${id}`);
  }
}

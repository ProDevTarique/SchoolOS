import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  limit,
  query,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, cleanFirestoreData } from './firebase';
import { School, SystemSettings } from '../types';

const SCHOOLS_COLLECTION = 'schools';
const SETTINGS_COLLECTION = 'settings';

export async function getFirstConfiguredSchool(): Promise<School | null> {
  try {
    const q = query(collection(db, SCHOOLS_COLLECTION), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) {
      return null;
    }
    const docData = snap.docs[0];
    const data = docData.data();
    if (!data.isConfigured) {
      return null;
    }
    const result = {
      id: docData.id,
      ...(data as Omit<School, 'id'>),
    };
    try {
      localStorage.setItem('schoolos_cached_school', JSON.stringify(result));
    } catch {}
    return result;
  } catch (err) {
    console.warn('Could not query schools collection directly:', err);
    try {
      const cached = localStorage.getItem('schoolos_cached_school');
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  }
}

export async function getSchoolById(schoolId: string): Promise<School | null> {
  try {
    const ref = doc(db, SCHOOLS_COLLECTION, schoolId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const result = {
      id: snap.id,
      ...(snap.data() as Omit<School, 'id'>),
    };
    try {
      localStorage.setItem('schoolos_cached_school', JSON.stringify(result));
    } catch {}
    return result;
  } catch (err) {
    console.warn('Could not fetch school by ID:', err);
    try {
      const cached = localStorage.getItem('schoolos_cached_school');
      if (cached) {
        const s = JSON.parse(cached);
        if (s.id === schoolId) return s;
      }
    } catch {}
    return null;
  }
}

export async function saveSchoolProfile(school: School): Promise<void> {
  try {
    const ref = doc(db, SCHOOLS_COLLECTION, school.id);
    const cleaned = cleanFirestoreData({
      ...school,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(ref, cleaned, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${SCHOOLS_COLLECTION}/${school.id}`);
  }
}

export async function updateSchool(schoolId: string, updates: Partial<School>): Promise<void> {
  try {
    const ref = doc(db, SCHOOLS_COLLECTION, schoolId);
    const cleaned = cleanFirestoreData({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    await updateDoc(ref, cleaned);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${SCHOOLS_COLLECTION}/${schoolId}`);
  }
}

export async function getSystemSettings(schoolId: string): Promise<SystemSettings | null> {
  try {
    const ref = doc(db, SETTINGS_COLLECTION, schoolId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return {
      id: snap.id,
      ...(snap.data() as Omit<SystemSettings, 'id'>),
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `${SETTINGS_COLLECTION}/${schoolId}`);
  }
}

export async function saveSystemSettings(settings: SystemSettings): Promise<void> {
  try {
    const ref = doc(db, SETTINGS_COLLECTION, settings.schoolId);
    const cleaned = cleanFirestoreData({
      ...settings,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(ref, cleaned, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${SETTINGS_COLLECTION}/${settings.schoolId}`);
  }
}

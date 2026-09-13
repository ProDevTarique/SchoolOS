import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, cleanFirestoreData } from './firebase';
import { UserProfile, Role } from '../types';
import { logAuditEvent } from './auditService';

const USERS_COLLECTION = 'users';

// Set session persistence
try {
  setPersistence(auth, browserLocalPersistence);
} catch (e) {
  console.warn('Could not set browserLocalPersistence:', e);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<UserProfile, 'id'>) };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `${USERS_COLLECTION}/${uid}`);
  }
}

export async function loginUser(email: string, pass: string): Promise<UserProfile> {
  const cleanEmail = email.trim().toLowerCase();
  const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
  const profile = await getUserProfile(userCredential.user.uid);

  if (!profile) {
    throw new Error('User profile record not found in system. Please contact your administrator.');
  }

  if (profile.status !== 'ACTIVE') {
    await logoutUser();
    throw new Error('Your user account is inactive. Please contact your school administrator.');
  }

  await updateDoc(doc(db, USERS_COLLECTION, userCredential.user.uid), {
    lastLoginAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return profile;
}

export async function registerAdminUser(params: {
  email: string;
  password: string;
  name: string;
  schoolId: string;
}): Promise<UserProfile> {
  const cleanEmail = params.email.trim().toLowerCase();
  const cred = await createUserWithEmailAndPassword(auth, cleanEmail, params.password);
  const uid = cred.user.uid;

  const newProfile: UserProfile = {
    id: uid,
    uid: uid,
    schoolId: params.schoolId,
    name: params.name.trim(),
    email: cleanEmail,
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  await setDoc(doc(db, USERS_COLLECTION, uid), cleanFirestoreData(newProfile));

  return newProfile;
}

export async function sendResetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function logoutUser(): Promise<void> {
  await fbSignOut(auth);
}

export async function getAllSchoolUsers(schoolId: string): Promise<UserProfile[]> {
  try {
    const q = query(collection(db, USERS_COLLECTION), where('schoolId', '==', schoolId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<UserProfile, 'id'>),
    }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, USERS_COLLECTION);
  }
}

export async function updateUserStatus(userId: string, status: 'ACTIVE' | 'INACTIVE'): Promise<void> {
  try {
    await updateDoc(doc(db, USERS_COLLECTION, userId), {
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${USERS_COLLECTION}/${userId}`);
  }
}

export async function updateUserRole(userId: string, role: Role): Promise<void> {
  try {
    await updateDoc(doc(db, USERS_COLLECTION, userId), {
      role,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${USERS_COLLECTION}/${userId}`);
  }
}

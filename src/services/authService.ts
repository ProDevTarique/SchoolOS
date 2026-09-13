import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
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

export function hashCredential(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'sh_' + Math.abs(hash).toString(36);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const p = {
        id: snap.id,
        ...(snap.data() as Omit<UserProfile, 'id'>),
      };
      try {
        localStorage.setItem('schoolos_cached_profile', JSON.stringify(p));
      } catch {}
      return p;
    }

    // Try finding by uid field if document ID differs
    const q = query(collection(db, USERS_COLLECTION), where('uid', '==', uid));
    const qSnap = await getDocs(q);
    if (!qSnap.empty) {
      const d = qSnap.docs[0];
      const p = {
        id: d.id,
        ...(d.data() as Omit<UserProfile, 'id'>),
      };
      try {
        localStorage.setItem('schoolos_cached_profile', JSON.stringify(p));
      } catch {}
      return p;
    }

    // Check cached profile
    try {
      const cached = localStorage.getItem('schoolos_cached_profile');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.id === uid || parsed.uid === uid) return parsed;
      }
    } catch {}

    return null;
  } catch (err) {
    console.warn('Could not fetch user profile from Firestore:', err);
    try {
      const cached = localStorage.getItem('schoolos_cached_profile');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.id === uid || parsed.uid === uid) return parsed;
      }
    } catch {}
    return null;
  }
}

export async function loginUser(email: string, pass: string): Promise<UserProfile> {
  const cleanEmail = email.trim().toLowerCase();
  const expectedHash = hashCredential(pass);
  let uid = '';
  let directAuthSuccess = false;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    uid = userCredential.user.uid;
    directAuthSuccess = true;
  } catch (authErr: any) {
    console.warn('Firebase Auth direct sign-in not completed:', authErr?.code || authErr?.message);

    // Fallback: Check institutional database records
    let userDoc: any = null;
    try {
      const q = query(
        collection(db, USERS_COLLECTION),
        where('email', '==', cleanEmail)
      );
      let snap = await getDocs(q);
      if (snap.empty) {
        // Try original casing fallback
        const qOriginal = query(
          collection(db, USERS_COLLECTION),
          where('email', '==', email.trim())
        );
        snap = await getDocs(qOriginal);
      }

      if (!snap.empty) {
        userDoc = snap.docs[0];
      }
    } catch (dbErr) {
      console.warn('Firestore user lookup error:', dbErr);
    }

    if (userDoc) {
      const userData = userDoc.data() as any;
      if (userData.passwordHash && userData.passwordHash !== expectedHash) {
        throw new Error('Invalid email or password. Please verify your credentials.');
      }

      uid = userDoc.id;

      // Attempt anonymous sign-in to grant a Firebase Auth session if possible
      try {
        await signInAnonymously(auth);
      } catch {
        // Non-blocking
      }

      const profile: UserProfile = {
        id: userDoc.id,
        uid: userDoc.id,
        schoolId: userData.schoolId,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        status: userData.status || 'ACTIVE',
        phone: userData.phone,
        avatarUrl: userData.avatarUrl,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
        lastLoginAt: new Date().toISOString(),
      };

      if (profile.status === 'INACTIVE') {
        await logoutUser();
        throw new Error('Your user account is inactive. Please contact your school administrator.');
      }

      try {
        localStorage.setItem('schoolos_session_uid', uid);
        localStorage.setItem('schoolos_cached_profile', JSON.stringify(profile));
      } catch {}

      // Update last login timestamp in Firestore non-blockingly
      updateDoc(doc(db, USERS_COLLECTION, uid), {
        lastLoginAt: new Date().toISOString(),
      }).catch(() => {});

      return profile;
    }

    // Check cached profile in case of complete offline / network restriction
    try {
      const cached = localStorage.getItem('schoolos_cached_profile');
      if (cached) {
        const parsed = JSON.parse(cached) as UserProfile & { passwordHash?: string };
        if (parsed?.email?.toLowerCase() === cleanEmail) {
          if (!parsed.passwordHash || parsed.passwordHash === expectedHash) {
            const sid = parsed.id || parsed.uid || 'admin_user';
            localStorage.setItem('schoolos_session_uid', sid);
            return parsed;
          }
        }
      }
    } catch {}

    throw new Error('Invalid email or password. Please verify your credentials.');
  }

  if (uid) {
    try {
      localStorage.setItem('schoolos_session_uid', uid);
    } catch {}
  }

  const profile = await getUserProfile(uid);

  if (!profile) {
    // If not found by uid directly, attempt search by email
    try {
      const q = query(collection(db, USERS_COLLECTION), where('email', '==', cleanEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        const p: UserProfile = {
          id: d.id,
          ...(d.data() as Omit<UserProfile, 'id'>),
        };
        try {
          localStorage.setItem('schoolos_cached_profile', JSON.stringify(p));
        } catch {}
        return p;
      }
    } catch {}

    throw new Error('User profile record not found in system. Please contact your administrator.');
  }

  if (profile.status === 'INACTIVE') {
    await logoutUser();
    throw new Error('Your user account is inactive. Please contact your school administrator.');
  }

  try {
    localStorage.setItem('schoolos_cached_profile', JSON.stringify(profile));
    await updateDoc(doc(db, USERS_COLLECTION, uid), {
      lastLoginAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // Non-blocking
  }

  return profile;
}

export async function registerAdminUser(params: {
  email: string;
  password: string;
  name: string;
  schoolId: string;
}): Promise<UserProfile> {
  const cleanEmail = params.email.trim().toLowerCase();
  let uid = '';

  try {
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, params.password);
    uid = cred.user.uid;
  } catch (err: any) {
    console.warn('Firebase Auth createUser fallback:', err?.code, err?.message);
    if (err?.code === 'auth/email-already-in-use') {
      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, params.password);
        uid = cred.user.uid;
      } catch {
        const q = query(collection(db, USERS_COLLECTION), where('email', '==', cleanEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          uid = snap.docs[0].id;
        } else {
          uid = `admin_${Date.now()}`;
        }
      }
    } else {
      // Any other error (network-request-failed, operation-not-allowed, configuration-not-found, etc.)
      try {
        const anonCred = await signInAnonymously(auth);
        uid = anonCred.user.uid;
      } catch {
        uid = `admin_${Date.now()}`;
      }
    }
  }

  if (uid) {
    try {
      localStorage.setItem('schoolos_session_uid', uid);
    } catch {}
  }

  const newProfile: UserProfile & { passwordHash?: string } = {
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
    passwordHash: hashCredential(params.password),
  };

  try {
    localStorage.setItem('schoolos_cached_profile', JSON.stringify(newProfile));
  } catch {}

  try {
    await setDoc(doc(db, USERS_COLLECTION, uid), cleanFirestoreData(newProfile));
  } catch (err) {
    console.warn('Could not setDoc for user in Firestore immediately:', err);
  }

  return newProfile;
}

export async function sendResetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function logoutUser(): Promise<void> {
  try {
    localStorage.removeItem('schoolos_session_uid');
    localStorage.removeItem('schoolos_cached_profile');
  } catch {}
  try {
    await fbSignOut(auth);
  } catch {}
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

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getUserProfile, logoutUser } from '../services/authService';
import { getFirstConfiguredSchool, getSchoolById } from '../services/schoolService';
import { UserProfile, School, Permission, ROLE_PERMISSIONS } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  profile: UserProfile | null;
  school: School | null;
  loading: boolean;
  schoolLoading: boolean;
  hasPermission: (permission: Permission) => boolean;
  logout: () => Promise<void>;
  reloadSchool: () => Promise<void>;
  reloadProfile: () => Promise<void>;
  setManualSchool: (school: School | null) => void;
  setManualProfile: (profile: UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const cached = localStorage.getItem('schoolos_cached_profile');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [school, setSchool] = useState<School | null>(() => {
    try {
      const cached = localStorage.getItem('schoolos_cached_school');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [schoolLoading, setSchoolLoading] = useState(!Boolean(localStorage.getItem('schoolos_cached_school')));

  // Load active school
  const loadSchool = async () => {
    try {
      setSchoolLoading(true);
      const activeSchool = await getFirstConfiguredSchool();
      if (activeSchool) {
        setSchool(activeSchool);
        try {
          localStorage.setItem('schoolos_cached_school', JSON.stringify(activeSchool));
        } catch {}
      }
    } catch (err) {
      console.error('Failed to load school profile:', err);
    } finally {
      setSchoolLoading(false);
    }
  };

  useEffect(() => {
    loadSchool();
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setCurrentUser(fbUser);
      const savedLocalUid = localStorage.getItem('schoolos_session_uid');
      const targetUid = fbUser ? fbUser.uid : savedLocalUid;

      if (targetUid) {
        try {
          const userProf = await getUserProfile(targetUid);
          if (userProf) {
            setProfile(userProf);
            if (userProf?.schoolId && (!school || school.id !== userProf.schoolId)) {
              const sch = await getSchoolById(userProf.schoolId);
              if (sch) setSchool(sch);
            }
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
      } else {
        const cached = localStorage.getItem('schoolos_cached_profile');
        if (!cached) {
          setProfile(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const hasPermission = (permission: Permission): boolean => {
    if (!profile) return false;
    if (profile.role === 'SUPER_ADMIN' || profile.role === 'ADMIN') return true;
    const allowed = ROLE_PERMISSIONS[profile.role] || [];
    return allowed.includes(permission);
  };

  const handleLogout = async () => {
    await logoutUser();
    setProfile(null);
    setCurrentUser(null);
    try {
      localStorage.removeItem('schoolos_session_uid');
      localStorage.removeItem('schoolos_cached_profile');
    } catch {}
  };

  const reloadSchool = async () => {
    await loadSchool();
  };

  const reloadProfile = async () => {
    const savedLocalUid = localStorage.getItem('schoolos_session_uid');
    const targetUid = auth.currentUser?.uid || savedLocalUid;
    if (targetUid) {
      const p = await getUserProfile(targetUid);
      if (p) setProfile(p);
    }
  };

  const setManualSchool = (s: School | null) => {
    setSchool(s);
    try {
      if (s) {
        localStorage.setItem('schoolos_cached_school', JSON.stringify(s));
      } else {
        localStorage.removeItem('schoolos_cached_school');
      }
    } catch {}
  };

  const setManualProfile = (p: UserProfile | null) => {
    setProfile(p);
    try {
      if (p) {
        localStorage.setItem('schoolos_cached_profile', JSON.stringify(p));
        localStorage.setItem('schoolos_session_uid', p.id || p.uid);
      } else {
        localStorage.removeItem('schoolos_cached_profile');
        localStorage.removeItem('schoolos_session_uid');
      }
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        school,
        loading,
        schoolLoading,
        hasPermission,
        logout: handleLogout,
        reloadSchool,
        reloadProfile,
        setManualSchool,
        setManualProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

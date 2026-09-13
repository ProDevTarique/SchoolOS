import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getUserProfile, logoutUser } from '../services/authService';
import { getSchoolById } from '../services/schoolService';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [schoolLoading, setSchoolLoading] = useState(true);

  // Load active school
  const loadSchool = async () => {
    try {
      setSchoolLoading(true);
      if (!auth.currentUser) {
        setSchool(null);
        return;
      }
      const userProf = await getUserProfile(auth.currentUser.uid);
      if (userProf?.schoolId) {
        setSchool(await getSchoolById(userProf.schoolId));
      }
    } catch (err) {
      console.error('Failed to load school profile:', err);
    } finally {
      setSchoolLoading(false);
    }
  };

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setCurrentUser(fbUser);
      if (fbUser) {
        try {
          const userProf = await getUserProfile(fbUser.uid);
          if (userProf && userProf.status === 'ACTIVE') {
            setProfile(userProf);
            if (userProf.schoolId) {
              const sch = await getSchoolById(userProf.schoolId);
              if (sch) setSchool(sch);
            }
          } else {
            setProfile(null);
            setSchool(null);
            if (userProf) {
              await logoutUser();
            }
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
          setProfile(null);
          setSchool(null);
        }
      } else {
        setProfile(null);
        setSchool(null);
      }
      setSchoolLoading(false);
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
    setSchool(null);
  };

  const reloadSchool = async () => {
    await loadSchool();
  };

  const reloadProfile = async () => {
    if (auth.currentUser) {
      const p = await getUserProfile(auth.currentUser.uid);
      if (p && p.status === 'ACTIVE') {
        setProfile(p);
        if (p.schoolId) setSchool(await getSchoolById(p.schoolId));
      }
    }
  };

  const setManualSchool = (s: School | null) => {
    setSchool(s);
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

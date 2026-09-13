import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getUserProfile, logoutUser } from '../services/authService';
import { getSchoolById } from '../services/schoolService';
import { UserProfile, School, Permission, ROLE_PERMISSIONS, SchoolSubscription, SubscriptionEntitlement } from '../types';
import { evaluateSubscription, getSchoolSubscription } from '../services/subscriptionService';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  profile: UserProfile | null;
  school: School | null;
  loading: boolean;
  schoolLoading: boolean;
  subscription: SchoolSubscription | null;
  subscriptionLoading: boolean;
  entitlement: SubscriptionEntitlement;
  hasPermission: (permission: Permission) => boolean;
  logout: () => Promise<void>;
  reloadSchool: () => Promise<void>;
  reloadProfile: () => Promise<void>;
  reloadSubscription: () => Promise<void>;
  setManualSchool: (school: School | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [schoolLoading, setSchoolLoading] = useState(true);
  const [subscription, setSubscription] = useState<SchoolSubscription | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [entitlement, setEntitlement] = useState<SubscriptionEntitlement>({
    state: 'LOADING',
    reason: 'Loading subscription entitlement.',
  });

  const loadSubscription = async (schoolId: string | undefined) => {
    setSubscriptionLoading(true);
    setEntitlement({ state: 'LOADING', reason: 'Loading subscription entitlement.' });
    if (!schoolId) {
      setSubscription(null);
      setEntitlement({ state: 'MISSING_CONFIGURATION', reason: 'No school is associated with this account.' });
      setSubscriptionLoading(false);
      return;
    }
    try {
      const currentSubscription = await getSchoolSubscription(schoolId);
      setSubscription(currentSubscription);
      setEntitlement(evaluateSubscription(currentSubscription));
    } catch (err) {
      console.error('Failed to load subscription entitlement:', err);
      setSubscription(null);
      setEntitlement({ state: 'ERROR', reason: 'Subscription status could not be verified.' });
    } finally {
      setSubscriptionLoading(false);
    }
  };

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
            await loadSubscription(userProf.schoolId);
          } else {
            setProfile(null);
            setSchool(null);
            await loadSubscription(undefined);
            if (userProf) {
              await logoutUser();
            }
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
          setProfile(null);
          setSchool(null);
          await loadSubscription(undefined);
        }
      } else {
        setProfile(null);
        setSchool(null);
        await loadSubscription(undefined);
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
    setSubscription(null);
    setEntitlement({ state: 'MISSING_CONFIGURATION', reason: 'No school is associated with this account.' });
  };

  const reloadSchool = async () => {
    await loadSchool();
  };

  const reloadProfile = async () => {
    if (auth.currentUser) {
      const p = await getUserProfile(auth.currentUser.uid);
      if (p && p.status === 'ACTIVE') {
        setProfile(p);
        if (p.schoolId) {
          setSchool(await getSchoolById(p.schoolId));
          await loadSubscription(p.schoolId);
        }
      }
    }
  };

  const reloadSubscription = async () => {
    await loadSubscription(profile?.schoolId);
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
        subscription,
        subscriptionLoading,
        entitlement,
        hasPermission,
        logout: handleLogout,
        reloadSchool,
        reloadProfile,
        reloadSubscription,
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

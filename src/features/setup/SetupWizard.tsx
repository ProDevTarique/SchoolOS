import React, { useState } from 'react';
import {
  GraduationCap,
  Building2,
  UserCheck,
  Layers,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { School, AcademicSession, ClassItem, SectionItem, SubjectItem } from '../../types';
import { saveSchoolProfile, saveSystemSettings } from '../../services/schoolService';
import { registerAdminUser } from '../../services/authService';
import {
  createAcademicSession,
  createClass,
  createSection,
  createSubject,
} from '../../services/academicService';
import { loadDemoSchoolData } from '../../services/demoData';
import { useAuth } from '../../hooks/useAuth';

interface SetupWizardProps {
  onSetupComplete: () => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onSetupComplete }) => {
  const { setManualSchool, setManualProfile } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 1: School Info
  const [schoolName, setSchoolName] = useState('Delhi Public School');
  const [schoolLogo, setSchoolLogo] = useState('');
  const [address, setAddress] = useState('Sector 4, RK Puram');
  const [city, setCity] = useState('New Delhi');
  const [state, setState] = useState('Delhi');
  const [pinCode, setPinCode] = useState('110022');
  const [phone, setPhone] = useState('+91 11 2617 0000');
  const [email, setEmail] = useState('admin@schoolos.demo');
  const [website, setWebsite] = useState('https://dps.schoolos.edu');
  const [principalName, setPrincipalName] = useState('Dr. S. K. Sharma');
  const [schoolMotto, setSchoolMotto] = useState('Service Before Self');
  const [academicSession, setAcademicSession] = useState('2025-26');

  // Step 2: Administrator
  const [adminName, setAdminName] = useState('System Administrator');
  const [adminEmail, setAdminEmail] = useState('admin@schoolos.demo');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 3: Academic Structure
  const [classesList, setClassesList] = useState<string[]>([
    'Class 9',
    'Class 10',
    'Class 11',
    'Class 12',
  ]);
  const [newClassName, setNewClassName] = useState('');

  const [sectionsList, setSectionsList] = useState<string[]>(['A', 'B']);
  const [newSectionName, setNewSectionName] = useState('');

  const [subjectsList, setSubjectsList] = useState<string[]>([
    'English',
    'Mathematics',
    'Science',
    'Social Science',
    'Hindi',
  ]);
  const [newSubjectName, setNewSubjectName] = useState('');

  const [loadDemo, setLoadDemo] = useState(false);

  // Validation for Step 1
  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!schoolName.trim() || !email.trim() || !phone.trim() || !academicSession.trim()) {
      setErrorMessage('Please fill in all required fields (School Name, Email, Phone, Academic Session).');
      return;
    }
    setStep(2);
  };

  // Validation for Step 2
  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!adminName.trim() || !adminEmail.trim()) {
      setErrorMessage('Admin name and email are required.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter an administrator password.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    setStep(3);
  };

  // Execution on Step 3
  const handleCompleteSetup = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const schoolId = `school_${Date.now()}`;
      const now = new Date().toISOString();

      // 1. Register Admin User first to authenticate the session
      const adminProfile = await registerAdminUser({
        email: adminEmail.trim(),
        password: password,
        name: adminName.trim(),
        schoolId,
      });

      // 2. Create School record without any undefined fields
      const schoolData: School = {
        id: schoolId,
        name: schoolName.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pinCode: pinCode.trim(),
        phone: phone.trim(),
        email: email.trim(),
        principalName: principalName.trim(),
        isConfigured: true,
        createdAt: now,
        updatedAt: now,
      };
      if (schoolLogo.trim()) schoolData.logoUrl = schoolLogo.trim();
      if (website.trim()) schoolData.website = website.trim();
      if (schoolMotto.trim()) schoolData.schoolMotto = schoolMotto.trim();

      await saveSchoolProfile(schoolData);

      // 3. Initialize default system settings
      await saveSystemSettings({
        id: schoolId,
        schoolId,
        academicYear: academicSession.trim(),
        dateFormat: 'DD/MM/YYYY',
        timezone: 'Asia/Kolkata',
        currency: '₹',
        enableDemoMode: true,
        updatedAt: now,
      });

      if (loadDemo) {
        // Load comprehensive demo data
        await loadDemoSchoolData(schoolId, adminProfile.uid, adminProfile.name);
      } else {
        // 4. Create primary academic session
        const session = await createAcademicSession({
          schoolId,
          name: academicSession.trim(),
          isActive: true,
          isArchived: false,
        });

        // Update school with session ID
        await saveSchoolProfile({
          ...schoolData,
          currentSessionId: session.id,
        });

        // 5. Create classes and sections
        for (let i = 0; i < classesList.length; i++) {
          const cName = classesList[i];
          const newClass = await createClass({
            schoolId,
            name: cName,
            code: `C${i + 1}`,
            sessionId: session.id,
            capacity: 40,
            status: 'ACTIVE',
          });

          // Create sections for this class
          for (const sName of sectionsList) {
            await createSection({
              schoolId,
              classId: newClass.id,
              name: sName,
              sessionId: session.id,
              capacity: 35,
              status: 'ACTIVE',
            });
          }
        }

        // 6. Create subjects
        for (let i = 0; i < subjectsList.length; i++) {
          const subName = subjectsList[i];
          await createSubject({
            schoolId,
            name: subName,
            code: `SUB-${101 + i}`,
            type: 'CORE',
            maxMarks: 100,
            passMarks: 33,
            isPractical: subName.toLowerCase().includes('science'),
            assignedClassIds: [],
            status: 'ACTIVE',
          });
        }
      }

      setManualSchool(schoolData);
      setManualProfile(adminProfile);
      setStep(4);
    } catch (err: any) {
      console.error('Setup failed:', err);
      setErrorMessage(err?.message || 'Failed to complete initial school configuration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              SchoolOS
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              School Management &amp; Administration System
            </p>
          </div>
        </div>

        {/* Stepper Header */}
        <div className="bg-white dark:bg-slate-900 shadow-sm rounded-xl p-4 mb-6 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step >= 1
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
              >
                1
              </div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 hidden sm:inline">
                School Info
              </span>
            </div>
            <div className="h-0.5 w-8 bg-slate-200 dark:bg-slate-800" />
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step >= 2
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
              >
                2
              </div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 hidden sm:inline">
                Administrator
              </span>
            </div>
            <div className="h-0.5 w-8 bg-slate-200 dark:bg-slate-800" />
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step >= 3
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
              >
                3
              </div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 hidden sm:inline">
                Academics
              </span>
            </div>
            <div className="h-0.5 w-8 bg-slate-200 dark:bg-slate-800" />
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step >= 4
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
              >
                4
              </div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 hidden sm:inline">
                Ready
              </span>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            id="setup-error-alert"
            className="mb-4 p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Card Body */}
        <div className="bg-white dark:bg-slate-900 shadow-sm rounded-xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800">
          {/* STEP 1: School Information */}
          {step === 1 && (
            <form onSubmit={handleNextStep1} className="space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  Step 1: Institutional Information
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter your school's official details for institutional headers, ID cards, and reports.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    School Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="e.g. St. Xavier Senior Secondary School"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Official Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@school.edu"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 11 2617 0000"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Principal / Head Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={principalName}
                    onChange={(e) => setPrincipalName(e.target.value)}
                    placeholder="Dr. S. K. Sharma"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Academic Session *
                  </label>
                  <input
                    type="text"
                    required
                    value={academicSession}
                    onChange={(e) => setAcademicSession(e.target.value)}
                    placeholder="2025-26"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Campus Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Campus Street / Road"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="State / Province"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    PIN / Postal Code
                  </label>
                  <input
                    type="text"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    placeholder="110022"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://school.edu"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    School Motto
                  </label>
                  <input
                    type="text"
                    value={schoolMotto}
                    onChange={(e) => setSchoolMotto(e.target.value)}
                    placeholder="e.g. Service Before Self / Knowledge is Light"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    School Logo (Image URL)
                  </label>
                  <input
                    type="text"
                    value={schoolLogo}
                    onChange={(e) => setSchoolLogo(e.target.value)}
                    placeholder="https://example.com/logo.png (leave blank for standard crest)"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  id="btn-step1-next"
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-xs"
                >
                  <span>Continue to Admin Setup</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Administrator */}
          {step === 2 && (
            <form onSubmit={handleNextStep2} className="space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-600" />
                  Step 2: First Administrator Account
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Create the super-admin master account. Passwords are encrypted securely by Firebase Authentication.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Administrator Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Administrator Name"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Admin Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@schoolos.demo"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  id="btn-step2-next"
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-xs"
                >
                  <span>Continue to Academics</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Academic Structure */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  Step 3: Academic Structure Initialization
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure the initial classes, sections, and subjects for the {academicSession} session.
                </p>
              </div>

              {/* Demo Data Option */}
              <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                    Optional: Seed Realistic Demo Data
                  </div>
                  <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">
                    Pre-populate Classes (Class 9, 10, 11), Sections (A, B), 20 sample students, 5 teachers, and 3 staff members.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={loadDemo}
                    onChange={(e) => setLoadDemo(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {!loadDemo && (
                <div className="space-y-5">
                  {/* Classes */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Classes
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {classesList.map((c, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        >
                          {c}
                          <button
                            type="button"
                            onClick={() => setClassesList(classesList.filter((_, idx) => idx !== i))}
                            className="text-slate-400 hover:text-rose-500"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add another class (e.g. Class 8)"
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newClassName.trim()) {
                            setClassesList([...classesList, newClassName.trim()]);
                            setNewClassName('');
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-white dark:bg-slate-700 text-xs font-medium flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Sections */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Default Sections per Class
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {sectionsList.map((s, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        >
                          Section {s}
                          <button
                            type="button"
                            onClick={() => setSectionsList(sectionsList.filter((_, idx) => idx !== i))}
                            className="text-slate-400 hover:text-rose-500"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add section (e.g. C)"
                        value={newSectionName}
                        onChange={(e) => setNewSectionName(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newSectionName.trim()) {
                            setSectionsList([...sectionsList, newSectionName.trim().toUpperCase()]);
                            setNewSectionName('');
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-white dark:bg-slate-700 text-xs font-medium flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Subjects */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Core Subjects
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {subjectsList.map((sub, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        >
                          {sub}
                          <button
                            type="button"
                            onClick={() => setSubjectsList(subjectsList.filter((_, idx) => idx !== i))}
                            className="text-slate-400 hover:text-rose-500"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add subject (e.g. Computer Science)"
                        value={newSubjectName}
                        onChange={(e) => setNewSubjectName(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newSubjectName.trim()) {
                            setSubjectsList([...subjectsList, newSubjectName.trim()]);
                            setNewSubjectName('');
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-white dark:bg-slate-700 text-xs font-medium flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  id="btn-complete-setup"
                  type="button"
                  disabled={loading}
                  onClick={handleCompleteSetup}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-xs disabled:opacity-50"
                >
                  {loading ? (
                    <span>Configuring SchoolOS...</span>
                  ) : (
                    <>
                      <span>Complete School Setup</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Finish */}
          {step === 4 && (
            <div id="setup-step4-finish" className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Your school is ready.
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                {schoolName} has been initialized with administrator credentials, academic structures, and persistent database collections.
              </p>
              <div className="pt-4">
                <button
                  id="btn-open-dashboard"
                  onClick={onSetupComplete}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors shadow-md"
                >
                  <span>Open School Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

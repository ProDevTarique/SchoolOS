import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, AlertCircle, Sparkles } from 'lucide-react';
import { Student, ClassItem, SectionItem, AcademicSession, StudentStatus } from '../../types';
import { createStudent, updateStudent, isAdmissionNumberUnique } from '../../services/studentService';
import { logAuditEvent } from '../../services/auditService';
import { useAuth } from '../../hooks/useAuth';

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentToEdit?: Student | null;
  classes: ClassItem[];
  sections: SectionItem[];
  sessions: AcademicSession[];
  onSaveSuccess: () => void;
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  isOpen,
  onClose,
  studentToEdit,
  classes,
  sections,
  sessions,
  onSaveSuccess,
}) => {
  const { school, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('2010-01-01');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [sessionId, setSessionId] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<StudentStatus>('ACTIVE');

  // Parents
  const [fatherName, setFatherName] = useState('');
  const [fatherPhone, setFatherPhone] = useState('');
  const [fatherOccupation, setFatherOccupation] = useState('');
  const [motherName, setMotherName] = useState('');
  const [motherPhone, setMotherPhone] = useState('');
  const [motherOccupation, setMotherOccupation] = useState('');
  const [parentEmail, setParentEmail] = useState('');

  // Guardian
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianRelation, setGuardianRelation] = useState('');

  // Address
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pinCode, setPinCode] = useState('');

  // Emergency & Medical
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [previousSchool, setPreviousSchool] = useState('');

  useEffect(() => {
    if (studentToEdit) {
      setAdmissionNumber(studentToEdit.admissionNumber);
      setRollNumber(studentToEdit.rollNumber || '');
      setFullName(studentToEdit.fullName);
      setPhotoUrl(studentToEdit.photoUrl || '');
      setDateOfBirth(studentToEdit.dateOfBirth);
      setGender(studentToEdit.gender);
      setBloodGroup(studentToEdit.bloodGroup || 'O+');
      setSessionId(studentToEdit.sessionId);
      setClassId(studentToEdit.classId);
      setSectionId(studentToEdit.sectionId);
      setAdmissionDate(studentToEdit.admissionDate);
      setStatus(studentToEdit.status);

      setFatherName(studentToEdit.fatherName || '');
      setFatherPhone(studentToEdit.fatherPhone || '');
      setFatherOccupation(studentToEdit.fatherOccupation || '');
      setMotherName(studentToEdit.motherName || '');
      setMotherPhone(studentToEdit.motherPhone || '');
      setMotherOccupation(studentToEdit.motherOccupation || '');
      setParentEmail(studentToEdit.parentEmail || '');

      setGuardianName(studentToEdit.guardianName || '');
      setGuardianPhone(studentToEdit.guardianPhone || '');
      setGuardianRelation(studentToEdit.guardianRelation || '');

      setAddress(studentToEdit.address || '');
      setCity(studentToEdit.city || '');
      setState(studentToEdit.state || '');
      setPinCode(studentToEdit.pinCode || '');

      setEmergencyName(studentToEdit.emergencyName || '');
      setEmergencyRelation(studentToEdit.emergencyRelation || '');
      setEmergencyPhone(studentToEdit.emergencyPhone || '');
      setMedicalNotes(studentToEdit.medicalNotes || '');
      setPreviousSchool(studentToEdit.previousSchool || '');
    } else {
      // Auto-generate fresh admission number
      setAdmissionNumber(`ADM-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
      setRollNumber('');
      setFullName('');
      setPhotoUrl('');
      setDateOfBirth('2010-01-01');
      setGender('MALE');
      setBloodGroup('O+');
      setSessionId(school?.currentSessionId || sessions.find((s) => s.isActive)?.id || '');
      setClassId(classes[0]?.id || '');
      setSectionId(sections.find((s) => s.classId === classes[0]?.id)?.id || '');
      setAdmissionDate(new Date().toISOString().split('T')[0]);
      setStatus('ACTIVE');

      setFatherName('');
      setFatherPhone('');
      setFatherOccupation('');
      setMotherName('');
      setMotherPhone('');
      setMotherOccupation('');
      setParentEmail('');

      setGuardianName('');
      setGuardianPhone('');
      setGuardianRelation('');

      setAddress('');
      setCity(school?.city || '');
      setState(school?.state || '');
      setPinCode(school?.pinCode || '');

      setEmergencyName('');
      setEmergencyRelation('');
      setEmergencyPhone('');
      setMedicalNotes('');
      setPreviousSchool('');
    }
  }, [studentToEdit, isOpen]);

  if (!isOpen) return null;

  const filteredSections = sections.filter((s) => s.classId === classId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !profile) return;
    setError(null);

    if (!admissionNumber.trim() || !fullName.trim() || !classId) {
      setError('Admission number, Student name, and Class are required fields.');
      return;
    }

    setLoading(true);
    try {
      if (studentToEdit) {
        await updateStudent(studentToEdit.id, {
          admissionNumber: admissionNumber.trim(),
          rollNumber: rollNumber.trim() || undefined,
          fullName: fullName.trim(),
          photoUrl: photoUrl.trim() || undefined,
          dateOfBirth,
          gender,
          bloodGroup,
          sessionId,
          classId,
          sectionId: sectionId || filteredSections[0]?.id || '',
          admissionDate,
          status,
          fatherName: fatherName.trim() || undefined,
          fatherPhone: fatherPhone.trim() || undefined,
          fatherOccupation: fatherOccupation.trim() || undefined,
          motherName: motherName.trim() || undefined,
          motherPhone: motherPhone.trim() || undefined,
          motherOccupation: motherOccupation.trim() || undefined,
          parentEmail: parentEmail.trim() || undefined,
          guardianName: guardianName.trim() || undefined,
          guardianPhone: guardianPhone.trim() || undefined,
          guardianRelation: guardianRelation.trim() || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          pinCode: pinCode.trim() || undefined,
          emergencyName: emergencyName.trim() || undefined,
          emergencyRelation: emergencyRelation.trim() || undefined,
          emergencyPhone: emergencyPhone.trim() || undefined,
          medicalNotes: medicalNotes.trim() || undefined,
          previousSchool: previousSchool.trim() || undefined,
        });

        await logAuditEvent({
          schoolId: school.id,
          userId: profile.uid,
          userName: profile.name,
          userRole: profile.role,
          action: 'STUDENT_UPDATED',
          module: 'Students',
          description: `Updated student record for "${fullName}" (${admissionNumber}).`,
        });
      } else {
        const newStudent = await createStudent({
          schoolId: school.id,
          admissionNumber: admissionNumber.trim(),
          rollNumber: rollNumber.trim() || undefined,
          fullName: fullName.trim(),
          photoUrl: photoUrl.trim() || undefined,
          dateOfBirth,
          gender,
          bloodGroup,
          sessionId,
          classId,
          sectionId: sectionId || filteredSections[0]?.id || '',
          admissionDate,
          status,
          fatherName: fatherName.trim() || undefined,
          fatherPhone: fatherPhone.trim() || undefined,
          fatherOccupation: fatherOccupation.trim() || undefined,
          motherName: motherName.trim() || undefined,
          motherPhone: motherPhone.trim() || undefined,
          motherOccupation: motherOccupation.trim() || undefined,
          parentEmail: parentEmail.trim() || undefined,
          guardianName: guardianName.trim() || undefined,
          guardianPhone: guardianPhone.trim() || undefined,
          guardianRelation: guardianRelation.trim() || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          pinCode: pinCode.trim() || undefined,
          emergencyName: emergencyName.trim() || undefined,
          emergencyRelation: emergencyRelation.trim() || undefined,
          emergencyPhone: emergencyPhone.trim() || undefined,
          medicalNotes: medicalNotes.trim() || undefined,
          previousSchool: previousSchool.trim() || undefined,
        });

        await logAuditEvent({
          schoolId: school.id,
          userId: profile.uid,
          userName: profile.name,
          userRole: profile.role,
          action: 'STUDENT_CREATED',
          module: 'Students',
          description: `Enrolled new student "${newStudent.fullName}" with admission no ${newStudent.admissionNumber}.`,
        });
      }

      onSaveSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save student record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-3xl w-full p-6 sm:p-8 my-8 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <UserPlus className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {studentToEdit ? 'Edit Student Record' : 'Student Admission Form'}
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          Complete official profile registration. All student records are securely stored in the institutional database.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Academic Placement */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              1. Institutional &amp; Academic Placement
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Admission Number *
                </label>
                <input
                  type="text"
                  required
                  value={admissionNumber}
                  onChange={(e) => setAdmissionNumber(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Class *
                </label>
                <select
                  required
                  value={classId}
                  onChange={(e) => {
                    setClassId(e.target.value);
                    const firstSec = sections.find((s) => s.classId === e.target.value);
                    setSectionId(firstSec?.id || '');
                  }}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Section
                </label>
                <select
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {filteredSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      Section {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Roll Number
                </label>
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="e.g. 15"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Admission Date
                </label>
                <input
                  type="date"
                  value={admissionDate}
                  onChange={(e) => setAdmissionDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StudentStatus)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="TRANSFERRED">TRANSFERRED</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="GRADUATED">GRADUATED</option>
                  <option value="EXPELLED">EXPELLED</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Personal Details */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              2. Student Personal Information
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Student's Legal Full Name"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="MALE">MALE</option>
                  <option value="FEMALE">FEMALE</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Blood Group
                </label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Photo URL
                </label>
                <input
                  type="url"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://... photo link"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Parent & Family Details */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              3. Parent &amp; Guardian Details
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Father&apos;s Name
                </label>
                <input
                  type="text"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  placeholder="Father's Name"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Father&apos;s Phone
                </label>
                <input
                  type="tel"
                  value={fatherPhone}
                  onChange={(e) => setFatherPhone(e.target.value)}
                  placeholder="+91..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Father&apos;s Occupation
                </label>
                <input
                  type="text"
                  value={fatherOccupation}
                  onChange={(e) => setFatherOccupation(e.target.value)}
                  placeholder="e.g. Engineer"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mother&apos;s Name
                </label>
                <input
                  type="text"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
                  placeholder="Mother's Name"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mother&apos;s Phone
                </label>
                <input
                  type="tel"
                  value={motherPhone}
                  onChange={(e) => setMotherPhone(e.target.value)}
                  placeholder="+91..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Parent Email
                </label>
                <input
                  type="email"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  placeholder="parent@email.com"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Address, Emergency & Medical */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              4. Address, Emergency Contact &amp; Medical
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-4">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Residential Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street / House details"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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
                  placeholder="State"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  PIN Code
                </label>
                <input
                  type="text"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  placeholder="PIN"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Emergency Contact Name &amp; Relation
                </label>
                <input
                  type="text"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  placeholder="e.g. Rajesh Sharma (Father)"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Emergency Phone Number
                </label>
                <input
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="+91..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Medical Notes &amp; Allergies
                </label>
                <input
                  type="text"
                  value={medicalNotes}
                  onChange={(e) => setMedicalNotes(e.target.value)}
                  placeholder="Any known chronic allergies or medications"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Modal Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{loading ? 'Saving...' : studentToEdit ? 'Update Student' : 'Enroll Student'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

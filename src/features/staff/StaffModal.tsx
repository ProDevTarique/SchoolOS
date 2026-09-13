import React, { useState, useEffect } from 'react';
import { X, Briefcase, Save, AlertCircle } from 'lucide-react';
import { StaffMember, StaffCategory, EmploymentStatus, ClassItem, SubjectItem } from '../../types';
import { createStaffMember, updateStaffMember } from '../../services/staffService';
import { logAuditEvent } from '../../services/auditService';
import { useAuth } from '../../hooks/useAuth';

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffToEdit?: StaffMember | null;
  classes: ClassItem[];
  subjects: SubjectItem[];
  onSaveSuccess: () => void;
}

export const StaffModal: React.FC<StaffModalProps> = ({
  isOpen,
  onClose,
  staffToEdit,
  classes,
  subjects,
  onSaveSuccess,
}) => {
  const { school, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [dateOfBirth, setDateOfBirth] = useState('1985-01-01');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [category, setCategory] = useState<StaffCategory>('Teacher');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [qualification, setQualification] = useState('');
  const [basicSalary, setBasicSalary] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>('ACTIVE');

  const [assignedClassIds, setAssignedClassIds] = useState<string[]>([]);
  const [assignedSubjectIds, setAssignedSubjectIds] = useState<string[]>([]);

  useEffect(() => {
    if (staffToEdit) {
      setEmployeeId(staffToEdit.employeeId);
      setName(staffToEdit.name);
      setPhotoUrl(staffToEdit.photoUrl || '');
      setGender(staffToEdit.gender || 'MALE');
      setDateOfBirth(staffToEdit.dateOfBirth || '1985-01-01');
      setPhone(staffToEdit.phone);
      setEmail(staffToEdit.email || '');
      setDesignation(staffToEdit.designation);
      setDepartment(staffToEdit.department || '');
      setCategory(staffToEdit.category);
      setJoiningDate(staffToEdit.joiningDate);
      setQualification(staffToEdit.qualification || '');
      setBasicSalary(staffToEdit.basicSalary ? staffToEdit.basicSalary.toString() : '');
      setEmploymentStatus(staffToEdit.employmentStatus);
      setAssignedClassIds(staffToEdit.assignedClassIds || []);
      setAssignedSubjectIds(staffToEdit.assignedSubjectIds || []);
    } else {
      setEmployeeId(`EMP-${Math.floor(100 + Math.random() * 900)}`);
      setName('');
      setPhotoUrl('');
      setGender('MALE');
      setDateOfBirth('1985-01-01');
      setPhone('');
      setEmail('');
      setDesignation('Teacher');
      setDepartment('Academics');
      setCategory('Teacher');
      setJoiningDate(new Date().toISOString().split('T')[0]);
      setQualification('B.Ed, M.Sc');
      setBasicSalary('');
      setEmploymentStatus('ACTIVE');
      setAssignedClassIds([]);
      setAssignedSubjectIds([]);
    }
  }, [staffToEdit, isOpen]);

  if (!isOpen) return null;

  const handleToggleClass = (cid: string) => {
    setAssignedClassIds((prev) =>
      prev.includes(cid) ? prev.filter((id) => id !== cid) : [...prev, cid]
    );
  };

  const handleToggleSubject = (sid: string) => {
    setAssignedSubjectIds((prev) =>
      prev.includes(sid) ? prev.filter((id) => id !== sid) : [...prev, sid]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !profile) return;
    setError(null);

    if (!employeeId.trim() || !name.trim() || !phone.trim() || !designation.trim()) {
      setError('Employee ID, Name, Phone, and Designation are required.');
      return;
    }

    setLoading(true);
    try {
      if (staffToEdit) {
        await updateStaffMember(staffToEdit.id, {
          schoolId: school.id,
          employeeId: employeeId.trim(),
          name: name.trim(),
          photoUrl: photoUrl.trim() || undefined,
          gender,
          dateOfBirth,
          phone: phone.trim(),
          email: email.trim() || undefined,
          designation: designation.trim(),
          department: department.trim() || undefined,
          category,
          joiningDate,
          qualification: qualification.trim() || undefined,
          basicSalary: basicSalary ? Number(basicSalary) : undefined,
          employmentStatus,
          assignedClassIds,
          assignedSubjectIds,
        });

        await logAuditEvent({
          schoolId: school.id,
          userId: profile.uid,
          userName: profile.name,
          userRole: profile.role,
          action: 'STAFF_UPDATED',
          module: 'Staff',
          description: `Updated staff record for "${name}" (${employeeId}).`,
        });
      } else {
        const newStaff = await createStaffMember({
          schoolId: school.id,
          employeeId: employeeId.trim(),
          name: name.trim(),
          photoUrl: photoUrl.trim() || undefined,
          gender,
          dateOfBirth,
          phone: phone.trim(),
          email: email.trim() || undefined,
          designation: designation.trim(),
          department: department.trim() || undefined,
          category,
          joiningDate,
          qualification: qualification.trim() || undefined,
          basicSalary: basicSalary ? Number(basicSalary) : undefined,
          employmentStatus,
          assignedClassIds,
          assignedSubjectIds,
        });

        await logAuditEvent({
          schoolId: school.id,
          userId: profile.uid,
          userName: profile.name,
          userRole: profile.role,
          action: 'STAFF_CREATED',
          module: 'Staff',
          description: `Registered new staff member "${newStaff.name}" (${newStaff.employeeId}).`,
        });
      }

      onSaveSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save staff record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-2xl w-full p-6 sm:p-8 my-8 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Briefcase className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {staffToEdit ? 'Edit Staff Record' : 'Register New Staff Member'}
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          Record staff credentials, departmental categorization, and academic class/subject assignments.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Employee ID *
              </label>
              <input
                type="text"
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. / Mr. / Ms. Full Name"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Role Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as StaffCategory)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="Principal">Principal</option>
                <option value="Vice Principal">Vice Principal</option>
                <option value="Teacher">Teacher</option>
                <option value="Accountant">Accountant</option>
                <option value="Receptionist">Receptionist</option>
                <option value="Librarian">Librarian</option>
                <option value="Driver">Driver (Transport)</option>
                <option value="Conductor">Conductor (Transport)</option>
                <option value="Security">Security</option>
                <option value="Other">Other Staff</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Designation *
              </label>
              <input
                type="text"
                required
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Senior Faculty"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Department
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Science / Accounts"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91..."
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@school.edu"
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
                Joining Date
              </label>
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Qualification
              </label>
              <input
                type="text"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                placeholder="e.g. M.Sc, B.Ed"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Basic Monthly Salary
              </label>
              <input
                type="number"
                value={basicSalary}
                onChange={(e) => setBasicSalary(e.target.value)}
                placeholder="e.g. 45000"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Employment Status
              </label>
              <select
                value={employmentStatus}
                onChange={(e) => setEmploymentStatus(e.target.value as EmploymentStatus)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="ON_LEAVE">ON_LEAVE</option>
                <option value="RESIGNED">RESIGNED</option>
                <option value="TERMINATED">TERMINATED</option>
              </select>
            </div>
          </div>

          {/* Teacher Assignments (Classes & Subjects) */}
          {category === 'Teacher' && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Teacher Class &amp; Subject Allocations
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Assigned Classes:
                </label>
                <div className="flex flex-wrap gap-2">
                  {classes.map((c) => {
                    const isSelected = assignedClassIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleToggleClass(c.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Assigned Subjects:
                </label>
                <div className="flex flex-wrap gap-2">
                  {subjects.map((s) => {
                    const isSelected = assignedSubjectIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleToggleSubject(s.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {s.name} ({s.code})
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

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
              className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{loading ? 'Saving...' : staffToEdit ? 'Update Staff Member' : 'Register Staff'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

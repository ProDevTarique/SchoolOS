import React from 'react';
import { X, Printer, Briefcase, Mail, Phone, Calendar, Award } from 'lucide-react';
import { StaffMember, School, ClassItem, SubjectItem } from '../../types';
import { SchoolHeader } from '../../components/common/SchoolHeader';

interface StaffProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffMember | null;
  school: School | null;
  classes: ClassItem[];
  subjects: SubjectItem[];
}

export const StaffProfileModal: React.FC<StaffProfileModalProps> = ({
  isOpen,
  onClose,
  staff,
  school,
  classes,
  subjects,
}) => {
  if (!isOpen || !staff) return null;

  const handlePrint = () => {
    window.print();
  };

  const assignedClassNames = (staff.assignedClassIds || [])
    .map((cid) => classes.find((c) => c.id === cid)?.name)
    .filter(Boolean);

  const assignedSubjectNames = (staff.assignedSubjectIds || [])
    .map((sid) => subjects.find((s) => s.id === sid)?.name)
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 my-8 relative">
        {/* Actions bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-6 print:hidden">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Staff Dossier &amp; Service Record
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Dossier</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Section */}
        <div id="printable-staff-dossier" className="space-y-6">
          <SchoolHeader school={school} subtitle="OFFICIAL EMPLOYEE PROFILE & SERVICE RECORD" />

          {/* Staff Info Banner */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
            <div className="w-20 h-20 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0 overflow-hidden shadow-xs">
              {staff.photoUrl ? (
                <img src={staff.photoUrl} alt={staff.name} className="w-full h-full object-cover" />
              ) : (
                <Briefcase className="w-8 h-8 text-slate-400" />
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {staff.name}
                </h2>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold self-center sm:self-auto ${
                  staff.employmentStatus === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {staff.employmentStatus}
                </span>
              </div>

              <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                {staff.designation} • {staff.department || 'General'}
              </div>

              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Employee ID</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{staff.employeeId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Category</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{staff.category}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Joining Date</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{staff.joiningDate || '—'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Details Table */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-600" />
                Contact &amp; Identification
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                <span className="text-slate-500">Official Phone:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{staff.phone}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                <span className="text-slate-500">Official Email:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{staff.email || '—'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Gender / DOB:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {staff.gender || '—'} {staff.dateOfBirth ? `(${staff.dateOfBirth})` : ''}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-600" />
                Qualifications &amp; Compensation
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                <span className="text-slate-500">Highest Qualification:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{staff.qualification || '—'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Monthly Basic Salary:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {staff.basicSalary ? `${school?.currency || '₹'} ${staff.basicSalary.toLocaleString()}` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Academic Responsibilities (For Teachers) */}
          {staff.category === 'Teacher' && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
              <div className="font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                Teaching &amp; Curriculum Assignments
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500 block text-[11px] mb-1">Assigned Classes:</span>
                  <div className="flex flex-wrap gap-1">
                    {assignedClassNames.length > 0 ? (
                      assignedClassNames.map((cName, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium">
                          {cName}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic">No classes assigned</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px] mb-1">Assigned Subjects:</span>
                  <div className="flex flex-wrap gap-1">
                    {assignedSubjectNames.length > 0 ? (
                      assignedSubjectNames.map((sName, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium">
                          {sName}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic">No subjects assigned</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Signatures */}
          <div className="pt-8 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 text-xs text-slate-500">
            <div>
              <div className="w-36 border-b border-slate-400 mb-1" />
              <span>Employee Signature</span>
            </div>
            <div className="text-right">
              <div className="w-36 border-b border-slate-400 mb-1 ml-auto" />
              <span>HR / Principal Signature</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

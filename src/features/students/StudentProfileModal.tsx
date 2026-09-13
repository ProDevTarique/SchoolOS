import React, { useEffect, useState } from 'react';
import { X, Printer, User, Phone, MapPin, HeartPulse, History, CalendarCheck } from 'lucide-react';
import { Student, School, ClassItem, SectionItem } from '../../types';
import { SchoolHeader } from '../../components/common/SchoolHeader';
import { getStudentAttendanceHistory } from '../../services/attendanceService';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  school: School | null;
  classes: ClassItem[];
  sections: SectionItem[];
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  isOpen,
  onClose,
  student,
  school,
  classes,
  sections,
}) => {
  const [attendance, setAttendance] = useState<{ date: string; status: string; remarks?: string }[]>([]);
  const [loadingAtt, setLoadingAtt] = useState(false);

  useEffect(() => {
    if (!student || !isOpen) return;
    const fetchAttendance = async () => {
      setLoadingAtt(true);
      try {
        const hist = await getStudentAttendanceHistory(student.schoolId, student.id);
        setAttendance(hist.slice(0, 15));
      } catch (err) {
        console.error('Failed to load student attendance:', err);
      } finally {
        setLoadingAtt(false);
      }
    };
    fetchAttendance();
  }, [student, isOpen]);

  if (!isOpen || !student) return null;

  const currentClass = classes.find((c) => c.id === student.classId);
  const currentSection = sections.find((s) => s.id === student.sectionId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full p-6 sm:p-8 my-8 relative">
        {/* Actions bar (hidden in print) */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-6 print:hidden">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Student Information System • Official Record
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Profile</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Institutional Profile */}
        <div id="printable-student-profile" className="space-y-6">
          {/* Institutional School Header */}
          <SchoolHeader school={school} subtitle="STUDENT ACADEMIC DOSSIER & PROFILE RECORD" />

          {/* Student Banner */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
            <div className="w-24 h-24 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden flex items-center justify-center text-slate-400 shrink-0 shadow-xs">
              {student.photoUrl ? (
                <img src={student.photoUrl} alt={student.fullName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-slate-400" />
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {student.fullName}
                </h2>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold self-center sm:self-auto ${
                  student.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  Status: {student.status}
                </span>
              </div>

              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Admission No</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{student.admissionNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Class &amp; Section</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {currentClass?.name || '—'} - {currentSection?.name || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Roll No</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{student.rollNumber || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Blood Group</span>
                  <span className="font-bold text-rose-600">{student.bloodGroup || '—'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Personal & Demographic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600" />
                Personal Details
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                <span className="text-slate-500">Date of Birth:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{student.dateOfBirth || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                <span className="text-slate-500">Gender:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{student.gender}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                <span className="text-slate-500">Admission Date:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{student.admissionDate || '—'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Primary Contact Email:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{student.parentEmail || '—'}</span>
              </div>
            </div>

            {/* Parents & Guardians */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <Phone className="w-4 h-4 text-indigo-600" />
                Parent &amp; Guardian Information
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                <span className="text-slate-500">Father&apos;s Name:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{student.fatherName || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                <span className="text-slate-500">Father&apos;s Phone:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{student.fatherPhone || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                <span className="text-slate-500">Mother&apos;s Name:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{student.motherName || '—'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Mother&apos;s Phone:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{student.motherPhone || '—'}</span>
              </div>
            </div>
          </div>

          {/* Section: Address, Emergency & Medical */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600" />
                Residential Address &amp; Emergency Contact
              </div>
              <div className="py-1">
                <span className="text-slate-500 block text-[11px]">Street Address:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {[student.address, student.city, student.state, student.pinCode ? `PIN: ${student.pinCode}` : ''].filter(Boolean).join(', ') || '—'}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 block text-[11px]">Emergency Contact:</span>
                <span className="font-semibold text-rose-600">
                  {student.emergencyName || student.fatherName || '—'} ({student.emergencyRelation || 'Parent'}) : {student.emergencyPhone || student.fatherPhone || '—'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-rose-500" />
                Medical &amp; Previous History
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Medical Notes &amp; Allergies:</span>
                <p className="text-slate-700 dark:text-slate-300 italic mt-0.5">
                  {student.medicalNotes || 'No known allergies or chronic medical conditions registered.'}
                </p>
              </div>
              {student.previousSchool && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 block text-[11px]">Transfer / Prior Institution:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{student.previousSchool}</span>
                </div>
              )}
            </div>
          </div>

          {/* Recent Attendance Records */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <CalendarCheck className="w-4 h-4 text-emerald-600" />
                <span>Recent Attendance Trail (Last 15 sessions)</span>
              </div>
              <span className="text-[11px] font-normal text-slate-400">
                {attendance.length} entries recorded
              </span>
            </div>

            {loadingAtt ? (
              <div className="py-4 text-center text-xs text-slate-400">Loading attendance data...</div>
            ) : attendance.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">No attendance records logged yet for this student.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                {attendance.map((rec, i) => (
                  <div key={i} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-mono">{rec.date}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      rec.status === 'PRESENT'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : rec.status === 'ABSENT'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        : rec.status === 'LATE'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {rec.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Institutional Signature stamp area */}
          <div className="pt-8 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 text-xs text-slate-500">
            <div>
              <div className="w-40 border-b border-slate-400 mb-1" />
              <span>Prepared by Registrar</span>
            </div>
            <div className="text-right">
              <div className="w-40 border-b border-slate-400 mb-1 ml-auto" />
              <span>Principal / Head of Institution</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

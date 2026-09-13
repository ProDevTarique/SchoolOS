import React from 'react';
import { X, Printer, GraduationCap } from 'lucide-react';
import { Student, School, ClassItem, SectionItem } from '../../types';

interface StudentIDCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  school: School | null;
  className?: string;
  sectionName?: string;
}

export const StudentIDCardModal: React.FC<StudentIDCardModalProps> = ({
  isOpen,
  onClose,
  student,
  school,
  className,
  sectionName,
}) => {
  if (!isOpen || !student) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-w-lg w-full p-6 relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            <span>Student Identity Card</span>
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Card</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* The Printable ID Card (Standard CR80 portrait aspect) */}
        <div className="flex justify-center my-2">
          <div
            id="printable-student-id-card"
            className="w-72 bg-white text-slate-900 border-2 border-slate-800 rounded-xl shadow-md overflow-hidden flex flex-col justify-between"
            style={{ height: '420px' }}
          >
            {/* Top School Band */}
            <div className="bg-indigo-900 text-white p-3 text-center">
              <div className="font-bold text-xs uppercase tracking-wider line-clamp-1">
                {school?.name || 'SchoolOS Academy'}
              </div>
              <div className="text-[9px] text-indigo-200 line-clamp-1 mt-0.5">
                {[school?.city, school?.state].filter(Boolean).join(', ')}
              </div>
            </div>

            {/* Photo & Identity */}
            <div className="p-4 flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 rounded-full border-2 border-indigo-600 bg-slate-100 overflow-hidden mb-3 shadow-inner flex items-center justify-center">
                {student.photoUrl ? (
                  <img src={student.photoUrl} alt={student.fullName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-indigo-800">
                    {student.fullName.charAt(0)}
                  </span>
                )}
              </div>

              <div className="font-bold text-base text-slate-900 tracking-tight">
                {student.fullName}
              </div>

              <div className="text-xs font-semibold text-indigo-700 mt-0.5">
                {className || 'Class'} - Section {sectionName || 'A'}
              </div>

              {/* Detail fields */}
              <div className="w-full mt-4 text-[11px] text-left border-t border-b border-slate-200 py-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Admission No:</span>
                  <span className="font-mono font-bold text-slate-800">{student.admissionNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Roll No:</span>
                  <span className="font-bold text-slate-800">{student.rollNumber || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Blood Group:</span>
                  <span className="font-bold text-rose-600">{student.bloodGroup || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Emergency Tel:</span>
                  <span className="font-bold text-slate-800">
                    {student.emergencyPhone || student.fatherPhone || student.motherPhone || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Bar / Validity */}
            <div className="bg-slate-100 px-3 py-2 border-t border-slate-300 flex items-center justify-between text-[9px] text-slate-600">
              <span>Valid Session</span>
              <span className="font-semibold uppercase tracking-wider">Authorized Card</span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Formatted for standard portrait ID badge card stock.
        </p>
      </div>
    </div>
  );
};

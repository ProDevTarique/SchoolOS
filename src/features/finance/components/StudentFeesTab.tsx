import React, { useState, useEffect } from 'react';
import {
  Search,
  Users,
  CreditCard,
  FileText,
  Filter,
  RefreshCw,
  ArrowUpRight,
} from 'lucide-react';
import { Student, ClassItem, SectionItem, FeeItem } from '../../../types';
import { getStudents } from '../../../services/studentService';
import { getClasses, getSections, getAcademicSessions } from '../../../services/academicService';
import { getAllFeeItems } from '../services/feeAssignmentService';
import { formatINR, roundINR, addINR } from '../utils/currencyUtils';
import { StudentFeeProfileModal } from './StudentFeeProfileModal';
import { useAuth } from '../../../hooks/useAuth';

interface StudentFeesTabProps {
  onCollectFeeForStudent: (student: Student) => void;
}

export const StudentFeesTab: React.FC<StudentFeesTabProps> = ({ onCollectFeeForStudent }) => {
  const { school } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [allFeeItems, setAllFeeItems] = useState<FeeItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [dueStatusFilter, setDueStatusFilter] = useState<'ALL' | 'DUES_ONLY' | 'CLEARED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected student profile modal
  const [activeProfileStudent, setActiveProfileStudent] = useState<Student | null>(null);

  const loadData = async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const [stList, clsList, secList, items] = await Promise.all([
        getStudents(school.id),
        getClasses(school.id),
        getSections(school.id),
        getAllFeeItems(school.id),
      ]);
      setStudents(stList);
      setClasses(clsList);
      setSections(secList);
      setAllFeeItems(items);
    } catch (err) {
      console.error('Failed to load student fees data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [school?.id]);

  const classesMap = new Map(classes.map((c) => [c.id, c.name]));
  const sectionsMap = new Map(sections.map((s) => [s.id, s.name]));

  // Calculate per-student financial aggregation
  const studentFeeStats = new Map<string, { totalAssigned: number; totalPaid: number; balance: number }>();

  allFeeItems.forEach((item) => {
    const stat = studentFeeStats.get(item.studentId) || { totalAssigned: 0, totalPaid: 0, balance: 0 };
    stat.totalAssigned = addINR(stat.totalAssigned, item.netPayable);
    stat.totalPaid = addINR(stat.totalPaid, item.paidAmount);
    if (item.status !== 'WAIVED' && item.status !== 'PAID') {
      stat.balance = addINR(stat.balance, item.balance);
    }
    studentFeeStats.set(item.studentId, stat);
  });

  // Filter students
  const filteredStudents = students.filter((s) => {
    if (selectedClassId && s.classId !== selectedClassId) return false;
    if (selectedSectionId && s.sectionId !== selectedSectionId) return false;

    const stats = studentFeeStats.get(s.id) || { totalAssigned: 0, totalPaid: 0, balance: 0 };

    if (dueStatusFilter === 'DUES_ONLY' && stats.balance <= 0) return false;
    if (dueStatusFilter === 'CLEARED' && stats.balance > 0) return false;

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      const matchName = s.fullName.toLowerCase().includes(term);
      const matchAdm = s.admissionNumber.toLowerCase().includes(term);
      const matchParent = (s.fatherName && s.fatherName.toLowerCase().includes(term)) || false;
      const matchPhone = (s.fatherPhone && s.fatherPhone.toLowerCase().includes(term)) || false;
      if (!matchName && !matchAdm && !matchParent && !matchPhone) return false;
    }

    return true;
  });

  const availableSections = sections.filter((s) => !selectedClassId || s.classId === selectedClassId);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Student Financial Profiles
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Individual student balances, scheduled dues, payments, and mathematical fee ledgers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3">
        {/* Search */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Search Student
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Name, Adm No, Parent..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Class Filter */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Class
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setSelectedSectionId('');
            }}
            className="w-full py-1.5 px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Section Filter */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Section
          </label>
          <select
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            className="w-full py-1.5 px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="">All Sections</option>
            {availableSections.map((s) => (
              <option key={s.id} value={s.id}>
                Section {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Dues Status Filter */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Balance Status
          </label>
          <select
            value={dueStatusFilter}
            onChange={(e) => setDueStatusFilter(e.target.value as any)}
            className="w-full py-1.5 px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="ALL">All Students ({students.length})</option>
            <option value="DUES_ONLY">Has Outstanding Balance</option>
            <option value="CLEARED">All Fees Cleared</option>
          </select>
        </div>
      </div>

      {/* Students Financial Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
            <span>Loading student profiles...</span>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
              No Student Financial Records Found
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Adjust your filters or assign fee structures to classes.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Admission No</th>
                  <th className="py-3 px-4">Class &amp; Section</th>
                  <th className="py-3 px-4">Parent / Phone</th>
                  <th className="py-3 px-4 text-right">Total Assigned</th>
                  <th className="py-3 px-4 text-right">Total Paid</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {filteredStudents.map((s) => {
                  const stats = studentFeeStats.get(s.id) || { totalAssigned: 0, totalPaid: 0, balance: 0 };
                  const hasDues = stats.balance > 0;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {s.photoUrl ? (
                            <img
                              src={s.photoUrl}
                              alt={s.fullName}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                              {s.fullName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="font-bold text-slate-900 dark:text-white">
                            {s.fullName}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-600 dark:text-slate-300">
                        {s.admissionNumber}
                      </td>
                      <td className="py-3 px-4">
                        {classesMap.get(s.classId) || 'Class'} {sectionsMap.get(s.sectionId) ? `- ${sectionsMap.get(s.sectionId)}` : ''}
                      </td>
                      <td className="py-3 px-4">
                        <div>{s.fatherName || s.motherName || '—'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{s.fatherPhone || s.motherPhone || ''}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium">
                        {formatINR(stats.totalAssigned, false)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-emerald-600">
                        {formatINR(stats.totalPaid, false)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-sm">
                        {hasDues ? (
                          <span className="text-rose-600 dark:text-rose-400">
                            {formatINR(stats.balance, true)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            Cleared
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveProfileStudent(s)}
                            className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            Profile / Ledger
                          </button>
                          {hasDues && (
                            <button
                              type="button"
                              onClick={() => onCollectFeeForStudent(s)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>Collect</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Fee Profile Modal */}
      {activeProfileStudent && (
        <StudentFeeProfileModal
          isOpen={Boolean(activeProfileStudent)}
          student={activeProfileStudent}
          className={classesMap.get(activeProfileStudent.classId) || 'Class'}
          sectionName={sectionsMap.get(activeProfileStudent.sectionId) || ''}
          sessionName="2025-26"
          onClose={() => {
            setActiveProfileStudent(null);
            loadData();
          }}
          onCollectPayment={(st) => onCollectFeeForStudent(st)}
        />
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Search,
  Filter,
  Download,
  Printer,
  Phone,
  ArrowUpDown,
  CreditCard,
  RefreshCw,
} from 'lucide-react';
import { ClassItem, SectionItem, Student } from '../../../types';
import { getFeeDefaultersReport, DefaulterRow } from '../services/financeReportsService';
import { getClasses, getSections } from '../../../services/academicService';
import { getAllFeeCategories } from '../services/feeStructureService';
import { formatINR } from '../utils/currencyUtils';
import { exportToCSV } from '../utils/exportUtils';
import { useAuth } from '../../../hooks/useAuth';

interface FeeDefaultersTabProps {
  onCollectFeeForStudentId?: (studentId: string) => void;
}

export const FeeDefaultersTab: React.FC<FeeDefaultersTabProps> = ({
  onCollectFeeForStudentId,
}) => {
  const { school } = useAuth();

  const [defaulters, setDefaulters] = useState<DefaulterRow[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedFeeType, setSelectedFeeType] = useState('');
  const [minOutstanding, setMinOutstanding] = useState<number | ''>('');
  const [sortBy, setSortBy] = useState<'HIGHEST_DUE' | 'OLDEST_OVERDUE' | 'CLASS' | 'NAME'>('HIGHEST_DUE');
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const [clsList, secList, cats, defRows] = await Promise.all([
        getClasses(school.id),
        getSections(school.id),
        getAllFeeCategories(school.id),
        getFeeDefaultersReport(school.id, {
          classId: selectedClassId || undefined,
          sectionId: selectedSectionId || undefined,
          feeType: selectedFeeType || undefined,
          minOutstanding: typeof minOutstanding === 'number' ? minOutstanding : undefined,
        }),
      ]);
      setClasses(clsList);
      setSections(secList);
      setCategories(cats);
      setDefaulters(defRows);
    } catch (err) {
      console.error('Failed to load defaulters report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [school?.id, selectedClassId, selectedSectionId, selectedFeeType, minOutstanding]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Student Name',
      'Admission No',
      'Class',
      'Section',
      'Parent Name',
      'Phone Number',
      'Total Due (INR)',
      'Overdue Amount (INR)',
      'Days Overdue',
      'Oldest Due Date',
    ];

    const rows = sortedDefaulters.map((d) => [
      d.studentName,
      d.admissionNumber,
      d.className,
      d.sectionName,
      d.parentName,
      d.parentPhone,
      d.totalDue,
      d.overdueAmount,
      d.daysOverdue,
      d.oldestDueDate,
    ]);

    exportToCSV(`Fee_Defaulters_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter and sort
  const filtered = defaulters.filter((d) => {
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      const mName = d.studentName.toLowerCase().includes(term);
      const mAdm = d.admissionNumber.toLowerCase().includes(term);
      const mParent = d.parentName.toLowerCase().includes(term);
      const mPhone = d.parentPhone.includes(term);
      if (!mName && !mAdm && !mParent && !mPhone) return false;
    }
    return true;
  });

  const sortedDefaulters = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'HIGHEST_DUE':
        return b.totalDue - a.totalDue;
      case 'OLDEST_OVERDUE':
        return b.daysOverdue - a.daysOverdue;
      case 'CLASS':
        return a.className.localeCompare(b.className) || a.studentName.localeCompare(b.studentName);
      case 'NAME':
        return a.studentName.localeCompare(b.studentName);
      default:
        return 0;
    }
  });

  const totalDefaulterAmount = sortedDefaulters.reduce((acc, curr) => acc + curr.totalDue, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Fee Defaulters Directory
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
              {sortedDefaulters.length} Defaulters
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time tracking of students with past-due fees, overdue aging, and direct guardian contacts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-rose-50/50 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/40">
          <span className="text-xs text-rose-700 dark:text-rose-400 font-bold block">
            Total Outstanding Default Amount
          </span>
          <div className="text-2xl font-bold font-mono text-rose-700 dark:text-rose-300 mt-1">
            {formatINR(totalDefaulterAmount, false)}
          </div>
          <div className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">
            Accumulated pending liability across {sortedDefaulters.length} students
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 font-medium block">Max Overdue Period</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {sortedDefaulters.length > 0 ? Math.max(...sortedDefaulters.map((d) => d.daysOverdue)) : 0}
            <span className="text-sm font-normal text-slate-400 ml-1">Days</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Oldest overdue fee period</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 font-medium block">Average Default / Student</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {sortedDefaulters.length > 0
              ? formatINR(Math.round(totalDefaulterAmount / sortedDefaulters.length), false)
              : '₹0'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Mean arrears per student</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Search
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Name, Adm #, Phone..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Class
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Fee Category
          </label>
          <select
            value={selectedFeeType}
            onChange={(e) => setSelectedFeeType(e.target.value)}
            className="w-full py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="">All Fee Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Min Outstanding (₹)
          </label>
          <input
            type="number"
            min="0"
            step="100"
            value={minOutstanding}
            onChange={(e) => setMinOutstanding(e.target.value === '' ? '' : parseFloat(e.target.value))}
            placeholder="e.g. 1000"
            className="w-full py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Sort Order
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="HIGHEST_DUE">Highest Outstanding</option>
            <option value="OLDEST_OVERDUE">Oldest Overdue Days</option>
            <option value="CLASS">Class Order</option>
            <option value="NAME">Student Name</option>
          </select>
        </div>
      </div>

      {/* Defaulters Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
            <span>Loading fee defaulters...</span>
          </div>
        ) : sortedDefaulters.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <AlertTriangle className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
              No Defaulters Found
            </p>
            <p className="text-xs text-slate-400 mt-1">
              All students have settled their dues or none match your filter criteria.
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
                  <th className="py-3 px-4">Parent / Guardian</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4 text-right">Total Due</th>
                  <th className="py-3 px-4 text-right">Overdue</th>
                  <th className="py-3 px-4 text-center">Days Overdue</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {sortedDefaulters.map((d) => (
                  <tr key={d.studentId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {d.studentName}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                      {d.admissionNumber}
                    </td>
                    <td className="py-3 px-4">
                      {d.className} {d.sectionName ? `- ${d.sectionName}` : ''}
                    </td>
                    <td className="py-3 px-4">{d.parentName}</td>
                    <td className="py-3 px-4">
                      {d.parentPhone ? (
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{d.parentPhone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                      {formatINR(d.totalDue, true)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-amber-600 dark:text-amber-400">
                      {formatINR(d.overdueAmount, true)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block font-mono font-bold text-[11px] px-2 py-0.5 rounded ${
                          d.daysOverdue > 60
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                            : d.daysOverdue > 30
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {d.daysOverdue} d
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {onCollectFeeForStudentId && (
                        <button
                          type="button"
                          onClick={() => onCollectFeeForStudentId(d.studentId)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ml-auto"
                        >
                          <CreditCard className="w-3 h-3" />
                          <span>Collect</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

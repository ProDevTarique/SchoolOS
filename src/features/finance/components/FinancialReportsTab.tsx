import React, { useState, useEffect } from 'react';
import {
  FileBarChart2,
  Calendar,
  Download,
  Printer,
  RefreshCw,
  Layers,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import {
  getDailyCollectionReport,
  getClassWiseCollectionReport,
  DailyCollectionReportRow,
} from '../services/financeReportsService';
import { getAcademicSessions } from '../../../services/academicService';
import { AcademicSession } from '../../../types';
import { formatINR } from '../utils/currencyUtils';
import { exportToCSV } from '../utils/exportUtils';
import { useAuth } from '../../../hooks/useAuth';

type ReportType = 'DAILY' | 'CLASS_WISE';

export const FinancialReportsTab: React.FC = () => {
  const { school } = useAuth();

  const [activeReport, setActiveReport] = useState<ReportType>('DAILY');
  const [dailyRows, setDailyRows] = useState<DailyCollectionReportRow[]>([]);
  const [classRows, setClassRows] = useState<any[]>([]);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const sessList = await getAcademicSessions(school.id);
      setSessions(sessList);
      const activeSess = sessList.find((s) => s.isActive) || sessList[0];
      const targetSessId = selectedSessionId || (activeSess ? activeSess.id : '');
      setSelectedSessionId(targetSessId);

      if (activeReport === 'DAILY') {
        const dData = await getDailyCollectionReport(school.id, startDate || undefined, endDate || undefined);
        setDailyRows(dData);
      } else {
        const cData = await getClassWiseCollectionReport(school.id, targetSessId || undefined);
        setClassRows(cData);
      }
    } catch (err) {
      console.error('Failed to load financial reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [school?.id, activeReport, selectedSessionId, startDate, endDate]);

  const handleExportCSV = () => {
    if (activeReport === 'DAILY') {
      const headers = [
        'Date',
        'Cash (INR)',
        'UPI (INR)',
        'Bank Transfer (INR)',
        'Cheque (INR)',
        'Card (INR)',
        'Other (INR)',
        'Total Gross (INR)',
        'Receipts Count',
        'Cancelled Receipts',
        'Net Collection (INR)',
      ];
      const rows = dailyRows.map((r) => [
        r.date,
        r.cash,
        r.upi,
        r.bank,
        r.cheque,
        r.card,
        r.other,
        r.total,
        r.receiptsCount,
        r.cancelledCount,
        r.netCollection,
      ]);
      exportToCSV(`Daily_Collection_${new Date().toISOString().split('T')[0]}`, headers, rows);
    } else {
      const headers = [
        'Class Name',
        'Total Students',
        'Total Billed (INR)',
        'Total Collected (INR)',
        'Total Discounts (INR)',
        'Outstanding Balance (INR)',
        'Collection %',
      ];
      const rows = classRows.map((c) => [
        c.className,
        c.totalStudents,
        c.totalBilled,
        c.totalCollected,
        c.totalDiscount,
        c.totalOutstanding,
        `${c.collectionPercentage}%`,
      ]);
      exportToCSV(`Class_Wise_Collection_${new Date().toISOString().split('T')[0]}`, headers, rows);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Institutional Financial Reports
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Comprehensive audit-ready reports including Daily Mode-wise Collections and Class-wise Collection efficiency.
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

      {/* Report Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveReport('DAILY')}
          className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeReport === 'DAILY'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Daily Collection Report</span>
        </button>

        <button
          onClick={() => setActiveReport('CLASS_WISE')}
          className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeReport === 'CLASS_WISE'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Class-Wise Collection Analysis</span>
        </button>
      </div>

      {/* Filters */}
      {activeReport === 'DAILY' ? (
        <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs max-w-lg">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-sm text-xs">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Academic Session
          </label>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="w-full py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.isActive ? '(Active)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Reports Table Display */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
          <span>Generating report...</span>
        </div>
      ) : activeReport === 'DAILY' ? (
        /* Daily Collection Report */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-3 text-right">Cash</th>
                  <th className="py-3 px-3 text-right">UPI</th>
                  <th className="py-3 px-3 text-right">Bank Transfer</th>
                  <th className="py-3 px-3 text-right">Cheque</th>
                  <th className="py-3 px-3 text-right">Card</th>
                  <th className="py-3 px-3 text-right">Other</th>
                  <th className="py-3 px-3 text-center">Receipts</th>
                  <th className="py-3 px-3 text-center">Cancelled</th>
                  <th className="py-3 px-4 text-right">Net Collection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {dailyRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500">
                      No collections recorded in this date range.
                    </td>
                  </tr>
                ) : (
                  dailyRows.map((r) => (
                    <tr key={r.date} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-white">
                        {r.date}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">{formatINR(r.cash, false)}</td>
                      <td className="py-3 px-3 text-right font-mono">{formatINR(r.upi, false)}</td>
                      <td className="py-3 px-3 text-right font-mono">{formatINR(r.bank, false)}</td>
                      <td className="py-3 px-3 text-right font-mono">{formatINR(r.cheque, false)}</td>
                      <td className="py-3 px-3 text-right font-mono">{formatINR(r.card, false)}</td>
                      <td className="py-3 px-3 text-right font-mono">{formatINR(r.other, false)}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                        {r.receiptsCount}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-rose-600 font-bold">
                        {r.cancelledCount > 0 ? r.cancelledCount : '0'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-sm text-indigo-700 dark:text-indigo-300">
                        {formatINR(r.netCollection, true)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Class-Wise Collection Report */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4 text-center">Students</th>
                  <th className="py-3 px-4 text-right">Total Billed</th>
                  <th className="py-3 px-4 text-right">Total Collected</th>
                  <th className="py-3 px-4 text-right">Discounts / Concessions</th>
                  <th className="py-3 px-4 text-right">Outstanding Due</th>
                  <th className="py-3 px-4 text-center">Collection %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {classRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No classes configured.
                    </td>
                  </tr>
                ) : (
                  classRows.map((c) => (
                    <tr key={c.classId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {c.className}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {c.totalStudents}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium">
                        {formatINR(c.totalBilled, false)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatINR(c.totalCollected, false)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-purple-600 dark:text-purple-400">
                        {formatINR(c.totalDiscount, false)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        {formatINR(c.totalOutstanding, false)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-600 h-full rounded-full"
                              style={{ width: `${Math.min(100, c.collectionPercentage)}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-xs">{c.collectionPercentage}%</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

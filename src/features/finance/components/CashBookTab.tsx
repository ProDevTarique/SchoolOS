import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Download,
  Printer,
  Filter,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Scale,
} from 'lucide-react';
import { CashBookEntry } from '../../../types';
import { getCashBookEntries } from '../services/financeReportsService';
import { formatINR } from '../utils/currencyUtils';
import { exportToCSV } from '../utils/exportUtils';
import { useAuth } from '../../../hooks/useAuth';

export const CashBookTab: React.FC = () => {
  const { school } = useAuth();

  const [entries, setEntries] = useState<CashBookEntry[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [netCashFlow, setNetCashFlow] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadData = async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const data = await getCashBookEntries(school.id, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        type: typeFilter !== 'ALL' ? typeFilter : undefined,
      });
      setEntries(data.entries);
      setTotalIncome(data.totalIncome);
      setTotalExpense(data.totalExpense);
      setNetCashFlow(data.netCashFlow);
    } catch (err) {
      console.error('Failed to load cash book entries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [school?.id, typeFilter, startDate, endDate]);

  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Description',
      'Ref / Receipt No',
      'Type',
      'Income (INR)',
      'Expense (INR)',
      'Running Balance (INR)',
      'Payment Mode',
    ];

    const rows = entries.map((e) => [
      e.date,
      e.description,
      e.receiptPaymentNumber,
      e.type,
      e.income,
      e.expense,
      e.runningBalance,
      e.paymentMode,
    ]);

    exportToCSV(`Cash_Book_${new Date().toISOString().split('T')[0]}`, headers, rows);
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
            General Accounts &amp; Cash Book
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time ledger of institutional cash and bank movements with automatic mathematical balance derivation.
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
            <span>Print Ledger</span>
          </button>
        </div>
      </div>

      {/* Summary Figures */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-800 dark:text-emerald-300 font-bold">
              Total Cash Inflows (Collections)
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-300 mt-1">
            {formatINR(totalIncome, false)}
          </div>
          <div className="text-[11px] text-emerald-600/80 mt-0.5">Receipts &amp; fee credits</div>
        </div>

        <div className="bg-rose-50/50 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs text-rose-800 dark:text-rose-300 font-bold">
              Total Outflows (Expenditure)
            </span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-700 dark:text-rose-300 mt-1">
            {formatINR(totalExpense, false)}
          </div>
          <div className="text-[11px] text-rose-600/80 mt-0.5">Disbursed expenses &amp; bills</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Net Closing Balance</span>
            <Scale className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {formatINR(netCashFlow, false)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Cumulative net funds in hand</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Transaction Type
          </label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="w-full py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="ALL">All Transactions ({entries.length})</option>
            <option value="INCOME">Income Only</option>
            <option value="EXPENSE">Expense Only</option>
          </select>
        </div>

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

      {/* Cash Book Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
            <span>Loading cash book...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <BookOpen className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
              No Cash Book Entries
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Recorded fee receipts and paid expenses will generate entries automatically here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Receipt / Voucher #</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4 text-right">Income (INR)</th>
                  <th className="py-3 px-4 text-right">Expense (INR)</th>
                  <th className="py-3 px-4 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {entries.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                      {item.date}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                      {item.description}
                    </td>
                    <td className="py-3 px-4 font-mono text-indigo-600 dark:text-indigo-400 text-[11px]">
                      {item.receiptPaymentNumber}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-medium">{item.paymentMode}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-emerald-600">
                      {item.income > 0 ? `+${formatINR(item.income, true)}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-rose-600">
                      {item.expense > 0 ? `-${formatINR(item.expense, true)}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatINR(item.runningBalance, true)}
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

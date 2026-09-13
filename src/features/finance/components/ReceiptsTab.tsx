import React, { useState, useEffect } from 'react';
import {
  Search,
  Printer,
  Download,
  FileText,
  Filter,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Receipt } from '../../../types';
import { getReceipts } from '../services/feePaymentService';
import { formatINR } from '../utils/currencyUtils';
import { exportToCSV } from '../utils/exportUtils';
import { ReceiptModal } from './ReceiptModal';
import { useAuth } from '../../../hooks/useAuth';

export const ReceiptsTab: React.FC = () => {
  const { school } = useAuth();

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CANCELLED'>('ALL');
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  const loadData = async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const list = await getReceipts(school.id);
      setReceipts(list);
    } catch (err) {
      console.error('Failed to load receipts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [school?.id]);

  const handleExportCSV = () => {
    const headers = [
      'Receipt No',
      'Date',
      'Student Name',
      'Admission No',
      'Class',
      'Parent Name',
      'Gross Amount',
      'Discount',
      'Late Fee',
      'Net Paid',
      'Payment Mode',
      'Ref No',
      'Status',
    ];

    const rows = filteredReceipts.map((r) => [
      r.receiptNumber,
      r.paymentDate,
      r.studentName,
      r.admissionNumber,
      `${r.className} ${r.sectionName || ''}`.trim(),
      r.parentName,
      r.grossAmount,
      r.discountAmount,
      r.lateFeeAmount,
      r.netPaid,
      r.paymentMode,
      r.referenceNumber || '',
      r.status,
    ]);

    exportToCSV(`Receipts_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  const filteredReceipts = receipts.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      const mRcpt = r.receiptNumber.toLowerCase().includes(term);
      const mName = r.studentName.toLowerCase().includes(term);
      const mAdm = r.admissionNumber.toLowerCase().includes(term);
      const mParent = (r.parentName && r.parentName.toLowerCase().includes(term)) || false;
      const mRef = (r.referenceNumber && r.referenceNumber.toLowerCase().includes(term)) || false;
      if (!mRcpt && !mName && !mAdm && !mParent && !mRef) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Receipts Registry
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complete institutional archive of printed and active payment vouchers.
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
            onClick={loadData}
            className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Search Receipts
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Receipt #, Student Name, Admission No, Parent, Ref ID..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="ALL">All Receipts ({receipts.length})</option>
            <option value="ACTIVE">Active Only</option>
            <option value="CANCELLED">Cancelled Only</option>
          </select>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
            <span>Loading receipts...</span>
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
              No Receipts Found
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Collected fees will generate receipts that are archived here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Receipt Number</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4 text-right">Net Paid</th>
                  <th className="py-3 px-4">Payment Mode</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {filteredReceipts.map((r) => {
                  const isCancelled = r.status === 'CANCELLED';

                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 ${
                        isCancelled ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {r.receiptNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {r.paymentDate}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {r.studentName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {r.admissionNumber}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {r.className} {r.sectionName ? `- ${r.sectionName}` : ''}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-sm text-slate-900 dark:text-white">
                        {formatINR(r.netPaid, true)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium">{r.paymentMode}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                            isCancelled
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedReceipt(r)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors ml-auto cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <ReceiptModal
        isOpen={Boolean(selectedReceipt)}
        receipt={selectedReceipt}
        school={school}
        onClose={() => setSelectedReceipt(null)}
      />
    </div>
  );
};

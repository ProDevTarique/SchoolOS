import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Eye,
  Printer,
  RefreshCw,
  Download,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { FeePayment, Receipt, PaymentMode, School } from '../../../types';
import { getFeePayments, getReceipts } from '../services/feePaymentService';
import { formatINR } from '../utils/currencyUtils';
import { exportToCSV } from '../utils/exportUtils';
import { ReceiptModal } from './ReceiptModal';
import { useAuth } from '../../../hooks/useAuth';

export const PaymentHistoryTab: React.FC = () => {
  const { school } = useAuth();

  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [modeFilter, setModeFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const loadData = async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const [payList, rcptList] = await Promise.all([
        getFeePayments(school.id),
        getReceipts(school.id),
      ]);
      setPayments(payList);
      setReceipts(rcptList);
    } catch (err) {
      console.error('Failed to load payment history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [school?.id]);

  const receiptMap = new Map<string, Receipt>();
  receipts.forEach((r) => {
    receiptMap.set(r.paymentId, r);
    receiptMap.set(r.receiptNumber, r);
  });

  const handleOpenReceipt = (p: FeePayment) => {
    const rcpt = receiptMap.get(p.id) || receiptMap.get(p.receiptNumber);
    if (rcpt) {
      setSelectedReceipt(rcpt);
      setShowReceiptModal(true);
    } else {
      alert('Receipt details not found.');
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Receipt No',
      'Date',
      'Student ID',
      'Gross Amount',
      'Discount',
      'Late Fee',
      'Amount Received',
      'Advance Credited',
      'Payment Mode',
      'Reference No',
      'Status',
      'Collected By',
    ];

    const rows = filteredPayments.map((p) => [
      p.receiptNumber,
      p.paymentDate,
      p.studentId,
      p.grossAmount,
      p.discountAmount,
      p.lateFeeAmount,
      p.amountReceived,
      p.advanceAmount,
      p.paymentMode,
      p.referenceNumber || '',
      p.status,
      p.collectedByName || p.collectedBy,
    ]);

    exportToCSV(`Payment_History_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  const filteredPayments = payments.filter((p) => {
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
    if (modeFilter !== 'ALL' && p.paymentMode !== modeFilter) return false;
    if (startDate && p.paymentDate < startDate) return false;
    if (endDate && p.paymentDate > endDate) return false;

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      const matchRcpt = p.receiptNumber.toLowerCase().includes(term);
      const matchRef = (p.referenceNumber && p.referenceNumber.toLowerCase().includes(term)) || false;
      const matchUser = (p.collectedByName && p.collectedByName.toLowerCase().includes(term)) || false;
      if (!matchRcpt && !matchRef && !matchUser) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Payment &amp; Receipt History
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Audit trail of all recorded fee transactions, payment methods, and cancelled vouchers.
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

      {/* Filters Bar */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-5 gap-3">
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
              placeholder="Receipt #, Ref No, User..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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
            className="w-full py-1.5 px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed Only</option>
            <option value="CANCELLED">Cancelled Only</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Payment Mode
          </label>
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="w-full py-1.5 px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="ALL">All Modes</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CHEQUE">Cheque</option>
            <option value="CARD">Card</option>
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
            className="w-full py-1.5 px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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
            className="w-full py-1.5 px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
            <span>Loading payment history...</span>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Clock className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
              No Payment Records Found
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Collected fees will be recorded and displayed here with complete audit history.
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
                  <th className="py-3 px-4 text-right">Amount Received</th>
                  <th className="py-3 px-4">Payment Mode</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Collected By</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {filteredPayments.map((p) => {
                  const rcpt = receiptMap.get(p.id) || receiptMap.get(p.receiptNumber);
                  const isCancelled = p.status === 'CANCELLED';

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 ${
                        isCancelled ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {p.receiptNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {p.paymentDate}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {rcpt?.studentName || 'Student'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {rcpt?.admissionNumber} {rcpt?.className ? `(${rcpt.className})` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-sm text-slate-900 dark:text-white">
                        {formatINR(p.amountReceived, true)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium">{p.paymentMode}</span>
                        {p.referenceNumber && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Ref: {p.referenceNumber}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                            isCancelled
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {p.collectedByName || p.collectedBy}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenReceipt(p)}
                            title="View / Print Receipt"
                            className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

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

      {/* Receipt View / Print Modal */}
      <ReceiptModal
        isOpen={showReceiptModal}
        receipt={selectedReceipt}
        school={school}
        onClose={() => {
          setShowReceiptModal(false);
          setSelectedReceipt(null);
        }}
      />

    </div>
  );
};

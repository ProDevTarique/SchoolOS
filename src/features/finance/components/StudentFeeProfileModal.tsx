import React, { useState, useEffect } from 'react';
import {
  Student,
  FeeItem,
  School,
  StudentFinancialSummary,
} from '../../../types';
import { getStudentFeeItems } from '../services/feeAssignmentService';
import { getStudentLedger, StudentLedgerEntry } from '../services/financeReportsService';
import { formatINR, roundINR, addINR } from '../utils/currencyUtils';
import { ConcessionModal } from './ConcessionModal';
import {
  X,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Award,
  BookOpen,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

interface StudentFeeProfileModalProps {
  isOpen: boolean;
  student: Student | null;
  className: string;
  sectionName: string;
  sessionName: string;
  onClose: () => void;
  onCollectPayment?: (student: Student) => void;
}

export const StudentFeeProfileModal: React.FC<StudentFeeProfileModalProps> = ({
  isOpen,
  student,
  className,
  sectionName,
  sessionName,
  onClose,
  onCollectPayment,
}) => {
  const { profile, hasPermission } = useAuth();

  const [activeTab, setActiveTab] = useState<'ITEMS' | 'LEDGER'>('ITEMS');
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<StudentLedgerEntry[]>([]);
  const [ledgerSummary, setLedgerSummary] = useState({ totalDebit: 0, totalCredit: 0, finalBalance: 0 });
  const [loading, setLoading] = useState(true);

  // Concession modal state
  const [concessionItem, setConcessionItem] = useState<FeeItem | null>(null);

  const loadProfileData = async () => {
    if (!student) return;
    setLoading(true);
    try {
      const [items, ledgerData] = await Promise.all([
        getStudentFeeItems(student.schoolId, student.id),
        getStudentLedger(student.schoolId, student.id),
      ]);
      setFeeItems(items);
      setLedgerEntries(ledgerData.entries);
      setLedgerSummary(ledgerData);
    } catch (err) {
      console.error('Failed to load student fee profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && student) {
      loadProfileData();
    }
  }, [isOpen, student]);

  if (!isOpen || !student) return null;

  // Compute summary figures
  const totalAssigned = feeItems.reduce((acc, curr) => addINR(acc, curr.grossAmount), 0);
  const totalPaid = feeItems.reduce((acc, curr) => addINR(acc, curr.paidAmount), 0);
  const totalDiscount = feeItems.reduce((acc, curr) => addINR(acc, curr.discountAmount || 0), 0);
  const totalConcession = feeItems.reduce((acc, curr) => addINR(acc, curr.concessionAmount || 0), 0);
  const totalLateFees = feeItems.reduce((acc, curr) => addINR(acc, curr.lateFeeAmount || 0), 0);
  const totalOutstanding = feeItems
    .filter((i) => i.status !== 'WAIVED' && i.status !== 'PAID')
    .reduce((acc, curr) => addINR(acc, curr.balance), 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            {student.photoUrl ? (
              <img
                src={student.photoUrl}
                alt={student.fullName}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-indigo-200 dark:border-indigo-900"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
                {student.fullName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {student.fullName}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  {student.status}
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <div>
                  Adm No: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{student.admissionNumber}</span>
                </div>
                <div>•</div>
                <div>Class: <span className="font-semibold text-slate-700 dark:text-slate-300">{className} {sectionName ? `- ${sectionName}` : ''}</span></div>
                <div>•</div>
                <div>Session: <span className="text-slate-700 dark:text-slate-300">{sessionName}</span></div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onCollectPayment && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onCollectPayment(student);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Collect Fee</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 my-4">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Assigned</span>
            <span className="text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white mt-1 block">
              {formatINR(totalAssigned, false)}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Paid</span>
            <span className="text-xs sm:text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
              {formatINR(totalPaid, false)}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Discounts</span>
            <span className="text-xs sm:text-sm font-mono font-bold text-slate-700 dark:text-slate-300 mt-1 block">
              {formatINR(totalDiscount, false)}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Concessions</span>
            <span className="text-xs sm:text-sm font-mono font-bold text-purple-600 dark:text-purple-400 mt-1 block">
              {formatINR(totalConcession, false)}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Late Fees</span>
            <span className="text-xs sm:text-sm font-mono font-bold text-amber-600 dark:text-amber-400 mt-1 block">
              +{formatINR(totalLateFees, false)}
            </span>
          </div>

          <div className="bg-rose-50/60 dark:bg-rose-950/30 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-center">
            <span className="text-[10px] text-rose-700 dark:text-rose-400 uppercase font-bold block">Outstanding</span>
            <span className="text-xs sm:text-sm font-mono font-bold text-rose-700 dark:text-rose-300 mt-1 block">
              {formatINR(totalOutstanding, true)}
            </span>
          </div>
        </div>

        {/* Tabs: Scheduled Items vs Detailed Ledger */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 mb-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('ITEMS')}
            className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'ITEMS'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Scheduled Fee Items ({feeItems.length})
          </button>
          <button
            onClick={() => setActiveTab('LEDGER')}
            className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'LEDGER'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Mathematical Fee Ledger ({ledgerEntries.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
              <span>Loading financial history...</span>
            </div>
          ) : activeTab === 'ITEMS' ? (
            /* Scheduled Items Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3">Fee Item</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3 text-right">Gross</th>
                    <th className="py-2.5 px-3 text-right">Discount</th>
                    <th className="py-2.5 px-3 text-right">Concession</th>
                    <th className="py-2.5 px-3 text-right">Late Fee</th>
                    <th className="py-2.5 px-3 text-right">Paid</th>
                    <th className="py-2.5 px-3 text-right">Balance</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {feeItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                        {item.name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                        {item.dueDate}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatINR(item.grossAmount, false)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600">
                        {item.discountAmount > 0 ? `-${formatINR(item.discountAmount, false)}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-purple-600">
                        {item.concessionAmount > 0 ? `-${formatINR(item.concessionAmount, false)}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-600">
                        {item.lateFeeAmount > 0 ? `+${formatINR(item.lateFeeAmount, false)}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatINR(item.paidAmount, false)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        {formatINR(item.balance, false)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            item.status === 'PAID'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : item.status === 'OVERDUE'
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                              : item.status === 'PARTIAL'
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {hasPermission('fees.edit') && item.status !== 'PAID' && (
                          <button
                            type="button"
                            onClick={() => setConcessionItem(item)}
                            className="text-[11px] font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 hover:underline"
                          >
                            Grant Concession
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Mathematical Fee Ledger */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Reference / Receipt</th>
                    <th className="py-2.5 px-3 text-right">Debit (+)</th>
                    <th className="py-2.5 px-3 text-right">Credit (-)</th>
                    <th className="py-2.5 px-3 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  <tr className="bg-slate-50/40 text-slate-500 italic">
                    <td className="py-2 px-3">—</td>
                    <td className="py-2 px-3 font-medium">Opening Balance</td>
                    <td className="py-2 px-3">—</td>
                    <td className="py-2 px-3 text-right font-mono">₹0.00</td>
                    <td className="py-2 px-3 text-right font-mono">₹0.00</td>
                    <td className="py-2 px-3 text-right font-mono font-bold">₹0.00</td>
                  </tr>
                  {ledgerEntries.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                        {entry.date}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                        {entry.description}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                        {entry.referenceNumber || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-rose-600">
                        {entry.debit > 0 ? `+${formatINR(entry.debit, true)}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-600">
                        {entry.credit > 0 ? `-${formatINR(entry.credit, true)}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatINR(entry.balance, true)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                    <td colSpan={3} className="py-3 px-3 text-right">
                      Total Ledger Summary:
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-rose-600">
                      +{formatINR(ledgerSummary.totalDebit, true)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-600">
                      -{formatINR(ledgerSummary.totalCredit, true)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-base">
                      {formatINR(ledgerSummary.finalBalance, true)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Concession Modal */}
        {profile && (
          <ConcessionModal
            isOpen={Boolean(concessionItem)}
            item={concessionItem}
            studentName={student.fullName}
            admissionNumber={student.admissionNumber}
            userId={profile.uid}
            userName={profile.name}
            userRole={profile.role}
            onClose={() => setConcessionItem(null)}
            onGranted={() => loadProfileData()}
          />
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Plus,
  ReceiptText,
  Filter,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Search,
  Check,
} from 'lucide-react';
import { Expense, ExpenseStatus } from '../../../types';
import {
  getExpenses,
  approveExpense,
  rejectExpense,
  getExpenseCategories,
  addExpenseCategory,
} from '../services/expenseService';
import { formatINR, roundINR } from '../utils/currencyUtils';
import { exportToCSV } from '../utils/exportUtils';
import { ExpenseModal } from './ExpenseModal';
import { useAuth } from '../../../hooks/useAuth';

export const ExpensesTab: React.FC = () => {
  const { school, profile, hasPermission } = useAuth();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ExpenseStatus>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [rejectingExpense, setRejectingExpense] = useState<Expense | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  const loadData = async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const [expList, catList] = await Promise.all([
        getExpenses(school.id),
        getExpenseCategories(school.id),
      ]);
      setExpenses(expList);
      setCategories(catList);
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [school?.id]);

  const handleApprove = async (expense: Expense, markPaid: boolean = false) => {
    if (!school?.id || !profile) return;
    setProcessingAction(true);
    try {
      await approveExpense({
        schoolId: school.id,
        expenseId: expense.id,
        markAsPaid: markPaid,
        userId: profile.uid,
        userName: profile.name,
        userRole: profile.role,
      });
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to approve expense');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingExpense || !school?.id || !profile || !rejectionReason.trim()) return;

    setProcessingAction(true);
    try {
      await rejectExpense({
        schoolId: school.id,
        expenseId: rejectingExpense.id,
        reason: rejectionReason.trim(),
        userId: profile.uid,
        userName: profile.name,
        userRole: profile.role,
      });
      setRejectingExpense(null);
      setRejectionReason('');
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to reject expense');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Category',
      'Description',
      'Vendor / Payee',
      'Payment Mode',
      'Invoice / Ref No',
      'Amount (INR)',
      'Status',
      'Submitted By',
      'Approved By',
    ];

    const rows = filteredExpenses.map((e) => [
      e.date,
      e.category,
      e.description,
      e.vendorPayee,
      e.paymentMode,
      e.referenceNumber || '',
      e.amount,
      e.status,
      e.submittedByName || e.submittedBy,
      e.approvedByName || '',
    ]);

    exportToCSV(`Expenses_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  const filteredExpenses = expenses.filter((e) => {
    if (categoryFilter !== 'ALL' && e.category !== categoryFilter) return false;
    if (statusFilter !== 'ALL' && e.status !== statusFilter) return false;
    if (startDate && e.date < startDate) return false;
    if (endDate && e.date > endDate) return false;

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      const mDesc = e.description.toLowerCase().includes(term);
      const mPayee = e.vendorPayee.toLowerCase().includes(term);
      const mCat = e.category.toLowerCase().includes(term);
      const mRef = (e.referenceNumber && e.referenceNumber.toLowerCase().includes(term)) || false;
      if (!mDesc && !mPayee && !mCat && !mRef) return false;
    }

    return true;
  });

  const totalFilteredAmount = filteredExpenses
    .filter((e) => e.status === 'PAID' || e.status === 'APPROVED')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const pendingApprovalsCount = expenses.filter((e) => e.status === 'PENDING_APPROVAL').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Institutional Expenses Management
            </h2>
            {pendingApprovalsCount > 0 && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                {pendingApprovalsCount} Pending Approval
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track operational bills, vendor payments, petty cash, and multi-tier administrative approval workflows.
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

          {hasPermission('expenses.create') && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Expense Voucher</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 font-medium block">Approved &amp; Paid Total</span>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {formatINR(totalFilteredAmount, false)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Sum of filtered approved expenditures</div>
        </div>

        <div className="bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40">
          <span className="text-xs text-amber-700 dark:text-amber-400 font-bold block">
            Awaiting Approval
          </span>
          <div className="text-2xl font-bold font-mono text-amber-700 dark:text-amber-300 mt-1">
            {pendingApprovalsCount} Vouchers
          </div>
          <div className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">
            Requires Principal / Admin authorization
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 font-medium block">Expense Categories</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {categories.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Maintenance, electricity, stationery, etc.</div>
        </div>
      </div>

      {/* Filters */}
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
              placeholder="Description, Payee, Ref..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Category
          </label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
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
            <option value="ALL">All Statuses</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="PAID">Paid</option>
            <option value="DRAFT">Draft</option>
            <option value="REJECTED">Rejected</option>
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

      {/* Expenses Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
            <span>Loading expenses...</span>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <ReceiptText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
              No Expense Vouchers Found
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Create an expense voucher to record school expenditures.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Payee / Vendor</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {filteredExpenses.map((e) => {
                  const isPending = e.status === 'PENDING_APPROVAL';

                  return (
                    <tr key={e.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {e.date}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {e.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {e.description}
                        </div>
                        {e.remarks && (
                          <div className="text-[10px] text-slate-400">{e.remarks}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {e.vendorPayee}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[11px]">{e.paymentMode}</span>
                        {e.referenceNumber && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {e.referenceNumber}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-sm text-slate-900 dark:text-white">
                        {formatINR(e.amount, true)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            e.status === 'PAID'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : e.status === 'APPROVED'
                              ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                              : e.status === 'PENDING_APPROVAL'
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                              : e.status === 'REJECTED'
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {e.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && hasPermission('expenses.approve') && (
                            <>
                              <button
                                onClick={() => handleApprove(e, true)}
                                disabled={processingAction}
                                className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] transition-colors cursor-pointer"
                                title="Approve and mark as Paid immediately"
                              >
                                Approve &amp; Pay
                              </button>
                              <button
                                onClick={() => handleApprove(e, false)}
                                disabled={processingAction}
                                className="px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold text-[11px] transition-colors cursor-pointer"
                                title="Approve only"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingExpense(e);
                                  setRejectionReason('');
                                }}
                                disabled={processingAction}
                                className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-[11px] transition-colors cursor-pointer"
                                title="Reject"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {e.status === 'APPROVED' && hasPermission('expenses.approve') && (
                            <button
                              onClick={() => handleApprove(e, true)}
                              disabled={processingAction}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] cursor-pointer"
                            >
                              Disburse / Pay
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

      {/* Expense Modal */}
      {school && profile && (
        <ExpenseModal
          isOpen={createModalOpen}
          schoolId={school.id}
          categories={categories}
          userId={profile.uid}
          userName={profile.name}
          userRole={profile.role}
          financialYear="2026-27"
          onClose={() => setCreateModalOpen(false)}
          onSaved={() => loadData()}
          onAddCustomCategory={async (cat) => {
            if (school?.id) {
              await addExpenseCategory(school.id, cat);
              setCategories((prev) => [...prev, cat]);
            }
          }}
        />
      )}

      {/* Reject Reason Modal */}
      {rejectingExpense && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 text-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Reject Expense Voucher
            </h3>
            <p className="text-slate-500 mb-4">
              Specify the reason for rejecting voucher #{rejectingExpense.id} ({formatINR(rejectingExpense.amount, false)}).
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-3">
              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason for rejection..."
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
              />

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingExpense(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingAction}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

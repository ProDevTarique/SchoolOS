import React, { useState } from 'react';
import {
  Expense,
  PaymentMode,
  ExpenseStatus,
  STANDARD_EXPENSE_CATEGORIES,
} from '../../../types';
import { createExpense } from '../services/expenseService';
import { X, Save, Plus } from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  schoolId: string;
  categories: string[];
  userId: string;
  userName: string;
  userRole: string;
  financialYear: string;
  onClose: () => void;
  onSaved: () => void;
  onAddCustomCategory: (cat: string) => Promise<void>;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  schoolId,
  categories,
  userId,
  userName,
  userRole,
  financialYear,
  onClose,
  onSaved,
  onAddCustomCategory,
}) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState(categories[0] || 'Maintenance');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCatName, setCustomCatName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [vendorPayee, setVendorPayee] = useState('');
  const [status, setStatus] = useState<ExpenseStatus>('PENDING_APPROVAL');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !vendorPayee.trim() || amount === '' || Number(amount) <= 0) {
      setError('Please provide description, payee, and a valid expense amount.');
      return;
    }

    let finalCategory = category;
    if (isCustomCategory) {
      if (!customCatName.trim()) {
        setError('Please enter custom category name.');
        return;
      }
      finalCategory = customCatName.trim();
      await onAddCustomCategory(finalCategory);
    }

    setSaving(true);
    setError(null);
    try {
      await createExpense(
        {
          schoolId,
          financialYear,
          date,
          category: finalCategory,
          description: description.trim(),
          amount: Number(amount),
          paymentMode,
          referenceNumber: referenceNumber.trim() || undefined,
          vendorPayee: vendorPayee.trim(),
          status,
          submittedBy: userId,
          submittedByName: userName,
          remarks: remarks.trim() || undefined,
        },
        userId,
        userName,
        userRole
      );

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create expense voucher.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Create Expense Voucher
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5">
              Record institutional expenditure, bills, maintenance, or vendor payments.
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="0.00"
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Expense Category *
            </label>
            {!isCustomCategory ? (
              <select
                value={category}
                onChange={(e) => {
                  if (e.target.value === '__CUSTOM__') {
                    setIsCustomCategory(true);
                  } else {
                    setCategory(e.target.value);
                  }
                }}
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="__CUSTOM__">+ Add Custom Category...</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={customCatName}
                  onChange={(e) => setCustomCatName(e.target.value)}
                  placeholder="New category name..."
                  className="flex-1 py-2 px-3 rounded-xl border border-indigo-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setIsCustomCategory(false)}
                  className="px-3 py-1 text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description / Purpose *
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Monthly electricity bill for school campus"
              className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Vendor / Payee *
              </label>
              <input
                type="text"
                required
                value={vendorPayee}
                onChange={(e) => setVendorPayee(e.target.value)}
                placeholder="e.g. State Electricity Board / Vendor"
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Payment Mode *
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                <option value="UPI">UPI</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Invoice / Reference No
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. Bill #12345"
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Initial Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ExpenseStatus)}
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="DRAFT">Draft</option>
                {userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'PRINCIPAL' ? (
                  <>
                    <option value="APPROVED">Approved</option>
                    <option value="PAID">Paid (Immediately Disbursed)</option>
                  </>
                ) : null}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Remarks / Notes
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Additional internal audit notes..."
              className="w-full py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors cursor-pointer"
            >
              {saving ? 'Creating...' : 'Submit Voucher'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { FeeItem } from '../../../types';
import { grantFeeConcession } from '../services/feeAssignmentService';
import { formatINR, roundINR } from '../utils/currencyUtils';
import { X, Check, AlertCircle } from 'lucide-react';

interface ConcessionModalProps {
  isOpen: boolean;
  item: FeeItem | null;
  studentName: string;
  admissionNumber: string;
  userId: string;
  userName: string;
  userRole: string;
  onClose: () => void;
  onGranted: () => void;
}

export const ConcessionModal: React.FC<ConcessionModalProps> = ({
  isOpen,
  item,
  studentName,
  admissionNumber,
  userId,
  userName,
  userRole,
  onClose,
  onGranted,
}) => {
  const [concessionAmount, setConcessionAmount] = useState<number | ''>('');
  const [concessionType, setConcessionType] = useState<'FIXED_AMOUNT' | 'PERCENTAGE'>('FIXED_AMOUNT');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const numConcession = typeof concessionAmount === 'number' ? concessionAmount : 0;
  const originalGross = item.grossAmount;
  const newPayable = Math.max(0, roundINR(
    concessionType === 'PERCENTAGE'
      ? originalGross - (originalGross * numConcession / 100)
      : originalGross - numConcession
  ));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numConcession <= 0 || (concessionType === 'PERCENTAGE' && numConcession > 100)) {
      setError(concessionType === 'PERCENTAGE'
        ? 'Percentage concession must be between 1% and 100%.'
        : 'Concession amount must be greater than zero.');
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a justification / approval reason.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await grantFeeConcession({
        schoolId: item.schoolId,
        academicSessionId: item.academicSessionId,
        studentId: item.studentId,
        feeItemId: item.id,
        concessionAmount: numConcession,
        concessionType,
        reason: reason.trim(),
        userId,
        userName,
        userRole,
      });
      onGranted();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to grant concession.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Grant Fee Concession
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Apply an authorized concession without altering the original fee schedule.
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Target Student & Fee Item Summary */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Student:</span>
              <span className="font-bold text-slate-900 dark:text-white">{studentName} ({admissionNumber})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Fee Item:</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">{item.name}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
              <span className="text-slate-500">Original Scheduled Fee:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{formatINR(originalGross, true)}</span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Concession Type *
            </label>
            <select
              value={concessionType}
              onChange={(e) => setConcessionType(e.target.value as 'FIXED_AMOUNT' | 'PERCENTAGE')}
              className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="FIXED_AMOUNT">Fixed amount</option>
              <option value="PERCENTAGE">Percentage</option>
            </select>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 mt-3">
              {concessionType === 'PERCENTAGE' ? 'Concession Percentage *' : 'Concession Amount (₹) *'}
            </label>
            <input
              type="number"
              min="1"
              max={concessionType === 'PERCENTAGE' ? 100 : undefined}
              step="1"
              required
              value={concessionAmount}
              onChange={(e) => setConcessionAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
              placeholder="e.g. 300"
              className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm"
            />
            {numConcession > 0 && (
              <div className="mt-1.5 p-2 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-[11px] flex justify-between">
                <span className="text-slate-600 dark:text-slate-300">Revised Payable:</span>
                <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                  {formatINR(newPayable, true)}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Approval Justification / Reason *
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Principal approved 20% sibling concession / special scholarship"
              className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'Applying...' : 'Grant Concession'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

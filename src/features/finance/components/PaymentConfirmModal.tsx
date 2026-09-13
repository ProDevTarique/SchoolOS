import React from 'react';
import { formatINR } from '../utils/currencyUtils';
import { CheckCircle, AlertCircle, Printer, PlusCircle, User, X } from 'lucide-react';
import { Receipt, Student } from '../../../types';

interface PaymentConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  summary: {
    studentName: string;
    admissionNumber: string;
    className: string;
    selectedItemsCount: number;
    grossAmount: number;
    discountAmount: number;
    lateFeeAmount: number;
    netPayable: number;
    amountReceived: number;
    advanceSurplus: number;
    paymentMode: string;
    referenceNumber?: string;
    paymentDate: string;
    remarks?: string;
  };
}

export const PaymentConfirmModal: React.FC<PaymentConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading,
  summary,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              ₹
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Confirm Fee Payment
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Please review payment details before recording.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Student & Payment Summary Box */}
        <div className="space-y-3 text-xs mb-5">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-slate-500 dark:text-slate-400">Student:</span>
              <span className="font-bold text-slate-900 dark:text-white">{summary.studentName}</span>
            </div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-slate-500 dark:text-slate-400">Admission No:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">{summary.admissionNumber}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">Class:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{summary.className}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-1.5">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Items Being Paid:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {summary.selectedItemsCount} Fee Item(s)
              </span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Gross Fee:</span>
              <span className="font-mono">{formatINR(summary.grossAmount, false)}</span>
            </div>
            {summary.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Discount Applied:</span>
                <span className="font-mono">-{formatINR(summary.discountAmount, false)}</span>
              </div>
            )}
            {summary.lateFeeAmount > 0 && (
              <div className="flex justify-between text-amber-600 dark:text-amber-400">
                <span>Late Fee Added:</span>
                <span className="font-mono">+{formatINR(summary.lateFeeAmount, false)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium pt-1 border-t border-indigo-200/60 dark:border-indigo-900/40">
              <span>Net Fee Payable:</span>
              <span className="font-mono">{formatINR(summary.netPayable, true)}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-bold text-indigo-700 dark:text-indigo-300 pt-1">
              <span>Amount Received:</span>
              <span className="font-mono text-base">{formatINR(summary.amountReceived, true)}</span>
            </div>
            {summary.advanceSurplus > 0 && (
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold pt-1">
                <span>Surplus Advance:</span>
                <span className="font-mono">{formatINR(summary.advanceSurplus, true)}</span>
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Payment Mode:</span>
              <span className="font-semibold text-slate-900 dark:text-white uppercase">{summary.paymentMode}</span>
            </div>
            {summary.referenceNumber && (
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Txn / Ref No:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{summary.referenceNumber}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Payment Date:</span>
              <span className="text-slate-700 dark:text-slate-300">{summary.paymentDate}</span>
            </div>
            {summary.remarks && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700">
                Remarks: {summary.remarks}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel / Edit
          </button>
          <button
            id="btn-confirm-save-payment"
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span>Recording...</span>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Confirm &amp; Record</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

interface PaymentSuccessModalProps {
  isOpen: boolean;
  receipt: Receipt | null;
  student: Student | null;
  onPrintReceipt: () => void;
  onNewPayment: () => void;
  onViewStudent: () => void;
}

export const PaymentSuccessModal: React.FC<PaymentSuccessModalProps> = ({
  isOpen,
  receipt,
  student,
  onPrintReceipt,
  onNewPayment,
  onViewStudent,
}) => {
  if (!isOpen || !receipt) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 text-center animate-in fade-in zoom-in duration-150">
        <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3">
          <CheckCircle className="w-8 h-8" />
        </div>

        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Payment Recorded Successfully
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Official receipt has been generated and cash book updated.
        </p>

        {/* Details card */}
        <div className="my-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-left text-xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 dark:text-slate-400">Receipt No:</span>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
              {receipt.receiptNumber}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 dark:text-slate-400">Student:</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {receipt.studentName}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 dark:text-slate-400">Amount Received:</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              {formatINR(receipt.netPaid, true)}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400">Remaining Due Balance:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {formatINR(receipt.remainingBalance, true)}
            </span>
          </div>
        </div>

        {/* Buttons: PRINT RECEIPT, NEW PAYMENT, VIEW STUDENT */}
        <div className="space-y-2">
          <button
            id="btn-print-receipt-success"
            type="button"
            onClick={onPrintReceipt}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>PRINT RECEIPT</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              id="btn-new-payment-action"
              type="button"
              onClick={onNewPayment}
              className="py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>NEW PAYMENT</span>
            </button>
            <button
              id="btn-view-student-action"
              type="button"
              onClick={onViewStudent}
              className="py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>VIEW STUDENT</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

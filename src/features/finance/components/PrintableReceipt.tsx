import React from 'react';
import { Receipt, School } from '../../../types';
import { formatINR, numberToWordsINR } from '../utils/currencyUtils';
import { GraduationCap, Printer, X } from 'lucide-react';

interface PrintableReceiptProps {
  receipt: Receipt;
  school: School | null;
  onClose?: () => void;
}

export const PrintableReceipt: React.FC<PrintableReceiptProps> = ({ receipt, school, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const isCancelled = receipt.status === 'CANCELLED';

  return (
    <div className="bg-white text-slate-900 font-sans p-6 sm:p-8 max-w-3xl mx-auto rounded-xl shadow-lg border border-slate-200 printable-receipt-container">
      {/* Top action bar (hidden on print) */}
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 print:hidden">
        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
          <span>Official Fee Receipt</span>
          {isCancelled && (
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
              CANCELLED
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            id="btn-print-receipt-action"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Watermark for Cancelled receipt */}
      {isCancelled && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-15 select-none z-10">
            <span className="text-7xl font-extrabold text-rose-600 rotate-[-25deg] uppercase border-4 border-rose-600 px-6 py-2 rounded-xl">
              CANCELLED
            </span>
          </div>
        </div>
      )}

      {/* Receipt Header / Institutional Info */}
      <div className="border-b-2 border-slate-800 pb-5 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {school?.logoUrl ? (
              <img
                src={school.logoUrl}
                alt={school.name}
                className="w-16 h-16 object-contain rounded-lg border border-slate-200 bg-white p-1"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold">
                <GraduationCap className="w-8 h-8" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-950 uppercase">
                {school?.name || 'SchoolOS Institutional ERP'}
              </h1>
              <p className="text-xs text-slate-600 mt-0.5 max-w-md leading-relaxed">
                {school?.address ? `${school.address}, ` : ''}
                {school?.city ? `${school.city}, ` : ''}
                {school?.state ? `${school.state} - ` : ''}
                {school?.pinCode || ''}
              </p>
              <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-x-3">
                {school?.phone && <span>Tel: {school.phone}</span>}
                {school?.email && <span>Email: {school.email}</span>}
                {school?.code && <span>Affiliation / School Code: {school.code}</span>}
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-800 font-bold text-xs uppercase tracking-wider rounded border border-slate-300">
              FEE RECEIPT
            </span>
            <div className="text-xs font-semibold text-slate-900 mt-2">
              Receipt No: <span className="font-mono text-indigo-700">{receipt.receiptNumber}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Date: <span className="font-medium text-slate-700">{receipt.paymentDate}</span>
            </div>
            {receipt.financialYear && (
              <div className="text-[11px] text-slate-500">
                FY: <span className="font-medium text-slate-700">{receipt.financialYear}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Student & Parent Particulars */}
      <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 mb-5 text-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-4">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
              Student Name
            </span>
            <span className="font-bold text-slate-900 text-sm">{receipt.studentName}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
              Admission No.
            </span>
            <span className="font-mono font-semibold text-slate-800">{receipt.admissionNumber}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
              Class &amp; Section
            </span>
            <span className="font-semibold text-slate-800">
              {receipt.className} {receipt.sectionName ? ` - ${receipt.sectionName}` : ''}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
              Parent / Guardian
            </span>
            <span className="font-medium text-slate-800">{receipt.parentName || '—'}</span>
          </div>
        </div>
      </div>

      {/* Fee Items Table */}
      <div className="overflow-x-auto mb-5">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 border-y border-slate-300 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-2 px-3">#</th>
              <th className="py-2 px-3">Fee Particulars</th>
              <th className="py-2 px-3">Period</th>
              <th className="py-2 px-3 text-right">Fee Due</th>
              <th className="py-2 px-3 text-right">Discount</th>
              <th className="py-2 px-3 text-right">Late Fee</th>
              <th className="py-2 px-3 text-right">Amount Paid</th>
              <th className="py-2 px-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-800">
            {receipt.items && receipt.items.length > 0 ? (
              receipt.items.map((item, index) => (
                <tr key={index} className="hover:bg-slate-50/50">
                  <td className="py-2 px-3 text-slate-500">{index + 1}</td>
                  <td className="py-2 px-3 font-medium text-slate-900">{item.feeType}</td>
                  <td className="py-2 px-3 text-slate-600">{item.period || '—'}</td>
                  <td className="py-2 px-3 text-right font-mono">{formatINR(item.amount, false)}</td>
                  <td className="py-2 px-3 text-right font-mono text-emerald-700">
                    {item.discount > 0 ? `-${formatINR(item.discount, false)}` : '—'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-amber-700">
                    {item.lateFee > 0 ? `+${formatINR(item.lateFee, false)}` : '—'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-950">
                    {formatINR(item.paid, false)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-600">
                    {formatINR(item.remaining, false)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-3 text-center text-slate-500 italic">
                  Fee payment voucher
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals & Net Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3 border-t-2 border-slate-800 mb-6">
        {/* Left: Amount in Words & Payment metadata */}
        <div className="space-y-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              Amount in Words:
            </span>
            <div className="text-xs font-semibold text-slate-900 italic mt-0.5 leading-relaxed bg-slate-50 p-2 rounded border border-slate-200">
              {numberToWordsINR(receipt.netPaid)}
            </div>
          </div>

          <div className="text-xs space-y-1 text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200">
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Mode:</span>
              <span className="font-semibold text-slate-800">{receipt.paymentMode}</span>
            </div>
            {receipt.referenceNumber && (
              <div className="flex justify-between">
                <span className="text-slate-500">Reference / Txn ID:</span>
                <span className="font-mono text-slate-800">{receipt.referenceNumber}</span>
              </div>
            )}
            {receipt.advanceAmount > 0 && (
              <div className="flex justify-between text-indigo-700 font-medium">
                <span>Credited to Advance:</span>
                <span className="font-mono">{formatINR(receipt.advanceAmount, false)}</span>
              </div>
            )}
            {receipt.remarks && (
              <div className="pt-1 text-[11px] text-slate-500 border-t border-slate-200">
                Remarks: {receipt.remarks}
              </div>
            )}
          </div>
        </div>

        {/* Right: Summary Figures */}
        <div className="text-xs space-y-1.5 self-end">
          <div className="flex justify-between text-slate-600">
            <span>Gross Amount Due:</span>
            <span className="font-mono font-medium">{formatINR(receipt.grossAmount, true)}</span>
          </div>

          {receipt.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Total Discount / Concession:</span>
              <span className="font-mono font-medium">-{formatINR(receipt.discountAmount, true)}</span>
            </div>
          )}

          {receipt.lateFeeAmount > 0 && (
            <div className="flex justify-between text-amber-700">
              <span>Late Fee / Fine:</span>
              <span className="font-mono font-medium">+{formatINR(receipt.lateFeeAmount, true)}</span>
            </div>
          )}

          <div className="flex justify-between py-1.5 border-y-2 border-slate-900 text-sm font-bold text-slate-950">
            <span>Total Net Paid:</span>
            <span className="font-mono text-indigo-700 text-base">{formatINR(receipt.netPaid, true)}</span>
          </div>

          <div className="flex justify-between text-slate-500 text-[11px] pt-1">
            <span>Previous Due Balance:</span>
            <span className="font-mono">{formatINR(receipt.previousBalance, true)}</span>
          </div>

          <div className="flex justify-between text-slate-900 font-semibold text-xs">
            <span>Remaining Outstanding Balance:</span>
            <span className="font-mono text-rose-600 font-bold">{formatINR(receipt.remainingBalance, true)}</span>
          </div>
        </div>
      </div>

      {/* Cancellation Notice if applicable */}
      {isCancelled && (
        <div className="mb-6 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          <div className="font-bold">This receipt was cancelled on {receipt.cancelledAt?.split('T')[0] || ''}</div>
          <div>Reason: {receipt.cancellationReason || 'Administrative cancellation'}</div>
          {receipt.cancelledByName && <div>Cancelled By: {receipt.cancelledByName}</div>}
        </div>
      )}

      {/* Signatures & Footer Note */}
      <div className="pt-8 border-t border-slate-200">
        <div className="flex justify-between items-end text-xs text-slate-500">
          <div>
            <div className="text-[10px] text-slate-400">
              Computer Generated Receipt • SchoolOS ERP
            </div>
            <div className="text-[10px] text-slate-400">
              Generated on {new Date(receipt.createdAt).toLocaleString('en-IN')}
            </div>
          </div>

          <div className="text-center">
            <div className="w-48 border-b border-slate-400 pb-1 mb-1 font-semibold text-slate-800 text-[11px]">
              {receipt.authorizedSignature || 'Authorized Signatory'}
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">
              Accounts Officer / Cashier
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

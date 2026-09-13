import React from 'react';
import { Receipt, School } from '../../../types';
import { PrintableReceipt } from './PrintableReceipt';

interface ReceiptModalProps {
  isOpen: boolean;
  receipt: Receipt | null;
  school: School | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  receipt,
  school,
  onClose,
}) => {
  if (!isOpen || !receipt) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <PrintableReceipt receipt={receipt} school={school} onClose={onClose} />
      </div>
    </div>
  );
};

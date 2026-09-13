import React, { useState, useEffect } from 'react';
import {
  Search,
  User,
  CreditCard,
  CheckSquare,
  Square,
  AlertCircle,
  Clock,
  CheckCircle,
  Sparkles,
  Phone,
  Layers,
  Calendar,
  Building,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { Student, FeeItem, PaymentMode, ChequeDetails, Receipt, School } from '../../../types';
import { getStudents } from '../../../services/studentService';
import { getStudentFeeItems } from '../services/feeAssignmentService';
import { recordFeePayment } from '../services/feePaymentService';
import { getClasses, getSections } from '../../../services/academicService';
import { getFinancialSettings } from '../services/financeSettingsService';
import { formatINR, roundINR, subINR, addINR } from '../utils/currencyUtils';
import { autoAllocatePayment, getDaysOverdue } from '../utils/feeCalculations';
import { PaymentConfirmModal, PaymentSuccessModal } from './PaymentConfirmModal';
import { ReceiptModal } from './ReceiptModal';
import { useAuth } from '../../../hooks/useAuth';

interface CollectFeeTabProps {
  initialStudentId?: string;
  onViewStudentProfile?: (studentId: string) => void;
}

export const CollectFeeTab: React.FC<CollectFeeTabProps> = ({
  initialStudentId,
  onViewStudentProfile,
}) => {
  const { school, profile } = useAuth();

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Fee items state
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Payment form state
  const [amountReceived, setAmountReceived] = useState<number | ''>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');

  // Cheque details
  const [chequeNumber, setChequeNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [chequeDate, setChequeDate] = useState(new Date().toISOString().split('T')[0]);

  // Modals state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdReceipt, setCreatedReceipt] = useState<Receipt | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Metadata caches
  const [classesMap, setClassesMap] = useState<Map<string, string>>(new Map());
  const [sectionsMap, setSectionsMap] = useState<Map<string, string>>(new Map());
  const [financialYear, setFinancialYear] = useState('2026-27');

  useEffect(() => {
    if (!school?.id) return;
    const loadMeta = async () => {
      try {
        const [clsList, secList, settings] = await Promise.all([
          getClasses(school.id),
          getSections(school.id),
          getFinancialSettings(school.id),
        ]);
        setClassesMap(new Map(clsList.map((c) => [c.id, c.name])));
        setSectionsMap(new Map(secList.map((s) => [s.id, s.name])));
        if (settings?.financialYear) setFinancialYear(settings.financialYear);
      } catch (err) {
        console.error('Failed to load classes or settings:', err);
      }
    };
    loadMeta();
  }, [school?.id]);

  // Initial student loading if passed
  useEffect(() => {
    if (!initialStudentId || !school?.id) return;
    const loadInitialStudent = async () => {
      const students = await getStudents(school.id);
      const target = students.find((s) => s.id === initialStudentId);
      if (target) {
        handleSelectStudent(target);
      }
    };
    loadInitialStudent();
  }, [initialStudentId, school?.id]);

  // Search debouncing
  useEffect(() => {
    if (!school?.id || !searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await getStudents(school.id, { search: searchTerm.trim() });
        setSearchResults(results.slice(0, 8)); // top 8 matches
      } catch (err) {
        console.error('Error searching students:', err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm, school?.id]);

  // Handle student selection
  const handleSelectStudent = async (student: Student) => {
    setSelectedStudent(student);
    setSearchResults([]);
    setSearchTerm('');
    setLoadingItems(true);

    try {
      const items = await getStudentFeeItems(student.schoolId, student.id);
      const pendingItems = items.filter((i) => i.status !== 'WAIVED' && i.status !== 'PAID' && i.balance > 0);
      setFeeItems(pendingItems);

      // Auto-select all pending items by default for fast checkout
      const ids = pendingItems.map((i) => i.id);
      setSelectedItemIds(ids);

      const totalDue = pendingItems.reduce((acc, curr) => addINR(acc, curr.balance), 0);
      setAmountReceived(totalDue > 0 ? totalDue : '');
    } catch (err) {
      console.error('Failed to load student fee items:', err);
    } finally {
      setLoadingItems(false);
    }
  };

  // Toggle selection of a single item
  const toggleItemSelection = (id: string) => {
    const next = selectedItemIds.includes(id)
      ? selectedItemIds.filter((item) => item !== id)
      : [...selectedItemIds, id];
    setSelectedItemIds(next);

    // Update suggested amount
    const selected = feeItems.filter((i) => next.includes(i.id));
    const totalDue = selected.reduce((acc, curr) => addINR(acc, curr.balance), 0);
    setAmountReceived(totalDue > 0 ? totalDue : '');
  };

  // Toggle all
  const toggleSelectAll = () => {
    if (selectedItemIds.length === feeItems.length) {
      setSelectedItemIds([]);
      setAmountReceived('');
    } else {
      const allIds = feeItems.map((i) => i.id);
      setSelectedItemIds(allIds);
      const totalDue = feeItems.reduce((acc, curr) => addINR(acc, curr.balance), 0);
      setAmountReceived(totalDue > 0 ? totalDue : '');
    }
  };

  // Computations
  const selectedItems = feeItems.filter((i) => selectedItemIds.includes(i.id));
  const selectedGross = selectedItems.reduce((acc, curr) => addINR(acc, curr.grossAmount), 0);
  const selectedDiscount = selectedItems.reduce((acc, curr) => addINR(acc, curr.discountAmount || 0), 0);
  const selectedLateFee = selectedItems.reduce((acc, curr) => addINR(acc, curr.lateFeeAmount || 0), 0);
  const selectedNetPayable = selectedItems.reduce((acc, curr) => addINR(acc, curr.balance), 0);

  const numAmountReceived = typeof amountReceived === 'number' ? amountReceived : 0;
  const advanceSurplus = Math.max(0, subINR(numAmountReceived, selectedNetPayable));

  // Handle open confirm modal
  const handleInitiatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || numAmountReceived <= 0) return;
    if (paymentMode === 'CHEQUE' && !chequeNumber.trim()) {
      alert('Please enter the cheque number.');
      return;
    }
    setIdempotencyKey((current) => current || crypto.randomUUID());
    setShowConfirmModal(true);
  };

  // Execute payment
  const handleConfirmPayment = async () => {
    if (!selectedStudent || !school?.id || !profile) return;
    setRecordingPayment(true);

    try {
      const { allocations } = autoAllocatePayment(selectedItems, numAmountReceived);

      let chequeDetails: ChequeDetails | undefined;
      if (paymentMode === 'CHEQUE') {
        chequeDetails = {
          chequeNumber: chequeNumber.trim(),
          bankName: bankName.trim(),
          chequeDate,
          clearingStatus: 'PENDING',
        };
      }

      const res = await recordFeePayment({
        schoolId: school.id,
        academicSessionId: selectedStudent.sessionId || 'session_demo_2025_26',
        financialYear,
        studentId: selectedStudent.id,
        studentName: selectedStudent.fullName,
        admissionNumber: selectedStudent.admissionNumber,
        className: classesMap.get(selectedStudent.classId) || 'Class',
        sectionName: sectionsMap.get(selectedStudent.sectionId) || '',
        parentName: selectedStudent.fatherName || selectedStudent.motherName || 'Parent',
        parentPhone: selectedStudent.fatherPhone || selectedStudent.motherPhone,
        paymentDate,
        paymentMode,
        referenceNumber: referenceNumber.trim() || undefined,
        chequeDetails,
        remarks: remarks.trim() || undefined,
        amountReceived: numAmountReceived,
        idempotencyKey,
        itemAllocations: allocations.map((a) => ({
          feeItemId: a.feeItemId,
          allocatedAmount: a.allocatedAmount,
          discountApplied: a.discountApplied,
          lateFeeApplied: a.lateFeeApplied,
        })),
        advanceToCredit: advanceSurplus,
        userId: profile.uid,
        userName: profile.name,
        userRole: profile.role,
      });

      setShowConfirmModal(false);
      setCreatedReceipt(res.receipt);
      setShowSuccessModal(true);

      // Refresh items for this student in background
      const refreshed = await getStudentFeeItems(selectedStudent.schoolId, selectedStudent.id);
      setFeeItems(refreshed.filter((i) => i.status !== 'WAIVED' && i.status !== 'PAID' && i.balance > 0));
    } catch (err: any) {
      console.error('Failed to record payment:', err);
      alert(err?.message || 'Payment recording failed. Please try again.');
    } finally {
      setRecordingPayment(false);
    }
  };

  // Reset for new payment
  const handleResetNewPayment = () => {
    setSelectedStudent(null);
    setFeeItems([]);
    setSelectedItemIds([]);
    setAmountReceived('');
    setReferenceNumber('');
    setRemarks('');
    setChequeNumber('');
    setBankName('');
    setShowSuccessModal(false);
    setCreatedReceipt(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Student Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="max-w-2xl">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Search Student for Fee Collection
          </label>
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
            <input
              id="input-fee-student-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Admission No, Name, Roll No, Parent Name, or Phone..."
              className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
            {searching && (
              <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin absolute right-3.5 top-3.5" />
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {searchResults.length > 0 && (
            <div className="mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/60 overflow-hidden z-20">
              {searchResults.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelectStudent(s)}
                  className="w-full p-3 text-left hover:bg-indigo-50/60 dark:hover:bg-slate-700/50 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    {s.photoUrl ? (
                      <img
                        src={s.photoUrl}
                        alt={s.fullName}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                        {s.fullName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        {s.fullName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <span className="font-mono font-medium">{s.admissionNumber}</span>
                        <span>•</span>
                        <span>
                          {classesMap.get(s.classId) || 'Class'} {sectionsMap.get(s.sectionId) ? `- ${sectionsMap.get(s.sectionId)}` : ''}
                        </span>
                        {s.fatherName && (
                          <>
                            <span>•</span>
                            <span>Parent: {s.fatherName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold flex items-center gap-1">
                    <span>Collect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Student Banner */}
      {selectedStudent && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {selectedStudent.photoUrl ? (
                <img
                  src={selectedStudent.photoUrl}
                  alt={selectedStudent.fullName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-200 dark:border-indigo-900"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-sm">
                  {selectedStudent.fullName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {selectedStudent.fullName}
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    {selectedStudent.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <div>
                    Admission No: <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{selectedStudent.admissionNumber}</span>
                  </div>
                  <div>
                    Class: <span className="font-semibold text-slate-700 dark:text-slate-200">{classesMap.get(selectedStudent.classId) || 'Class'} {sectionsMap.get(selectedStudent.sectionId) ? `- ${sectionsMap.get(selectedStudent.sectionId)}` : ''}</span>
                  </div>
                  {selectedStudent.rollNumber && (
                    <div>
                      Roll No: <span className="font-mono text-slate-700 dark:text-slate-200">{selectedStudent.rollNumber}</span>
                    </div>
                  )}
                  {selectedStudent.fatherName && (
                    <div>
                      Parent: <span className="text-slate-700 dark:text-slate-200">{selectedStudent.fatherName}</span>
                    </div>
                  )}
                  {selectedStudent.fatherPhone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span className="font-mono">{selectedStudent.fatherPhone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {onViewStudentProfile && (
                <button
                  type="button"
                  onClick={() => onViewStudentProfile(selectedStudent.id)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Student Fee Profile
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                Change Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fee Items Checklist & Collection Form */}
      {selectedStudent && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Outstanding Dues List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    {selectedItemIds.length === feeItems.length && feeItems.length > 0 ? (
                      <CheckSquare className="w-5 h-5 text-indigo-600" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Outstanding Fee Dues ({feeItems.length})
                  </h3>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Total Outstanding:{' '}
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                    {formatINR(
                      feeItems.reduce((acc, curr) => addINR(acc, curr.balance), 0),
                      true
                    )}
                  </span>
                </div>
              </div>

              {loadingItems ? (
                <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                  <span>Loading student dues...</span>
                </div>
              ) : feeItems.length === 0 ? (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                  <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    No Outstanding Dues
                  </p>
                  <p className="text-xs mt-0.5">
                    This student has cleared all scheduled fees or none have been assigned yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {feeItems.map((item) => {
                    const isSelected = selectedItemIds.includes(item.id);
                    const daysOver = getDaysOverdue(item.dueDate, 0);

                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleItemSelection(item.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-800 shadow-xs'
                            : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleItemSelection(item.id);
                            }}
                            className="text-slate-400 hover:text-indigo-600"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-indigo-600" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>
                          <div>
                            <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>Due Date: {item.dueDate}</span>
                              {daysOver > 0 && (
                                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                                  ({daysOver} days overdue)
                                </span>
                              )}
                              {item.lateFeeAmount > 0 && (
                                <span className="text-amber-600 dark:text-amber-400">
                                  • Late fine: +{formatINR(item.lateFeeAmount, false)}
                                </span>
                              )}
                              {item.concessionAmount > 0 && (
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  • Concession: -{formatINR(item.concessionAmount, false)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                            {formatINR(item.balance, true)}
                          </div>
                          <span
                            className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                              item.status === 'OVERDUE'
                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                                : item.status === 'PARTIAL'
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Payment Entry Desk */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                Payment Collection Form
              </h3>

              <form onSubmit={handleInitiatePayment} className="space-y-4">
                {/* Dues Summary Pill */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Selected Items:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedItems.length} items
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Total Net Dues:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatINR(selectedNetPayable, true)}
                    </span>
                  </div>
                </div>

                {/* Amount Received Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Amount Received (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">₹</span>
                    <input
                      id="input-fee-amount-received"
                      type="number"
                      min="1"
                      step="0.01"
                      required
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 text-base font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                  {numAmountReceived > 0 && (
                    <div className="mt-1 text-[11px] flex justify-between">
                      {numAmountReceived < selectedNetPayable ? (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          Partial payment. Remaining due: {formatINR(subINR(selectedNetPayable, numAmountReceived), true)}
                        </span>
                      ) : advanceSurplus > 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Full payment + {formatINR(advanceSurplus, true)} credited to Advance
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Full payment of selected dues
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Mode *
                  </label>
                  <select
                    id="select-fee-payment-mode"
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                    className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT / IMPS / RTGS)</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="DEMAND_DRAFT">Demand Draft (DD)</option>
                    <option value="CARD">Debit / Credit Card</option>
                    <option value="ONLINE">Online Portal</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                {/* Cheque Details if Cheque */}
                {paymentMode === 'CHEQUE' && (
                  <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-2 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                        Cheque Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={chequeNumber}
                        onChange={(e) => setChequeNumber(e.target.value)}
                        placeholder="e.g. 000124"
                        className="w-full py-1.5 px-2.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g. State Bank of India"
                        className="w-full py-1.5 px-2.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                        Cheque Date
                      </label>
                      <input
                        type="date"
                        value={chequeDate}
                        onChange={(e) => setChequeDate(e.target.value)}
                        className="w-full py-1.5 px-2.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                {/* Reference / Txn No */}
                {paymentMode !== 'CASH' && paymentMode !== 'CHEQUE' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Transaction / Reference Number
                    </label>
                    <input
                      id="input-fee-ref-number"
                      type="text"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="e.g. UPI Ref, UTR No, Card Auth Code"
                      className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                {/* Payment Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Date
                  </label>
                  <input
                    id="input-fee-payment-date"
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Remarks / Notes
                  </label>
                  <textarea
                    rows={2}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Optional transaction note..."
                    className="w-full py-1.5 px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                  />
                </div>

                <button
                  id="btn-submit-fee-payment"
                  type="submit"
                  disabled={numAmountReceived <= 0 || selectedItems.length === 0}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Collect {numAmountReceived > 0 ? formatINR(numAmountReceived, true) : 'Fee'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {selectedStudent && (
        <PaymentConfirmModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleConfirmPayment}
          loading={recordingPayment}
          summary={{
            studentName: selectedStudent.fullName,
            admissionNumber: selectedStudent.admissionNumber,
            className: classesMap.get(selectedStudent.classId) || 'Class',
            selectedItemsCount: selectedItems.length,
            grossAmount: selectedGross,
            discountAmount: selectedDiscount,
            lateFeeAmount: selectedLateFee,
            netPayable: selectedNetPayable,
            amountReceived: numAmountReceived,
            advanceSurplus,
            paymentMode,
            referenceNumber,
            paymentDate,
            remarks,
          }}
        />
      )}

      {/* Post-Payment Success Modal */}
      <PaymentSuccessModal
        isOpen={showSuccessModal}
        receipt={createdReceipt}
        student={selectedStudent}
        onPrintReceipt={() => setShowPrintModal(true)}
        onNewPayment={handleResetNewPayment}
        onViewStudent={() => {
          if (selectedStudent && onViewStudentProfile) {
            onViewStudentProfile(selectedStudent.id);
          }
          setShowSuccessModal(false);
        }}
      />

      {/* Printable Receipt Modal */}
      <ReceiptModal
        isOpen={showPrintModal}
        receipt={createdReceipt}
        school={school}
        onClose={() => setShowPrintModal(false)}
      />
    </div>
  );
};

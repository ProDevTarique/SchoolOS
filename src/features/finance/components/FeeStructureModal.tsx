import React, { useState, useEffect } from 'react';
import { FeeStructure, FeeCategory, FeeFrequency, LateFeeType, ClassItem, SectionItem, AcademicSession } from '../../../types';
import { createFeeStructure, updateFeeStructure } from '../services/feeStructureService';
import { DEFAULT_INDIAN_ACADEMIC_MONTHS } from '../services/feeAssignmentService';
import { X, Save, Plus } from 'lucide-react';
import { formatINR } from '../utils/currencyUtils';

interface FeeStructureModalProps {
  isOpen: boolean;
  structure: FeeStructure | null;
  schoolId: string;
  classes: ClassItem[];
  sections: SectionItem[];
  sessions: AcademicSession[];
  categories: string[];
  feeCategories?: FeeCategory[];
  userId: string;
  userName: string;
  userRole: string;
  onClose: () => void;
  onSaved: () => void;
}

export const FeeStructureModal: React.FC<FeeStructureModalProps> = ({
  isOpen,
  structure,
  schoolId,
  classes,
  sections,
  sessions,
  categories,
  feeCategories = [],
  userId,
  userName,
  userRole,
  onClose,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [academicSessionId, setAcademicSessionId] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [feeCategory, setFeeCategory] = useState<string>('Tuition Fee');
  const [frequency, setFrequency] = useState<FeeFrequency>('MONTHLY');
  const [amount, setAmount] = useState<number | ''>('');
  const [dueDateDay, setDueDateDay] = useState<number>(10);
  const [dueDate, setDueDate] = useState<string>('');
  const [lateFeeType, setLateFeeType] = useState<LateFeeType>('FIXED');
  const [lateFeeAmount, setLateFeeAmount] = useState<number>(50);
  const [gracePeriodDays, setGracePeriodDays] = useState<number>(5);
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [description, setDescription] = useState('');
  const [applicableMonths, setApplicableMonths] = useState<string[]>(DEFAULT_INDIAN_ACADEMIC_MONTHS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (structure) {
      setName(structure.name);
      setAcademicSessionId(structure.academicSessionId);
      setClassId(structure.classId);
      setSectionId(structure.sectionId || '');
      setFeeCategory(feeCategories.find((category) => category.id === structure.feeCategoryId)?.name || structure.feeCategory);
      setFrequency(structure.frequency);
      setAmount(structure.amount);
      setDueDateDay(structure.dueDateDay || 10);
      setDueDate(structure.dueDate || '');
      setLateFeeType(structure.lateFeeRule?.type || 'NONE');
      setLateFeeAmount(structure.lateFeeRule?.amount || 0);
      setGracePeriodDays(structure.lateFeeRule?.gracePeriodDays || 0);
      setStatus(structure.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE');
      setDescription(structure.description || '');
      setApplicableMonths(structure.applicableMonths || DEFAULT_INDIAN_ACADEMIC_MONTHS);
    } else {
      setName('');
      setAcademicSessionId(sessions.find((s) => s.isActive)?.id || (sessions[0]?.id || ''));
      setClassId(classes[0]?.id || '');
      setSectionId('');
      setFeeCategory(feeCategories.find((category) => category.status === 'ACTIVE')?.name || 'Tuition Fee');
      setFrequency('MONTHLY');
      setAmount('');
      setDueDateDay(10);
      setDueDate('');
      setLateFeeType('FIXED');
      setLateFeeAmount(50);
      setGracePeriodDays(5);
      setStatus('ACTIVE');
      setDescription('');
      setApplicableMonths(DEFAULT_INDIAN_ACADEMIC_MONTHS);
    }
  }, [structure, isOpen, classes, sessions]);

  if (!isOpen) return null;

  const handleToggleMonth = (month: string) => {
    if (applicableMonths.includes(month)) {
      setApplicableMonths(applicableMonths.filter((m) => m !== month));
    } else {
      setApplicableMonths([...applicableMonths, month]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || amount === '' || Number(amount) < 0) {
      setError('Please provide a valid structure name and amount.');
      return;
    }

    const finalCategory = feeCategory.trim();
    const selectedCategory = feeCategories.find((category) => category.name === finalCategory && category.status === 'ACTIVE');
    if (!finalCategory || (!selectedCategory && feeCategories.length > 0)) {
      setError('Please select or specify a fee category.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        schoolId,
        academicSessionId,
        name: name.trim(),
        classId,
        sectionId: sectionId.trim() || undefined,
        feeCategory: finalCategory,
        feeCategoryId: selectedCategory?.id,
        frequency,
        applicableMonths: frequency === 'MONTHLY' ? applicableMonths : undefined,
        amount: Number(amount),
        dueDateDay: frequency === 'MONTHLY' ? Number(dueDateDay) : undefined,
        dueDate: frequency !== 'MONTHLY' ? dueDate || undefined : undefined,
        lateFeeRule: {
          type: lateFeeType,
          amount: Number(lateFeeAmount) || 0,
          gracePeriodDays: Number(gracePeriodDays) || 0,
        },
        status,
        description: description.trim() || undefined,
        createdBy: userId,
      };

      if (structure) {
        await updateFeeStructure(structure.id, payload, userId, userName, userRole);
      } else {
        await createFeeStructure(payload, userId, userName, userRole);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save fee structure.');
    } finally {
      setSaving(false);
    }
  };

  const filteredSections = sections.filter((s) => s.classId === classId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {structure ? 'Edit Fee Structure' : 'Create Fee Structure'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Define fee amounts, frequency, applicable class, and late fee rules.
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
          {/* Structure Name & Academic Session */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Structure Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Class 10 Tuition Fee 2026-27"
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Academic Session *
              </label>
              <select
                value={academicSessionId}
                onChange={(e) => setAcademicSessionId(e.target.value)}
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.isActive ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Class & Optional Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Applicable Class *
              </label>
              <select
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setSectionId('');
                }}
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Section (Optional - defaults to Entire Class)
              </label>
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">All Sections (Entire Class)</option>
                {filteredSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    Section {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fee Category & Custom */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fee Category *
              </label>
              <select
                value={feeCategory}
                onChange={(e) => setFeeCategory(e.target.value)}
                required
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Frequency *
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as FeeFrequency)}
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="HALF_YEARLY">Half-yearly</option>
                <option value="ANNUAL">Annual</option>
                <option value="ONE_TIME">One-time</option>
                <option value="PER_DAY">Per day</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>
          </div>

          {/* Amount & Due Date Rule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="e.g. 1500"
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>

            {frequency === 'MONTHLY' ? (
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Due Day of Every Month
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dueDateDay}
                  onChange={(e) => setDueDateDay(parseInt(e.target.value) || 10)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            ) : (
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            )}
          </div>

          {/* Applicable Months (If monthly) */}
          {frequency === 'MONTHLY' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Applicable Months ({applicableMonths.length}/12)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setApplicableMonths(
                      applicableMonths.length === 12 ? [] : DEFAULT_INDIAN_ACADEMIC_MONTHS
                    )
                  }
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {applicableMonths.length === 12 ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                {DEFAULT_INDIAN_ACADEMIC_MONTHS.map((m) => {
                  const active = applicableMonths.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleToggleMonth(m)}
                      className={`py-1.5 px-2 rounded-lg text-center font-medium transition-colors text-[11px] ${
                        active
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-white dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {m.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Late Fee Rule Settings */}
          <div className="p-3.5 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 space-y-2.5">
            <span className="font-bold text-amber-900 dark:text-amber-300 block text-xs">
              Late Fee &amp; Fine Configuration
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Rule Type
                </label>
                <select
                  value={lateFeeType}
                  onChange={(e) => setLateFeeType(e.target.value as LateFeeType)}
                  className="w-full py-1.5 px-2 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="NONE">No Late Fee</option>
                  <option value="FIXED">Fixed Amount</option>
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="PER_DAY">Per Day Overdue</option>
                  <option value="PER_WEEK">Per Week Overdue</option>
                  <option value="ONE_TIME">One-time after due date</option>
                </select>
              </div>

              {lateFeeType !== 'NONE' && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {lateFeeType === 'PERCENTAGE' ? 'Rate (%)' : 'Amount (₹)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={lateFeeAmount}
                      onChange={(e) => setLateFeeAmount(parseFloat(e.target.value) || 0)}
                      className="w-full py-1.5 px-2 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Grace Period (Days)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={gracePeriodDays}
                      onChange={(e) => setGracePeriodDays(parseInt(e.target.value) || 0)}
                      className="w-full py-1.5 px-2 rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : structure ? 'Update Structure' : 'Create Structure'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

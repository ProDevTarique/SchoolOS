import React, { useState, useEffect } from 'react';
import {
  Plus,
  Percent,
  Award,
  Trash2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  X,
  Save,
} from 'lucide-react';
import { FeeDiscount, DiscountType, DiscountScope, AcademicSession } from '../../../types';
import {
  getFeeDiscounts,
  createFeeDiscount,
  deleteFeeDiscount,
} from '../services/feeAssignmentService';
import { getAcademicSessions } from '../../../services/academicService';
import { getAllFeeCategories } from '../services/feeStructureService';
import { formatINR } from '../utils/currencyUtils';
import { useAuth } from '../../../hooks/useAuth';

export const DiscountsTab: React.FC = () => {
  const { school, profile, hasPermission } = useAuth();

  const [discounts, setDiscounts] = useState<FeeDiscount[]>([]);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal create
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<DiscountType>('SCHOLARSHIP');
  const [scope, setScope] = useState<DiscountScope>('CATEGORY');
  const [value, setValue] = useState<number | ''>('');
  const [applicableCategory, setApplicableCategory] = useState('');
  const [reason, setReason] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const [discList, sessList, cats] = await Promise.all([
        getFeeDiscounts(school.id),
        getAcademicSessions(school.id),
        getAllFeeCategories(school.id),
      ]);
      setDiscounts(discList);
      setSessions(sessList);
      setCategories(cats);
      const activeSess = sessList.find((s) => s.isActive) || sessList[0];
      if (activeSess) setSessionId(activeSess.id);
      if (cats.length > 0) setApplicableCategory(cats[0]);
    } catch (err) {
      console.error('Failed to load discounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [school?.id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || value === '' || Number(value) <= 0 || !reason.trim()) {
      setError('Please fill in all required fields with valid values.');
      return;
    }
    if (!profile || !school?.id) return;

    setSaving(true);
    setError(null);
    try {
      await createFeeDiscount(
        {
          schoolId: school.id,
          academicSessionId: sessionId,
          name: name.trim(),
          type,
          discountScope: scope,
          value: Number(value),
          applicableCategory: scope === 'CATEGORY' ? applicableCategory : undefined,
          reason: reason.trim(),
          approvedBy: profile.uid,
          approvedByName: profile.name,
          date: new Date().toISOString().split('T')[0],
          isActive: true,
          createdBy: profile.uid,
        },
        profile.uid,
        profile.name,
        profile.role
      );

      setModalOpen(false);
      setName('');
      setValue('');
      setReason('');
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to create discount.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!profile || !school?.id || !window.confirm('Deactivate this discount rule?')) return;
    try {
      await deleteFeeDiscount(id, school.id, profile.uid, profile.name, profile.role);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete discount.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Discounts &amp; Scholarships Manager
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure institutional scholarships, sibling discounts, and staff-child concessions with strict approval logging.
          </p>
        </div>

        {hasPermission('fees.manage') && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Discount Policy</span>
          </button>
        )}
      </div>

      {/* Discounts Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
          <span>Loading discount policies...</span>
        </div>
      ) : discounts.length === 0 ? (
        <div className="py-16 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Award className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
          <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
            No Discount Policies Configured
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Add institutional scholarships, sibling discounts, or staff concessions here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {discounts.map((d) => (
            <div
              key={d.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                    {d.type}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Scope: {d.discountScope}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {d.name}
                </h3>
                <div className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                  {d.type === 'PERCENTAGE' ? `${d.value}% Off` : formatINR(d.value, false)}
                </div>

                {d.applicableCategory && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Applies to: <span className="font-semibold text-slate-700 dark:text-slate-300">{d.applicableCategory}</span>
                  </div>
                )}

                <div className="text-xs text-slate-600 dark:text-slate-300 italic mt-3 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/60">
                  "{d.reason}"
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <div>
                  Approved By: <span className="font-semibold text-slate-600 dark:text-slate-300">{d.approvedByName || 'Admin'}</span>
                </div>
                {hasPermission('fees.manage') && (
                  <button
                    onClick={() => handleDelete(d.id)}
                    className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title="Deactivate Rule"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-150 text-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Add Discount / Scholarship Rule
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Policy Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Merit Scholarship 25% / Sibling Discount"
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Discount Type *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as DiscountType)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (₹)</option>
                    <option value="SCHOLARSHIP">Merit Scholarship</option>
                    <option value="SIBLING">Sibling Discount</option>
                    <option value="STAFF_CHILD">Staff Child</option>
                    <option value="CUSTOM">Custom Discount</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Value {type === 'PERCENTAGE' ? '(%)' : '(₹)'} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={value}
                    onChange={(e) => setValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="e.g. 25"
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Discount Scope *
                  </label>
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value as DiscountScope)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="CATEGORY">Fee Category Level</option>
                    <option value="STUDENT">Student Level</option>
                    <option value="PAYMENT">Payment Level</option>
                  </select>
                </div>

                {scope === 'CATEGORY' && (
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Fee Category
                    </label>
                    <select
                      value={applicableCategory}
                      onChange={(e) => setApplicableCategory(e.target.value)}
                      className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Institutional Justification / Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Record justification and board approval notes..."
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

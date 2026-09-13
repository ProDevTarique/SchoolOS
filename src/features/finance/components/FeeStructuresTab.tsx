import React, { useState, useEffect } from 'react';
import {
  Plus,
  Layers,
  Calendar,
  Edit2,
  Trash2,
  Send,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Calculator,
} from 'lucide-react';
import { FeeStructure, FeeCategory, ClassItem, SectionItem, AcademicSession } from '../../../types';
import {
  getFeeStructures,
  deleteFeeStructure,
} from '../services/feeStructureService';
import { getFeeCategories } from '../services/feeCategoryService';
import { assignFeeStructure } from '../services/feeAssignmentService';
import { getClasses, getSections, getAcademicSessions } from '../../../services/academicService';
import { FeeStructureModal } from './FeeStructureModal';
import { formatINR } from '../utils/currencyUtils';
import { calculateStructureTotals } from '../utils/feeCalculations';
import { useAuth } from '../../../hooks/useAuth';

export const FeeStructuresTab: React.FC = () => {
  const { school, profile, hasPermission } = useAuth();

  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [categories, setCategories] = useState<FeeCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null);

  // Assignment modal / action
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignSuccessMsg, setAssignSuccessMsg] = useState<string | null>(null);

  const fetchMetaAndData = async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const [clsList, secList, sessList, cats] = await Promise.all([
        getClasses(school.id),
        getSections(school.id),
        getAcademicSessions(school.id),
        getFeeCategories(school.id),
      ]);

      setClasses(clsList);
      setSections(secList);
      setSessions(sessList);
      setCategories(cats);

      const activeSess = sessList.find((s) => s.isActive) || sessList[0];
      const initialSessId = selectedSessionId || (activeSess ? activeSess.id : '');
      setSelectedSessionId(initialSessId);

      const initialClassId = selectedClassId || (clsList[0] ? clsList[0].id : '');
      setSelectedClassId(initialClassId);

      const structList = await getFeeStructures(school.id, {
        academicSessionId: initialSessId || undefined,
        classId: initialClassId || undefined,
      });
      setStructures(structList);
    } catch (err) {
      console.error('Failed to load fee structures meta:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetaAndData();
  }, [school?.id]);

  const handleFilterChange = async (sessId: string, clsId: string) => {
    setSelectedSessionId(sessId);
    setSelectedClassId(clsId);
    if (!school?.id) return;
    setLoading(true);
    try {
      const list = await getFeeStructures(school.id, {
        academicSessionId: sessId || undefined,
        classId: clsId || undefined,
      });
      setStructures(list);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!profile || !window.confirm('Deactivate this fee structure?')) return;
    try {
      await deleteFeeStructure(id, profile.uid, profile.name, profile.role);
      handleFilterChange(selectedSessionId, selectedClassId);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete fee structure');
    }
  };

  const handleAssignToClass = async (structure: FeeStructure) => {
    if (!school?.id || !profile) return;
    setAssigningId(structure.id);
    setAssignSuccessMsg(null);

    try {
      const res = await assignFeeStructure({
        schoolId: school.id,
        academicSessionId: structure.academicSessionId,
        feeStructure: structure,
        assignmentType: structure.sectionId ? 'SECTION' : 'CLASS',
        classId: structure.classId,
        sectionId: structure.sectionId,
        userId: profile.uid,
        userName: profile.name,
        userRole: profile.role,
      });

      setAssignSuccessMsg(
        `Successfully assigned "${structure.name}" to ${res.assignmentCount} students (${res.itemsGenerated} fee items scheduled)!`
      );
      setTimeout(() => setAssignSuccessMsg(null), 6000);
    } catch (err: any) {
      console.error('Failed to assign fee:', err);
      alert(err?.message || 'Failed to assign fee structure');
    } finally {
      setAssigningId(null);
    }
  };

  // Automated totals calculation for selected class
  const totals = calculateStructureTotals(structures);
  const selectedClassName = classes.find((c) => c.id === selectedClassId)?.name || 'Class';
  const selectedSessionName = sessions.find((s) => s.id === selectedSessionId)?.name || 'Session';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Action */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Fee Structure Management
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              {selectedSessionName}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure institutional fee schedules, recurring dues, and late fee policies per class.
          </p>
        </div>

        {hasPermission('fees.manage') && (
          <button
            id="btn-create-fee-structure"
            onClick={() => {
              setEditingStructure(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Fee Structure</span>
          </button>
        )}
      </div>

      {/* Assignment Success Alert */}
      {assignSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-3 animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{assignSuccessMsg}</span>
        </div>
      )}

      {/* Filters Bar: Session & Class */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Academic Session
          </label>
          <select
            value={selectedSessionId}
            onChange={(e) => handleFilterChange(e.target.value, selectedClassId)}
            className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.isActive ? '(Current Active)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Select Class
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => handleFilterChange(selectedSessionId, e.target.value)}
            className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Section 4 Automated Liability Display Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Total Recurring Fee
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              Per Month
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-2">
            {formatINR(totals.totalRecurringPerMonth, false)}
            <span className="text-xs font-normal text-slate-400 font-sans">/mo</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Tuition &amp; monthly recurring charges
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Total One-Time / Annual
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              Yearly
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-2">
            {formatINR(totals.totalOneTimeAndAnnual, false)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Annual, admission &amp; exam fees
          </div>
        </div>

        <div className="bg-indigo-50/60 dark:bg-indigo-950/30 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-indigo-800 dark:text-indigo-300 font-bold">
              Total Annual Liability
            </span>
            <Calculator className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-700 dark:text-indigo-300 mt-2">
            {formatINR(totals.totalPossibleAnnualLiability, false)}
          </div>
          <div className="text-[11px] text-indigo-600/80 dark:text-indigo-400/80 mt-1">
            Max liability per student for {selectedClassName}
          </div>
        </div>
      </div>

      {/* Fee Structures Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Structures for {selectedClassName} ({structures.length})
          </h3>
          <span className="text-xs text-slate-400">
            Session: {selectedSessionName}
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
            <span>Loading structures...</span>
          </div>
        ) : structures.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Layers className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
              No Fee Structures Found
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Create fee structures (e.g. Tuition Fee, Annual Fee) to start scheduling fees for this class.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Fee Structure Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Frequency</th>
                  <th className="py-3 px-4">Scope</th>
                  <th className="py-3 px-4">Late Fee Rule</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {structures.map((s) => {
                  const secName = s.sectionId
                    ? sections.find((sec) => sec.id === s.sectionId)?.name
                    : null;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{s.name}</div>
                        {s.description && (
                          <div className="text-[11px] text-slate-400">{s.description}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium">{s.feeCategory}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {s.frequency}
                        </span>
                        {s.frequency === 'MONTHLY' && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Due: {s.dueDateDay || 10}th of mo ({s.applicableMonths?.length || 12} mo)
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {secName ? `Section ${secName}` : 'Entire Class'}
                      </td>
                      <td className="py-3 px-4">
                        {s.lateFeeRule?.type && s.lateFeeRule.type !== 'NONE' ? (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            {s.lateFeeRule.type === 'PERCENTAGE'
                              ? `${s.lateFeeRule.amount}%`
                              : `₹${s.lateFeeRule.amount}`}{' '}
                            ({s.lateFeeRule.type.toLowerCase()})
                          </span>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-sm text-slate-900 dark:text-white">
                        {formatINR(s.amount, false)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                            s.status === 'ACTIVE'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {hasPermission('fees.manage') && (
                            <>
                              <button
                                onClick={() => handleAssignToClass(s)}
                                disabled={assigningId === s.id}
                                title="Schedule / Assign dues to students of this class"
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {assigningId === s.id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Send className="w-3 h-3" />
                                )}
                                <span>Assign</span>
                              </button>

                              <button
                                onClick={() => {
                                  setEditingStructure(s);
                                  setModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="Edit Structure"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(s.id)}
                                className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                title="Delete Structure"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
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

      {/* Fee Structure Create/Edit Modal */}
      {school && profile && (
        <FeeStructureModal
          isOpen={modalOpen}
          structure={editingStructure}
          schoolId={school.id}
          classes={classes}
          sections={sections}
          sessions={sessions}
          categories={categories.map((category) => category.name)}
          feeCategories={categories}
          userId={profile.uid}
          userName={profile.name}
          userRole={profile.role}
          onClose={() => {
            setModalOpen(false);
            setEditingStructure(null);
          }}
          onSaved={() => handleFilterChange(selectedSessionId, selectedClassId)}
        />
      )}
    </div>
  );
};

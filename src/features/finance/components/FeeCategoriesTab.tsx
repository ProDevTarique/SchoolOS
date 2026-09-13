import React, { useEffect, useState } from 'react';
import { Edit2, RefreshCw, Save } from 'lucide-react';
import { FeeCategory } from '../../../types';
import { useAuth } from '../../../hooks/useAuth';
import {
  createFeeCategory,
  getFeeCategories,
  initializeDefaultFeeCategories,
  updateFeeCategory,
} from '../services/feeCategoryService';

export const FeeCategoriesTab: React.FC = () => {
  const { school, profile, hasPermission } = useAuth();
  const [categories, setCategories] = useState<FeeCategory[]>([]);
  const [editing, setEditing] = useState<FeeCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');

  const load = async () => {
    if (!school?.id) return;
    setLoading(true);
    setError(null);
    try {
      setCategories(await getFeeCategories(school.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fee categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [school?.id]);

  const resetForm = () => {
    setEditing(null);
    setName('');
    setCode('');
    setDescription('');
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!school?.id || !profile || !name.trim() || (!editing && !code.trim())) {
      setError('Category name and code are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await updateFeeCategory(editing, {
          name,
          description,
          status: editing.status,
          displayOrder: editing.displayOrder,
        }, profile.uid, profile.name, profile.role);
      } else {
        await createFeeCategory({
          schoolId: school.id,
          name,
          code,
          description,
          status: 'ACTIVE',
          displayOrder: categories.length + 1,
          createdBy: profile.uid,
        }, profile.uid, profile.name, profile.role);
      }
      resetForm();
      setMessage('Fee category saved successfully.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save fee category.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (category: FeeCategory) => {
    if (!profile) return;
    try {
      await updateFeeCategory(category, {
        name: category.name,
        description: category.description,
        status: category.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
        displayOrder: category.displayOrder,
      }, profile.uid, profile.name, profile.role);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category status.');
    }
  };

  const canManage = hasPermission('fees.manage');

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Fee Categories</h2>
          <p className="text-xs text-slate-500 mt-1">Maintain reusable categories for class fee structures.</p>
        </div>
        <button onClick={() => initializeDefaultFeeCategories(school!.id, profile!.uid, profile!.name, profile!.role).then(load)} disabled={!canManage || !school || !profile} className="px-3 py-2 rounded-xl border text-xs font-bold">
          Initialize Defaults
        </button>
      </div>
      {message && <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs">{message}</div>}
      {error && <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs">{error}</div>}
      {canManage && (
        <form onSubmit={save} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" required className="px-3 py-2 rounded-xl border bg-transparent text-xs" />
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Stable code" disabled={!!editing} required={!editing} className="px-3 py-2 rounded-xl border bg-transparent text-xs" />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="px-3 py-2 rounded-xl border bg-transparent text-xs" />
          <button disabled={saving} className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-2"><Save className="w-4 h-4" />{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
        </form>
      )}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? <div className="p-8 text-center text-xs text-slate-500"><RefreshCw className="inline w-4 h-4 animate-spin mr-2" />Loading categories...</div> :
          categories.length === 0 ? <div className="p-8 text-center text-xs text-slate-500">No fee categories configured.</div> :
          <div className="divide-y divide-slate-100 dark:divide-slate-800">{categories.map((category) => (
            <div key={category.id} className="p-4 flex items-center justify-between gap-4">
              <div><div className="font-bold text-sm text-slate-900 dark:text-white">{category.name}</div><div className="text-[11px] text-slate-500">{category.code} {category.description ? `- ${category.description}` : ''}</div></div>
              <div className="flex items-center gap-2"><button onClick={() => toggleStatus(category)} disabled={!canManage} className={`px-2 py-1 rounded text-[10px] font-bold ${category.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{category.status}</button><button onClick={() => { setEditing(category); setName(category.name); setCode(category.code); setDescription(category.description || ''); }} disabled={!canManage} className="p-2 text-slate-500"><Edit2 className="w-4 h-4" /></button></div>
            </div>
          ))}</div>}
      </div>
    </div>
  );
};

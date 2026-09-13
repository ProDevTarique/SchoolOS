import React, { useEffect, useState } from 'react';
import {
  Settings,
  Shield,
  Building2,
  Database,
  Save,
  Check,
  AlertCircle,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { School, AuditLog } from '../../types';
import { updateSchool } from '../../services/schoolService';
import { getAuditLogs, logAuditEvent } from '../../services/auditService';
import { seedDemoData } from '../../services/demoData';
import { useAuth } from '../../hooks/useAuth';

type SettingsTab = 'PROFILE' | 'AUDIT' | 'SYSTEM';

export const SettingsView: React.FC = () => {
  const { school, profile, hasPermission, reloadSchool } = useAuth();

  const [activeTab, setActiveTab] = useState<SettingsTab>('PROFILE');

  // School Profile fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [currency, setCurrency] = useState('₹');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [gradingSystem, setGradingSystem] = useState('CBSE');

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Audit Logs state
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState('');

  // Demo seeding state
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  useEffect(() => {
    if (school) {
      setName(school.name);
      setCode(school.code || '');
      setLogoUrl(school.logoUrl || '');
      setAddress(school.address || '');
      setCity(school.city || '');
      setState(school.state || '');
      setPinCode(school.pinCode || '');
      setPhone(school.phone || '');
      setEmail(school.email || '');
      setWebsite(school.website || '');
      setCurrency(school.currency || '₹');
      setTimezone(school.timezone || 'Asia/Kolkata');
      setGradingSystem(school.gradingSystem || 'CBSE');
    }
  }, [school]);

  const fetchLogs = async () => {
    if (!school?.id) return;
    setLoadingLogs(true);
    try {
      const data = await getAuditLogs(school.id);
      setLogs(data);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'AUDIT') {
      fetchLogs();
    }
  }, [activeTab, school?.id]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !profile) return;
    setSaving(true);
    setError(null);
    setSavedSuccess(false);

    try {
      await updateSchool(school.id, {
        name: name.trim(),
        code: code.trim(),
        logoUrl: logoUrl.trim() || undefined,
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pinCode: pinCode.trim(),
        phone: phone.trim(),
        email: email.trim(),
        website: website.trim() || undefined,
        currency,
        timezone,
        gradingSystem,
      });

      await logAuditEvent({
        schoolId: school.id,
        userId: profile.uid,
        userName: profile.name,
        userRole: profile.role,
        action: 'SETTINGS_UPDATED',
        module: 'Settings',
        description: `Institutional profile parameters updated by ${profile.name}.`,
      });

      await reloadSchool();
      setSavedSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to update institutional profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleSeedDemo = async () => {
    if (!school?.id) return;
    if (!window.confirm('This will populate classes, students, and staff with full realistic data for testing. Continue?')) {
      return;
    }
    setSeeding(true);
    setSeedSuccess(false);
    try {
      await seedDemoData(school.id);
      await reloadSchool();
      setSeedSuccess(true);
      if (activeTab === 'AUDIT') fetchLogs();
    } catch (err: any) {
      alert(err?.message || 'Failed to seed demo data.');
    } finally {
      setSeeding(false);
    }
  };

  const filteredLogs = logs.filter((l) => {
    if (selectedModule && l.module !== selectedModule) return false;
    if (logSearch.trim()) {
      const term = logSearch.toLowerCase();
      const mUser = l.userName.toLowerCase().includes(term);
      const mAction = l.action.toLowerCase().includes(term);
      const mDesc = l.description.toLowerCase().includes(term);
      if (!mUser && !mAction && !mDesc) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            Institution Settings &amp; Security Audit
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure institutional identities, review immutable audit trails, and manage system parameters.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('PROFILE')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'PROFILE'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>School Profile &amp; Metadata</span>
        </button>

        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'AUDIT'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>System Audit Log</span>
        </button>

        <button
          onClick={() => setActiveTab('SYSTEM')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'SYSTEM'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>System Health &amp; Demo Data</span>
        </button>
      </div>

      {/* Tab: School Profile */}
      {activeTab === 'PROFILE' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
          {savedSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-700 dark:text-emerald-300 text-xs rounded-lg flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>School configuration updated successfully!</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  School Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  School Code / Affiliation No
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  School Logo Image URL
                </label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://... image link"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Campus Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Postal Code / PIN
                </label>
                <input
                  type="text"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Currency Symbol
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="₹">₹ (INR - Indian Rupee)</option>
                  <option value="$">$ (USD - US Dollar)</option>
                  <option value="£">£ (GBP - British Pound)</option>
                  <option value="€">€ (EUR - Euro)</option>
                  <option value="AED">AED (Emirati Dirham)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Grading System
                </label>
                <select
                  value={gradingSystem}
                  onChange={(e) => setGradingSystem(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="CBSE">CBSE (Standard 9-Point)</option>
                  <option value="ICSE">ICSE / ISC System</option>
                  <option value="State Board">State Board Marks System</option>
                  <option value="IB">International Baccalaureate (IB)</option>
                  <option value="Cambridge">Cambridge IGCSE</option>
                </select>
              </div>
            </div>

            {hasPermission('settings.manage') && (
              <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Tab: System Audit Log */}
      {activeTab === 'AUDIT' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Filter logs by user, action..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">All Modules</option>
                <option value="Auth">Auth</option>
                <option value="Students">Students</option>
                <option value="Staff">Staff</option>
                <option value="Academics">Academics</option>
                <option value="Attendance">Attendance</option>
                <option value="Settings">Settings</option>
                <option value="System">System</option>
              </select>
            </div>

            <button
              onClick={fetchLogs}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {loadingLogs ? (
            <div className="py-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
              <span>Loading audit logs...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              No audit logs recorded yet for this filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Module</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLogs.map((lg) => (
                    <tr key={lg.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {new Date(lg.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                        {lg.userName}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {lg.userRole}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-indigo-600 dark:text-indigo-400 font-medium">
                        {lg.module}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-medium text-slate-800 dark:text-slate-200 text-[11px]">
                        {lg.action}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">
                        {lg.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: System Health & Demo Seeding */}
      {activeTab === 'SYSTEM' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600" />
              <span>Database &amp; Storage Connectivity</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Operating on Google Cloud Firestore with real-time replication and multi-role access control rules.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Database Engine</span>
                <span className="font-bold text-slate-900 dark:text-white">Cloud Firestore (Active)</span>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Current Session ID</span>
                <span className="font-mono text-indigo-600 font-bold">{school?.currentSessionId || 'Active'}</span>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">ERP Software Version</span>
                <span className="font-bold text-emerald-600">v1.0.0 Production Phase 1</span>
              </div>
            </div>
          </div>

          {/* Seed Demo Data Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Demonstration &amp; Test Dataset Provisioning</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Instantly seed the database with realistic students (Class 1 to 10), subjects (Mathematics, Science, English, etc.), faculty staff, and academic structure for comprehensive ERP demonstration and testing.
            </p>

            {seedSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-700 dark:text-emerald-300 text-xs rounded-lg flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Demo datasets successfully populated! Check Students, Academics, and Staff tabs.</span>
              </div>
            )}

            <button
              onClick={handleSeedDemo}
              disabled={seeding}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50 transition-colors"
            >
              {seeding ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Populating sample data...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Seed Realistic Demo Data</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

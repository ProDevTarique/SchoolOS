import React, { useState, useEffect } from 'react';
import {
  Settings,
  Hash,
  Calendar,
  Save,
  CheckCircle,
  AlertCircle,
  Bell,
  FileText,
  Shield,
  RefreshCw,
  CreditCard,
} from 'lucide-react';
import {
  FinancialSettings,
  LateFeeType,
  AcademicSession,
  PAYMENT_MODE_OPTIONS,
  PaymentMode,
} from '../../../types';
import {
  getFinancialSettings,
  updateFinancialSettings,
} from '../services/financeSettingsService';
import { useAuth } from '../../../hooks/useAuth';
import { getAcademicSessions } from '../../../services/academicService';

export const FinanceSettingsTab: React.FC = () => {
  const { school, profile, hasPermission } = useAuth();

  const [settings, setSettings] = useState<FinancialSettings | null>(null);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [academicSessionId, setAcademicSessionId] = useState('');
  const [currencyCode, setCurrencyCode] = useState('INR');
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [enabledPaymentMethods, setEnabledPaymentMethods] = useState<PaymentMode[]>(
    PAYMENT_MODE_OPTIONS.map((option) => option.value)
  );
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<PaymentMode>('CASH');
  const [financialYear, setFinancialYear] = useState('2026-27');
  const [receiptPrefix, setReceiptPrefix] = useState('SCH');
  const [receiptStartingNumber, setReceiptStartingNumber] = useState<number>(1);
  const [receiptNumberPattern, setReceiptNumberPattern] = useState('{PREFIX}-{YEAR}-{NUM6}');
  const [defaultLateFeeType, setDefaultLateFeeType] = useState<LateFeeType>('FIXED');
  const [defaultLateFeeAmount, setDefaultLateFeeAmount] = useState<number>(50);
  const [defaultGracePeriodDays, setDefaultGracePeriodDays] = useState<number>(5);
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [signatoryName, setSignatoryName] = useState('Authorized Signatory');
  const [signatoryTitle, setSignatoryTitle] = useState('Accounts Department');

  // Notifications preferences
  const [feeDueReminder, setFeeDueReminder] = useState(true);
  const [feeOverdueReminder, setFeeOverdueReminder] = useState(true);
  const [paymentConfirmation, setPaymentConfirmation] = useState(true);
  const [receiptNotification, setReceiptNotification] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!school?.id) return;
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const s = await getFinancialSettings(school.id);
        const availableSessions = await getAcademicSessions(school.id);
        setSessions(availableSessions);
        setSettings(s);
        setAcademicSessionId(s.academicSessionId || school.currentSessionId || availableSessions.find((session) => session.isActive)?.id || '');
        setCurrencyCode(s.currencyCode || 'INR');
        setCurrencySymbol(s.currencySymbol || s.currency || '₹');
        const configuredMethods = s.enabledPaymentMethods?.length
          ? s.enabledPaymentMethods
          : PAYMENT_MODE_OPTIONS.map((option) => option.value);
        setEnabledPaymentMethods(configuredMethods);
        setDefaultPaymentMethod(s.defaultPaymentMethod || configuredMethods[0] || 'CASH');
        setFinancialYear(s.financialYear || '2026-27');
        setReceiptPrefix(s.receiptPrefix || 'SCH');
        setReceiptStartingNumber(s.receiptStartingNumber || 1);
        setReceiptNumberPattern(s.receiptNumberPattern || '{PREFIX}-{YEAR}-{NUM6}');
        setDefaultLateFeeType(s.defaultLateFeeType || 'FIXED');
        setDefaultLateFeeAmount(s.defaultLateFeeAmount ?? 50);
        setDefaultGracePeriodDays(s.defaultGracePeriodDays ?? 5);
        setTermsAndConditions(s.termsAndConditions || '');
        setSignatoryName(s.authorizedSignatoryName || 'Authorized Signatory');
        setSignatoryTitle(s.authorizedSignatoryTitle || 'Accounts Department');

        if (s.notificationPreferences) {
          setFeeDueReminder(s.notificationPreferences.feeDueReminder ?? true);
          setFeeOverdueReminder(s.notificationPreferences.feeOverdueReminder ?? true);
          setPaymentConfirmation(s.notificationPreferences.paymentConfirmation ?? true);
          setReceiptNotification(s.notificationPreferences.receiptNotification ?? true);
        }
      } catch (err) {
        console.error('Failed to load financial settings:', err);
        setError(err instanceof Error ? err.message : 'Failed to load financial settings.');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [school?.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !profile) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (!academicSessionId) {
        throw new Error('Select an academic session before saving finance settings.');
      }
      if (!currencyCode.trim() || !currencySymbol.trim()) {
        throw new Error('Currency code and symbol are required.');
      }
      const updated = await updateFinancialSettings(
        school.id,
        {
          financialYear: financialYear.trim(),
          academicSessionId: academicSessionId || undefined,
          currency: currencySymbol.trim(),
          currencyCode: currencyCode.trim().toUpperCase(),
          currencySymbol: currencySymbol.trim(),
          enabledPaymentMethods,
          defaultPaymentMethod,
          receiptPrefix: receiptPrefix.trim().toUpperCase(),
          receiptStartingNumber: Number(receiptStartingNumber) || 1,
          receiptNumberPattern: receiptNumberPattern.trim(),
          defaultLateFeeType,
          defaultLateFeeAmount: Number(defaultLateFeeAmount) || 0,
          defaultGracePeriodDays: Number(defaultGracePeriodDays) || 0,
          termsAndConditions: termsAndConditions.trim(),
          authorizedSignatoryName: signatoryName.trim(),
          authorizedSignatoryTitle: signatoryTitle.trim(),
          notificationPreferences: {
            feeDueReminder,
            feeOverdueReminder,
            paymentConfirmation,
            receiptNotification,
          },
        },
        profile.uid,
        profile.name,
        profile.role
      );

      setSettings(updated);
      setSuccessMsg('Financial settings updated successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const togglePaymentMethod = (method: PaymentMode) => {
    setEnabledPaymentMethods((current) =>
      current.includes(method)
        ? current.filter((value) => value !== method)
        : [...current, method]
    );
  };

  // Preview receipt number based on pattern
  const sampleNum = (settings?.currentReceiptCounter || 0) + 1;
  const sampleReceiptPreview = receiptNumberPattern
    .replace('{PREFIX}', receiptPrefix || 'SCH')
    .replace('{YEAR}', financialYear || '2026-27')
    .replace('{NUM6}', sampleNum.toString().padStart(6, '0'))
    .replace('{NUM5}', sampleNum.toString().padStart(5, '0'))
    .replace('{NUM4}', sampleNum.toString().padStart(4, '0'));

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Institutional Finance &amp; Accounting Settings
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure financial year boundaries, receipt numbering sequences, late fee policies, and notification triggers.
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Section 1: Financial Year & Period Separation */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
            <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Financial Year Definition</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400">
            Associate finance configuration with an existing school academic session and financial year.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Active Financial Year *
              </label>
              <input
                type="text"
                required
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
                placeholder="e.g. 2026-27"
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Format: YYYY-YY (e.g. 2025-26 or 2026-27)</span>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Academic Session *
              </label>
              <select
                required
                value={academicSessionId}
                onChange={(e) => setAcademicSessionId(e.target.value)}
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">Select academic session</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.name}{session.isActive ? ' (Active)' : ''}
                  </option>
                ))}
              </select>
              {sessions.length === 0 && (
                <span className="text-[10px] text-amber-600 mt-0.5 block">
                  Create an academic session before saving finance settings.
                </span>
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Default Currency Code
              </label>
              <input
                type="text"
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                maxLength={3}
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Currency Symbol *
              </label>
              <input
                type="text"
                required
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                maxLength={4}
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
            <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Payment Methods</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400">
            Enable only the payment methods your school accepts. Collection workflows will reuse this configuration.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PAYMENT_MODE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <input
                  type="checkbox"
                  checked={enabledPaymentMethods.includes(option.value)}
                  onChange={() => togglePaymentMethod(option.value)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="font-bold text-slate-900 dark:text-white">{option.label}</span>
              </label>
            ))}
          </div>
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Default Payment Method
            </label>
            <select
              value={defaultPaymentMethod}
              onChange={(e) => setDefaultPaymentMethod(e.target.value as PaymentMode)}
              className="w-full sm:max-w-xs py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {PAYMENT_MODE_OPTIONS
                .filter((option) => enabledPaymentMethods.includes(option.value))
                .map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
            </select>
          </div>
        </div>

        {/* Section 2: Receipt Numbering Pattern & Sequence */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
            <Hash className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Receipt Numbering Configuration</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Receipt Prefix *
              </label>
              <input
                type="text"
                required
                value={receiptPrefix}
                onChange={(e) => setReceiptPrefix(e.target.value)}
                placeholder="SCH"
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Starting Number Sequence
              </label>
              <input
                type="number"
                min="1"
                required
                value={receiptStartingNumber}
                onChange={(e) => setReceiptStartingNumber(parseInt(e.target.value) || 1)}
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Numbering Pattern
              </label>
              <select
                value={receiptNumberPattern}
                onChange={(e) => setReceiptNumberPattern(e.target.value)}
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              >
                <option value="{PREFIX}-{YEAR}-{NUM6}">SCH-2026-27-000001</option>
                <option value="{YEAR}/FEES/{NUM5}">2026-27/FEES/00001</option>
                <option value="{PREFIX}/{YEAR}/{NUM5}">SCH/2026-27/00001</option>
                <option value="{PREFIX}-{NUM6}">SCH-000001</option>
              </select>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
            <div>
              <span className="text-indigo-900 dark:text-indigo-300 font-semibold block">
                Live Next Receipt Preview:
              </span>
              <span className="text-[11px] text-indigo-700/80 dark:text-indigo-400/80">
                Guaranteed sequential, collision-free transaction generation
              </span>
            </div>
            <div className="font-mono font-bold text-sm text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
              {sampleReceiptPreview}
            </div>
          </div>
        </div>

        {/* Section 3: Default Late Fee Rules */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
            <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Default Late Fee &amp; Grace Period</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Default Late Fee Rule
              </label>
              <select
                value={defaultLateFeeType}
                onChange={(e) => setDefaultLateFeeType(e.target.value as LateFeeType)}
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="NONE">No Late Fee</option>
                <option value="FIXED">Fixed Amount</option>
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="PER_DAY">Per Day Overdue</option>
                <option value="PER_WEEK">Per Week Overdue</option>
                <option value="ONE_TIME">One-time after due date</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Default Amount / Rate
              </label>
              <input
                type="number"
                min="0"
                value={defaultLateFeeAmount}
                onChange={(e) => setDefaultLateFeeAmount(parseFloat(e.target.value) || 0)}
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Default Grace Period (Days)
              </label>
              <input
                type="number"
                min="0"
                value={defaultGracePeriodDays}
                onChange={(e) => setDefaultGracePeriodDays(parseInt(e.target.value) || 0)}
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Receipt Terms & Signatory */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Official Receipt Footer &amp; Signatory</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Authorized Signatory Name
              </label>
              <input
                type="text"
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
                placeholder="Authorized Signatory"
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Authorized Signatory Title
              </label>
              <input
                type="text"
                value={signatoryTitle}
                onChange={(e) => setSignatoryTitle(e.target.value)}
                placeholder="Accounts Department"
                className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Receipt Terms &amp; Conditions Note
            </label>
            <textarea
              rows={3}
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Section 5: Notification Preferences (Section 29) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
            <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Notification Triggers &amp; Reminders (Architecture Ready)</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400">
            Configure automated reminder events. External SMS gateway remains dormant until communication provider credentials are configured in Phase 3.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <input
                type="checkbox"
                checked={feeDueReminder}
                onChange={(e) => setFeeDueReminder(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">Fee Due Reminder</span>
                <span className="text-[11px] text-slate-500">Notify parent 3 days prior to monthly due date</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <input
                type="checkbox"
                checked={feeOverdueReminder}
                onChange={(e) => setFeeOverdueReminder(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">Fee Overdue Notice</span>
                <span className="text-[11px] text-slate-500">Trigger overdue alerts once grace period lapses</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <input
                type="checkbox"
                checked={paymentConfirmation}
                onChange={(e) => setPaymentConfirmation(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">Payment Confirmation</span>
                <span className="text-[11px] text-slate-500">Acknowledge fee receipt instantaneously</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <input
                type="checkbox"
                checked={receiptNotification}
                onChange={(e) => setReceiptNotification(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">Digital Receipt Link</span>
                <span className="text-[11px] text-slate-500">Send downloadable e-receipt reference</span>
              </div>
            </label>
          </div>
        </div>

        {hasPermission('finance_settings.manage') && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Finance Settings'}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

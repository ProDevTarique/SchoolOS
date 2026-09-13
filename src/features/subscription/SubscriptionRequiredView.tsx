import React from 'react';
import { CreditCard, LifeBuoy, LogOut, RefreshCw } from 'lucide-react';
import { EntitlementState, School, SchoolSubscription } from '../../types';

interface SubscriptionRequiredViewProps {
  school: School | null;
  subscription: SchoolSubscription | null;
  state: Exclude<EntitlementState, 'LOADING' | 'ENTITLED'>;
  reason: string;
  onReload: () => Promise<void>;
  onLogout: () => Promise<void>;
  onOpenBilling: () => void;
}

export const SubscriptionRequiredView: React.FC<SubscriptionRequiredViewProps> = ({
  school,
  subscription,
  state,
  reason,
  onReload,
  onLogout,
  onOpenBilling,
}) => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
    <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-8 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-600 flex items-center justify-center text-white mb-5">
        <CreditCard className="w-7 h-7" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">TalimOS subscription required</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {school?.name || 'Your school'} cannot access normal operations until its subscription is configured.
      </p>
      <div className="mt-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 text-left text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Status</span>
          <strong className="text-slate-900 dark:text-white">{subscription?.status || state}</strong>
        </div>
        <p className="mt-2 text-slate-600 dark:text-slate-300">{reason}</p>
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button onClick={onOpenBilling} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
          <CreditCard className="w-4 h-4" /> View subscription
        </button>
        <button onClick={() => window.location.href = 'mailto:support@talimos.example'} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
          <LifeBuoy className="w-4 h-4" /> Contact support
        </button>
        <button onClick={onReload} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
        <button onClick={onLogout} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:text-rose-300">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </div>
  </div>
);

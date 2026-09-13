import React from 'react';
import { CreditCard, LifeBuoy } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { SchoolSubscription } from '../../types';

interface SubscriptionViewProps {
  subscription: SchoolSubscription | null;
}

function formatTimestamp(value: Timestamp | undefined): string {
  if (!value) return 'Not configured';
  const date = value instanceof Timestamp ? value.toDate() : new Date(value as unknown as string);
  if (Number.isNaN(date.getTime())) return 'Not configured';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export const SubscriptionView: React.FC<SubscriptionViewProps> = ({ subscription }) => (
  <div className="max-w-3xl">
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Subscription &amp; billing</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        View subscription status and contact support. Payment collection is not available in this foundation.
      </p>
    </div>
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <CreditCard className="w-5 h-5 text-indigo-600" />
        <h2 className="font-semibold text-slate-900 dark:text-white">Current plan</h2>
      </div>
      {subscription ? (
        <div className="grid gap-4 sm:grid-cols-2 text-sm">
          <div><span className="text-slate-500">Plan</span><p className="font-semibold">{subscription.planName || subscription.planId}</p></div>
          <div><span className="text-slate-500">Status</span><p className="font-semibold">{subscription.status}</p></div>
          <div><span className="text-slate-500">Current period</span><p className="font-semibold">{formatTimestamp(subscription.currentPeriodStart)} to {formatTimestamp(subscription.currentPeriodEnd)}</p></div>
          <div><span className="text-slate-500">Grace period</span><p className="font-semibold">{formatTimestamp(subscription.gracePeriodEnd)}</p></div>
          <div><span className="text-slate-500">Provider</span><p className="font-semibold">{subscription.provider}</p></div>
        </div>
      ) : (
        <p className="text-sm text-slate-600 dark:text-slate-300">No subscription configuration is available.</p>
      )}
      <button onClick={() => window.location.href = 'mailto:support@talimos.example'} className="mt-6 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
        <LifeBuoy className="w-4 h-4" /> Contact support
      </button>
    </div>
  </div>
);

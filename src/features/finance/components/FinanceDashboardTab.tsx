import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  CreditCard,
  Layers,
  ArrowUpRight,
  PieChart,
  BarChart3,
  RefreshCw,
  PlusCircle,
  FileSpreadsheet,
} from 'lucide-react';
import {
  getFinanceDashboardMetrics,
  FinanceDashboardMetrics,
} from '../services/financeReportsService';
import { formatINR, formatINRCompact } from '../utils/currencyUtils';
import { useAuth } from '../../../hooks/useAuth';

interface FinanceDashboardTabProps {
  onQuickAction: (action: string) => void;
}

export const FinanceDashboardTab: React.FC<FinanceDashboardTabProps> = ({ onQuickAction }) => {
  const { school } = useAuth();

  const [metrics, setMetrics] = useState<FinanceDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!school?.id) return;
    setLoading(true);
    try {
      const data = await getFinanceDashboardMetrics(school.id);
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load finance dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [school?.id]);

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
        <span>Loading finance dashboard metrics...</span>
      </div>
    );
  }

  const m = metrics || {
    todayCollection: 0,
    monthCollection: 0,
    yearCollection: 0,
    outstandingFees: 0,
    todayExpenses: 0,
    monthExpenses: 0,
    netIncome: 0,
    pendingExpenseApprovals: 0,
    paymentMethodDistribution: {},
    collectionTrend: [],
    classCollectionSummary: [],
  };

  const totalMethodAmount = Object.values(m.paymentMethodDistribution).reduce(
    (acc, curr) => acc + curr,
    0
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Quick Shortcuts */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Finance &amp; Accounts Overview
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time executive snapshot of fee collections, operational expenses, and liquidity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onQuickAction('collect')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Collect Fee</span>
          </button>
          <button
            onClick={() => onQuickAction('expenses')}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Record Expense</span>
          </button>
          <button
            onClick={loadData}
            className="p-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 8 Primary Metric Cards (Section 27) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Today's Collection */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] text-slate-500 font-semibold block">Today's Collection</span>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {formatINR(m.todayCollection, false)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Fees collected today</div>
        </div>

        {/* This Month's Collection */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] text-slate-500 font-semibold block">Month's Collection</span>
          <div className="text-lg sm:text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
            {formatINR(m.monthCollection, false)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Current billing cycle</div>
        </div>

        {/* This Year's Collection */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] text-slate-500 font-semibold block">Year's Collection</span>
          <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {formatINR(m.yearCollection, false)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">YTD institutional collection</div>
        </div>

        {/* Outstanding Fees */}
        <div className="bg-rose-50/50 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/40 shadow-xs">
          <span className="text-[11px] text-rose-700 dark:text-rose-400 font-bold block">
            Outstanding Fees
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-rose-700 dark:text-rose-300 mt-1">
            {formatINR(m.outstandingFees, false)}
          </div>
          <div className="text-[10px] text-rose-600/80 mt-0.5">Accumulated arrears</div>
        </div>

        {/* Today's Expenses */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] text-slate-500 font-semibold block">Today's Expenses</span>
          <div className="text-lg sm:text-xl font-bold font-mono text-slate-800 dark:text-slate-200 mt-1">
            {formatINR(m.todayExpenses, false)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Disbursed today</div>
        </div>

        {/* This Month's Expenses */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] text-slate-500 font-semibold block">Month's Expenses</span>
          <div className="text-lg sm:text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
            {formatINR(m.monthExpenses, false)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Total monthly outflows</div>
        </div>

        {/* Net Income */}
        <div className="bg-indigo-50/60 dark:bg-indigo-950/30 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 shadow-xs">
          <span className="text-[11px] text-indigo-800 dark:text-indigo-300 font-bold block">
            Net Monthly Balance
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-indigo-700 dark:text-indigo-300 mt-1">
            {formatINR(m.netIncome, false)}
          </div>
          <div className="text-[10px] text-indigo-600/80 mt-0.5">Collections minus expenses</div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 shadow-xs">
          <span className="text-[11px] text-amber-800 dark:text-amber-300 font-bold block">
            Pending Approvals
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-amber-700 dark:text-amber-300 mt-1">
            {m.pendingExpenseApprovals} Vouchers
          </div>
          <div className="text-[10px] text-amber-600/80 mt-0.5">Awaiting authorization</div>
        </div>
      </div>

      {/* Visual Analytics / Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Method Distribution */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-600" />
              <span>Payment Mode Breakdown</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Total: {formatINR(totalMethodAmount, false)}
            </span>
          </div>

          {totalMethodAmount === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs italic">
              No payments recorded yet to display mode distribution.
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              {Object.entries(m.paymentMethodDistribution).map(([mode, amt]) => {
                const pct = totalMethodAmount > 0 ? Math.round((amt / totalMethodAmount) * 100) : 0;
                return (
                  <div key={mode} className="space-y-1">
                    <div className="flex justify-between font-medium">
                      <span className="text-slate-700 dark:text-slate-300">{mode}</span>
                      <span className="font-mono text-slate-900 dark:text-white">
                        {formatINR(amt, false)} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 6-Month Trend Overview */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span>6-Month Collection vs Expense Trend</span>
            </h3>
            <span className="text-[11px] text-slate-400">Monthly Performance</span>
          </div>

          {m.collectionTrend.length === 0 || m.collectionTrend.every((t) => t.collection === 0 && t.expense === 0) ? (
            <div className="py-12 text-center text-slate-400 text-xs italic">
              Insufficient historical data to render trends.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-6 gap-2 text-center pt-2">
                {m.collectionTrend.map((t, idx) => {
                  const maxVal = Math.max(
                    ...m.collectionTrend.map((x) => Math.max(x.collection, x.expense)),
                    1
                  );
                  const collHeight = Math.max(8, Math.round((t.collection / maxVal) * 90));
                  const expHeight = Math.max(8, Math.round((t.expense / maxVal) * 90));

                  return (
                    <div key={idx} className="flex flex-col items-center gap-1.5">
                      <div className="h-28 w-full flex items-end justify-center gap-1 bg-slate-50 dark:bg-slate-800/40 rounded-lg p-1">
                        <div
                          className="w-3 bg-indigo-600 rounded-t transition-all"
                          style={{ height: `${collHeight}%` }}
                          title={`Collected: ₹${t.collection}`}
                        />
                        <div
                          className="w-3 bg-rose-500 rounded-t transition-all"
                          style={{ height: `${expHeight}%` }}
                          title={`Expense: ₹${t.expense}`}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                        {t.month}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-center gap-6 pt-2 text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-indigo-600 rounded-xs" />
                  <span>Collections</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-rose-500 rounded-xs" />
                  <span>Expenses</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

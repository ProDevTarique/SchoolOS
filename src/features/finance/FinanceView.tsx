import React, { useState, useEffect } from 'react';
import {
  Layers,
  Users,
  CreditCard,
  Clock,
  AlertTriangle,
  Award,
  FileText,
  ReceiptText,
  BookOpen,
  FileBarChart2,
  Settings,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Student } from '../../types';

// Tab Components
import { FinanceDashboardTab } from './components/FinanceDashboardTab';
import { FeeStructuresTab } from './components/FeeStructuresTab';
import { StudentFeesTab } from './components/StudentFeesTab';
import { CollectFeeTab } from './components/CollectFeeTab';
import { PaymentHistoryTab } from './components/PaymentHistoryTab';
import { FeeDefaultersTab } from './components/FeeDefaultersTab';
import { DiscountsTab } from './components/DiscountsTab';
import { ReceiptsTab } from './components/ReceiptsTab';
import { ExpensesTab } from './components/ExpensesTab';
import { CashBookTab } from './components/CashBookTab';
import { FinancialReportsTab } from './components/FinancialReportsTab';
import { FinanceSettingsTab } from './components/FinanceSettingsTab';
import { FeeCategoriesTab } from './components/FeeCategoriesTab';
import { StudentFeeAssignmentsTab } from './components/StudentFeeAssignmentsTab';

export type FinanceSubTab =
  | 'overview'
  | 'structures'
  | 'categories'
  | 'assignments'
  | 'student-fees'
  | 'collect'
  | 'payments'
  | 'defaulters'
  | 'discounts'
  | 'receipts'
  | 'expenses'
  | 'accounts'
  | 'reports'
  | 'settings';

interface FinanceViewProps {
  initialSubTab?: FinanceSubTab;
}

export const FinanceView: React.FC<FinanceViewProps> = ({ initialSubTab = 'overview' }) => {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<FinanceSubTab>(initialSubTab);
  const [collectStudentId, setCollectStudentId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);

  const handleCollectForStudent = (student: Student) => {
    setCollectStudentId(student.id);
    setActiveTab('collect');
  };

  const handleCollectForStudentId = (studentId: string) => {
    setCollectStudentId(studentId);
    setActiveTab('collect');
  };

  const navTabs = [
    { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard, perm: 'fees.view' as const },
    { id: 'structures' as const, label: 'Fee Structures', icon: Layers, perm: 'fees.view' as const },
    { id: 'categories' as const, label: 'Fee Categories', icon: Layers, perm: 'fees.view' as const },
    { id: 'assignments' as const, label: 'Student Assignments', icon: Users, perm: 'fees.manage' as const },
    { id: 'student-fees' as const, label: 'Student Fees', icon: Users, perm: 'fees.view' as const },
    { id: 'collect' as const, label: 'Collect Fee', icon: CreditCard, perm: 'fees.collect' as const },
    { id: 'payments' as const, label: 'Payment History', icon: Clock, perm: 'fees.view' as const },
    { id: 'defaulters' as const, label: 'Fee Defaulters', icon: AlertTriangle, perm: 'fees.view' as const },
    { id: 'discounts' as const, label: 'Discounts & Scholarships', icon: Award, perm: 'fees.view' as const },
    { id: 'receipts' as const, label: 'Receipts', icon: FileText, perm: 'receipts.view' as const },
    { id: 'expenses' as const, label: 'Expenses', icon: ReceiptText, perm: 'expenses.view' as const },
    { id: 'accounts' as const, label: 'Accounts (Cash Book)', icon: BookOpen, perm: 'accounts.view' as const },
    { id: 'reports' as const, label: 'Financial Reports', icon: FileBarChart2, perm: 'reports.finance.view' as const },
    { id: 'settings' as const, label: 'Finance Settings', icon: Settings, perm: 'finance_settings.manage' as const },
  ];

  const visibleTabs = navTabs.filter((t) => hasPermission(t.perm));

  return (
    <div className="space-y-6">
      {/* Finance Navigation Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-2 sm:p-2.5 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                id={`finance-nav-${tab.id}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id !== 'collect') {
                    setCollectStudentId(undefined);
                  }
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab View Router */}
      <div className="min-w-0">
        {activeTab === 'overview' && (
          <FinanceDashboardTab
            onQuickAction={(action) => {
              if (action === 'collect') setActiveTab('collect');
              if (action === 'expenses') setActiveTab('expenses');
            }}
          />
        )}

        {activeTab === 'structures' && <FeeStructuresTab />}
        {activeTab === 'categories' && <FeeCategoriesTab />}
        {activeTab === 'assignments' && <StudentFeeAssignmentsTab />}

        {activeTab === 'student-fees' && (
          <StudentFeesTab onCollectFeeForStudent={handleCollectForStudent} />
        )}

        {activeTab === 'collect' && (
          <CollectFeeTab
            initialStudentId={collectStudentId}
            onViewStudentProfile={() => setActiveTab('student-fees')}
          />
        )}

        {activeTab === 'payments' && <PaymentHistoryTab />}

        {activeTab === 'defaulters' && (
          <FeeDefaultersTab onCollectFeeForStudentId={handleCollectForStudentId} />
        )}

        {activeTab === 'discounts' && <DiscountsTab />}

        {activeTab === 'receipts' && <ReceiptsTab />}

        {activeTab === 'expenses' && <ExpensesTab />}

        {activeTab === 'accounts' && <CashBookTab />}

        {activeTab === 'reports' && <FinancialReportsTab />}

        {activeTab === 'settings' && <FinanceSettingsTab />}
      </div>
    </div>
  );
};

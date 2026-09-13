import React, { useState } from 'react';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  Briefcase,
  CalendarCheck,
  FileBarChart,
  Settings,
  ShieldCheck,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  UserPlus,
  FileSpreadsheet,
  Layers,
  BookOpen,
  Calendar,
  X,
  CreditCard,
  IndianRupee,
  ReceiptText,
  FileText,
  Award,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export type NavItemKey =
  | 'dashboard'
  | 'academic-sessions'
  | 'academic-classes'
  | 'academic-sections'
  | 'academic-subjects'
  | 'students-list'
  | 'students-add'
  | 'students-import'
  | 'staff-list'
  | 'staff-add'
  | 'attendance'
  | 'reports'
  | 'school-settings'
  | 'users'
  | 'audit-logs'
  | 'subscription'
  // Phase 2 Finance Nav Items
  | 'finance'
  | 'finance-structures'
  | 'finance-student-fees'
  | 'finance-collect'
  | 'finance-payments'
  | 'finance-defaulters'
  | 'finance-discounts'
  | 'finance-receipts'
  | 'finance-expenses'
  | 'finance-accounts'
  | 'finance-reports'
  | 'finance-settings';

interface SidebarProps {
  currentTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  mobileOpen,
  onCloseMobile,
}) => {
  const { profile, hasPermission } = useAuth();
  const [academicOpen, setAcademicOpen] = useState(
    currentTab.startsWith('academic-')
  );
  const [studentsOpen, setStudentsOpen] = useState(
    currentTab.startsWith('students-')
  );
  const [staffOpen, setStaffOpen] = useState(currentTab.startsWith('staff-'));
  const [financeOpen, setFinanceOpen] = useState(
    currentTab.startsWith('finance')
  );

  const handleNav = (tab: NavItemKey) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  const isActive = (tab: NavItemKey) => currentTab === tab;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          id="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-200 flex flex-col border-r border-slate-800 transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold tracking-tight text-white text-lg leading-tight">
                TalimOS
              </div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">
                Admin ERP
              </div>
            </div>
          </div>
          <button
            id="sidebar-close-mobile-btn"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Role Badge */}
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <div className="truncate pr-2">
            <div className="text-xs font-medium text-slate-200 truncate">
              {profile?.name || 'Authorized Staff'}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {profile?.email}
            </div>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {profile?.role || 'STAFF'}
          </span>
        </div>

        {/* Scrollable Nav Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 text-sm font-medium">
          {/* Dashboard */}
          <button
            id="nav-btn-dashboard"
            onClick={() => handleNav('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
              isActive('dashboard')
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>Dashboard</span>
          </button>

          {/* Academic Menu */}
          {hasPermission('classes.view') && (
            <div>
              <button
                id="nav-group-academic"
                onClick={() => setAcademicOpen(!academicOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-4 h-4 shrink-0 text-slate-400" />
                  <span>Academic</span>
                </div>
                {academicOpen ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>
              {academicOpen && (
                <div className="ml-7 pl-2 border-l border-slate-800 mt-1 space-y-1">
                  <button
                    id="nav-btn-sessions"
                    onClick={() => handleNav('academic-sessions')}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                      isActive('academic-sessions')
                        ? 'bg-indigo-600 text-white font-medium'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Sessions</span>
                  </button>
                  <button
                    id="nav-btn-classes"
                    onClick={() => handleNav('academic-classes')}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                      isActive('academic-classes')
                        ? 'bg-indigo-600 text-white font-medium'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Classes</span>
                  </button>
                  <button
                    id="nav-btn-sections"
                    onClick={() => handleNav('academic-sections')}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                      isActive('academic-sections')
                        ? 'bg-indigo-600 text-white font-medium'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Sections</span>
                  </button>
                  <button
                    id="nav-btn-subjects"
                    onClick={() => handleNav('academic-subjects')}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                      isActive('academic-subjects')
                        ? 'bg-indigo-600 text-white font-medium'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Subjects</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Students Menu */}
          {hasPermission('students.view') && (
            <div>
              <button
                id="nav-group-students"
                onClick={() => setStudentsOpen(!studentsOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 shrink-0 text-slate-400" />
                  <span>Students</span>
                </div>
                {studentsOpen ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>
              {studentsOpen && (
                <div className="ml-7 pl-2 border-l border-slate-800 mt-1 space-y-1">
                  <button
                    id="nav-btn-students-list"
                    onClick={() => handleNav('students-list')}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                      isActive('students-list')
                        ? 'bg-indigo-600 text-white font-medium'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>All Students</span>
                  </button>
                  {hasPermission('students.create') && (
                    <>
                      <button
                        id="nav-btn-students-add"
                        onClick={() => handleNav('students-add')}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                          isActive('students-add')
                            ? 'bg-indigo-600 text-white font-medium'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add Student</span>
                      </button>
                      <button
                        id="nav-btn-students-import"
                        onClick={() => handleNav('students-import')}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                          isActive('students-import')
                            ? 'bg-indigo-600 text-white font-medium'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Import Students</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Staff Menu */}
          {hasPermission('staff.view') && (
            <div>
              <button
                id="nav-group-staff"
                onClick={() => setStaffOpen(!staffOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Briefcase className="w-4 h-4 shrink-0 text-slate-400" />
                  <span>Staff</span>
                </div>
                {staffOpen ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>
              {staffOpen && (
                <div className="ml-7 pl-2 border-l border-slate-800 mt-1 space-y-1">
                  <button
                    id="nav-btn-staff-list"
                    onClick={() => handleNav('staff-list')}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                      isActive('staff-list')
                        ? 'bg-indigo-600 text-white font-medium'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>All Staff</span>
                  </button>
                  {hasPermission('staff.create') && (
                    <button
                      id="nav-btn-staff-add"
                      onClick={() => handleNav('staff-add')}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                        isActive('staff-add')
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Add Staff</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Attendance */}
          {hasPermission('attendance.view') && (
            <button
              id="nav-btn-attendance"
              onClick={() => handleNav('attendance')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                isActive('attendance')
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <CalendarCheck className="w-4 h-4 shrink-0" />
              <span>Attendance</span>
            </button>
          )}

          {/* Reports */}
          {hasPermission('reports.view') && (
            <button
              id="nav-btn-reports"
              onClick={() => handleNav('reports')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                isActive('reports')
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FileBarChart className="w-4 h-4 shrink-0" />
              <span>Reports</span>
            </button>
          )}

          {/* ================= FINANCE SECTION ================= */}
          {(hasPermission('fees.view') ||
            hasPermission('fees.collect') ||
            hasPermission('expenses.view') ||
            hasPermission('receipts.view')) && (
            <div>
              <button
                id="nav-group-finance"
                onClick={() => setFinanceOpen(!financeOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 shrink-0 text-slate-400" />
                  <span className="font-semibold text-white">Finance</span>
                </div>
                {financeOpen ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>
              {financeOpen && (
                <div className="ml-7 pl-2 border-l border-slate-800 mt-1 space-y-1">
                  {/* Overview */}
                  <button
                    id="nav-btn-finance-overview"
                    onClick={() => handleNav('finance')}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                      isActive('finance')
                        ? 'bg-indigo-600 text-white font-medium'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Overview</span>
                  </button>

                  {/* 1. Fee Structures */}
                  {hasPermission('fees.view') && (
                    <button
                      id="nav-btn-finance-structures"
                      onClick={() => handleNav('finance-structures')}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                        isActive('finance-structures')
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Fee Structures</span>
                    </button>
                  )}

                  {/* 2. Student Fees */}
                  {hasPermission('fees.view') && (
                    <button
                      id="nav-btn-finance-student-fees"
                      onClick={() => handleNav('finance-student-fees')}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                        isActive('finance-student-fees')
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Student Fees</span>
                    </button>
                  )}

                  {/* 3. Collect Fee */}
                  {hasPermission('fees.collect') && (
                    <button
                      id="nav-btn-finance-collect"
                      onClick={() => handleNav('finance-collect')}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                        isActive('finance-collect')
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300 font-semibold">Collect Fee</span>
                    </button>
                  )}

                  {/* 4. Payment History */}
                  {hasPermission('fees.view') && (
                    <button
                      id="nav-btn-finance-payments"
                      onClick={() => handleNav('finance-payments')}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                        isActive('finance-payments')
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Payment History</span>
                    </button>
                  )}

                  {/* 5. Fee Defaulters */}
                  {hasPermission('fees.view') && (
                    <button
                      id="nav-btn-finance-defaulters"
                      onClick={() => handleNav('finance-defaulters')}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                        isActive('finance-defaulters')
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      <span>Fee Defaulters</span>
                    </button>
                  )}

                  {/* 6. Discounts & Scholarships */}
                  {hasPermission('fees.view') && (
                    <button
                      id="nav-btn-finance-discounts"
                      onClick={() => handleNav('finance-discounts')}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                        isActive('finance-discounts')
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>Discounts &amp; Scholarships</span>
                    </button>
                  )}

                  {/* 7. Receipts */}
                  {hasPermission('receipts.view') && (
                    <button
                      id="nav-btn-finance-receipts"
                      onClick={() => handleNav('finance-receipts')}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                        isActive('finance-receipts')
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Receipts</span>
                    </button>
                  )}

                  {/* 8. Expenses */}
                  {hasPermission('expenses.view') && (
                    <button
                      id="nav-btn-finance-expenses"
                      onClick={() => handleNav('finance-expenses')}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                        isActive('finance-expenses')
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <ReceiptText className="w-3.5 h-3.5" />
                      <span>Expenses</span>
                    </button>
                  )}

                  {/* 9. Accounts (Cash Book) */}
                  {hasPermission('accounts.view') && (
                    <button
                      id="nav-btn-finance-accounts"
                      onClick={() => handleNav('finance-accounts')}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                        isActive('finance-accounts')
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Accounts (Cash Book)</span>
                    </button>
                  )}

                  {/* 10. Financial Reports */}
                  {hasPermission('reports.finance.view') && (
                    <button
                      id="nav-btn-finance-reports"
                      onClick={() => handleNav('finance-reports')}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                        isActive('finance-reports')
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <FileBarChart className="w-3.5 h-3.5" />
                      <span>Financial Reports</span>
                    </button>
                  )}

                  {/* 11. Finance Settings */}
                  {hasPermission('finance_settings.manage') && (
                    <button
                      id="nav-btn-finance-settings"
                      onClick={() => handleNav('finance-settings')}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                        isActive('finance-settings')
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Finance Settings</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="pt-3 pb-1">
            <div className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              System Admin
            </div>
          </div>

          <button
            id="nav-btn-subscription"
            onClick={() => handleNav('subscription')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
              isActive('subscription')
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4 shrink-0" />
            <span>Subscription &amp; Billing</span>
          </button>

          {/* School Settings */}
          {hasPermission('school_settings.view') && (
            <button
              id="nav-btn-school-settings"
              onClick={() => handleNav('school-settings')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                isActive('school-settings')
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>School Settings</span>
            </button>
          )}

          {/* User Management */}
          {hasPermission('users.view') && (
            <button
              id="nav-btn-user-management"
              onClick={() => handleNav('users')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                isActive('users')
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>User Management</span>
            </button>
          )}

          {/* Audit Logs */}
          {hasPermission('audit.view') && (
            <button
              id="nav-btn-audit-logs"
              onClick={() => handleNav('audit-logs')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                isActive('audit-logs')
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ClipboardList className="w-4 h-4 shrink-0" />
              <span>Audit Logs</span>
            </button>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800 text-[11px] text-slate-500 text-center">
          TalimOS v1.0 • Phase 1
        </div>
      </aside>
    </>
  );
};

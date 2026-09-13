import React, { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { Sidebar, NavItemKey } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { SetupWizard } from './features/setup/SetupWizard';
import { LoginView } from './features/auth/LoginView';
import { DashboardView } from './features/dashboard/DashboardView';
import { AcademicsView } from './features/academics/AcademicsView';
import { StudentsListView } from './features/students/StudentsListView';
import { StaffListView } from './features/staff/StaffListView';
import { AttendanceView } from './features/attendance/AttendanceView';
import { ReportsView } from './features/reports/ReportsView';
import { SettingsView } from './features/settings/SettingsView';
import { UsersView } from './features/users/UsersView';
import { FinanceView } from './features/finance/FinanceView';
import { GraduationCap, RefreshCw } from 'lucide-react';

const SchoolOSApp: React.FC = () => {
  const { currentUser, profile, school, loading, schoolLoading, reloadSchool, reloadProfile } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavItemKey>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [forceSetup, setForceSetup] = useState(false);

  // Initializing state
  if (loading || schoolLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 mb-4 animate-pulse">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-white tracking-tight">SchoolOS Enterprise ERP</h2>
        <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
          <span>Synchronizing institutional security &amp; records...</span>
        </p>
      </div>
    );
  }

  // School First-Run Setup (if no school profile configured or user forced setup)
  if (!school || forceSetup) {
    return (
      <SetupWizard
        onSetupComplete={async () => {
          setForceSetup(false);
          await reloadSchool();
          await reloadProfile();
        }}
      />
    );
  }

  // Not logged in -> Show Login View
  if (!profile) {
    return (
      <LoginView
        onLoginSuccess={async () => {
          await reloadProfile();
          setCurrentTab('dashboard');
        }}
      />
    );
  }

  // Authenticated Main ERP Workspace
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors">
      {/* Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setMobileSidebarOpen(false);
        }}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {/* Top Header */}
        <Header onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} />

        {/* Dynamic Route View */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardView onNavigate={(tab) => setCurrentTab(tab)} />
          )}

          {/* Academic Sub-routes */}
          {currentTab === 'academic-sessions' && <AcademicsView initialSubTab="sessions" />}
          {currentTab === 'academic-classes' && <AcademicsView initialSubTab="classes" />}
          {currentTab === 'academic-sections' && <AcademicsView initialSubTab="sections" />}
          {currentTab === 'academic-subjects' && <AcademicsView initialSubTab="subjects" />}

          {/* Student Sub-routes */}
          {currentTab === 'students-list' && <StudentsListView />}
          {currentTab === 'students-add' && <StudentsListView initialOpenAdd={true} />}
          {currentTab === 'students-import' && <StudentsListView initialOpenImport={true} />}

          {/* Staff Sub-routes */}
          {currentTab === 'staff-list' && <StaffListView />}
          {currentTab === 'staff-add' && <StaffListView initialOpenAdd={true} />}

          {/* Attendance */}
          {currentTab === 'attendance' && <AttendanceView />}

          {/* Reports */}
          {currentTab === 'reports' && <ReportsView />}

          {/* Settings & Admin */}
          {currentTab === 'school-settings' && <SettingsView />}
          {currentTab === 'users' && <UsersView />}
          {currentTab === 'audit-logs' && <SettingsView />}

          {/* Phase 2 Finance Module Routes */}
          {currentTab === 'finance' && <FinanceView initialSubTab="overview" />}
          {currentTab === 'finance-structures' && <FinanceView initialSubTab="structures" />}
          {currentTab === 'finance-student-fees' && <FinanceView initialSubTab="student-fees" />}
          {currentTab === 'finance-collect' && <FinanceView initialSubTab="collect" />}
          {currentTab === 'finance-payments' && <FinanceView initialSubTab="payments" />}
          {currentTab === 'finance-defaulters' && <FinanceView initialSubTab="defaulters" />}
          {currentTab === 'finance-discounts' && <FinanceView initialSubTab="discounts" />}
          {currentTab === 'finance-receipts' && <FinanceView initialSubTab="receipts" />}
          {currentTab === 'finance-expenses' && <FinanceView initialSubTab="expenses" />}
          {currentTab === 'finance-accounts' && <FinanceView initialSubTab="accounts" />}
          {currentTab === 'finance-reports' && <FinanceView initialSubTab="reports" />}
          {currentTab === 'finance-settings' && <FinanceView initialSubTab="settings" />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SchoolOSApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

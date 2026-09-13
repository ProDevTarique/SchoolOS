import React from 'react';
import { Menu, Sun, Moon, LogOut, Shield, School as SchoolIcon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';

interface HeaderProps {
  onToggleMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileSidebar }) => {
  const { profile, school, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header
      id="app-top-header"
      className="sticky top-0 z-30 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between transition-colors"
    >
      {/* Left side: Hamburger & School info */}
      <div className="flex items-center gap-3">
        <button
          id="btn-toggle-mobile-sidebar"
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Open Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          {school?.logoUrl ? (
            <img
              src={school.logoUrl}
              alt={school.name}
              className="w-7 h-7 object-contain rounded border border-slate-200 dark:border-slate-700 hidden sm:block"
            />
          ) : (
            <div className="w-7 h-7 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 hidden sm:flex">
              <SchoolIcon className="w-4 h-4" />
            </div>
          )}
          <div>
            <span className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100">
              {school?.name || 'SchoolOS ERP'}
            </span>
            {school?.principalName && (
              <span className="text-xs text-slate-500 dark:text-slate-400 hidden md:inline ml-2 pl-2 border-l border-slate-300 dark:border-slate-700">
                Principal: {school.principalName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme Toggle */}
        <button
          id="btn-theme-toggle"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* User Role info pill */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
          <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span className="font-medium text-slate-800 dark:text-slate-200">{profile?.name || 'Admin'}</span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold">{profile?.role}</span>
        </div>

        {/* Logout Button */}
        <button
          id="btn-logout"
          onClick={logout}
          title="Sign Out"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
};

import React from 'react';
import { School } from '../../types';
import { GraduationCap } from 'lucide-react';

interface SchoolHeaderProps {
  school: School | null;
  subtitle?: string;
  compact?: boolean;
}

export const SchoolHeader: React.FC<SchoolHeaderProps> = ({ school, subtitle, compact = false }) => {
  if (!school) return null;

  return (
    <div
      id="school-institutional-header"
      className={`border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 ${
        compact ? 'py-2 mb-3' : 'pt-2'
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {school.logoUrl ? (
            <img
              src={school.logoUrl}
              alt={school.name}
              className={`object-contain rounded-lg border border-slate-200 dark:border-slate-700 bg-white p-1 ${
                compact ? 'w-12 h-12' : 'w-16 h-16'
              }`}
            />
          ) : (
            <div
              className={`rounded-lg bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center font-bold tracking-wider ${
                compact ? 'w-12 h-12 text-lg' : 'w-16 h-16 text-xl'
              }`}
            >
              <GraduationCap className={compact ? 'w-6 h-6' : 'w-8 h-8'} />
            </div>
          )}

          <div>
            <h1 className={`font-bold tracking-tight text-slate-900 dark:text-slate-100 ${
              compact ? 'text-lg' : 'text-2xl'
            }`}>
              {school.name}
            </h1>
            {school.schoolMotto && (
              <p className="text-xs italic text-slate-500 dark:text-slate-400">
                &ldquo;{school.schoolMotto}&rdquo;
              </p>
            )}
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {[school.address, school.city, school.state, school.pinCode ? `PIN: ${school.pinCode}` : '']
                .filter(Boolean)
                .join(', ')}
            </p>
          </div>
        </div>

        <div className="text-right text-xs text-slate-500 dark:text-slate-400 space-y-0.5 hidden sm:block">
          {school.phone && <div>Tel: <span className="font-medium text-slate-700 dark:text-slate-200">{school.phone}</span></div>}
          {school.email && <div>Email: <span className="font-medium text-slate-700 dark:text-slate-200">{school.email}</span></div>}
          {school.website && <div>Web: <span className="font-medium text-slate-700 dark:text-slate-200">{school.website}</span></div>}
        </div>
      </div>

      {subtitle && (
        <div className="mt-3 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
          <span className="font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200">{subtitle}</span>
          <span>Date: {new Date().toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
        </div>
      )}
    </div>
  );
};

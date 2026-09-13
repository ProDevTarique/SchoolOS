import React, { useEffect, useState } from 'react';
import {
  Users,
  GraduationCap,
  Briefcase,
  Layers,
  Calendar,
  CheckCircle,
  Clock,
  ArrowUpRight,
  UserPlus,
  CalendarCheck,
  FileBarChart,
  Activity,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getStudents } from '../../services/studentService';
import { getStaffList } from '../../services/staffService';
import { getClasses, getSections, getAcademicSessions } from '../../services/academicService';
import { getTodayAttendanceSummary } from '../../services/attendanceService';
import { getAuditLogs } from '../../services/auditService';
import { Student, StaffMember, AuditLog } from '../../types';
import { NavItemKey } from '../../components/layout/Sidebar';
import { IndianRupee, CreditCard } from 'lucide-react';
import { getFinanceDashboardMetrics, FinanceDashboardMetrics } from '../finance/services/financeReportsService';
import { formatINR } from '../finance/utils/currencyUtils';

interface DashboardViewProps {
  onNavigate: (tab: NavItemKey) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { school, profile, hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);

  // Stats
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalTeachers, setTotalTeachers] = useState(0);
  const [totalStaff, setTotalStaff] = useState(0);
  const [totalClasses, setTotalClasses] = useState(0);
  const [totalSections, setTotalSections] = useState(0);
  const [activeSessionName, setActiveSessionName] = useState('2025-26');

  // Finance Stats
  const [financeMetrics, setFinanceMetrics] = useState<FinanceDashboardMetrics | null>(null);

  // Widgets
  const [recentStudents, setRecentStudents] = useState<Student[]>([]);
  const [recentAuditLogs, setRecentAuditLogs] = useState<AuditLog[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState({
    totalPresent: 0,
    totalAbsent: 0,
    totalLate: 0,
    totalLeave: 0,
    totalMarked: 0,
    percentage: 0,
  });

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!school?.id) return;
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [
          studentsList,
          allStaff,
          classesList,
          sectionsList,
          sessionsList,
          todayAtt,
          logs,
        ] = await Promise.all([
          getStudents(school.id),
          getStaffList(school.id),
          getClasses(school.id),
          getSections(school.id),
          getAcademicSessions(school.id),
          getTodayAttendanceSummary(school.id, todayStr),
          getAuditLogs(school.id, 6),
        ]);

        setTotalStudents(studentsList.filter((s) => s.status === 'ACTIVE').length);
        const teachers = allStaff.filter((st) => st.category === 'Teacher' && st.employmentStatus === 'ACTIVE');
        setTotalTeachers(teachers.length);
        setTotalStaff(allStaff.filter((st) => st.employmentStatus === 'ACTIVE').length);
        setTotalClasses(classesList.filter((c) => c.status === 'ACTIVE').length);
        setTotalSections(sectionsList.filter((s) => s.status === 'ACTIVE').length);

        const activeSess = sessionsList.find((s) => s.isActive);
        if (activeSess) {
          setActiveSessionName(activeSess.name);
        }

        // Recent students (last 5)
        const sortedStudents = [...studentsList].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setRecentStudents(sortedStudents.slice(0, 5));
        setAttendanceSummary(todayAtt);
        setRecentAuditLogs(logs);

        // Optional finance metrics if user has permissions
        if (hasPermission('fees.view')) {
          try {
            const fm = await getFinanceDashboardMetrics(school.id);
            setFinanceMetrics(fm);
          } catch (fErr) {
            console.warn('Finance metrics error on dashboard:', fErr);
          }
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [school?.id]);

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            <span>Administration Console</span>
            <span>•</span>
            <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
            Welcome back, {profile?.name || 'Administrator'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {school?.name} • Active Session: <span className="font-semibold text-slate-700 dark:text-slate-200">{activeSessionName}</span>
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {hasPermission('students.create') && (
            <button
              id="dash-quick-add-student"
              onClick={() => onNavigate('students-add')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Student</span>
            </button>
          )}

          {hasPermission('attendance.manage') && (
            <button
              id="dash-quick-mark-attendance"
              onClick={() => onNavigate('attendance')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Mark Attendance</span>
            </button>
          )}

          {hasPermission('reports.view') && (
            <button
              id="dash-quick-view-reports"
              onClick={() => onNavigate('reports')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
            >
              <FileBarChart className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Reports</span>
            </button>
          )}

          {hasPermission('fees.collect') && (
            <button
              id="dash-quick-collect-fee"
              onClick={() => onNavigate('finance-collect')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Collect Fee</span>
            </button>
          )}
        </div>
      </div>

      {/* 6 Key Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Students */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Students</span>
            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {loading ? '...' : totalStudents}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Active enrollments</div>
        </div>

        {/* Total Teachers */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Teachers</span>
            <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {loading ? '...' : totalTeachers}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Teaching faculty</div>
        </div>

        {/* Total Staff */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">All Staff</span>
            <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {loading ? '...' : totalStaff}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Active personnel</div>
        </div>

        {/* Total Classes */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Classes</span>
            <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {loading ? '...' : totalClasses}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Grade levels</div>
        </div>

        {/* Total Sections */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Sections</span>
            <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {loading ? '...' : totalSections}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Class divisions</div>
        </div>

        {/* Active Academic Session */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Session</span>
            <Calendar className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white truncate">
            {activeSessionName}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Active Term</span>
          </div>
        </div>
      </div>

      {/* Finance Overview Strip (For authorized roles) */}
      {financeMetrics && hasPermission('fees.view') && (
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-xl p-5 text-white shadow-xs border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-900/50">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <IndianRupee className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight">Finance & Fee Snapshot</h3>
                <p className="text-[11px] text-slate-400">Institutional fee collections, dues & cash position</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('finance')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-300 hover:text-white transition-colors self-start sm:self-auto"
            >
              <span>View Finance Hub</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            <div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Today&apos;s Collection</span>
              <div className="text-xl font-bold text-emerald-400 mt-1">
                {formatINR(financeMetrics.todayCollection)}
              </div>
              <span className="text-[10px] text-slate-400">Cash, UPI, Cheque, Bank</span>
            </div>

            <div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Month Collection</span>
              <div className="text-xl font-bold text-white mt-1">
                {formatINR(financeMetrics.monthCollection)}
              </div>
              <span className="text-[10px] text-slate-400">Current calendar month</span>
            </div>

            <div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Outstanding Dues</span>
              <div className="text-xl font-bold text-rose-400 mt-1">
                {formatINR(financeMetrics.outstandingFees)}
              </div>
              <span className="text-[10px] text-slate-400">Pending & overdue fee items</span>
            </div>

            <div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Net Cash Position</span>
              <div className={`text-xl font-bold mt-1 ${financeMetrics.netIncome >= 0 ? 'text-indigo-300' : 'text-rose-400'}`}>
                {formatINR(financeMetrics.netIncome)}
              </div>
              <span className="text-[10px] text-slate-400">Total inflow minus expenses</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Attendance Summary & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Summary Widget (1 col) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-indigo-600" />
                Today&apos;s Attendance
              </h2>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{todayStr}</span>
            </div>

            <div className="py-5 text-center">
              <div className="text-4xl font-extrabold text-slate-900 dark:text-white">
                {attendanceSummary.percentage}%
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {attendanceSummary.totalMarked > 0
                  ? `${attendanceSummary.totalPresent} Present of ${attendanceSummary.totalMarked} marked today`
                  : 'No attendance marked yet today'}
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  {attendanceSummary.totalPresent}
                </div>
                <div className="text-[10px] text-emerald-600/80 uppercase font-semibold">Present</div>
              </div>
              <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30">
                <div className="text-sm font-bold text-rose-700 dark:text-rose-400">
                  {attendanceSummary.totalAbsent}
                </div>
                <div className="text-[10px] text-rose-600/80 uppercase font-semibold">Absent</div>
              </div>
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                <div className="text-sm font-bold text-amber-700 dark:text-amber-400">
                  {attendanceSummary.totalLate}
                </div>
                <div className="text-[10px] text-amber-600/80 uppercase font-semibold">Late</div>
              </div>
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <div className="text-sm font-bold text-blue-700 dark:text-blue-400">
                  {attendanceSummary.totalLeave}
                </div>
                <div className="text-[10px] text-blue-600/80 uppercase font-semibold">Leave</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('attendance')}
            className="mt-5 w-full py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1 transition-colors"
          >
            <span>Open Attendance Module</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Recent Students Table (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Recent Student Admissions
              </h2>
              <button
                onClick={() => onNavigate('students-list')}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            {recentStudents.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No student admissions logged yet.
              </div>
            ) : (
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800 font-semibold">
                      <th className="py-2">Admission No</th>
                      <th className="py-2">Student Name</th>
                      <th className="py-2">Roll No</th>
                      <th className="py-2">Parent Contact</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recentStudents.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 font-medium text-slate-900 dark:text-slate-100">
                          {st.admissionNumber}
                        </td>
                        <td className="py-2.5 text-slate-800 dark:text-slate-200 font-medium">
                          {st.fullName}
                        </td>
                        <td className="py-2.5 text-slate-500">
                          {st.rollNumber || '—'}
                        </td>
                        <td className="py-2.5 text-slate-500">
                          {st.fatherPhone || st.motherPhone || '—'}
                        </td>
                        <td className="py-2.5">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${
                            st.status === 'ACTIVE'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {st.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-right">
            <span className="text-[11px] text-slate-400">
              Total {totalStudents} students registered in current school database
            </span>
          </div>
        </div>
      </div>

      {/* Audit Log / Recent Activity Widget */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" />
            Recent Administrative Activity
          </h2>
          {hasPermission('audit.view') && (
            <button
              onClick={() => onNavigate('audit-logs')}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>Full Audit Trail</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {recentAuditLogs.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No audit records recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
            {recentAuditLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-start justify-between gap-4 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <div>
                    <div className="font-medium text-slate-800 dark:text-slate-200">
                      {log.description}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      By <span className="font-medium text-slate-600 dark:text-slate-300">{log.userName}</span> ({log.userRole}) • Module: {log.module}
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

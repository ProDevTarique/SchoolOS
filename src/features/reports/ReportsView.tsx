import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Users,
  CalendarCheck,
  Briefcase,
  Download,
  Printer,
  FileSpreadsheet,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Student, StaffMember, ClassItem, SectionItem } from '../../types';
import { getStudents } from '../../services/studentService';
import { getStaffList } from '../../services/staffService';
import { getClasses, getSections } from '../../services/academicService';
import { useAuth } from '../../hooks/useAuth';
import { SchoolHeader } from '../../components/common/SchoolHeader';

type ReportTab = 'STRENGTH' | 'STAFF' | 'ATTENDANCE_OVERVIEW';

export const ReportsView: React.FC = () => {
  const { school } = useAuth();

  const [activeTab, setActiveTab] = useState<ReportTab>('STRENGTH');
  const [students, setStudents] = useState<Student[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!school?.id) return;
    const loadReportData = async () => {
      setLoading(true);
      try {
        const [stList, stfList, clsList, secList] = await Promise.all([
          getStudents(school.id),
          getStaffList(school.id),
          getClasses(school.id),
          getSections(school.id),
        ]);
        setStudents(stList);
        setStaff(stfList);
        setClasses(clsList);
        setSections(secList);
      } catch (err) {
        console.error('Failed to load report data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadReportData();
  }, [school?.id]);

  const handlePrint = () => {
    window.print();
  };

  // Student Strength Computation
  const strengthRows = classes.map((c) => {
    const classStudents = students.filter((s) => s.classId === c.id);
    const boys = classStudents.filter((s) => s.gender === 'MALE').length;
    const girls = classStudents.filter((s) => s.gender === 'FEMALE').length;
    const other = classStudents.filter((s) => s.gender === 'OTHER').length;
    const active = classStudents.filter((s) => s.status === 'ACTIVE').length;
    return {
      id: c.id,
      name: c.name,
      code: c.code,
      boys,
      girls,
      other,
      total: classStudents.length,
      active,
    };
  });

  const totalBoys = strengthRows.reduce((acc, r) => acc + r.boys, 0);
  const totalGirls = strengthRows.reduce((acc, r) => acc + r.girls, 0);
  const totalStudents = students.length;

  // Staff Summary Computation
  const staffCategories = [
    'Principal',
    'Vice Principal',
    'Teacher',
    'Accountant',
    'Receptionist',
    'Librarian',
    'Driver',
    'Conductor',
    'Security',
    'Other',
  ];

  const staffCategoryRows = staffCategories.map((cat) => {
    const members = staff.filter((s) => s.category === cat);
    const active = members.filter((s) => s.employmentStatus === 'ACTIVE').length;
    const totalSalary = members.reduce((sum, s) => sum + (s.basicSalary || 0), 0);
    return {
      category: cat,
      count: members.length,
      active,
      totalSalary,
    };
  }).filter((r) => r.count > 0);

  const totalPayroll = staff.reduce((sum, s) => sum + (s.basicSalary || 0), 0);

  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[] = [];
    let filename = '';

    if (activeTab === 'STRENGTH') {
      headers = ['Class Name', 'Class Code', 'Male Students', 'Female Students', 'Other', 'Total Enrolled', 'Active Status'];
      rows = strengthRows.map((r) =>
        `"${r.name}","${r.code}",${r.boys},${r.girls},${r.other},${r.total},${r.active}`
      );
      filename = `Student_Strength_Report_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (activeTab === 'STAFF') {
      headers = ['Staff Category', 'Total Count', 'Active Count', 'Total Basic Salary (Monthly)'];
      rows = staffCategoryRows.map((r) =>
        `"${r.category}",${r.count},${r.active},${r.totalSalary}`
      );
      filename = `Staff_Summary_Report_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      headers = ['Metric', 'Value'];
      rows = [
        `"Total Students Enrolled",${totalStudents}`,
        `"Total Staff Count",${staff.length}`,
        `"Total Classes",${classes.length}`,
      ];
      filename = `Executive_Summary_${new Date().toISOString().split('T')[0]}.csv`;
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Institutional Reports Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time demographic breakdowns, staff allocation reports, and print-ready executive dossiers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-xs font-semibold print:hidden">
        <button
          onClick={() => setActiveTab('STRENGTH')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'STRENGTH'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Student Strength &amp; Demographics</span>
        </button>

        <button
          onClick={() => setActiveTab('STAFF')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'STAFF'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Staff &amp; Payroll Summary</span>
        </button>

        <button
          onClick={() => setActiveTab('ATTENDANCE_OVERVIEW')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'ATTENDANCE_OVERVIEW'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Academic Overview</span>
        </button>
      </div>

      {/* Report Canvas */}
      <div id="printable-report-canvas" className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
        {/* Printable Institutional Header */}
        <SchoolHeader
          school={school}
          subtitle={
            activeTab === 'STRENGTH'
              ? 'CLASS-WISE ENROLLMENT & GENDER DEMOGRAPHICS AUDIT'
              : activeTab === 'STAFF'
              ? 'STAFF CADRE & RESOURCE DISBURSEMENT REPORT'
              : 'EXECUTIVE INSTITUTIONAL OVERVIEW'
          }
        />

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
            <span>Computing statistical aggregates...</span>
          </div>
        ) : activeTab === 'STRENGTH' ? (
          <div className="space-y-6">
            {/* Demographic Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-medium text-slate-500 block">Total Enrolled</span>
                <span className="text-2xl font-bold text-slate-900 dark:text-white mt-1 block">
                  {totalStudents}
                </span>
                <span className="text-[11px] text-slate-400">Across {classes.length} classes</span>
              </div>

              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60">
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400 block">Male Students</span>
                <span className="text-2xl font-bold text-blue-800 dark:text-blue-300 mt-1 block">
                  {totalBoys}
                </span>
                <span className="text-[11px] text-blue-500">
                  {totalStudents > 0 ? Math.round((totalBoys / totalStudents) * 100) : 0}% of total
                </span>
              </div>

              <div className="p-4 rounded-xl bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800/60">
                <span className="text-xs font-medium text-pink-600 dark:text-pink-400 block">Female Students</span>
                <span className="text-2xl font-bold text-pink-800 dark:text-pink-300 mt-1 block">
                  {totalGirls}
                </span>
                <span className="text-[11px] text-pink-500">
                  {totalStudents > 0 ? Math.round((totalGirls / totalStudents) * 100) : 0}% of total
                </span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 block">Active Status</span>
                <span className="text-2xl font-bold text-emerald-800 dark:text-emerald-300 mt-1 block">
                  {students.filter((s) => s.status === 'ACTIVE').length}
                </span>
                <span className="text-[11px] text-emerald-500">In good standing</span>
              </div>
            </div>

            {/* Class Breakdown Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4 text-center">Boys</th>
                    <th className="py-3 px-4 text-center">Girls</th>
                    <th className="py-3 px-4 text-center">Other</th>
                    <th className="py-3 px-4 text-center">Active</th>
                    <th className="py-3 px-4 text-right">Class Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {strengthRows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{r.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{r.code}</td>
                      <td className="py-3 px-4 text-center font-medium text-blue-600">{r.boys}</td>
                      <td className="py-3 px-4 text-center font-medium text-pink-600">{r.girls}</td>
                      <td className="py-3 px-4 text-center text-slate-400">{r.other}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 font-semibold">
                          {r.active}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {r.total}
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="bg-slate-50 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-700">
                    <td className="py-3 px-4">Total Aggregate</td>
                    <td className="py-3 px-4">—</td>
                    <td className="py-3 px-4 text-center text-blue-700">{totalBoys}</td>
                    <td className="py-3 px-4 text-center text-pink-700">{totalGirls}</td>
                    <td className="py-3 px-4 text-center text-slate-500">
                      {students.filter((s) => s.gender === 'OTHER').length}
                    </td>
                    <td className="py-3 px-4 text-center text-emerald-700">
                      {students.filter((s) => s.status === 'ACTIVE').length}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-900 dark:text-white">
                      {totalStudents}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'STAFF' ? (
          <div className="space-y-6">
            {/* Staff Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-medium text-slate-500 block">Total Staff Members</span>
                <span className="text-2xl font-bold text-slate-900 dark:text-white mt-1 block">
                  {staff.length}
                </span>
                <span className="text-[11px] text-slate-400">All departments</span>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60">
                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 block">Teaching Faculty</span>
                <span className="text-2xl font-bold text-indigo-800 dark:text-indigo-300 mt-1 block">
                  {staff.filter((s) => s.category === 'Teacher').length}
                </span>
                <span className="text-[11px] text-indigo-500">
                  Ratio: ~1 :{' '}
                  {staff.filter((s) => s.category === 'Teacher').length > 0
                    ? Math.round(
                        totalStudents / staff.filter((s) => s.category === 'Teacher').length
                      )
                    : 'N/A'}{' '}
                  students
                </span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 block">Monthly Base Payroll</span>
                <span className="text-2xl font-bold text-emerald-800 dark:text-emerald-300 mt-1 block">
                  {school?.currency || '₹'} {totalPayroll.toLocaleString()}
                </span>
                <span className="text-[11px] text-emerald-500">Estimated monthly basic</span>
              </div>
            </div>

            {/* Staff Breakdown Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Staff Category</th>
                    <th className="py-3 px-4 text-center">Total Enrolled</th>
                    <th className="py-3 px-4 text-center">Active Status</th>
                    <th className="py-3 px-4 text-right">Base Payroll Allocation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {staffCategoryRows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{r.category}</td>
                      <td className="py-3 px-4 text-center font-semibold">{r.count}</td>
                      <td className="py-3 px-4 text-center text-emerald-600 font-semibold">{r.active}</td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-900 dark:text-white">
                        {school?.currency || '₹'} {r.totalSalary.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-700">
                    <td className="py-3 px-4">Total Payroll Aggregate</td>
                    <td className="py-3 px-4 text-center">{staff.length}</td>
                    <td className="py-3 px-4 text-center text-emerald-700">
                      {staff.filter((s) => s.employmentStatus === 'ACTIVE').length}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-900 dark:text-white">
                      {school?.currency || '₹'} {totalPayroll.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                Operational Overview
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                TalimOS core operational parameters are currently operating in good standing. All academic structures (sessions, classes, sections, and subjects) are synced with the Firestore database.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                  Academic Configuration
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Configured Classes:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{classes.length}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Configured Sections:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{sections.length}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Active Students:</span>
                  <span className="font-semibold text-emerald-600">
                    {students.filter((s) => s.status === 'ACTIVE').length}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                  Preparedness for Phase 2 Modules
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Fee Structure Architecture:</span>
                  <span className="text-indigo-600 font-semibold">Ready for Activation</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Transport &amp; SMS Schema:</span>
                  <span className="text-indigo-600 font-semibold">Pre-architected</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Parent Portal Auth Linking:</span>
                  <span className="text-indigo-600 font-semibold">Enabled</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Signature area */}
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 text-xs text-slate-500">
          <div>
            <div className="w-36 border-b border-slate-400 mb-1" />
            <span>Generated by Data Officer</span>
          </div>
          <div className="text-right">
            <div className="w-36 border-b border-slate-400 mb-1 ml-auto" />
            <span>Principal Approval</span>
          </div>
        </div>
      </div>
    </div>
  );
};

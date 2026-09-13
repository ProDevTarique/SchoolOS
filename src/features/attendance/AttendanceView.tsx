import React, { useEffect, useState } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Coffee,
  Save,
  Printer,
  Calendar,
  AlertCircle,
  Check,
  RefreshCw,
} from 'lucide-react';
import { ClassItem, SectionItem, Student, AttendanceStatus, AttendanceRecord } from '../../types';
import { getClasses, getSections } from '../../services/academicService';
import { getStudents } from '../../services/studentService';
import { getDailyAttendance, saveDailyAttendance } from '../../services/attendanceService';
import { logAuditEvent } from '../../services/auditService';
import { useAuth } from '../../hooks/useAuth';
import { SchoolHeader } from '../../components/common/SchoolHeader';

export const AttendanceView: React.FC = () => {
  const { school, profile, hasPermission } = useAuth();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<Map<string, { status: AttendanceStatus; remarks: string }>>(new Map());

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load classes & sections on mount
  useEffect(() => {
    if (!school?.id) return;
    const init = async () => {
      try {
        const [cls, sec] = await Promise.all([getClasses(school.id), getSections(school.id)]);
        setClasses(cls);
        setSections(sec);
        if (cls.length > 0) {
          setSelectedClassId(cls[0].id);
          const firstSec = sec.find((s) => s.classId === cls[0].id);
          if (firstSec) setSelectedSectionId(firstSec.id);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load classes.');
      }
    };
    init();
  }, [school?.id]);

  // When class changes, select first section of that class
  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    const firstSec = sections.find((s) => s.classId === classId);
    setSelectedSectionId(firstSec ? firstSec.id : '');
  };

  // Load students & existing attendance for class, section & date
  useEffect(() => {
    if (!school?.id || !selectedClassId || !selectedSectionId) return;

    const fetchClassStudentsAndAttendance = async () => {
      setLoading(true);
      setError(null);
      setSavedSuccess(false);
      try {
        const [allStudents, existingDaily] = await Promise.all([
          getStudents(school.id, { classId: selectedClassId, sectionId: selectedSectionId, status: 'ACTIVE' }),
          getDailyAttendance(school.id, selectedClassId, selectedSectionId, selectedDate),
        ]);

        // Sort students by roll number or name
        const sortedStudents = [...allStudents].sort((a, b) => {
          const rA = parseInt(a.rollNumber || '0', 10);
          const rB = parseInt(b.rollNumber || '0', 10);
          if (rA && rB) return rA - rB;
          return a.fullName.localeCompare(b.fullName);
        });
        setStudents(sortedStudents);

        // Map existing attendance or default to PRESENT
        const map = new Map<string, { status: AttendanceStatus; remarks: string }>();
        if (existingDaily && existingDaily.records) {
          existingDaily.records.forEach((r) => {
            map.set(r.studentId, { status: r.status, remarks: r.remarks || '' });
          });
        }

        // For any student not marked, default to PRESENT
        sortedStudents.forEach((st) => {
          if (!map.has(st.id)) {
            map.set(st.id, { status: 'PRESENT', remarks: '' });
          }
        });

        setRecords(map);
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch class attendance.');
      } finally {
        setLoading(false);
      }
    };

    fetchClassStudentsAndAttendance();
  }, [school?.id, selectedClassId, selectedSectionId, selectedDate]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setRecords((prev) => {
      const next = new Map<string, { status: AttendanceStatus; remarks: string }>(prev);
      const current = next.get(studentId);
      next.set(studentId, {
        status,
        remarks: current ? current.remarks : '',
      });
      return next;
    });
    setSavedSuccess(false);
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setRecords((prev) => {
      const next = new Map<string, { status: AttendanceStatus; remarks: string }>(prev);
      const current = next.get(studentId);
      next.set(studentId, {
        status: current ? current.status : 'PRESENT',
        remarks,
      });
      return next;
    });
  };

  const markAll = (status: AttendanceStatus) => {
    setRecords((prev) => {
      const next = new Map<string, { status: AttendanceStatus; remarks: string }>(prev);
      students.forEach((st) => {
        const current = next.get(st.id);
        next.set(st.id, {
          status,
          remarks: current ? current.remarks : '',
        });
      });
      return next;
    });
    setSavedSuccess(false);
  };

  const handleSave = async () => {
    if (!school?.id || !profile || !selectedClassId || !selectedSectionId) return;
    setSaving(true);
    setError(null);
    try {
      const attendanceRecords: AttendanceRecord[] = students.map((st) => {
        const rec = records.get(st.id) || { status: 'PRESENT', remarks: '' };
        return {
          studentId: st.id,
          studentName: st.fullName,
          rollNumber: st.rollNumber,
          status: rec.status,
          remarks: rec.remarks,
        };
      });

      await saveDailyAttendance({
        schoolId: school.id,
        classId: selectedClassId,
        sectionId: selectedSectionId,
        date: selectedDate,
        recordedBy: profile.name,
        records: attendanceRecords,
        sessionId: school.currentSessionId,
      });

      await logAuditEvent({
        schoolId: school.id,
        userId: profile.uid,
        userName: profile.name,
        userRole: profile.role,
        action: 'ATTENDANCE_RECORDED',
        module: 'Attendance',
        description: `Marked attendance for Class ${
          classes.find((c) => c.id === selectedClassId)?.name
        } on ${selectedDate}.`,
      });

      setSavedSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to save attendance record.');
    } finally {
      setSaving(false);
    }
  };

  // Computed summary for UI
  const counts = {
    total: students.length,
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
  };
  records.forEach((v) => {
    if (v.status === 'PRESENT') counts.present++;
    else if (v.status === 'ABSENT') counts.absent++;
    else if (v.status === 'LATE') counts.late++;
    else if (v.status === 'LEAVE') counts.leave++;
  });
  const percentage = counts.total > 0 ? Math.round(((counts.present + counts.late) / counts.total) * 100) : 0;

  const currentClassName = classes.find((c) => c.id === selectedClassId)?.name;
  const currentSectionName = sections.find((s) => s.id === selectedSectionId)?.name;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-indigo-600" />
            Daily Attendance Register
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Log student daily presence, tardiness, and authorized leaves with automated summary calculation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Register</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-lg flex items-center gap-2 print:hidden">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Selector Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
        {/* Class */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Class
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => handleClassChange(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Section */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Section
          </label>
          <select
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            {sections
              .filter((s) => s.classId === selectedClassId)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  Section {s.name}
                </option>
              ))}
          </select>
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Attendance Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Attendance Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
          <div className="text-xl font-bold text-slate-900 dark:text-white">{counts.total}</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Total Enrolled</div>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-center">
          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{counts.present}</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600">Present</div>
        </div>

        <div className="bg-rose-50 dark:bg-rose-950/30 p-3 rounded-xl border border-rose-200 dark:border-rose-800/60 text-center">
          <div className="text-xl font-bold text-rose-700 dark:text-rose-400">{counts.absent}</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-rose-600">Absent</div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-800/60 text-center">
          <div className="text-xl font-bold text-amber-700 dark:text-amber-400">{counts.late}</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-amber-600">Late</div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-xl border border-blue-200 dark:border-blue-800/60 text-center">
          <div className="text-xl font-bold text-blue-700 dark:text-blue-400">{counts.leave}</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-blue-600">Leave</div>
        </div>

        <div className="bg-indigo-50 dark:bg-indigo-950/30 p-3 rounded-xl border border-indigo-200 dark:border-indigo-800/60 text-center">
          <div className="text-xl font-bold text-indigo-700 dark:text-indigo-400">{percentage}%</div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-indigo-600">Attendance Rate</div>
        </div>
      </div>

      {/* Main Register Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Printable Header */}
        <div className="hidden print:block p-4">
          <SchoolHeader school={school} subtitle={`CLASS ATTENDANCE REGISTER - ${currentClassName} (SEC ${currentSectionName}) - DATE: ${selectedDate}`} />
        </div>

        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
          <div className="text-xs">
            <span className="font-bold text-slate-900 dark:text-white">
              {currentClassName} - Section {currentSectionName}
            </span>
            <span className="text-slate-400 mx-2">•</span>
            <span className="text-slate-500 font-medium">Date: {selectedDate}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => markAll('PRESENT')}
              className="px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 transition-colors"
            >
              Mark All Present
            </button>
            <button
              onClick={() => markAll('ABSENT')}
              className="px-2.5 py-1 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold hover:bg-rose-100 transition-colors"
            >
              Mark All Absent
            </button>
            {hasPermission('attendance.manage') && (
              <button
                id="btn-save-attendance"
                onClick={handleSave}
                disabled={saving || students.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Register'}</span>
              </button>
            )}
          </div>
        </div>

        {savedSuccess && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between px-4">
            <div className="flex items-center gap-2 font-medium">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Attendance recorded successfully for {currentClassName} on {selectedDate}.</span>
            </div>
            <span className="text-[11px] text-emerald-600">Database updated</span>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
            <span>Loading class roster and attendance...</span>
          </div>
        ) : students.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No active students enrolled in this class and section.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 w-12">Roll</th>
                  <th className="py-3 px-4">Adm No</th>
                  <th className="py-3 px-4">Student Full Name</th>
                  <th className="py-3 px-4 text-center">Status Action</th>
                  <th className="py-3 px-4">Remarks / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {students.map((st) => {
                  const rec = records.get(st.id) || { status: 'PRESENT', remarks: '' };
                  return (
                    <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {st.rollNumber || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {st.admissionNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {st.fullName}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Present */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(st.id, 'PRESENT')}
                            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                              rec.status === 'PRESENT'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-emerald-50'
                            }`}
                          >
                            P
                          </button>

                          {/* Absent */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(st.id, 'ABSENT')}
                            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                              rec.status === 'ABSENT'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-rose-50'
                            }`}
                          >
                            A
                          </button>

                          {/* Late */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(st.id, 'LATE')}
                            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                              rec.status === 'LATE'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-amber-50'
                            }`}
                          >
                            L
                          </button>

                          {/* Leave */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(st.id, 'LEAVE')}
                            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                              rec.status === 'LEAVE'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-50'
                            }`}
                          >
                            LV
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={rec.remarks}
                          onChange={(e) => handleRemarksChange(st.id, e.target.value)}
                          placeholder="Optional note / reason..."
                          className="w-full px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>P = Present • A = Absent • L = Late • LV = Leave</span>
          <span>Logged by: {profile?.name || 'Administrator'}</span>
        </div>
      </div>
    </div>
  );
};

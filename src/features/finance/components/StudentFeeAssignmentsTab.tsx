import React, { useEffect, useState } from 'react';
import { RefreshCw, UserPlus } from 'lucide-react';
import { AcademicSession, ClassItem, FeeStructure, Student } from '../../../types';
import { getStudents } from '../../../services/studentService';
import { getAcademicSessions, getClasses } from '../../../services/academicService';
import { getFeeStructures } from '../services/feeStructureService';
import { assignFeeStructure } from '../services/feeAssignmentService';
import { useAuth } from '../../../hooks/useAuth';

export const StudentFeeAssignmentsTab: React.FC = () => {
  const { school, profile, hasPermission } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [studentId, setStudentId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [structureId, setStructureId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!school?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [studentList, sessionList, classList] = await Promise.all([
        getStudents(school.id),
        getAcademicSessions(school.id),
        getClasses(school.id),
      ]);
      setStudents(studentList);
      setSessions(sessionList);
      setClasses(classList);
      const activeSession = sessionList.find((session) => session.isActive) || sessionList[0];
      setSessionId((current) => current || activeSession?.id || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assignment data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [school?.id]);

  useEffect(() => {
    if (!school?.id || !sessionId) return;
    getFeeStructures(school.id, { academicSessionId: sessionId, status: 'ACTIVE' })
      .then(setStructures)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load fee structures.'));
  }, [school?.id, sessionId]);

  const selectedStudent = students.find((student) => student.id === studentId);
  const applicableStructures = structures.filter((structure) =>
    selectedStudent
      && structure.classId === selectedStudent.classId
      && (!structure.sectionId || structure.sectionId === selectedStudent.sectionId)
  );

  const assign = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!school || !profile || !selectedStudent || !structureId) {
      setError('Select a student and an applicable fee structure.');
      return;
    }
    const structure = applicableStructures.find((item) => item.id === structureId);
    if (!structure) {
      setError('The selected fee structure is not applicable to this student.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await assignFeeStructure({
        schoolId: school.id,
        academicSessionId: sessionId,
        feeStructure: structure,
        assignmentType: 'STUDENT',
        classId: selectedStudent.classId,
        sectionId: selectedStudent.sectionId,
        studentIds: [selectedStudent.id],
        userId: profile.uid,
        userName: profile.name,
        userRole: profile.role,
      });
      setMessage(`Assignment saved. ${result.itemsGenerated} new fee items generated.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign fee structure.');
    } finally {
      setSaving(false);
    }
  };

  if (!hasPermission('fees.manage')) {
    return <div className="p-6 rounded-2xl border text-sm text-slate-500">You do not have permission to manage student fee assignments.</div>;
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div><h2 className="text-lg font-bold text-slate-900 dark:text-white">Student Fee Assignments</h2><p className="text-xs text-slate-500 mt-1">Assign active class or section fee structures to individual students.</p></div>
        <button onClick={load} className="p-2 rounded-xl border text-slate-500"><RefreshCw className="w-4 h-4" /></button>
      </div>
      {message && <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs">{message}</div>}
      {error && <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs">{error}</div>}
      <form onSubmit={assign} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="text-xs font-bold text-slate-600">Academic Session<select value={sessionId} onChange={(e) => setSessionId(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border bg-transparent font-normal">{sessions.map((session) => <option key={session.id} value={session.id}>{session.name}</option>)}</select></label>
        <label className="text-xs font-bold text-slate-600">Student<select value={studentId} onChange={(e) => { setStudentId(e.target.value); setStructureId(''); }} className="mt-1 w-full px-3 py-2 rounded-xl border bg-transparent font-normal"><option value="">Select student</option>{students.map((student) => <option key={student.id} value={student.id}>{student.fullName} ({student.admissionNumber})</option>)}</select></label>
        <label className="text-xs font-bold text-slate-600">Applicable Fee Structure<select value={structureId} onChange={(e) => setStructureId(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl border bg-transparent font-normal"><option value="">Select structure</option>{applicableStructures.map((structure) => <option key={structure.id} value={structure.id}>{structure.name} - {structure.amount} / {structure.frequency}</option>)}</select></label>
        {selectedStudent && <div className="md:col-span-3 text-xs text-slate-500">Class: {classes.find((item) => item.id === selectedStudent.classId)?.name || selectedStudent.classId} · Section: {selectedStudent.sectionId || 'All sections'}</div>}
        <button disabled={saving || loading} className="md:col-span-3 md:justify-self-end px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center gap-2"><UserPlus className="w-4 h-4" />{saving ? 'Assigning...' : 'Assign Fee Structure'}</button>
      </form>
    </div>
  );
};

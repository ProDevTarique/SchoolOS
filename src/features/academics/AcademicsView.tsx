import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Layers,
  BookOpen,
  Plus,
  CheckCircle,
  Edit2,
  Archive,
  AlertCircle,
  X,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import {
  getAcademicSessions,
  createAcademicSession,
  updateAcademicSession,
  getClasses,
  createClass,
  updateClass,
  getSections,
  createSection,
  updateSection,
  getSubjects,
  createSubject,
  updateSubject,
} from '../../services/academicService';
import { getStaffList } from '../../services/staffService';
import { logAuditEvent } from '../../services/auditService';
import {
  AcademicSession,
  ClassItem,
  SectionItem,
  SubjectItem,
  StaffMember,
} from '../../types';

interface AcademicsViewProps {
  initialSubTab?: 'sessions' | 'classes' | 'sections' | 'subjects';
}

export const AcademicsView: React.FC<AcademicsViewProps> = ({ initialSubTab = 'sessions' }) => {
  const { school, profile, hasPermission, reloadSchool } = useAuth();
  const [activeTab, setActiveTab] = useState<'sessions' | 'classes' | 'sections' | 'subjects'>(initialSubTab);

  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [teachers, setTeachers] = useState<StaffMember[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [modalType, setModalType] = useState<
    'create_session' | 'edit_session' | 'create_class' | 'edit_class' | 'create_section' | 'edit_section' | 'create_subject' | 'edit_subject' | null
  >(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form states
  const [sessionForm, setSessionForm] = useState({ name: '', startDate: '', endDate: '', isActive: false });
  const [classForm, setClassForm] = useState({ name: '', code: '', capacity: 40, classTeacherId: '', status: 'ACTIVE' as const });
  const [sectionForm, setSectionForm] = useState({ classId: '', name: '', room: '', capacity: 35, classTeacherId: '', status: 'ACTIVE' as const });
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    type: 'CORE' as const,
    maxMarks: 100,
    passMarks: 33,
    isPractical: false,
    assignedClassIds: [] as string[],
    status: 'ACTIVE' as const,
  });

  const loadData = async () => {
    if (!school?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [sess, cls, sec, sub, stf] = await Promise.all([
        getAcademicSessions(school.id),
        getClasses(school.id),
        getSections(school.id),
        getSubjects(school.id),
        getStaffList(school.id, { category: 'Teacher', status: 'ACTIVE' }),
      ]);
      setSessions(sess);
      setClasses(cls);
      setSections(sec);
      setSubjects(sub);
      setTeachers(stf);
    } catch (err: any) {
      setError(err?.message || 'Failed to load academic records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [school?.id]);

  useEffect(() => {
    setActiveTab(initialSubTab);
  }, [initialSubTab]);

  // Session Handlers
  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !profile) return;
    setError(null);
    try {
      if (modalType === 'create_session') {
        const newS = await createAcademicSession({
          schoolId: school.id,
          name: sessionForm.name.trim(),
          startDate: sessionForm.startDate,
          endDate: sessionForm.endDate,
          isActive: sessionForm.isActive,
          isArchived: false,
        });
        await logAuditEvent({
          schoolId: school.id,
          userId: profile.uid,
          userName: profile.name,
          userRole: profile.role,
          action: 'SESSION_CREATED',
          module: 'Academics',
          description: `Created academic session "${newS.name}".`,
        });
      } else if (modalType === 'edit_session' && editingItem) {
        await updateAcademicSession(
          editingItem.id,
          {
            name: sessionForm.name.trim(),
            startDate: sessionForm.startDate,
            endDate: sessionForm.endDate,
            isActive: sessionForm.isActive,
          },
          school.id
        );
        await logAuditEvent({
          schoolId: school.id,
          userId: profile.uid,
          userName: profile.name,
          userRole: profile.role,
          action: 'SESSION_UPDATED',
          module: 'Academics',
          description: `Updated academic session "${sessionForm.name}".`,
        });
      }
      setModalType(null);
      await loadData();
      await reloadSchool();
    } catch (err: any) {
      setError(err?.message || 'Failed to save academic session.');
    }
  };

  const handleActivateSession = async (session: AcademicSession) => {
    if (!school?.id || !profile) return;
    try {
      await updateAcademicSession(session.id, { isActive: true }, school.id);
      await logAuditEvent({
        schoolId: school.id,
        userId: profile.uid,
        userName: profile.name,
        userRole: profile.role,
        action: 'SESSION_ACTIVATED',
        module: 'Academics',
        description: `Activated academic session "${session.name}".`,
      });
      await loadData();
      await reloadSchool();
    } catch (err: any) {
      setError(err?.message || 'Failed to activate session.');
    }
  };

  // Class Handlers
  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !profile) return;
    setError(null);
    try {
      const activeSess = sessions.find((s) => s.isActive);
      if (modalType === 'create_class') {
        const newC = await createClass({
          schoolId: school.id,
          name: classForm.name.trim(),
          code: classForm.code.trim().toUpperCase(),
          sessionId: activeSess?.id,
          classTeacherId: classForm.classTeacherId || undefined,
          capacity: Number(classForm.capacity),
          status: classForm.status,
        });
        await logAuditEvent({
          schoolId: school.id,
          userId: profile.uid,
          userName: profile.name,
          userRole: profile.role,
          action: 'CLASS_CREATED',
          module: 'Academics',
          description: `Created class "${newC.name}" (${newC.code}).`,
        });
      } else if (modalType === 'edit_class' && editingItem) {
        await updateClass(editingItem.id, {
          name: classForm.name.trim(),
          code: classForm.code.trim().toUpperCase(),
          classTeacherId: classForm.classTeacherId || undefined,
          capacity: Number(classForm.capacity),
          status: classForm.status,
        });
      }
      setModalType(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to save class.');
    }
  };

  // Section Handlers
  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !profile) return;
    setError(null);
    try {
      const activeSess = sessions.find((s) => s.isActive);
      if (modalType === 'create_section') {
        const newS = await createSection({
          schoolId: school.id,
          classId: sectionForm.classId,
          name: sectionForm.name.trim().toUpperCase(),
          sessionId: activeSess?.id,
          room: sectionForm.room.trim(),
          capacity: Number(sectionForm.capacity),
          classTeacherId: sectionForm.classTeacherId || undefined,
          status: sectionForm.status,
        });
        await logAuditEvent({
          schoolId: school.id,
          userId: profile.uid,
          userName: profile.name,
          userRole: profile.role,
          action: 'SECTION_CREATED',
          module: 'Academics',
          description: `Created section "${newS.name}" for class.`,
        });
      } else if (modalType === 'edit_section' && editingItem) {
        await updateSection(editingItem.id, {
          classId: sectionForm.classId,
          name: sectionForm.name.trim().toUpperCase(),
          room: sectionForm.room.trim(),
          capacity: Number(sectionForm.capacity),
          classTeacherId: sectionForm.classTeacherId || undefined,
          status: sectionForm.status,
        });
      }
      setModalType(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to save section.');
    }
  };

  // Subject Handlers
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school?.id || !profile) return;
    setError(null);
    try {
      if (modalType === 'create_subject') {
        const newSub = await createSubject({
          schoolId: school.id,
          name: subjectForm.name.trim(),
          code: subjectForm.code.trim().toUpperCase(),
          type: subjectForm.type,
          maxMarks: Number(subjectForm.maxMarks),
          passMarks: Number(subjectForm.passMarks),
          isPractical: subjectForm.isPractical,
          assignedClassIds: subjectForm.assignedClassIds,
          status: subjectForm.status,
        });
        await logAuditEvent({
          schoolId: school.id,
          userId: profile.uid,
          userName: profile.name,
          userRole: profile.role,
          action: 'SUBJECT_CREATED',
          module: 'Academics',
          description: `Created subject "${newSub.name}" (${newSub.code}).`,
        });
      } else if (modalType === 'edit_subject' && editingItem) {
        await updateSubject(editingItem.id, {
          name: subjectForm.name.trim(),
          code: subjectForm.code.trim().toUpperCase(),
          type: subjectForm.type,
          maxMarks: Number(subjectForm.maxMarks),
          passMarks: Number(subjectForm.passMarks),
          isPractical: subjectForm.isPractical,
          assignedClassIds: subjectForm.assignedClassIds,
          status: subjectForm.status,
        });
      }
      setModalType(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to save subject.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            Academic Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure academic sessions, class tiers, section divisions, and curriculum subjects.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-medium self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'sessions'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            Sessions ({sessions.length})
          </button>
          <button
            onClick={() => setActiveTab('classes')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'classes'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            Classes ({classes.length})
          </button>
          <button
            onClick={() => setActiveTab('sections')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'sections'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            Sections ({sections.length})
          </button>
          <button
            onClick={() => setActiveTab('subjects')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'subjects'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            Subjects ({subjects.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* ================= 1. SESSIONS TAB ================= */}
      {activeTab === 'sessions' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Academic Sessions</h2>
              <p className="text-xs text-slate-500">Only one academic session can be active at a time.</p>
            </div>
            {hasPermission('classes.manage') && (
              <button
                onClick={() => {
                  setSessionForm({ name: '', startDate: '', endDate: '', isActive: sessions.length === 0 });
                  setModalType('create_session');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Session</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Session Name</th>
                  <th className="py-3 px-4">Start Date</th>
                  <th className="py-3 px-4">End Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{s.name}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{s.startDate || '—'}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{s.endDate || '—'}</td>
                    <td className="py-3 px-4">
                      {s.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300">
                          <CheckCircle className="w-3 h-3" />
                          CURRENT ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          Historical
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {!s.isActive && hasPermission('classes.manage') && (
                        <button
                          onClick={() => handleActivateSession(s)}
                          className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-700 text-[11px] font-medium transition-colors"
                        >
                          Activate
                        </button>
                      )}
                      {hasPermission('classes.manage') && (
                        <button
                          onClick={() => {
                            setEditingItem(s);
                            setSessionForm({
                              name: s.name,
                              startDate: s.startDate || '',
                              endDate: s.endDate || '',
                              isActive: s.isActive,
                            });
                            setModalType('edit_session');
                          }}
                          className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= 2. CLASSES TAB ================= */}
      {activeTab === 'classes' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Classes Directory</h2>
              <p className="text-xs text-slate-500">Grade levels configured for the school.</p>
            </div>
            {hasPermission('classes.manage') && (
              <button
                onClick={() => {
                  setClassForm({ name: '', code: '', capacity: 40, classTeacherId: '', status: 'ACTIVE' });
                  setModalType('create_class');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Class</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Class Name</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Class Teacher</th>
                  <th className="py-3 px-4">Sections</th>
                  <th className="py-3 px-4">Capacity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {classes.map((c) => {
                  const teacher = teachers.find((t) => t.id === c.classTeacherId);
                  const classSecs = sections.filter((s) => s.classId === c.id);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {c.name}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">{c.code}</td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        {teacher ? teacher.name : <span className="text-slate-400 italic">Not assigned</span>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1 flex-wrap">
                          {classSecs.map((sec) => (
                            <span
                              key={sec.id}
                              className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-semibold text-[10px]"
                            >
                              {sec.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{c.capacity || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          c.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {hasPermission('classes.manage') && (
                          <button
                            onClick={() => {
                              setEditingItem(c);
                              setClassForm({
                                name: c.name,
                                code: c.code,
                                capacity: c.capacity || 40,
                                classTeacherId: c.classTeacherId || '',
                                status: c.status,
                              });
                              setModalType('edit_class');
                            }}
                            className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= 3. SECTIONS TAB ================= */}
      {activeTab === 'sections' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Class Sections</h2>
              <p className="text-xs text-slate-500">Divisions mapped to classes and assigned rooms.</p>
            </div>
            {hasPermission('classes.manage') && (
              <button
                onClick={() => {
                  setSectionForm({
                    classId: classes[0]?.id || '',
                    name: '',
                    room: '',
                    capacity: 35,
                    classTeacherId: '',
                    status: 'ACTIVE',
                  });
                  setModalType('create_section');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Section</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Section Name</th>
                  <th className="py-3 px-4">Room No</th>
                  <th className="py-3 px-4">Class Teacher</th>
                  <th className="py-3 px-4">Capacity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sections.map((sec) => {
                  const parentClass = classes.find((c) => c.id === sec.classId);
                  const teacher = teachers.find((t) => t.id === sec.classTeacherId);
                  return (
                    <tr key={sec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {parentClass?.name || '—'}
                      </td>
                      <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">
                        Section {sec.name}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{sec.room || '—'}</td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        {teacher ? teacher.name : <span className="text-slate-400 italic">Not assigned</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{sec.capacity || '—'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                          {sec.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {hasPermission('classes.manage') && (
                          <button
                            onClick={() => {
                              setEditingItem(sec);
                              setSectionForm({
                                classId: sec.classId,
                                name: sec.name,
                                room: sec.room || '',
                                capacity: sec.capacity || 35,
                                classTeacherId: sec.classTeacherId || '',
                                status: sec.status,
                              });
                              setModalType('edit_section');
                            }}
                            className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= 4. SUBJECTS TAB ================= */}
      {activeTab === 'subjects' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Subject Curriculum</h2>
              <p className="text-xs text-slate-500">Academic subjects, grading thresholds, and class mappings.</p>
            </div>
            {hasPermission('classes.manage') && (
              <button
                onClick={() => {
                  setSubjectForm({
                    name: '',
                    code: '',
                    type: 'CORE',
                    maxMarks: 100,
                    passMarks: 33,
                    isPractical: false,
                    assignedClassIds: classes.map((c) => c.id),
                    status: 'ACTIVE',
                  });
                  setModalType('create_subject');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Subject</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Subject Name</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Max Marks</th>
                  <th className="py-3 px-4">Pass Marks</th>
                  <th className="py-3 px-4">Practical</th>
                  <th className="py-3 px-4">Assigned Classes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {subjects.map((sub) => {
                  const assignedCount = sub.assignedClassIds?.length || 0;
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{sub.name}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">{sub.code}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {sub.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-800 dark:text-slate-200 font-medium">{sub.maxMarks}</td>
                      <td className="py-3 px-4 text-slate-800 dark:text-slate-200 font-medium">{sub.passMarks}</td>
                      <td className="py-3 px-4">
                        {sub.isPractical ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                            Yes
                          </span>
                        ) : (
                          <span className="text-slate-400">No</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {assignedCount === classes.length && classes.length > 0
                          ? 'All Classes'
                          : `${assignedCount} classes`}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {hasPermission('classes.manage') && (
                          <button
                            onClick={() => {
                              setEditingItem(sub);
                              setSubjectForm({
                                name: sub.name,
                                code: sub.code,
                                type: sub.type,
                                maxMarks: sub.maxMarks,
                                passMarks: sub.passMarks,
                                isPractical: sub.isPractical,
                                assignedClassIds: sub.assignedClassIds || [],
                                status: sub.status,
                              });
                              setModalType('edit_subject');
                            }}
                            className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODAL: Session ================= */}
      {(modalType === 'create_session' || modalType === 'edit_session') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setModalType(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              {modalType === 'create_session' ? 'Create Academic Session' : 'Edit Academic Session'}
            </h3>
            <form onSubmit={handleSaveSession} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Session Name (e.g. 2026-27) *
                </label>
                <input
                  type="text"
                  required
                  value={sessionForm.name}
                  onChange={(e) => setSessionForm({ ...sessionForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={sessionForm.startDate}
                    onChange={(e) => setSessionForm({ ...sessionForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={sessionForm.endDate}
                    onChange={(e) => setSessionForm({ ...sessionForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="session-is-active"
                  checked={sessionForm.isActive}
                  onChange={(e) => setSessionForm({ ...sessionForm, isActive: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="session-is-active" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Set as Current Active Session
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-3 py-1.5 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Save Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: Class ================= */}
      {(modalType === 'create_class' || modalType === 'edit_class') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setModalType(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              {modalType === 'create_class' ? 'Create Class' : 'Edit Class'}
            </h3>
            <form onSubmit={handleSaveClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Class Name (e.g. Class 10) *
                </label>
                <input
                  type="text"
                  required
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Class Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={classForm.code}
                    onChange={(e) => setClassForm({ ...classForm, code: e.target.value })}
                    placeholder="C10"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Capacity
                  </label>
                  <input
                    type="number"
                    value={classForm.capacity}
                    onChange={(e) => setClassForm({ ...classForm, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Class Teacher
                </label>
                <select
                  value={classForm.classTeacherId}
                  onChange={(e) => setClassForm({ ...classForm, classTeacherId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="">-- Unassigned --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.employeeId})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-3 py-1.5 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Save Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: Section ================= */}
      {(modalType === 'create_section' || modalType === 'edit_section') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setModalType(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              {modalType === 'create_section' ? 'Create Section' : 'Edit Section'}
            </h3>
            <form onSubmit={handleSaveSection} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Parent Class *
                </label>
                <select
                  required
                  value={sectionForm.classId}
                  onChange={(e) => setSectionForm({ ...sectionForm, classId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Section Name (e.g. A) *
                  </label>
                  <input
                    type="text"
                    required
                    value={sectionForm.name}
                    onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
                    placeholder="A"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Room No
                  </label>
                  <input
                    type="text"
                    value={sectionForm.room}
                    onChange={(e) => setSectionForm({ ...sectionForm, room: e.target.value })}
                    placeholder="Room 101"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Section Teacher
                </label>
                <select
                  value={sectionForm.classTeacherId}
                  onChange={(e) => setSectionForm({ ...sectionForm, classTeacherId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="">-- Unassigned --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.employeeId})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-3 py-1.5 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Save Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: Subject ================= */}
      {(modalType === 'create_subject' || modalType === 'edit_subject') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setModalType(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              {modalType === 'create_subject' ? 'Create Subject' : 'Edit Subject'}
            </h3>
            <form onSubmit={handleSaveSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject Name *
                </label>
                <input
                  type="text"
                  required
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  placeholder="e.g. Science"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Subject Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={subjectForm.code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                    placeholder="SCI101"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Subject Type
                  </label>
                  <select
                    value={subjectForm.type}
                    onChange={(e) => setSubjectForm({ ...subjectForm, type: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="CORE">CORE</option>
                    <option value="ELECTIVE">ELECTIVE</option>
                    <option value="OPTIONAL">OPTIONAL</option>
                    <option value="VOCATIONAL">VOCATIONAL</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Max Marks
                  </label>
                  <input
                    type="number"
                    value={subjectForm.maxMarks}
                    onChange={(e) => setSubjectForm({ ...subjectForm, maxMarks: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Pass Marks
                  </label>
                  <input
                    type="number"
                    value={subjectForm.passMarks}
                    onChange={(e) => setSubjectForm({ ...subjectForm, passMarks: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="sub-is-practical"
                  checked={subjectForm.isPractical}
                  onChange={(e) => setSubjectForm({ ...subjectForm, isPractical: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="sub-is-practical" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Has Practical / Lab component
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-3 py-1.5 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

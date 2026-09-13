import React, { useEffect, useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  FileSpreadsheet,
  Printer,
  Download,
  Eye,
  Edit2,
  Trash2,
  CreditCard,
  GraduationCap,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Student, ClassItem, SectionItem, AcademicSession, StudentStatus } from '../../types';
import { getStudents, deleteStudent } from '../../services/studentService';
import { getClasses, getSections, getAcademicSessions } from '../../services/academicService';
import { logAuditEvent } from '../../services/auditService';
import { useAuth } from '../../hooks/useAuth';
import { StudentFormModal } from './StudentFormModal';
import { StudentProfileModal } from './StudentProfileModal';
import { StudentIDCardModal } from './StudentIDCardModal';
import { BulkImportModal } from './BulkImportModal';

interface StudentsListViewProps {
  initialOpenAdd?: boolean;
  initialOpenImport?: boolean;
}

export const StudentsListView: React.FC<StudentsListViewProps> = ({
  initialOpenAdd = false,
  initialOpenImport = false,
}) => {
  const { school, profile, hasPermission } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClassId, setFilterClassId] = useState('');
  const [filterSectionId, setFilterSectionId] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Pagination & Sort
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;
  const [sortBy, setSortBy] = useState<'name' | 'admissionNumber' | 'rollNumber'>('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(initialOpenAdd);
  const [importModalOpen, setImportModalOpen] = useState(initialOpenImport);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [studentToView, setStudentToView] = useState<Student | null>(null);
  const [studentForIDCard, setStudentForIDCard] = useState<Student | null>(null);

  const loadAllData = async () => {
    if (!school?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [stList, clsList, secList, sessList] = await Promise.all([
        getStudents(school.id),
        getClasses(school.id),
        getSections(school.id),
        getAcademicSessions(school.id),
      ]);
      setStudents(stList);
      setClasses(clsList);
      setSections(secList);
      setSessions(sessList);
    } catch (err: any) {
      setError(err?.message || 'Failed to load students.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [school?.id]);

  useEffect(() => {
    if (initialOpenAdd) setAddModalOpen(true);
    if (initialOpenImport) setImportModalOpen(true);
  }, [initialOpenAdd, initialOpenImport]);

  // Filtered and sorted students
  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => {
        if (filterClassId && s.classId !== filterClassId) return false;
        if (filterSectionId && s.sectionId !== filterSectionId) return false;
        if (filterStatus && s.status !== filterStatus) return false;

        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase().trim();
          const matchName = s.fullName.toLowerCase().includes(term);
          const matchAdm = s.admissionNumber.toLowerCase().includes(term);
          const matchRoll = s.rollNumber ? s.rollNumber.toLowerCase().includes(term) : false;
          const matchPhone = s.fatherPhone?.includes(term) || s.motherPhone?.includes(term);
          if (!matchName && !matchAdm && !matchRoll && !matchPhone) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA = '';
        let valB = '';
        if (sortBy === 'name') {
          valA = a.fullName.toLowerCase();
          valB = b.fullName.toLowerCase();
        } else if (sortBy === 'admissionNumber') {
          valA = a.admissionNumber.toLowerCase();
          valB = b.admissionNumber.toLowerCase();
        } else if (sortBy === 'rollNumber') {
          const rA = parseInt(a.rollNumber || '0', 10);
          const rB = parseInt(b.rollNumber || '0', 10);
          return sortAsc ? rA - rB : rB - rA;
        }
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
  }, [students, searchTerm, filterClassId, filterSectionId, filterStatus, sortBy, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleDelete = async (student: Student) => {
    if (!window.confirm(`Are you sure you want to permanently remove ${student.fullName} (${student.admissionNumber})?`)) {
      return;
    }
    try {
      await deleteStudent(student.id);
      if (school?.id && profile) {
        await logAuditEvent({
          schoolId: school.id,
          userId: profile.uid,
          userName: profile.name,
          userRole: profile.role,
          action: 'STUDENT_DELETED',
          module: 'Students',
          description: `Deleted student record for "${student.fullName}" (${student.admissionNumber}).`,
        });
      }
      await loadAllData();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete student.');
    }
  };

  const handleExportCSV = () => {
    if (filteredStudents.length === 0) return;
    const headers = [
      'Admission Number',
      'Roll Number',
      'Full Name',
      'Gender',
      'Class',
      'Section',
      'Status',
      'Father Name',
      'Father Phone',
      'Date of Birth',
      'Admission Date',
    ];
    const rows = filteredStudents.map((s) => {
      const cls = classes.find((c) => c.id === s.classId)?.name || '';
      const sec = sections.find((sec) => sec.id === s.sectionId)?.name || '';
      return [
        `"${s.admissionNumber}"`,
        `"${s.rollNumber || ''}"`,
        `"${s.fullName}"`,
        `"${s.gender}"`,
        `"${cls}"`,
        `"${sec}"`,
        `"${s.status}"`,
        `"${s.fatherName || ''}"`,
        `"${s.fatherPhone || ''}"`,
        `"${s.dateOfBirth}"`,
        `"${s.admissionDate}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Students_Directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintDirectory = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Student Information System (SIS)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Directory of enrolled students, admission records, profiles, and identity credentials.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasPermission('students.create') && (
            <>
              <button
                id="btn-add-student-modal"
                onClick={() => {
                  setStudentToEdit(null);
                  setAddModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Student</span>
              </button>
              <button
                id="btn-import-students-modal"
                onClick={() => setImportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Bulk Import</span>
              </button>
            </>
          )}

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            onClick={handlePrintDirectory}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors"
            title="Print Directory"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3">
        {/* Search input */}
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            id="input-search-students"
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by student name, admission number, roll number, or parent phone..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>

        {/* Filter: Class */}
        <div className="w-full sm:w-44">
          <select
            id="select-filter-class"
            value={filterClassId}
            onChange={(e) => {
              setFilterClassId(e.target.value);
              setFilterSectionId('');
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter: Section */}
        <div className="w-full sm:w-36">
          <select
            id="select-filter-section"
            value={filterSectionId}
            disabled={!filterClassId}
            onChange={(e) => {
              setFilterSectionId(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-50"
          >
            <option value="">All Sections</option>
            {sections
              .filter((s) => s.classId === filterClassId)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  Section {s.name}
                </option>
              ))}
          </select>
        </div>

        {/* Filter: Status */}
        <div className="w-full sm:w-36">
          <select
            id="select-filter-status"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="TRANSFERRED">TRANSFERRED</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="GRADUATED">GRADUATED</option>
            <option value="EXPELLED">EXPELLED</option>
          </select>
        </div>
      </div>

      {/* Main Student Directory Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-900 dark:text-white">{filteredStudents.length}</span> matching students
          </div>
          <div className="flex items-center gap-2">
            <span>Sort by:</span>
            <button
              onClick={() => {
                if (sortBy === 'name') setSortAsc(!sortAsc);
                else {
                  setSortBy('name');
                  setSortAsc(true);
                }
              }}
              className={`font-semibold hover:underline ${sortBy === 'name' ? 'text-indigo-600' : ''}`}
            >
              Name {sortBy === 'name' ? (sortAsc ? '↑' : '↓') : ''}
            </button>
            <span>•</span>
            <button
              onClick={() => {
                if (sortBy === 'admissionNumber') setSortAsc(!sortAsc);
                else {
                  setSortBy('admissionNumber');
                  setSortAsc(true);
                }
              }}
              className={`font-semibold hover:underline ${sortBy === 'admissionNumber' ? 'text-indigo-600' : ''}`}
            >
              Adm No {sortBy === 'admissionNumber' ? (sortAsc ? '↑' : '↓') : ''}
            </button>
            <span>•</span>
            <button
              onClick={() => {
                if (sortBy === 'rollNumber') setSortAsc(!sortAsc);
                else {
                  setSortBy('rollNumber');
                  setSortAsc(true);
                }
              }}
              className={`font-semibold hover:underline ${sortBy === 'rollNumber' ? 'text-indigo-600' : ''}`}
            >
              Roll No {sortBy === 'rollNumber' ? (sortAsc ? '↑' : '↓') : ''}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
            <span>Loading student database...</span>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No student records found matching the current search &amp; filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Adm No</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Class &amp; Section</th>
                  <th className="py-3 px-4">Roll No</th>
                  <th className="py-3 px-4">Gender</th>
                  <th className="py-3 px-4">Parent Details</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedStudents.map((st) => {
                  const cls = classes.find((c) => c.id === st.classId);
                  const sec = sections.find((s) => s.id === st.sectionId);
                  return (
                    <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-slate-100">
                        {st.admissionNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{st.fullName}</span>
                          {st.bloodGroup && (
                            <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 dark:bg-rose-950/40 px-1.5 rounded">
                              {st.bloodGroup}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                          {cls?.name || 'Class'}
                        </span>
                        {sec && (
                          <span className="text-slate-500 ml-1">
                            - {sec.name}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-mono">
                        {st.rollNumber || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{st.gender}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        <div>{st.fatherName || st.motherName || '—'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {st.fatherPhone || st.motherPhone || ''}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          st.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                            : st.status === 'SUSPENDED' || st.status === 'EXPELLED'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {st.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        {/* View Profile */}
                        <button
                          onClick={() => setStudentToView(st)}
                          title="View Profile Dossier"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* ID Card */}
                        <button
                          onClick={() => setStudentForIDCard(st)}
                          title="Generate ID Card"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Student */}
                        {hasPermission('students.edit') && (
                          <button
                            onClick={() => {
                              setStudentToEdit(st);
                              setAddModalOpen(true);
                            }}
                            title="Edit Student"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete */}
                        {hasPermission('students.delete') && (
                          <button
                            onClick={() => handleDelete(st)}
                            title="Delete Student Record"
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <StudentFormModal
        isOpen={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setStudentToEdit(null);
        }}
        studentToEdit={studentToEdit}
        classes={classes}
        sections={sections}
        sessions={sessions}
        onSaveSuccess={loadAllData}
      />

      <StudentProfileModal
        isOpen={!!studentToView}
        onClose={() => setStudentToView(null)}
        student={studentToView}
        school={school}
        classes={classes}
        sections={sections}
      />

      <StudentIDCardModal
        isOpen={!!studentForIDCard}
        onClose={() => setStudentForIDCard(null)}
        student={studentForIDCard}
        school={school}
        className={classes.find((c) => c.id === studentForIDCard?.classId)?.name}
        sectionName={sections.find((s) => s.id === studentForIDCard?.sectionId)?.name}
      />

      <BulkImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        classes={classes}
        sections={sections}
        onImportSuccess={loadAllData}
      />
    </div>
  );
};

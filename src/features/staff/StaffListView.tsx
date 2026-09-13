import React, { useEffect, useState, useMemo } from 'react';
import {
  Briefcase,
  Search,
  Plus,
  Printer,
  Eye,
  Edit2,
  Trash2,
  GraduationCap,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { StaffMember, StaffCategory, EmploymentStatus, ClassItem, SubjectItem } from '../../types';
import { getStaffList, deleteStaffMember } from '../../services/staffService';
import { getClasses, getSubjects } from '../../services/academicService';
import { logAuditEvent } from '../../services/auditService';
import { useAuth } from '../../hooks/useAuth';
import { StaffModal } from './StaffModal';
import { StaffProfileModal } from './StaffProfileModal';

interface StaffListViewProps {
  initialOpenAdd?: boolean;
}

export const StaffListView: React.FC<StaffListViewProps> = ({ initialOpenAdd = false }) => {
  const { school, profile, hasPermission } = useAuth();

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Modals
  const [staffModalOpen, setStaffModalOpen] = useState(initialOpenAdd);
  const [staffToEdit, setStaffToEdit] = useState<StaffMember | null>(null);
  const [staffToView, setStaffToView] = useState<StaffMember | null>(null);

  const loadData = async () => {
    if (!school?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [stf, cls, subs] = await Promise.all([
        getStaffList(school.id),
        getClasses(school.id),
        getSubjects(school.id),
      ]);
      setStaff(stf);
      setClasses(cls);
      setSubjects(subs);
    } catch (err: any) {
      setError(err?.message || 'Failed to load staff list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [school?.id]);

  useEffect(() => {
    if (initialOpenAdd) setStaffModalOpen(true);
  }, [initialOpenAdd]);

  const filteredStaff = useMemo(() => {
    return staff.filter((s) => {
      if (filterCategory && s.category !== filterCategory) return false;
      if (filterStatus && s.employmentStatus !== filterStatus) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const mName = s.name.toLowerCase().includes(term);
        const mEmp = s.employeeId.toLowerCase().includes(term);
        const mPhone = s.phone.includes(term);
        const mDept = s.department ? s.department.toLowerCase().includes(term) : false;
        const mDesig = s.designation.toLowerCase().includes(term);
        if (!mName && !mEmp && !mPhone && !mDept && !mDesig) return false;
      }

      return true;
    });
  }, [staff, searchTerm, filterCategory, filterStatus]);

  const handleDelete = async (member: StaffMember) => {
    if (!window.confirm(`Are you sure you want to remove staff member ${member.name} (${member.employeeId})?`)) {
      return;
    }
    try {
      await deleteStaffMember(member.id);
      if (school?.id && profile) {
        await logAuditEvent({
          schoolId: school.id,
          userId: profile.uid,
          userName: profile.name,
          userRole: profile.role,
          action: 'STAFF_DELETED',
          module: 'Staff',
          description: `Removed staff member "${member.name}" (${member.employeeId}).`,
        });
      }
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete staff member.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-600" />
            Human Resources &amp; Staff Manager
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Teaching faculty, administrative personnel, and operations staff directory.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasPermission('staff.create') && (
            <button
              id="btn-add-staff-modal"
              onClick={() => {
                setStaffToEdit(null);
                setStaffModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Staff Member</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print List</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter & Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            id="input-search-staff"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, employee ID, phone, department, designation..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>

        <div className="w-full sm:w-48">
          <select
            id="select-filter-staff-category"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="">All Categories</option>
            <option value="Principal">Principal</option>
            <option value="Vice Principal">Vice Principal</option>
            <option value="Teacher">Teacher</option>
            <option value="Accountant">Accountant</option>
            <option value="Receptionist">Receptionist</option>
            <option value="Librarian">Librarian</option>
            <option value="Driver">Driver</option>
            <option value="Conductor">Conductor</option>
            <option value="Security">Security</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="w-full sm:w-40">
          <select
            id="select-filter-staff-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="ON_LEAVE">ON_LEAVE</option>
            <option value="RESIGNED">RESIGNED</option>
            <option value="TERMINATED">TERMINATED</option>
          </select>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-900 dark:text-white">{filteredStaff.length}</span> personnel records
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
            <span>Loading staff records...</span>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No staff records found matching the current search &amp; filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Emp ID</th>
                  <th className="py-3 px-4">Staff Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Designation &amp; Dept</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Assignments</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStaff.map((st) => {
                  const assignedClassNames = (st.assignedClassIds || [])
                    .map((cid) => classes.find((c) => c.id === cid)?.name)
                    .filter(Boolean);

                  return (
                    <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {st.employeeId}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {st.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {st.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        <div>{st.designation}</div>
                        {st.department && (
                          <div className="text-[11px] text-slate-400">{st.department}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        <div>{st.phone}</div>
                        {st.email && <div className="text-[11px] text-slate-400">{st.email}</div>}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {st.category === 'Teacher' ? (
                          assignedClassNames.length > 0 ? (
                            <div className="flex gap-1 flex-wrap max-w-xs">
                              {assignedClassNames.map((cn, i) => (
                                <span key={i} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
                                  {cn}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No classes</span>
                          )
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          st.employmentStatus === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {st.employmentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          onClick={() => setStaffToView(st)}
                          title="View Staff Dossier"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {hasPermission('staff.edit') && (
                          <button
                            onClick={() => {
                              setStaffToEdit(st);
                              setStaffModalOpen(true);
                            }}
                            title="Edit Staff Member"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {hasPermission('staff.delete') && (
                          <button
                            onClick={() => handleDelete(st)}
                            title="Delete Staff Member"
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
      </div>

      {/* Modals */}
      <StaffModal
        isOpen={staffModalOpen}
        onClose={() => {
          setStaffModalOpen(false);
          setStaffToEdit(null);
        }}
        staffToEdit={staffToEdit}
        classes={classes}
        subjects={subjects}
        onSaveSuccess={loadData}
      />

      <StaffProfileModal
        isOpen={!!staffToView}
        onClose={() => setStaffToView(null)}
        staff={staffToView}
        school={school}
        classes={classes}
        subjects={subjects}
      />
    </div>
  );
};

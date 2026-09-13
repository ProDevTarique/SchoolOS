import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Search,
  UserCheck,
  UserX,
  KeyRound,
  AlertCircle,
  RefreshCw,
  Check,
} from 'lucide-react';
import { UserProfile, Role, ROLE_PERMISSIONS } from '../../types';
import { getAllSchoolUsers, updateUserRole, updateUserStatus } from '../../services/authService';
import { logAuditEvent } from '../../services/auditService';
import { useAuth } from '../../hooks/useAuth';

export const UsersView: React.FC = () => {
  const { school, profile, hasPermission } = useAuth();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchUsers = async () => {
    if (!school?.id) return;
    setLoading(true);
    setError(null);
    try {
      const list = await getAllSchoolUsers(school.id);
      setUsers(list);
    } catch (err: any) {
      setError(err?.message || 'Failed to load user accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [school?.id]);

  const handleRoleChange = async (userId: string, userName: string, newRole: Role) => {
    if (!school?.id || !profile) return;
    try {
      await updateUserRole(userId, newRole);
      await logAuditEvent({
        schoolId: school.id,
        userId: profile.uid,
        userName: profile.name,
        userRole: profile.role,
        action: 'USER_ROLE_CHANGED',
        module: 'Users',
        description: `Changed role for user ${userName} to ${newRole}.`,
      });
      setSuccessMsg(`Role updated for ${userName} to ${newRole}.`);
      fetchUsers();
    } catch (err: any) {
      setError(err?.message || 'Failed to update user role.');
    }
  };

  const handleStatusToggle = async (user: UserProfile) => {
    if (!school?.id || !profile) return;
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateUserStatus(user.id, newStatus);
      await logAuditEvent({
        schoolId: school.id,
        userId: profile.uid,
        userName: profile.name,
        userRole: profile.role,
        action: 'USER_STATUS_CHANGED',
        module: 'Users',
        description: `Set status of user ${user.name} to ${newStatus}.`,
      });
      setSuccessMsg(`User ${user.name} is now ${newStatus}.`);
      fetchUsers();
    } catch (err: any) {
      setError(err?.message || 'Failed to update user status.');
    }
  };

  const filteredUsers = users.filter((u) => {
    if (selectedRole && u.role !== selectedRole) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const mName = u.name.toLowerCase().includes(term);
      const mEmail = u.email.toLowerCase().includes(term);
      if (!mName && !mEmail) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            User Management &amp; Access Governance
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Administer institutional user accounts, role-based access control (RBAC), and session permissions.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-700 dark:text-emerald-300 text-xs rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-xs text-emerald-800 font-bold">
            ×
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by user name, email..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>

        <div className="w-full sm:w-48">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="">All Roles</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            <option value="ADMIN">ADMIN</option>
            <option value="PRINCIPAL">PRINCIPAL</option>
            <option value="TEACHER">TEACHER</option>
            <option value="ACCOUNTANT">ACCOUNTANT</option>
            <option value="RECEPTIONIST">RECEPTIONIST</option>
            <option value="TRANSPORT_MANAGER">TRANSPORT_MANAGER</option>
            <option value="PARENT">PARENT</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-900 dark:text-white">{filteredUsers.length}</span> registered accounts
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
            <span>Loading user credentials...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No user accounts found matching this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role Designation</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {u.name}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-mono">
                      {u.email}
                    </td>
                    <td className="py-3 px-4">
                      {hasPermission('users.manage') ? (
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, u.name, e.target.value as Role)}
                          className="px-2 py-1 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        >
                          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="PRINCIPAL">PRINCIPAL</option>
                          <option value="TEACHER">TEACHER</option>
                          <option value="ACCOUNTANT">ACCOUNTANT</option>
                          <option value="RECEPTIONIST">RECEPTIONIST</option>
                          <option value="TRANSPORT_MANAGER">TRANSPORT_MANAGER</option>
                          <option value="PARENT">PARENT</option>
                        </select>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">
                          {u.role}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {hasPermission('users.manage') && u.id !== profile?.uid && (
                        <button
                          onClick={() => handleStatusToggle(u)}
                          className={`px-2 py-1 rounded text-xs font-medium border ${
                            u.status === 'ACTIVE'
                              ? 'border-rose-300 text-rose-600 hover:bg-rose-50'
                              : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

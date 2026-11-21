'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  Download,
  KeyRound,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Loader2,
  X,
  FileSpreadsheet,
  FileJson,
} from 'lucide-react';

interface Student {
  id: string;
  username: string;
  real_name: string;
  school: string;
  status: string;
  must_change_password: boolean;
  created_at: string;
  last_login_at: string | null;
  total_attempts: number;
  average_score: number | null;
}

export default function StudentManagementPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Form states
  const [addForm, setAddForm] = useState({
    real_name: '',
    school: '',
    username: '',
    password: '',
    must_change_password: false,
  });

  const [editForm, setEditForm] = useState({
    real_name: '',
    school: '',
    status: 'active',
    must_change_password: false,
  });

  const [resetPassword, setResetPassword] = useState('');
  const [forceChangeOnLogin, setForceChangeOnLogin] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/students?search=${encodeURIComponent(search)}&status=${statusFilter}`);
      const data = await res.json();
      if (data.success) {
        setStudents(data.students);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to fetch students.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search, statusFilter]);

  // Handle Add Student
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add student');

      setMessage({ type: 'success', text: `Student @${addForm.username} created successfully!` });
      setShowAddModal(false);
      setAddForm({ real_name: '', school: '', username: '', password: '', must_change_password: false });
      fetchStudents();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Edit Student
  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/students/${selectedStudent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update student');

      setMessage({ type: 'success', text: 'Student details updated successfully!' });
      setShowEditModal(false);
      fetchStudents();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/students/${selectedStudent.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_password: resetPassword,
          must_change_password: forceChangeOnLogin,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');

      setMessage({ type: 'success', text: data.message });
      setShowResetModal(false);
      setResetPassword('');
      fetchStudents();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle status quick action
  const toggleStudentStatus = async (student: Student) => {
    const nextStatus = student.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`/api/admin/students/${student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setMessage({
          type: 'success',
          text: `Account for @${student.username} is now ${nextStatus}.`,
        });
        fetchStudents();
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to change status' });
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Student Management</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            View, search, edit student accounts, reset credentials, and backup rosters.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export Dropdown / Buttons */}
          <a
            href="/api/admin/students/export?format=csv"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-sm transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            CSV Backup
          </a>
          <a
            href="/api/admin/students/export?format=json"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-sm transition-colors"
          >
            <FileJson className="w-3.5 h-3.5 text-blue-600" />
            JSON Backup
          </a>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Add Student
          </button>
        </div>
      </div>

      {/* Alert banner */}
      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, username, school..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Accounts</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="inactive">Inactive / Deactivated</option>
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <p className="text-xs">Loading students...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No students found matching your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">School</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4 text-center">Attempts</th>
                  <th className="py-3 px-4 text-center">Avg. Score</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{student.real_name}</p>
                      <p className="text-[11px] text-slate-400">@{student.username}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{student.school || '-'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          student.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : student.status === 'pending_approval'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {student.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {new Date(student.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {student.last_login_at
                        ? new Date(student.last_login_at).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold">{student.total_attempts}</td>
                    <td className="py-3 px-4 text-center">
                      {student.average_score !== null ? (
                        <span className="font-bold text-emerald-600">{student.average_score}%</span>
                      ) : (
                        <span className="text-slate-400">--</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          title="Reset Password"
                          onClick={() => {
                            setSelectedStudent(student);
                            setShowResetModal(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Edit Details"
                          onClick={() => {
                            setSelectedStudent(student);
                            setEditForm({
                              real_name: student.real_name,
                              school: student.school,
                              status: student.status,
                              must_change_password: student.must_change_password,
                            });
                            setShowEditModal(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title={student.status === 'active' ? 'Deactivate' : 'Activate'}
                          onClick={() => toggleStudentStatus(student)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            student.status === 'active'
                              ? 'text-slate-500 hover:text-red-600 hover:bg-red-50'
                              : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {student.status === 'active' ? (
                            <XCircle className="w-3.5 h-3.5" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD STUDENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add New Student</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddStudent} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-600 mb-1">Real Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Patel"
                  value={addForm.real_name}
                  onChange={(e) => setAddForm({ ...addForm, real_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold uppercase text-slate-600 mb-1">School Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kendriya Vidyalaya"
                  value={addForm.school}
                  onChange={(e) => setAddForm({ ...addForm, school: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold uppercase text-slate-600 mb-1">Username (Unique)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. priya_p"
                  value={addForm.username}
                  onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl lowercase"
                />
              </div>
              <div>
                <label className="block font-bold uppercase text-slate-600 mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="forceChangeAdd"
                  checked={addForm.must_change_password}
                  onChange={(e) => setAddForm({ ...addForm, must_change_password: e.target.checked })}
                  className="rounded text-blue-600"
                />
                <label htmlFor="forceChangeAdd" className="text-slate-600 font-medium">
                  Force password change on student&apos;s next login
                </label>
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {actionLoading ? 'Creating...' : 'Save Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STUDENT MODAL */}
      {showEditModal && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Edit Student Details</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditStudent} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-600 mb-1">Username</label>
                <input
                  type="text"
                  disabled
                  value={`@${selectedStudent.username}`}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold uppercase text-slate-600 mb-1">Real Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.real_name}
                  onChange={(e) => setEditForm({ ...editForm, real_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold uppercase text-slate-600 mb-1">School Name</label>
                <input
                  type="text"
                  required
                  value={editForm.school}
                  onChange={(e) => setEditForm({ ...editForm, school: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold uppercase text-slate-600 mb-1">Account Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  <option value="active">Active</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Update Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {showResetModal && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Reset Student Password</h3>
              <button onClick={() => setShowResetModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-4 pt-4 text-xs">
              <p className="text-slate-500">
                Set a new password for <span className="font-bold text-slate-900">{selectedStudent.real_name}</span> (@{selectedStudent.username}).
              </p>
              <div>
                <label className="block font-bold uppercase text-slate-600 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter temporary or permanent password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="forceChangeReset"
                  checked={forceChangeOnLogin}
                  onChange={(e) => setForceChangeOnLogin(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <label htmlFor="forceChangeReset" className="text-slate-600 font-medium">
                  Force student to change password on next login
                </label>
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {actionLoading ? 'Resetting...' : 'Confirm Reset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

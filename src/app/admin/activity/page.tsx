'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  Search,
  Filter,
  Download,
  Clock,
  User,
  Shield,
  FileSpreadsheet,
  Loader2,
  Calendar,
} from 'lucide-react';

interface ActivityLog {
  id: string;
  user_id: string;
  student_name: string;
  username: string;
  school: string;
  role: string;
  event_type: string;
  metadata: any;
  timestamp: string;
}

export default function AdminActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/admin/activity?search=${encodeURIComponent(search)}&event_type=${eventTypeFilter}`
      );
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to load logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search, eventTypeFilter]);

  const getEventBadge = (type: string) => {
    if (type.includes('login') && !type.includes('failed')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (type.includes('failed')) {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    if (type.includes('registered') || type.includes('created')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (type.includes('reset') || type.includes('updated')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (type.includes('test') || type.includes('submitted')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Student Activity Log</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time audit trail of registrations, logins, status updates, and test events.
          </p>
        </div>
        <div>
          <a
            href="/api/admin/activity?format=csv"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-sm transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export Audit to CSV
          </a>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student name, username, event..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Activity Types</option>
            <option value="student_registered">Student Registered</option>
            <option value="successful_login">Successful Login</option>
            <option value="failed_login">Failed Login</option>
            <option value="logout">Logout</option>
            <option value="password_reset_by_admin">Password Reset</option>
            <option value="account_activated">Account Activated</option>
            <option value="account_deactivated">Account Deactivated</option>
            <option value="student_data_exported">Data Exported</option>
          </select>
        </div>
      </div>

      {/* Activity Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <p className="text-xs">Loading activity feed...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No activity events recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">School</th>
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4">Details / Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        <span className="text-[10px] text-slate-400 ml-1 font-mono">
                          ({new Date(log.timestamp).toLocaleDateString()})
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{log.student_name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">@{log.username}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{log.school}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getEventBadge(log.event_type)}`}>
                        {log.event_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {log.metadata && Object.keys(log.metadata).length > 0 ? (
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                          {JSON.stringify(log.metadata)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
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
}

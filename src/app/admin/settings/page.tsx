'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  KeyRound,
  CheckCircle,
  AlertCircle,
  Database,
  Cpu,
  Loader2,
  Lock,
} from 'lucide-react';

export default function AdminSettingsPage() {
  const [regMode, setRegMode] = useState('open');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setRegMode(data.settings.registration_mode);
        }
      })
      .catch(() => setMessage({ type: 'error', text: 'Failed to load settings.' }))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveRegistrationMode = async (mode: string) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_mode: mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');
      setRegMode(mode);
      setMessage({ type: 'success', text: `Registration mode updated to: ${mode === 'open' ? 'Open' : 'Teacher Approval Required'}` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl w-full mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">System Settings</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure student registration policies, access security, and inspect system health.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-2 text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {message.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Registration Mode Setting Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Student Registration Mode</h2>
            <p className="text-xs text-slate-500">Determine whether students can register freely or require teacher approval.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-xs text-slate-400 py-4">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            Loading settings...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div
              onClick={() => handleSaveRegistrationMode('open')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                regMode === 'open'
                  ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="font-bold text-sm text-slate-900">Open Registration (Default)</p>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${regMode === 'open' ? 'border-blue-600' : 'border-slate-300'}`}>
                  {regMode === 'open' && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Students can sign up and immediately log in to take examinations without waiting for approval.
              </p>
            </div>

            <div
              onClick={() => handleSaveRegistrationMode('approval_required')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                regMode === 'approval_required'
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="font-bold text-sm text-slate-900">Approval Required</p>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${regMode === 'approval_required' ? 'border-indigo-600' : 'border-slate-300'}`}>
                  {regMode === 'approval_required' && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                New student registrations remain in &quot;Pending Approval&quot; status until the teacher manually activates their account.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* System Infrastructure Status */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Database className="w-4 h-4 text-slate-700" />
          Environment & Subsystem Status
        </h2>
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <p className="font-bold text-slate-800">Database Layer</p>
              <p className="text-[11px] text-slate-500">PostgreSQL / Supabase + Zero-Downtime Local Store</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              Online & Ready
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <p className="font-bold text-slate-800">Authentication & Session Security</p>
              <p className="text-[11px] text-slate-500">Argon2/Bcrypt + Secure HTTP-Only Cookies (7-day duration)</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              Active
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <p className="font-bold text-slate-800">Google Gemini AI Engine</p>
              <p className="text-[11px] text-slate-500">Backend API integration for PDF question parsing and Quick Tests</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 font-bold border border-purple-200">
              Configured via Env
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

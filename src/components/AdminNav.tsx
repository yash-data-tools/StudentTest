'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileUp,
  Sparkles,
  BookOpen,
  ClipboardList,
  CheckCircle,
  BarChart3,
  Activity,
  Settings,
  Shield,
  ChevronRight,
} from 'lucide-react';
import LogoutButton from './LogoutButton';

const navItems = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Students', href: '/admin/students', icon: Users },
  { name: 'PDF to Test', href: '/admin/pdf-to-test', icon: FileUp, badge: 'Phase 3' },
  { name: 'AI Quick Test', href: '/admin/ai-quick-test', icon: Sparkles, badge: 'Phase 7' },
  { name: 'Test Management', href: '/admin/tests', icon: ClipboardList },
  { name: 'Pending Reviews', href: '/admin/pending-reviews', icon: CheckCircle, badge: 'Phase 6' },
  { name: 'Results & Analytics', href: '/admin/results', icon: BarChart3 },
  { name: 'Question Bank', href: '/admin/question-bank', icon: BookOpen },
  { name: 'Student Activity', href: '/admin/activity', icon: Activity },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminNav({ children, user }: { children: React.ReactNode; user?: any }) {
  const pathname = usePathname();

  // Do not wrap admin login page with the dashboard sidebar
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex-shrink-0 flex flex-col justify-between border-r border-slate-800">
        <div>
          {/* Logo / Title */}
          <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm text-white tracking-tight">Smart Tuition</span>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Teacher Console</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && !isActive && (
                    <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/70" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between">
            <div className="truncate pr-2">
              <p className="text-xs font-bold text-slate-200 truncate">{user?.real_name || 'Tutor'}</p>
              <p className="text-[11px] text-slate-400 truncate">@{user?.username || 'admin'}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Main Page Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

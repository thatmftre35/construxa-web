'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronRight, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
        checked ? 'bg-steel-blue' : 'bg-light-gray'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function SettingRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-dark-navy">{label}</span>
      {value && <span className="text-sm text-slate-blue-gray">{value}</span>}
      {children}
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function SettingsPage() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);

  const [autoTagLocation, setAutoTagLocation] = useState(true);
  const [autoTagTime, setAutoTagTime] = useState(true);
  const [wifiOnly, setWifiOnly] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [taskDeadlines, setTaskDeadlines] = useState(true);
  const [approvalsNeeded, setApprovalsNeeded] = useState(true);

  const displayName = profile?.full_name || profile?.first_name || 'Builder';
  const role = profile?.role || 'General Contractor';
  const company = profile?.company || 'Company';

  async function handleSignOut() {
    try {
      await signOut();
      router.replace('/auth/login');
    } catch {
      // handle error silently
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <h1 className="text-2xl sm:text-3xl font-bold text-dark-navy">Settings</h1>

      {/* Profile Card */}
      <div className="card">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-steel-blue text-white flex items-center justify-center text-lg font-bold flex-shrink-0">
            {getInitials(displayName)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-dark-navy">{displayName}</h2>
            <p className="text-sm text-slate-blue-gray">
              {role} &middot; {company}
            </p>
          </div>
          <button className="text-sm font-medium text-steel-blue hover:text-dark-navy transition-colors">
            Edit
          </button>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="space-y-2">
        <button className="card w-full flex items-center justify-between hover:shadow-md transition-shadow text-left">
          <span className="font-medium text-dark-navy">Project Settings</span>
          <ChevronRight size={18} className="text-slate-blue-gray" />
        </button>
        <button className="card w-full flex items-center justify-between hover:shadow-md transition-shadow text-left">
          <span className="font-medium text-dark-navy">Company Settings</span>
          <ChevronRight size={18} className="text-slate-blue-gray" />
        </button>
      </div>

      {/* Photo Settings */}
      <div className="card space-y-1">
        <h3 className="text-xs font-bold text-slate-blue-gray uppercase tracking-widest mb-3">
          Photo Settings
        </h3>
        <SettingRow label="Photo Quality" value="High" />
        <div className="border-t border-light-gray" />
        <SettingRow label="Auto-tag Location">
          <Toggle checked={autoTagLocation} onChange={setAutoTagLocation} />
        </SettingRow>
        <div className="border-t border-light-gray" />
        <SettingRow label="Auto-tag Time">
          <Toggle checked={autoTagTime} onChange={setAutoTagTime} />
        </SettingRow>
      </div>

      {/* Upload & Sync */}
      <div className="card">
        <h3 className="text-xs font-bold text-slate-blue-gray uppercase tracking-widest mb-3">
          Upload & Sync
        </h3>
        <SettingRow label="WiFi Only">
          <Toggle checked={wifiOnly} onChange={setWifiOnly} />
        </SettingRow>
      </div>

      {/* Notifications */}
      <div className="card space-y-1">
        <h3 className="text-xs font-bold text-slate-blue-gray uppercase tracking-widest mb-3">
          Notifications
        </h3>
        <SettingRow label="Push Notifications">
          <Toggle checked={pushNotifications} onChange={setPushNotifications} />
        </SettingRow>
        <div className="border-t border-light-gray" />
        <SettingRow label="Task Deadlines">
          <Toggle checked={taskDeadlines} onChange={setTaskDeadlines} />
        </SettingRow>
        <div className="border-t border-light-gray" />
        <SettingRow label="Approvals Needed">
          <Toggle checked={approvalsNeeded} onChange={setApprovalsNeeded} />
        </SettingRow>
      </div>

      {/* Sign Out */}
      <button
        onClick={handleSignOut}
        className="btn-danger flex items-center justify-center gap-2"
      >
        <LogOut size={18} />
        Sign Out
      </button>
    </motion.div>
  );
}

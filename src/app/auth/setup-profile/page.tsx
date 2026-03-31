'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Camera, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { countries, roles, trades } from '@/constants/mockData';

function ProgressDots({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all ${
            i === current
              ? 'w-8 bg-steel-blue'
              : i < current
                ? 'w-2 bg-approved'
                : 'w-2 bg-light-gray'
          }`}
        />
      ))}
    </div>
  );
}

export default function SetupProfilePage() {
  const router = useRouter();
  const { updateProfile } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatar, setAvatar] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [trade, setTrade] = useState('');
  const [company, setCompany] = useState('');
  const [receiveUpdates, setReceiveUpdates] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatar(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateProfile({
        full_name: `${firstName} ${lastName}`.trim(),
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        country,
        phone: phone || undefined,
        role,
        trade,
        company,
        receive_updates: receiveUpdates,
      });
      router.push('/auth/preferences');
    } catch {
      // silently handle
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center max-w-md mx-auto"
    >
      <ProgressDots current={0} />

      <h2 className="text-xl font-bold text-dark-navy text-center mb-6">Set up your profile</h2>

      <div className="card w-full">
        {/* Avatar Upload */}
        <div className="flex justify-center mb-6">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative w-24 h-24 rounded-full border-2 border-dashed border-ice-blue flex items-center justify-center bg-frost-white overflow-hidden hover:border-steel-blue transition-colors"
          >
            {avatar ? (
              <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-8 h-8 text-slate-blue-gray" />
            )}
            {avatar && (
              <div className="absolute inset-0 bg-dark-navy/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>

        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="input-field"
          />
          <input
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="input-field"
          />
        </div>

        {/* Country */}
        <div className="mb-4">
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="input-field appearance-none"
          >
            <option value="">Select Country</option>
            {countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Phone */}
        <div className="mb-4">
          <input
            type="tel"
            placeholder="Phone (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input-field"
          />
        </div>

        {/* Role */}
        <div className="mb-4">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="input-field appearance-none"
          >
            <option value="">Select Role</option>
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Trade */}
        <div className="mb-4">
          <select
            value={trade}
            onChange={(e) => setTrade(e.target.value)}
            className="input-field appearance-none"
          >
            <option value="">Select Trade</option>
            {trades.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Company */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="input-field"
          />
        </div>

        {/* Receive Updates Toggle */}
        <div className="flex items-center justify-between mb-6 p-3 bg-frost-white rounded-xl">
          <div>
            <p className="text-sm font-medium text-dark-navy">Receive Updates</p>
            <p className="text-xs text-slate-blue-gray">Get notified about new features and tips</p>
          </div>
          <button
            onClick={() => setReceiveUpdates(!receiveUpdates)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              receiveUpdates ? 'bg-steel-blue' : 'bg-light-gray'
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                receiveUpdates ? 'translate-x-[22px]' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Save Button */}
        <button onClick={handleSave} disabled={isLoading} className="btn-primary flex items-center justify-center gap-2">
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          {isLoading ? 'Saving...' : 'Save & Continue'}
        </button>

        {/* Skip */}
        <button
          onClick={() => router.push('/auth/preferences')}
          className="btn-ghost mt-2"
        >
          Skip for now
        </button>
      </div>
    </motion.div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Lock, Building, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

type AccountType = 'personal' | 'organization';

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ['Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['bg-rejected', 'bg-rejected', 'bg-pending', 'bg-pending', 'bg-approved'];
  return { score, label: labels[score], color: colors[score] };
}

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useAuthStore();

  const [accountType, setAccountType] = useState<AccountType>('personal');
  const [orgCode, setOrgCode] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (accountType === 'personal') {
      if (!confirmEmail) {
        newErrors.confirmEmail = 'Please confirm your email';
      } else if (email !== confirmEmail) {
        newErrors.confirmEmail = 'Emails do not match';
      }
    }

    if (accountType === 'organization' && !orgCode) {
      newErrors.orgCode = 'Organization code is required';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      await signUp(email, password);
      router.refresh();
      router.push('/auth/setup-profile');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign up failed';
      setErrors({ general: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col"
    >
      {/* Back Link */}
      <Link href="/auth/login" className="flex items-center gap-1 text-steel-blue text-sm font-medium mb-6 hover:underline">
        <ArrowLeft className="w-4 h-4" />
        Back to Login
      </Link>

      {/* Card */}
      <div className="card w-full">
        <h2 className="text-xl font-bold text-dark-navy text-center mb-6">Create an Account</h2>

        {/* Segmented Control */}
        <div className="segmented-control mb-6">
          <button
            className={`segment ${accountType === 'personal' ? 'segment-active' : ''}`}
            onClick={() => setAccountType('personal')}
          >
            Personal
          </button>
          <button
            className={`segment ${accountType === 'organization' ? 'segment-active' : ''}`}
            onClick={() => setAccountType('organization')}
          >
            Organization
          </button>
        </div>

        {errors.general && (
          <div className="mb-4 p-3 bg-rejected/10 text-rejected text-sm rounded-xl text-center">
            {errors.general}
          </div>
        )}

        {/* Organization Code */}
        {accountType === 'organization' && (
          <div className="mb-4">
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-blue-gray" />
              <input
                type="text"
                placeholder="Organization Code"
                value={orgCode}
                onChange={(e) => setOrgCode(e.target.value)}
                className="input-field pl-11"
              />
            </div>
            {errors.orgCode && <p className="text-rejected text-xs mt-1 ml-1">{errors.orgCode}</p>}
          </div>
        )}

        {/* Email */}
        <div className="mb-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-blue-gray" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field pl-11"
            />
          </div>
          {errors.email && <p className="text-rejected text-xs mt-1 ml-1">{errors.email}</p>}
        </div>

        {/* Confirm Email (Personal only) */}
        {accountType === 'personal' && (
          <div className="mb-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-blue-gray" />
              <input
                type="email"
                placeholder="Confirm email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                className="input-field pl-11"
              />
            </div>
            {errors.confirmEmail && <p className="text-rejected text-xs mt-1 ml-1">{errors.confirmEmail}</p>}
          </div>
        )}

        {/* Password */}
        <div className="mb-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-blue-gray" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field pl-11"
            />
          </div>
          {errors.password && <p className="text-rejected text-xs mt-1 ml-1">{errors.password}</p>}

          {/* Password Strength */}
          {password.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1.5 mb-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i < strength.score ? strength.color : 'bg-light-gray'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-blue-gray">{strength.label}</p>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="mb-6">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-blue-gray" />
            <input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field pl-11"
            />
          </div>
          {errors.confirmPassword && <p className="text-rejected text-xs mt-1 ml-1">{errors.confirmPassword}</p>}
        </div>

        {/* Organization approval note */}
        {accountType === 'organization' && (
          <div className="mb-4 p-3 bg-frost-white rounded-xl text-xs text-slate-blue-gray">
            Your account will require admin approval before you can access the organization workspace.
          </div>
        )}

        {/* Create Account Button */}
        <button onClick={handleSignUp} disabled={isLoading} className="btn-primary flex items-center justify-center gap-2">
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-light-gray" />
          <span className="text-xs text-slate-blue-gray">or continue with</span>
          <div className="flex-1 h-px bg-light-gray" />
        </div>

        {/* Social Buttons */}
        <div className="flex gap-3">
          <button className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </button>
          <button className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Apple
          </button>
        </div>

        {/* Terms */}
        <p className="text-center text-xs text-slate-blue-gray mt-6">
          By creating an account, you agree to our{' '}
          <span className="text-steel-blue font-medium">Terms of Service</span> and{' '}
          <span className="text-steel-blue font-medium">Privacy Policy</span>.
        </p>
      </div>
    </motion.div>
  );
}

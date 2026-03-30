'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      await signIn(email, password);
      router.refresh();
      router.push('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
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
      className="flex flex-col items-center"
    >
      {/* Logo */}
      <div className="mb-8 text-center">
        <h1 className="font-display text-4xl tracking-[6px] text-steel-blue">CONSTRUXA</h1>
        <div className="mt-2 mx-auto w-12 h-1 bg-ice-blue rounded-full" />
      </div>

      {/* Card */}
      <div className="card w-full">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-dark-navy">Welcome to Construxa</h2>
          <p className="text-slate-blue-gray text-sm mt-1">Login Now</p>
        </div>

        {errors.general && (
          <div className="mb-4 p-3 bg-rejected/10 text-rejected text-sm rounded-xl text-center">
            {errors.general}
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

        {/* Password */}
        <div className="mb-6">
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
        </div>

        {/* Sign In Button */}
        <button onClick={handleSignIn} disabled={isLoading} className="btn-primary flex items-center justify-center gap-2">
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          {isLoading ? 'Signing In...' : 'Sign In'}
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

        {/* Sign Up Link */}
        <p className="text-center text-sm text-slate-blue-gray mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="text-steel-blue font-semibold hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </motion.div>
  );
}

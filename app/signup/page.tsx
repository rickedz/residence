'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signUp } from '../_lib/supabase';

export default function TenantSignUpPage() {
  const router = useRouter();

  const [name, setName]                 = useState('');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [confirmPassword, setConfirm]   = useState('');
  const [showPw, setShowPw]             = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [done, setDone]                 = useState(false);

  function validate(): string | null {
    if (!name.trim() || name.trim().length < 2)  return 'Full name must be at least 2 characters.';
    if (!email.trim())                            return 'Email address is required.';
    if (!password)                                return 'Password is required.';
    if (password.length < 8)                      return 'Password must be at least 8 characters.';
    if (!/[a-zA-Z]/.test(password))              return 'Password must contain at least one letter.';
    if (!/[0-9]/.test(password))                 return 'Password must contain at least one number.';
    if (password !== confirmPassword)             return 'Passwords do not match.';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      const { requiresConfirmation } = await signUp(
        email.trim(),
        password,
        name.trim(),
        'tenant',      // always tenant for self-registration
      );
      if (requiresConfirmation) {
        setDone(true);
      } else {
        // Email confirmation disabled — go straight to login
        router.replace('/login');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-up failed.';
      setError(
        msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')
          ? 'An account with that email already exists.'
          : msg,
      );
      setLoading(false);
    }
  }

  // ── Success / confirmation screen ────────────────────────────────
  if (done) {
    return (
      <PageShell>
        <div className="w-full max-w-md rounded-2xl border border-zinc-100 bg-white shadow-xl overflow-hidden">
          <div className="bg-zinc-900 px-7 py-7 text-white text-center">
            <div className="text-5xl mb-3">📬</div>
            <h1 className="text-2xl font-bold">Check your inbox</h1>
            <p className="mt-2 text-sm text-zinc-300">We sent a confirmation link to your email.</p>
          </div>
          <div className="px-7 py-7 space-y-4 text-center">
            <p className="text-sm text-zinc-600 leading-relaxed">
              Click the link in the email to verify your address and activate your account.
            </p>
            <div className="rounded-xl bg-zinc-50 border border-zinc-100 px-4 py-3 text-xs text-zinc-500 text-left">
              <p>✅ Account created for <span className="font-semibold text-zinc-700">{email}</span></p>
              <p className="mt-1">✅ Role: <span className="font-semibold text-zinc-700">Tenant</span></p>
            </div>
            <Link href="/login"
              className="block w-full rounded-xl bg-violet-600 py-3 text-sm font-bold text-white text-center hover:bg-violet-700 transition-colors">
              Go to Sign In
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  // ── Sign-up form ─────────────────────────────────────────────────
  return (
    <PageShell>
      <div className="w-full max-w-md rounded-2xl border border-zinc-100 bg-white shadow-xl overflow-hidden">
        {/* Card header */}
        <div className="bg-zinc-900 px-7 py-7 text-white">
          <p className="text-sm font-semibold text-zinc-300">Greenview Residences</p>
          <h1 className="mt-1 text-2xl font-bold">Create tenant account</h1>
          <p className="mt-2 text-sm text-zinc-300">
            Sign up to browse available rooms and manage your tenancy.
          </p>
          {/* Tenant badge */}
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-violet-500/20 border border-violet-400/30 px-3 py-1">
            <span className="text-sm">🏡</span>
            <span className="text-xs font-semibold text-violet-200">Tenant Account</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-7 py-7">
          {/* Full name */}
          <div>
            <label htmlFor="name" className="mb-1 block text-xs font-semibold text-zinc-600">
              Full Name
            </label>
            <input id="name" type="text" autoComplete="name" placeholder="e.g. Maria Santos"
              value={name} onChange={e => { setName(e.target.value); setError(''); }}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-400" />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-semibold text-zinc-600">
              Email Address
            </label>
            <input id="email" type="email" autoComplete="email" placeholder="you@example.com"
              value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-400" />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-semibold text-zinc-600">
              Password
            </label>
            <div className="relative">
              <input id="password" type={showPw ? 'text' : 'password'} autoComplete="new-password"
                placeholder="Min. 8 characters with a number"
                value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 pr-11 text-sm outline-none focus:ring-2 focus:ring-violet-400" />
              <button type="button" onClick={() => setShowPw(v => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400 hover:text-zinc-700">
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label htmlFor="confirm" className="mb-1 block text-xs font-semibold text-zinc-600">
              Confirm Password
            </label>
            <div className="relative">
              <input id="confirm" type={showConfirm ? 'text' : 'password'} autoComplete="new-password"
                placeholder="Repeat your password"
                value={confirmPassword} onChange={e => { setConfirm(e.target.value); setError(''); }}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 pr-11 text-sm outline-none focus:ring-2 focus:ring-violet-400" />
              <button type="button" onClick={() => setShowConfirm(v => !v)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400 hover:text-zinc-700">
                {showConfirm ? '🙈' : '👁️'}
              </button>
            </div>
            {confirmPassword.length > 0 && (
              <p className={`mt-1 text-xs font-medium ${password === confirmPassword ? 'text-emerald-600' : 'text-red-500'}`}>
                {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700" role="alert">
              {error}
            </p>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading}
            className="w-full rounded-xl bg-violet-600 py-3 text-sm font-bold text-white transition-colors hover:bg-violet-700 disabled:opacity-60">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Creating account…
              </span>
            ) : 'Create Account'}
          </button>
        </form>

        {/* Footer */}
        <div className="border-t border-zinc-100 bg-zinc-50 px-7 py-4 text-center text-xs text-zinc-500">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-violet-600 hover:text-violet-700 underline underline-offset-2">
            Sign in
          </Link>
        </div>
      </div>
    </PageShell>
  );
}

// ── Shared page shell ────────────────────────────────────────────────
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 flex flex-col">
      <header className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-zinc-100 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white text-xl">🏢</div>
          <div>
            <p className="font-bold text-zinc-900 leading-tight">ResideHub</p>
            <p className="text-[11px] text-zinc-400">Apartment Maintenance Portal</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-emerald-700">System Online</span>
        </div>
      </header>
      <section className="flex flex-1 items-center justify-center px-5 py-12">
        {children}
      </section>
    </main>
  );
}

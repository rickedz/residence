'use client';

import { useState, Suspense, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInAndSendOtp, verifyOtpAndGetProfile } from '../_lib/supabase';
import type { Role } from '../_lib/types';

const DASHBOARD_BY_ROLE: Record<Role, string> = {
  owner:    '/owner',
  manager:  '/manager',
  handyman: '/handyman',
  tenant:   '/tenant',
};

// ─────────────────────────────────────────────────────────────────────
// Step 1 — credentials form
// ─────────────────────────────────────────────────────────────────────
function CredentialsForm({
  onOtpSent,
}: {
  onOtpSent: (email: string) => void;
}) {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signInAndSendOtp(email.trim(), password);
      onOtpSent(email.trim());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed.';
      setError(msg.toLowerCase().includes('invalid') ? 'Invalid email or password.' : msg);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 px-7 py-7">
      <div>
        <label htmlFor="email" className="mb-1 block text-xs font-semibold text-zinc-600">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => { setEmail(e.target.value); setError(''); }}
          className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-400"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-xs font-semibold text-zinc-600">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 pr-11 text-sm outline-none focus:ring-2 focus:ring-violet-400"
          />
          <button type="button" onClick={() => setShowPassword(v => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400 hover:text-zinc-700">
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={loading}
        className="w-full rounded-xl bg-violet-600 py-3 text-sm font-bold text-white transition-colors hover:bg-violet-700 disabled:opacity-60">
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Sending verification code…
          </span>
        ) : 'Continue'}
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Step 2 — OTP verification form
// ─────────────────────────────────────────────────────────────────────
const OTP_LENGTH = 6;

function OtpForm({
  email,
  onBack,
}: {
  email: string;
  onBack: () => void;
}) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const nextPath     = searchParams.get('next');

  const [digits, setDigits]     = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs               = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first box on mount
  useEffect(() => { inputRefs.current[0]?.focus(); }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function handleDigitChange(index: number, value: string) {
    // Allow pasting a full OTP into the first box
    if (value.length === OTP_LENGTH && index === 0) {
      const pasted = value.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
      const next = [...Array(OTP_LENGTH).fill('')];
      pasted.forEach((d, i) => { next[i] = d; });
      setDigits(next);
      setError('');
      inputRefs.current[OTP_LENGTH - 1]?.focus();
      return;
    }

    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError('');
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerify() {
    const token = digits.join('');
    if (token.length < OTP_LENGTH) {
      setError('Please enter the full 6-digit code.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { profile } = await verifyOtpAndGetProfile(email, token);
      const destination = nextPath ?? DASHBOARD_BY_ROLE[profile.role];
      router.replace(destination);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed.';
      setError(
        msg.toLowerCase().includes('expired') ? 'Code expired. Please request a new one.' :
        msg.toLowerCase().includes('invalid') ? 'Incorrect code. Please try again.' : msg,
      );
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError('');
    setDigits(Array(OTP_LENGTH).fill(''));
    try {
      const { error: otpError } = await import('../_lib/supabase').then(m =>
        m.supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
      );
      if (otpError) throw otpError;
      setCooldown(60);
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  }

  const token = digits.join('');
  const isFull = token.length === OTP_LENGTH;

  return (
    <div className="px-7 py-7 space-y-5">
      {/* Info */}
      <div className="rounded-xl bg-violet-50 border border-violet-100 px-4 py-3 flex items-start gap-3">
        <span className="text-xl mt-0.5">📧</span>
        <div>
          <p className="text-sm font-semibold text-violet-900">Check your email</p>
          <p className="text-xs text-violet-600 mt-0.5">
            We sent a 6-digit code to <span className="font-bold">{email}</span>
          </p>
        </div>
      </div>

      {/* OTP boxes */}
      <div>
        <label className="mb-2 block text-xs font-semibold text-zinc-600">
          Verification Code
        </label>
        <div className="flex gap-2 justify-between">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={i === 0 ? OTP_LENGTH : 1}
              value={d}
              onChange={e => handleDigitChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onFocus={e => e.target.select()}
              className={`h-12 w-full rounded-xl border-2 text-center text-lg font-bold outline-none transition-all
                ${d ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-zinc-200 text-zinc-900'}
                focus:border-violet-500 focus:ring-2 focus:ring-violet-200`}
            />
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}

      {/* Verify button */}
      <button
        onClick={handleVerify}
        disabled={loading || !isFull}
        className="w-full rounded-xl bg-violet-600 py-3 text-sm font-bold text-white transition-colors hover:bg-violet-700 disabled:opacity-60">
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Verifying…
          </span>
        ) : 'Verify & Sign In'}
      </button>

      {/* Resend + back */}
      <div className="flex items-center justify-between text-xs">
        <button onClick={onBack}
          className="text-zinc-400 hover:text-zinc-700 transition-colors">
          ← Back
        </button>
        <button
          onClick={handleResend}
          disabled={resending || cooldown > 0}
          className="text-violet-600 hover:text-violet-800 font-semibold disabled:opacity-50 transition-colors">
          {resending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Page shell
// ─────────────────────────────────────────────────────────────────────
function LoginContent() {
  const [step, setStep]   = useState<'credentials' | 'otp'>('credentials');
  const [email, setEmail] = useState('');

  function handleOtpSent(sentEmail: string) {
    setEmail(sentEmail);
    setStep('otp');
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-100 bg-white shadow-xl overflow-hidden">
      {/* Card header */}
      <div className="bg-zinc-900 px-7 py-7 text-white">
        <p className="text-sm font-semibold text-zinc-300">Greenview Residences</p>
        {step === 'credentials' ? (
          <>
            <h1 className="mt-1 text-2xl font-bold">Welcome back</h1>
            <p className="mt-2 text-sm text-zinc-300">Sign in to continue to your dashboard.</p>
          </>
        ) : (
          <>
            <h1 className="mt-1 text-2xl font-bold">Verify your identity</h1>
            <p className="mt-2 text-sm text-zinc-300">Enter the code we emailed you to continue.</p>
          </>
        )}

        {/* Step indicator */}
        <div className="flex items-center gap-2 mt-4">
          {['Credentials', 'Verification'].map((label, i) => {
            const current = step === 'credentials' ? 0 : 1;
            const active  = i === current;
            const done    = i < current;
            return (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors
                  ${done ? 'bg-emerald-500 text-white' : active ? 'bg-white text-zinc-900' : 'bg-white/20 text-white/60'}`}>
                  {done ? '✓' : i + 1}
                </div>
                <span className={`text-xs font-medium transition-colors ${active ? 'text-white' : 'text-white/50'}`}>
                  {label}
                </span>
                {i < 1 && <span className="text-white/30 text-xs mx-0.5">→</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form area — Suspense needed for useSearchParams inside OtpForm */}
      <Suspense fallback={<div className="px-7 py-7 text-sm text-zinc-400 animate-pulse">Loading…</div>}>
        {step === 'credentials' ? (
          <CredentialsForm onOtpSent={handleOtpSent} />
        ) : (
          <OtpForm email={email} onBack={() => setStep('credentials')} />
        )}
      </Suspense>

      {/* Footer */}
      <div className="border-t border-zinc-100 bg-zinc-50 px-7 py-4 text-center text-xs leading-relaxed text-zinc-500">
        No account yet? Ask your property owner or landlord to add you to ResideHub.
      </div>
    </div>
  );
}

export default function LoginPage() {
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
        <Suspense fallback={null}>
          <LoginContent />
        </Suspense>
      </section>
    </main>
  );
}

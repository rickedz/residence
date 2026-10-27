'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../_lib/supabase';
import type { Role } from '../../_lib/types';

type Step = 'verifying' | 'set_password' | 'saving' | 'error';

export default function ConfirmPage() {
  const router  = useRouter();
  const [step, setStep]         = useState<Step>('verifying');
  const [errorMsg, setErrorMsg] = useState('');

  // Password-set form state
  const [password, setPassword]         = useState('');
  const [confirmPw, setConfirmPw]       = useState('');
  const [showPw, setShowPw]             = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [pwError, setPwError]           = useState('');

  useEffect(() => {
    // The Supabase client auto-processes the #access_token fragment on init.
    // We listen for the resulting SIGNED_IN / PASSWORD_RECOVERY event.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'INITIAL_SESSION' || !session) return;

        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          // Invited users get a SIGNED_IN event; show the set-password form.
          setStep('set_password');
        }
      },
    );

    // Also handle the case where the client already resolved the session
    // synchronously before our listener was registered.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setStep('set_password');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSetPassword() {
    setPwError('');
    if (password.length < 8) { setPwError('Password must be at least 8 characters.'); return; }
    if (!/[a-zA-Z]/.test(password)) { setPwError('Password must contain at least one letter.'); return; }
    if (!/[0-9]/.test(password))    { setPwError('Password must contain at least one number.'); return; }
    if (password !== confirmPw)     { setPwError('Passwords do not match.'); return; }

    setStep('saving');
    try {
      // 1. Update the password
      const { error: pwErr } = await supabase.auth.updateUser({ password });
      if (pwErr) throw pwErr;

      // 2. Get the resolved session and user metadata
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) throw new Error('Session lost after password update.');

      const meta = user.user_metadata as {
        name?: string;
        role?: Role;
        unit_number?: string | null;
      };

      const name       = meta.name       ?? user.email ?? 'Unknown';
      const role: Role = meta.role       ?? 'tenant';
      const unitNumber = meta.unit_number ?? null;

      // 3. Insert the profile row (ignore if it already exists)
      const initials = name
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

      await supabase.from('profiles').upsert({
        id:          user.id,
        name,
        role,
        unit_number: unitNumber,
        avatar:      initials,
      }, { onConflict: 'id', ignoreDuplicates: true });

      // 4. Set the session cookie so the proxy lets them through
      const expiresIn = sessionData.session?.expires_in ?? 3600;
      document.cookie = `rh_session=1; path=/; max-age=${expiresIn}; SameSite=Lax`;

      // 5. Send them to login so they sign in with their new password
      router.replace('/login');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
      setStep('error');
    }
  }

  // ── Verifying screen ─────────────────────────────────────────────
  if (step === 'verifying') {
    return (
      <ConfirmShell>
        <div className="text-center py-4">
          <div className="text-4xl mb-3 animate-pulse">🔐</div>
          <p className="text-sm font-semibold text-zinc-700">Verifying your invitation…</p>
          <p className="text-xs text-zinc-400 mt-1">This only takes a moment.</p>
        </div>
      </ConfirmShell>
    );
  }

  // ── Set password screen ──────────────────────────────────────────
  if (step === 'set_password') {
    return (
      <ConfirmShell>
        <div className="bg-zinc-900 px-7 py-7 text-white">
          <div className="text-3xl mb-2">👋</div>
          <h1 className="text-2xl font-bold">Welcome to ResideHub</h1>
          <p className="mt-1.5 text-sm text-zinc-300">
            Set a password to activate your account.
          </p>
        </div>

        <div className="space-y-4 px-7 py-7">
          {/* Password */}
          <div>
            <label htmlFor="pw" className="mb-1 block text-xs font-semibold text-zinc-600">
              New Password
            </label>
            <div className="relative">
              <input
                id="pw"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Min. 8 characters with a number"
                value={password}
                onChange={e => { setPassword(e.target.value); setPwError(''); }}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 pr-11 text-sm outline-none focus:ring-2 focus:ring-violet-400"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400 hover:text-zinc-700"
              >
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label htmlFor="confirm-pw" className="mb-1 block text-xs font-semibold text-zinc-600">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirm-pw"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repeat your password"
                value={confirmPw}
                onChange={e => { setConfirmPw(e.target.value); setPwError(''); }}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 pr-11 text-sm outline-none focus:ring-2 focus:ring-violet-400"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400 hover:text-zinc-700"
              >
                {showConfirm ? '🙈' : '👁️'}
              </button>
            </div>
            {confirmPw.length > 0 && (
              <p className={`mt-1 text-xs font-medium ${password === confirmPw ? 'text-emerald-600' : 'text-red-500'}`}>
                {password === confirmPw ? '✓ Passwords match' : '✗ Passwords do not match'}
              </p>
            )}
          </div>

          {pwError && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700" role="alert">
              {pwError}
            </p>
          )}

          <button
            onClick={handleSetPassword}
            className="w-full rounded-xl bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-700 transition-colors"
          >
            Activate Account
          </button>
        </div>
      </ConfirmShell>
    );
  }

  // ── Saving screen ────────────────────────────────────────────────
  if (step === 'saving') {
    return (
      <ConfirmShell>
        <div className="text-center py-8">
          <div className="text-4xl mb-3 animate-pulse">⚙️</div>
          <p className="text-sm font-semibold text-zinc-700">Activating your account…</p>
        </div>
      </ConfirmShell>
    );
  }

  // ── Error screen ─────────────────────────────────────────────────
  return (
    <ConfirmShell>
      <div className="text-center px-7 py-8">
        <div className="text-4xl mb-3">❌</div>
        <p className="font-semibold text-zinc-900">Something went wrong</p>
        <p className="text-xs text-zinc-500 mt-1 mb-5">{errorMsg}</p>
        <button
          onClick={() => router.replace('/login')}
          className="rounded-xl bg-violet-600 text-white text-sm font-semibold px-5 py-2.5 hover:bg-violet-700 transition-colors"
        >
          Go to Sign In
        </button>
      </div>
    </ConfirmShell>
  );
}

// ── Shared card shell ────────────────────────────────────────────
function ConfirmShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 flex flex-col">
      <header className="flex items-center gap-3 px-6 sm:px-8 py-5 border-b border-zinc-100 bg-white/80 backdrop-blur-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white text-xl">🏢</div>
        <div>
          <p className="font-bold text-zinc-900 leading-tight">ResideHub</p>
          <p className="text-[11px] text-zinc-400">Apartment Maintenance Portal</p>
        </div>
      </header>

      <section className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-md rounded-2xl border border-zinc-100 bg-white shadow-xl overflow-hidden">
          {children}
        </div>
      </section>
    </main>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../_components/Sidebar';
import Badge from '../../_components/Badge';
import { useSession } from '../../_lib/useSession';
import { supabase, fetchExpenses, fetchRentRecords, fetchContractors, insertExpense, insertContractor, updateContractorHired, type ExpenseRow, type RentRecordRow, type ContractorRow } from '../../_lib/supabase';

function fmt(n: number) { return '₱' + n.toLocaleString('en-PH'); }

function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <span className="text-4xl">{icon}</span>
      <p className="font-semibold text-zinc-700">{title}</p>
      <p className="text-sm text-zinc-400 max-w-xs">{sub}</p>
    </div>
  );
}

// ── Add User Modal ──────────────────────────────────────────────────
type NewUserRole = 'manager' | 'handyman' | 'tenant';
const USER_ROLES: { value: NewUserRole; label: string; icon: string; color: string }[] = [
  { value: 'manager',  label: 'Property Manager', icon: '🏢', color: 'border-blue-400 bg-blue-50 text-blue-700' },
  { value: 'handyman', label: 'Handyman',          icon: '🛠️', color: 'border-emerald-400 bg-emerald-50 text-emerald-700' },
  { value: 'tenant',   label: 'Tenant',            icon: '🏡', color: 'border-violet-400 bg-violet-50 text-violet-700' },
];

function AddUserModal({ onClose }: { onClose: () => void }) {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [role, setRole]         = useState<NewUserRole>('tenant');
  const [unitNumber, setUnit]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  function reset() { setName(''); setEmail(''); setPassword(''); setRole('tenant'); setUnit(''); setSuccess(''); setError(''); }

  async function handleCreate() {
    setError('');
    if (!name.trim())                            { setError('Full name is required.'); return; }
    if (!email.trim())                           { setError('Email address is required.'); return; }
    if (!password)                               { setError('Password is required.'); return; }
    if (password.length < 8)                     { setError('Password must be at least 8 characters.'); return; }
    if (role === 'tenant' && !unitNumber.trim()) { setError('Unit number is required for tenants.'); return; }
    setLoading(true);
    try {
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;
      if (!token) throw new Error('Session expired. Please sign in again.');
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password, role, unitNumber: unitNumber.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to create account.');
      setSuccess(email.trim().toLowerCase());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create account.');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        {success ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50"><span className="text-3xl">✅</span></div>
            <h3 className="text-xl font-bold text-zinc-900">Account Created!</h3>
            <p className="mt-2 text-sm text-zinc-500"><span className="font-semibold text-zinc-700">{success}</span> can now sign in.</p>
            <div className="mt-6 flex gap-3">
              <button onClick={reset} className="flex-1 rounded-xl border-2 border-zinc-200 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors">Add Another</button>
              <button onClick={onClose} className="flex-1 rounded-xl bg-zinc-900 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors">Done</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
              <div><h3 className="font-bold text-zinc-900 text-lg">Add New User</h3><p className="text-xs text-zinc-400 mt-0.5">Create an account and share credentials with them.</p></div>
              <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 transition-colors text-lg">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-500 mb-1 block uppercase tracking-wide">Full Name</label>
                  <input type="text" placeholder="Maria Santos" value={name} onChange={e => { setName(e.target.value); setError(''); }}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 transition" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 mb-1 block uppercase tracking-wide">Email</label>
                  <input type="email" placeholder="user@email.com" value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 transition" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500 mb-1 block uppercase tracking-wide">Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} autoComplete="new-password" placeholder="Min. 8 characters" value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 transition" />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700">{showPw ? '🙈' : '👁️'}</button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500 mb-2 block uppercase tracking-wide">Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {USER_ROLES.map(r => (
                    <button key={r.value} type="button" onClick={() => { setRole(r.value); setError(''); }}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 text-xs font-semibold transition-all
                        ${role === r.value ? r.color + ' scale-[1.02] shadow-sm' : 'border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50'}`}>
                      <span className="text-xl">{r.icon}</span>
                      <span className="leading-tight text-center">{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {role === 'tenant' && (
                <div>
                  <label className="text-xs font-semibold text-zinc-500 mb-1 block uppercase tracking-wide">Unit Number <span className="text-red-500 normal-case">*</span></label>
                  <input type="text" placeholder="e.g. 3B" value={unitNumber} onChange={e => { setUnit(e.target.value); setError(''); }}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 transition" />
                </div>
              )}
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                  <span className="text-red-500 mt-0.5 shrink-0">⚠</span>
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={onClose} className="flex-1 rounded-xl border-2 border-zinc-200 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors">Cancel</button>
              <button onClick={handleCreate} disabled={loading}
                className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-all disabled:opacity-60">
                {loading ? <span className="flex items-center justify-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Creating…</span> : 'Create Account'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Add Expense Modal ───────────────────────────────────────────────
const EXPENSE_CATEGORIES = ['Structural', 'Electrical', 'Plumbing', 'Landscaping', 'Security', 'Elevator', 'Other'];

function AddExpenseModal({ profileId, onClose, onSaved }: {
  profileId: string;
  onClose: () => void;
  onSaved: (row: ExpenseRow) => void;
}) {
  const [category,    setCategory]    = useState('Structural');
  const [description, setDescription] = useState('');
  const [amount,      setAmount]      = useState('');
  const [date,        setDate]        = useState(new Date().toISOString().split('T')[0]);
  const [status,      setStatus]      = useState<'paid' | 'pending' | 'overdue'>('pending');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  async function handleSave() {
    const amt = parseFloat(amount);
    if (!description.trim()) { setError('Description is required.'); return; }
    if (isNaN(amt) || amt <= 0) { setError('Enter a valid amount.'); return; }
    setLoading(true);
    try {
      const row = await insertExpense({
        category: category,
        description: description.trim(),
        amount: amt,
        date,
        status,
        created_by: profileId,
      });
      onSaved(row);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add expense.');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
          <h3 className="font-bold text-zinc-900 text-lg">Add Expense</h3>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 transition-colors text-lg">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block uppercase tracking-wide">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block uppercase tracking-wide">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as 'paid' | 'pending' | 'overdue')}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500 mb-1 block uppercase tracking-wide">Description</label>
            <input type="text" placeholder="e.g. Roof repair – east wing" value={description}
              onChange={e => { setDescription(e.target.value); setError(''); }}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block uppercase tracking-wide">Amount (₱)</label>
              <input type="number" min="0" step="0.01" placeholder="0.00" value={amount}
                onChange={e => { setAmount(e.target.value); setError(''); }}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block uppercase tracking-wide">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
          </div>
          {error && <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5"><span className="text-red-500 mt-0.5">⚠</span><p className="text-xs text-red-700">{error}</p></div>}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 rounded-xl border-2 border-zinc-200 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-all disabled:opacity-60">
            {loading ? <span className="flex items-center justify-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Saving…</span> : 'Save Expense'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Contractor Modal ─────────────────────────────────────────────
function AddContractorModal({ onClose, onSaved }: {
  onClose: () => void;
  onSaved: (row: ContractorRow) => void;
}) {
  const [form, setForm]     = useState({ name: '', specialty: '', phone: '', email: '', rating: '4.0' });
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleSave() {
    if (!form.name.trim() || !form.specialty.trim()) { setError('Name and specialty are required.'); return; }
    if (!form.email.trim().includes('@')) { setError('Enter a valid email.'); return; }
    setLoading(true);
    try {
      const row = await insertContractor({
        name:      form.name.trim(),
        specialty:  form.specialty.trim(),
        phone:      form.phone.trim(),
        email:      form.email.trim(),
        rating:     parseFloat(form.rating) || 4.0,
        last_hired:  null,
        status,
      });
      onSaved(row);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add contractor.');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
          <h3 className="font-bold text-zinc-900 text-lg">Add Contractor</h3>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 transition-colors text-lg">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block uppercase tracking-wide">Company Name</label>
              <input type="text" placeholder="ProBuild PH" value={form.name}
                onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setError(''); }}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block uppercase tracking-wide">Specialty</label>
              <input type="text" placeholder="Electrical" value={form.specialty}
                onChange={e => { setForm(f => ({ ...f, specialty: e.target.value })); setError(''); }}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block uppercase tracking-wide">Phone</label>
              <input type="text" placeholder="0917-111-2222" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block uppercase tracking-wide">Email</label>
              <input type="email" placeholder="info@company.com" value={form.email}
                onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setError(''); }}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block uppercase tracking-wide">Rating</label>
              <input type="number" min="0" max="5" step="0.1" value={form.rating}
                onChange={e => setForm(f => ({ ...f, rating: e.target.value }))}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block uppercase tracking-wide">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as 'active' | 'inactive')}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          {error && <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5"><span className="text-red-500 mt-0.5">⚠</span><p className="text-xs text-red-700">{error}</p></div>}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 rounded-xl border-2 border-zinc-200 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-all disabled:opacity-60">
            {loading ? <span className="flex items-center justify-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Saving…</span> : 'Save Contractor'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Row / Card components ────────────────────────────────────────────
const CATEGORY_ICON: Record<string, string> = { Structural: '🏗️', Electrical: '⚡', Plumbing: '🔧', Landscaping: '🌿', Security: '🔒', Elevator: '🛗' };

function ExpenseRow({ e }: { e: ExpenseRow }) {
  return (
    <tr className="border-b border-zinc-50 hover:bg-violet-50/40 transition-colors">
      <td className="py-3.5 pr-4 pl-2">
        <div className="flex items-center gap-2.5">
          <span className="text-base">{CATEGORY_ICON[e.category] ?? '📋'}</span>
          <span className="rounded-lg bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">{e.category}</span>
        </div>
      </td>
      <td className="py-3.5 pr-4 text-sm text-zinc-700 max-w-[200px]"><p className="truncate">{e.description}</p></td>
      <td className="py-3.5 pr-4 text-sm font-bold text-zinc-900">{fmt(e.amount)}</td>
      <td className="py-3.5 pr-4 text-xs text-zinc-400 whitespace-nowrap">{e.date}</td>
      <td className="py-3.5"><Badge variant={e.status} /></td>
    </tr>
  );
}

function RentRow({ r }: { r: RentRecordRow }) {
  const initials = r.tenant_name.split(' ').map(w => w[0]).join('').slice(0, 2);
  return (
    <tr className="border-b border-zinc-50 hover:bg-violet-50/40 transition-colors">
      <td className="py-3.5 pr-4 pl-2">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 shrink-0 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700">{initials}</div>
          <span className="text-sm font-medium text-zinc-800">{r.tenant_name}</span>
        </div>
      </td>
      <td className="py-3.5 pr-4"><span className="rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-bold text-zinc-600">Unit {r.unit_number}</span></td>
      <td className="py-3.5 pr-4 text-sm font-bold text-zinc-900">{fmt(r.amount)}</td>
      <td className="py-3.5 pr-4 text-xs text-zinc-400 whitespace-nowrap">{r.due_date}</td>
      <td className="py-3.5 pr-4 text-xs text-zinc-400 whitespace-nowrap">{r.paid_date ?? '—'}</td>
      <td className="py-3.5"><Badge variant={r.status} /></td>
    </tr>
  );
}

const SPECIALTY_ICON: Record<string, string> = { 'Structural & Civil': '🏗️', 'Electrical': '⚡', 'Plumbing': '🔧', 'Landscaping': '🌿', 'Security Systems': '🔒', 'Elevator Maintenance': '🛗' };

function ContractorCard({ c, onHire }: { c: ContractorRow; onHire: (id: string) => void }) {
  const filled = Math.round(c.rating);
  return (
    <div className="group rounded-2xl border border-zinc-100 bg-white p-5 flex flex-col gap-3 hover:border-violet-200 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-zinc-100 flex items-center justify-center text-xl">{SPECIALTY_ICON[c.specialty] ?? '🔨'}</div>
          <div><p className="font-bold text-zinc-900 text-sm leading-tight">{c.name}</p><p className="text-xs text-zinc-500 mt-0.5">{c.specialty}</p></div>
        </div>
        <Badge variant={c.status} />
      </div>
      <div className="flex items-center gap-1.5">
        <div className="flex">{Array.from({ length: 5 }, (_, i) => <span key={i} className={`text-sm ${i < filled ? 'text-amber-400' : 'text-zinc-200'}`}>★</span>)}</div>
        <span className="text-xs font-bold text-zinc-700">{c.rating}</span>
      </div>
      <div className="space-y-1 py-3 border-t border-b border-zinc-50">
        <div className="flex items-center gap-2 text-xs text-zinc-500"><span>📞</span><span>{c.phone}</span></div>
        <div className="flex items-center gap-2 text-xs text-zinc-500"><span>✉️</span><span className="truncate">{c.email}</span></div>
        {c.last_hired && <div className="flex items-center gap-2 text-xs text-zinc-400"><span>🗓️</span><span>Last hired: {c.last_hired}</span></div>}
      </div>
      <button onClick={() => onHire(c.id)} className="w-full rounded-xl bg-zinc-900 text-white text-xs font-bold py-2 hover:bg-violet-600 transition-colors group-hover:bg-violet-600">Hire Contractor</button>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────
export default function OwnerPage() {
  const { profile, loading: sessionLoading } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab]   = useState<'expenses' | 'rent' | 'contractors'>('expenses');
  const [showAddUser, setShowAddUser]       = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddContractor, setShowAddContractor] = useState(false);
  const [hireToast, setHireToast]           = useState('');

  const [expenses,    setExpenses]    = useState<ExpenseRow[]>([]);
  const [rentRecords, setRentRecords] = useState<RentRecordRow[]>([]);
  const [contractors, setContractors] = useState<ContractorRow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const syncActiveTab = () => {
      const tab = window.location.hash.slice(1);
      setActiveTab(tab === 'rent' || tab === 'contractors' ? tab : 'expenses');
    };

    syncActiveTab();
    window.addEventListener('hashchange', syncActiveTab);
    return () => window.removeEventListener('hashchange', syncActiveTab);
  }, []);

  useEffect(() => {
    if (!sessionLoading && !profile) router.replace('/login');
  }, [sessionLoading, profile, router]);

  useEffect(() => {
    if (!profile) return;
    async function load() {
      setDataLoading(true);
      try {
        const [exp, rent, cont] = await Promise.all([fetchExpenses(), fetchRentRecords(), fetchContractors()]);
        setExpenses(exp); setRentRecords(rent); setContractors(cont);
      } catch (err) { console.error('Failed to load owner data:', err); }
      finally { setDataLoading(false); }
    }
    load();
  }, [profile]);

  if (sessionLoading || !profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-[3px] border-zinc-200 border-t-violet-600 animate-spin" />
          <p className="text-sm text-zinc-400">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const userName   = profile.name;
  const userAvatar = profile.avatar ?? profile.name.slice(0, 2).toUpperCase();

  async function handleHire(id: string) {
    try {
      await updateContractorHired(id);
      setContractors(prev => prev.map(c => c.id === id ? { ...c, last_hired: new Date().toISOString().split('T')[0] } : c));
      const c = contractors.find(x => x.id === id);
      setHireToast(`Hired ${c?.name ?? 'contractor'} — last hired date updated.`);
      setTimeout(() => setHireToast(''), 4000);
    } catch (err) {
      console.error('Failed to hire contractor:', err);
    }
  }

  // Metrics
  const totalExpenses   = expenses.reduce((s, e) => s + e.amount, 0);
  const paidExpenses    = expenses.filter(e => e.status === 'paid').reduce((s, e) => s + e.amount, 0);
  const pendingExpenses = expenses.filter(e => e.status === 'pending' || e.status === 'overdue').reduce((s, e) => s + e.amount, 0);
  const totalRent       = rentRecords.reduce((s, r) => s + r.amount, 0);
  const collectedRent   = rentRecords.filter(r => r.status === 'paid').reduce((s, r) => s + r.amount, 0);
  const pendingRent     = rentRecords.filter(r => r.status === 'pending').reduce((s, r) => s + r.amount, 0);
  const overdueRent     = rentRecords.filter(r => r.status === 'overdue').reduce((s, r) => s + r.amount, 0);
  const overdueCount    = rentRecords.filter(r => r.status === 'overdue').length;
  const paidRentCount   = rentRecords.filter(r => r.status === 'paid').length;
  const collectionRate  = rentRecords.length > 0 ? Math.round((paidRentCount / rentRecords.length) * 100) : 0;
  const activeContractors = contractors.filter(c => c.status === 'active').length;

  const tabs = [
    { id: 'expenses'    as const, label: 'Expenses',        icon: '💸', count: expenses.length },
    { id: 'rent'        as const, label: 'Rent Collection', icon: '💰', count: rentRecords.length > 0 ? `${paidRentCount}/${rentRecords.length}` : 0 },
    { id: 'contractors' as const, label: 'Contractors',     icon: '👷', count: activeContractors },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {showAddUser && <AddUserModal onClose={() => setShowAddUser(false)} />}
      {showAddExpense && (
        <AddExpenseModal profileId={profile.id} onClose={() => setShowAddExpense(false)}
          onSaved={row => setExpenses(prev => [row, ...prev])} />
      )}
      {showAddContractor && (
        <AddContractorModal onClose={() => setShowAddContractor(false)}
          onSaved={row => setContractors(prev => [row, ...prev])} />
      )}
      {hireToast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-emerald-600 text-white text-sm font-semibold px-5 py-3 shadow-lg animate-in fade-in slide-in-from-bottom-2">
          ✅ {hireToast}
        </div>
      )}
      <Sidebar role="owner" userName={userName} userAvatar={userAvatar} />

      <div className="flex flex-1 flex-col overflow-hidden bg-zinc-50">
        {/* Topbar */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white/90 backdrop-blur-sm px-8 py-4">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Property Owner Dashboard</h1>
            <p className="text-xs text-zinc-400 mt-0.5">{userName} · Greenview Residences · Building A</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5">
              <span>📅</span><span>{new Date().toLocaleDateString('en-PH', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </div>
            <button onClick={() => setShowAddUser(true)}
              className="flex items-center gap-2 rounded-xl bg-violet-600 text-white text-sm font-semibold px-4 py-2 hover:bg-violet-700 transition-all shadow-sm shadow-violet-200">
              <span>＋</span> Add User
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {/* Summary banner */}
          <div className="rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Monthly Overview</p>
              <p className="text-3xl font-black mt-1">{rentRecords.length > 0 ? fmt(collectedRent) : '—'}</p>
              <p className="text-sm text-zinc-300 mt-0.5">
                {rentRecords.length > 0 ? `collected of ${fmt(totalRent)} expected` : 'No rent records yet'}
              </p>
            </div>
            {rentRecords.length > 0 && (
              <div className="flex gap-6 flex-wrap">
                <div className="text-center"><p className="text-2xl font-bold text-emerald-400">{collectionRate}%</p><p className="text-xs text-zinc-400 mt-0.5">Collection Rate</p></div>
                <div className="text-center"><p className="text-2xl font-bold text-amber-400">{fmt(pendingRent)}</p><p className="text-xs text-zinc-400 mt-0.5">Pending</p></div>
                {overdueCount > 0 && <div className="text-center"><p className="text-2xl font-bold text-red-400">{overdueCount}</p><p className="text-xs text-zinc-400 mt-0.5">Overdue</p></div>}
              </div>
            )}
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-xl">💰</div>
                {rentRecords.length > 0 && <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{paidRentCount}/{rentRecords.length} paid</span>}
              </div>
              <div><p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Rent Collected</p><p className="text-2xl font-black text-zinc-900 mt-0.5">{rentRecords.length > 0 ? fmt(collectedRent) : '—'}</p></div>
              <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${collectionRate}%` }} /></div>
            </div>
            <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center text-xl">💸</div>
                {expenses.length > 0 && <span className="text-xs font-semibold text-zinc-500 bg-zinc-50 px-2 py-0.5 rounded-full">{expenses.length} items</span>}
              </div>
              <div><p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Total Expenses</p><p className="text-2xl font-black text-zinc-900 mt-0.5">{expenses.length > 0 ? fmt(totalExpenses) : '—'}</p></div>
              <p className="text-xs text-zinc-400">{expenses.length > 0 ? `${fmt(paidExpenses)} settled` : 'No expenses logged'}</p>
            </div>
            <div className="rounded-2xl bg-white border border-zinc-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-xl">⏳</div>
                {pendingExpenses > 0 && <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Action needed</span>}
              </div>
              <div><p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Pending Expenses</p><p className="text-2xl font-black text-zinc-900 mt-0.5">{expenses.length > 0 ? fmt(pendingExpenses) : '—'}</p></div>
              <p className="text-xs text-zinc-400">Awaiting payment</p>
            </div>
            <div className={`rounded-2xl border shadow-sm p-5 space-y-3 ${overdueCount > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-zinc-100'}`}>
              <div className="flex items-center justify-between">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xl ${overdueCount > 0 ? 'bg-red-100' : 'bg-zinc-50'}`}>{overdueCount > 0 ? '⚠️' : '✅'}</div>
                {overdueCount > 0 && <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full animate-pulse">Follow up</span>}
              </div>
              <div><p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Overdue Tenants</p><p className={`text-2xl font-black mt-0.5 ${overdueCount > 0 ? 'text-red-700' : 'text-zinc-900'}`}>{overdueCount}</p></div>
              <p className="text-xs text-zinc-400">{overdueCount > 0 ? `${fmt(overdueRent)} outstanding` : 'All tenants current'}</p>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-2xl p-1.5 w-fit shadow-sm">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => { window.location.hash = tab.id === 'expenses' ? '' : tab.id; }}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all
                  ${activeTab === tab.id ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'}`}>
                <span>{tab.icon}</span><span>{tab.label}</span>
                <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-500'}`}>{tab.count}</span>
              </button>
            ))}
          </div>

          {dataLoading ? (
            <div className="flex items-center justify-center py-20"><div className="text-sm text-zinc-400 animate-pulse">Loading data…</div></div>
          ) : (
            <>
              {/* Expenses tab */}
              {activeTab === 'expenses' && (
                <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
                    <div><h2 className="font-bold text-zinc-900">Building Expenses</h2><p className="text-xs text-zinc-400 mt-0.5">Structural, electrical, plumbing, and more</p></div>
                    <button onClick={() => setShowAddExpense(true)} className="flex items-center gap-1.5 rounded-xl bg-zinc-900 text-white text-xs font-bold px-3 py-2 hover:bg-zinc-700 transition-colors"><span>＋</span> Add Expense</button>
                  </div>
                  {expenses.length === 0 ? (
                    <EmptyState icon="💸" title="No expenses logged yet" sub="Building expenses will appear here once you start recording them." />
                  ) : (
                    <>
                      <div className="flex gap-3 px-6 py-3 bg-zinc-50 border-b border-zinc-100 flex-wrap">
                        {[{ label: 'Total', value: fmt(totalExpenses), color: 'text-zinc-700' }, { label: 'Paid', value: fmt(paidExpenses), color: 'text-emerald-600' }, { label: 'Pending', value: fmt(pendingExpenses), color: 'text-amber-600' }]
                          .map(chip => <div key={chip.label} className="flex items-center gap-1.5 text-xs"><span className="text-zinc-400">{chip.label}:</span><span className={`font-bold ${chip.color}`}>{chip.value}</span></div>)}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead><tr className="border-b border-zinc-100 bg-zinc-50/50">{['Category', 'Description', 'Amount', 'Date', 'Status'].map(h => <th key={h} className={`pb-3 pt-3 pr-4 text-xs font-bold uppercase tracking-wider text-zinc-400 ${h === 'Category' ? 'pl-2' : ''}`}>{h}</th>)}</tr></thead>
                          <tbody>{expenses.map(e => <ExpenseRow key={e.id} e={e} />)}</tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Rent tab */}
              {activeTab === 'rent' && (
                <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
                    <div><h2 className="font-bold text-zinc-900">Rent Collection</h2><p className="text-xs text-zinc-400 mt-0.5">{rentRecords.length > 0 ? `${paidRentCount} of ${rentRecords.length} tenants have paid` : 'No rent records yet'}</p></div>
                    {rentRecords.length > 0 && <div className="flex items-center gap-2"><div className="h-2 w-24 bg-zinc-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${collectionRate}%` }} /></div><span className="text-sm font-bold text-zinc-700">{collectionRate}%</span></div>}
                  </div>
                  {overdueCount > 0 && (
                    <div className="flex items-center gap-3 px-6 py-3 bg-red-50 border-b border-red-100">
                      <span className="text-red-500">⚠️</span>
                      <p className="text-xs text-red-700 font-semibold">{overdueCount} tenant{overdueCount > 1 ? 's are' : ' is'} overdue — {fmt(overdueRent)} outstanding.</p>
                    </div>
                  )}
                  {rentRecords.length === 0 ? (
                    <EmptyState icon="💰" title="No rent records yet" sub="Tenant rent records will appear here once they are added to the system." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead><tr className="border-b border-zinc-100 bg-zinc-50/50">{['Tenant', 'Unit', 'Amount', 'Due Date', 'Paid Date', 'Status'].map(h => <th key={h} className={`pb-3 pt-3 pr-4 text-xs font-bold uppercase tracking-wider text-zinc-400 ${h === 'Tenant' ? 'pl-2' : ''}`}>{h}</th>)}</tr></thead>
                        <tbody>{rentRecords.sort((a, b) => { const o: Record<string, number> = { overdue: 0, pending: 1, paid: 2 }; return o[a.status] - o[b.status]; }).map(r => <RentRow key={r.id} r={r} />)}</tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Contractors tab */}
              {activeTab === 'contractors' && (
                <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
                    <div><h2 className="font-bold text-zinc-900">Contractor Directory</h2><p className="text-xs text-zinc-400 mt-0.5">{contractors.length > 0 ? `${activeContractors} active · ${contractors.length - activeContractors} inactive` : 'No contractors yet'}</p></div>
                    <button onClick={() => setShowAddContractor(true)} className="flex items-center gap-1.5 rounded-xl bg-zinc-900 text-white text-xs font-bold px-3 py-2 hover:bg-zinc-700 transition-colors"><span>＋</span> Add Contractor</button>
                  </div>
                  {contractors.length === 0 ? (
                    <EmptyState icon="👷" title="No contractors yet" sub="Add contractors to your directory to quickly hire them for maintenance work." />
                  ) : (
                    <div className="p-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {contractors.map(c => <ContractorCard key={c.id} c={c} onHire={handleHire} />)}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

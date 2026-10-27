'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../_components/Sidebar';
import Topbar from '../../_components/Topbar';
import StatCard from '../../_components/StatCard';
import SectionCard from '../../_components/SectionCard';
import Badge from '../../_components/Badge';
import { useSession } from '../../_lib/useSession';
import {
  supabase,
  fetchPaymentRecords,
  fetchTickets,
  fetchTicketUpdates,
  insertTicket,
  insertTicketUpdate,
  fetchRooms,
  fetchRoomApplications,
  insertRoomApplication,
  type PaymentRecordRow,
  type TicketRow,
  type TicketUpdateRow,
  type RoomRow,
  type RoomApplicationRow,
  type ProfileRow,
} from '../../_lib/supabase';
import type { TicketStatus, Priority } from '../../_lib/types';

function fmt(n: number) {
  return '₱' + n.toLocaleString('en-PH');
}

function fmtMonth(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
}

// ── Empty state helper ──────────────────────────────────────────────
function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
      <span className="text-4xl">{icon}</span>
      <p className="font-semibold text-zinc-700">{title}</p>
      <p className="text-sm text-zinc-400 max-w-xs">{sub}</p>
    </div>
  );
}

// ── Payment row ─────────────────────────────────────────────────────
function PaymentRow({ p }: { p: PaymentRecordRow }) {
  return (
    <tr className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
      <td className="py-3 pr-4 text-sm font-medium text-zinc-800">{fmtMonth(p.month)}</td>
      <td className="py-3 pr-4 text-sm font-semibold text-zinc-900">{fmt(p.amount)}</td>
      <td className="py-3 pr-4 text-xs text-zinc-400">{p.due_date}</td>
      <td className="py-3 pr-4 text-xs text-zinc-400">{p.paid_date ?? '—'}</td>
      <td className="py-3 pr-4 text-xs text-zinc-500">{p.method ?? '—'}</td>
      <td className="py-3"><Badge variant={p.status} /></td>
    </tr>
  );
}

// ── Pay Rent modal ──────────────────────────────────────────────────
function PayRentModal({
  payment,
  onClose,
  onPaid,
}: {
  payment: PaymentRecordRow;
  onClose: () => void;
  onPaid: (row: PaymentRecordRow) => void;
}) {
  const [step, setStep]       = useState<'confirm' | 'success' | 'error'>('confirm');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const monthLabel = fmtMonth(payment.month);

  async function handlePay() {
    setLoading(true);
    setError('');
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error: updError } = await supabase
        .from('payment_records')
        .update({ paid_date: today, method: 'Cash', status: 'paid' })
        .eq('id', payment.id)
        .select()
        .single();

      if (updError) throw updError;
      onPaid(data as PaymentRecordRow);
      setStep('success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Payment failed.');
      setStep('error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">

        {step === 'confirm' && (<>
          <h3 className="font-bold text-zinc-900 text-lg mb-1">Pay Rent</h3>
          <p className="text-xs text-zinc-400 mb-4">{monthLabel}</p>

          <div className="rounded-xl bg-zinc-50 p-4 mb-4 text-center">
            <p className="text-xs text-zinc-500">Amount Due</p>
            <p className="text-3xl font-bold text-zinc-900 mt-1">{fmt(payment.amount)}</p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 mb-5">
            <span className="text-2xl">💵</span>
            <div>
              <p className="text-sm font-semibold text-zinc-800">Cash Payment</p>
              <p className="text-xs text-zinc-400">Pay in person at the admin office</p>
            </div>
          </div>

          <div className="space-y-2 mb-5 text-sm">
            {[['Month', monthLabel], ['Amount', fmt(payment.amount)], ['Method', 'Cash']].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-zinc-500">{label}</span>
                <span className="font-semibold text-zinc-900">{value}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 rounded-xl border border-zinc-200 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors">Cancel</button>
            <button onClick={handlePay} disabled={loading}
              className="flex-1 rounded-xl bg-violet-600 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition-colors disabled:opacity-60">
              {loading
                ? <span className="flex items-center justify-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Processing…</span>
                : 'Confirm Payment'}
            </button>
          </div>
        </>)}

        {step === 'success' && (
          <div className="text-center py-4">
            <div className="text-5xl mb-3">✅</div>
            <h3 className="font-bold text-zinc-900 text-lg">Payment Recorded!</h3>
            <p className="text-sm text-zinc-500 mt-1">{fmt(payment.amount)} for {monthLabel}</p>
            <p className="text-xs text-zinc-400 mt-0.5">Paid via Cash at the admin office.</p>
            <button onClick={onClose} className="mt-5 w-full rounded-xl bg-zinc-900 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors">Done</button>
          </div>
        )}

        {step === 'error' && (
          <div className="text-center py-4">
            <div className="text-5xl mb-3">❌</div>
            <h3 className="font-bold text-zinc-900 text-lg">Payment Failed</h3>
            <p className="text-xs text-red-500 mt-1 mb-5">{error}</p>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 rounded-xl border border-zinc-200 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors">Close</button>
              <button onClick={() => setStep('confirm')} className="flex-1 rounded-xl bg-violet-600 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition-colors">Try Again</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Submit Request modal ────────────────────────────────────────────
function SubmitRequestModal({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (title: string, desc: string, priority: string) => Promise<void>;
}) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium' });
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    setPhotos(prev => [...prev, ...Array.from(files).map(f => URL.createObjectURL(f))]);
  }

  async function handleSubmit() {
    if (!form.title.trim()) return;
    setLoading(true);
    await onSubmit(form.title, form.description, form.priority);
    setLoading(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-zinc-900 text-lg mb-4">Submit Maintenance Request</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-zinc-600 mb-1 block">Issue Title</label>
            <input className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="e.g. Leaking faucet in bathroom" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-600 mb-1 block">Description</label>
            <textarea rows={3} className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              placeholder="Describe the issue in detail..." value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-600 mb-1 block">Priority</label>
            <select className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              <option value="low">Low – Minor inconvenience</option>
              <option value="medium">Medium – Affects daily use</option>
              <option value="high">High – Significant issue</option>
              <option value="urgent">Urgent – Safety concern</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-600 mb-1 block">Attach Photos (optional)</label>
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 py-6 px-4 cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-colors"
              onClick={() => inputRef.current?.click()} onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}>
              <span className="text-2xl mb-1">📸</span>
              <p className="text-xs text-zinc-500">Click or drag photos here</p>
              <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
            </div>
            {photos.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {photos.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={url} alt="" className="h-14 w-14 rounded-lg object-cover border border-zinc-200" />
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 rounded-xl border border-zinc-200 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={!form.title.trim() || loading}
            className="flex-1 rounded-xl bg-violet-600 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition-colors disabled:opacity-40">
            {loading ? 'Submitting…' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Repair tracker card ─────────────────────────────────────────────
const STATUS_STEP: Record<TicketStatus, number> = {
  open: 0, assigned: 1, in_progress: 2, resolved: 3, closed: 4,
};
const STEPS = ['Submitted', 'Assigned', 'In Progress', 'Resolved'];

interface TicketWithUpdates extends TicketRow {
  updates: TicketUpdateRow[];
}

function RepairCard({ t }: { t: TicketWithUpdates }) {
  const step = STATUS_STEP[t.status];
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-zinc-900">{t.title}</p>
          <p className="text-xs text-zinc-400 mt-0.5">Submitted: {t.submitted_date}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge variant={t.status} />
          <Badge variant={t.priority} />
        </div>
      </div>
      {/* Stepper */}
      <div className="flex items-center">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold
              ${i <= step ? 'bg-violet-600 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
              {i < step ? '✓' : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-1 flex-1 rounded-full ${i < step ? 'bg-violet-600' : 'bg-zinc-100'}`} />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between">
        {STEPS.map((s, i) => (
          <span key={s} className={`text-[10px] font-medium ${i <= step ? 'text-violet-700' : 'text-zinc-400'}`}>{s}</span>
        ))}
      </div>
      {/* Updates */}
      <div className="space-y-2 pt-1 border-t border-zinc-100">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Updates</p>
        {t.updates.length === 0 ? (
          <p className="text-xs text-zinc-400">No updates yet.</p>
        ) : t.updates.map((u, i) => (
          <div key={u.id} className="flex gap-2.5">
            <div className="flex flex-col items-center">
              <div className="h-2 w-2 rounded-full bg-violet-400 mt-1 shrink-0" />
              {i < t.updates.length - 1 && <div className="w-px flex-1 bg-zinc-100 my-0.5" />}
            </div>
            <div className="pb-2">
              <p className="text-xs text-zinc-500">{new Date(u.created_at).toLocaleDateString('en-PH')}</p>
              <p className="text-sm text-zinc-700">{u.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Apply for Room modal ────────────────────────────────────────────
function ApplyRoomModal({ room, tenantId, onClose, onApplied }: {
  room: RoomRow;
  tenantId: string;
  onClose: () => void;
  onApplied: (app: RoomApplicationRow) => void;
}) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);

  async function handleApply() {
    setLoading(true); setError('');
    try {
      const app = await insertRoomApplication(room.id, tenantId, message.trim() || undefined);
      onApplied(app);
      setSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to apply.';
      setError(msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')
        ? 'You already have an application for this room.'
        : msg);
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl overflow-hidden">
        {success ? (
          <div className="p-8 text-center">
            <div className="text-5xl mb-3">📬</div>
            <h3 className="text-xl font-bold text-zinc-900">Application Sent!</h3>
            <p className="mt-2 text-sm text-zinc-500">
              Your application for <span className="font-semibold">Room {room.room_number}</span> has been submitted.
              The property manager will review it shortly.
            </p>
            <button onClick={onClose}
              className="mt-5 w-full rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-700 transition-colors">
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Room summary */}
            <div className="bg-zinc-900 px-6 py-5 text-white">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Apply for Room</p>
              <h3 className="mt-1 text-2xl font-black">Room {room.room_number}</h3>
              <p className="mt-0.5 text-sm text-zinc-300">{room.type} · {room.floor ? `Floor ${room.floor}` : ''} · {fmt(room.monthly_rent)}/mo</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-600 mb-1 block">Message to manager <span className="text-zinc-400 font-normal">(optional)</span></label>
                <textarea rows={3} placeholder="Introduce yourself or ask a question…" value={message}
                  onChange={e => { setMessage(e.target.value); setError(''); }}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none" />
              </div>
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                  <span className="text-red-500 mt-0.5 shrink-0">⚠</span>
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={onClose}
                className="flex-1 rounded-xl border-2 border-zinc-200 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleApply} disabled={loading}
                className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-700 transition-all disabled:opacity-60">
                {loading
                  ? <span className="flex items-center justify-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Applying…</span>
                  : 'Submit Application'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────
export default function TenantPage() {
  const { profile, loading: sessionLoading } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab]             = useState<'overview' | 'pay' | 'submit' | 'track' | 'rooms'>('overview');
  const [showPayModal, setShowPayModal]       = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [applyingRoom, setApplyingRoom]       = useState<RoomRow | null>(null);

  // Real data state
  const [payments,      setPayments]      = useState<PaymentRecordRow[]>([]);
  const [tickets,       setTickets]       = useState<TicketWithUpdates[]>([]);
  const [rooms,         setRooms]         = useState<RoomRow[]>([]);
  const [myApps,        setMyApps]        = useState<(RoomApplicationRow & { rooms: RoomRow; profiles: ProfileRow })[]>([]);
  const [dataLoading,   setDataLoading]   = useState(true);

  useEffect(() => {
    const syncActiveTab = () => {
      const tab = window.location.hash.slice(1);
      if (tab === 'pay')         setActiveTab('pay');
      else if (tab === 'submit') setActiveTab('submit');
      else if (tab === 'track')  setActiveTab('track');
      else if (tab === 'rooms')  setActiveTab('rooms');
      else                       setActiveTab('overview');
    };
    syncActiveTab();
    window.addEventListener('hashchange', syncActiveTab);
    return () => window.removeEventListener('hashchange', syncActiveTab);
  }, []);

  // Redirect if unauthenticated
  useEffect(() => {
    if (!sessionLoading && !profile) router.replace('/login');
  }, [sessionLoading, profile, router]);

  // Load data once profile is ready
  useEffect(() => {
    if (!profile) return;

    async function load() {
      setDataLoading(true);
      try {
        const p = profile!;

        // ── Ensure a pending rent record exists for the current month ──
        // Tenants can't insert into payment_records (RLS), so we call
        // the server-side API route which uses the service role key.
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData.session?.access_token;
          if (token) {
            const response = await fetch('/api/rent', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({}),
            });
            if (!response.ok) {
              const result = await response.json() as { error?: string };
              throw new Error(result.error ?? 'Could not create the rent record.');
            }
          }
        } catch (err) {
          console.error('Could not ensure rent record:', err);
        }

        const [payRows, ticketRows] = await Promise.all([
          fetchPaymentRecords(p.id),
          fetchTickets(),
        ]);

        // Fetch updates for each ticket
        const withUpdates: TicketWithUpdates[] = await Promise.all(
          ticketRows.map(async t => ({
            ...t,
            updates: await fetchTicketUpdates(t.id),
          }))
        );

        setPayments(payRows);
        setTickets(withUpdates);
      } catch (err) {
        console.error('Failed to load tenant data:', err);
      } finally {
        setDataLoading(false);
      }
    }

    load();
  }, [profile]);

  if (sessionLoading || !profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50">
        <div className="text-sm text-zinc-400 animate-pulse">Loading…</div>
      </div>
    );
  }

  const userName   = profile.name;
  const userAvatar = profile.avatar ?? profile.name.slice(0, 2).toUpperCase();
  const unitLabel  = profile.unit_number ? `Unit ${profile.unit_number}` : 'Greenview Residences';

  const pendingPayment  = payments.find(p => p.status === 'pending');
  const paidCount       = payments.filter(p => p.status === 'paid').length;
  const openRequests    = tickets.filter(t => t.status !== 'resolved' && t.status !== 'closed').length;
  const resolvedCount   = tickets.filter(t => t.status === 'resolved').length;
  const currentRent     = pendingPayment?.amount ?? payments[0]?.amount ?? 0;

  async function handleSubmitRequest(title: string, desc: string, priority: string) {
    const p = profile!;
    try {
      const newTicket = await insertTicket({
        title,
        description:    desc,
        unit_number:    p.unit_number ?? '',
        tenant_id:      p.id,
        tenant_name:    p.name,
        submitted_date: new Date().toISOString().split('T')[0],
        priority:       priority as Priority,
        status:         'open',
        assigned_to:    null,
        category:       'General',
      });
      await insertTicketUpdate(newTicket.id, 'Request received and pending review.', p.id);
      const updates = await fetchTicketUpdates(newTicket.id);
      setTickets(prev => [{ ...newTicket, updates }, ...prev]);
      window.location.hash = 'track';
    } catch (err) {
      console.error('Failed to submit request:', err);
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {showPayModal && pendingPayment && (
        <PayRentModal
          payment={pendingPayment}
          onClose={() => setShowPayModal(false)}
          onPaid={(row) => setPayments(prev => prev.map(p => p.id === row.id ? row : p))}
        />
      )}
      {showSubmitModal && (
        <SubmitRequestModal onClose={() => setShowSubmitModal(false)} onSubmit={handleSubmitRequest} />
      )}

      <Sidebar role="tenant" userName={userName} userAvatar={userAvatar} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar title="Tenant Portal" subtitle={`${userName} · ${unitLabel}`} />

        <main className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Current Rent"  value={currentRent ? fmt(currentRent) : '—'} sub="Per month"       icon="🏡" accent="violet" />
            <StatCard label="Payments Made" value={paidCount}    sub="On-time payments"  icon="💳" accent="emerald" />
            <StatCard label="Open Requests" value={openRequests} sub="Pending repairs"   icon="🔧" accent="amber" />
            <StatCard label="Resolved"      value={resolvedCount} sub="Issues fixed"     icon="✅" accent="blue" />
          </div>

          {/* Pending payment alert */}
          {pendingPayment && (
            <div className="flex items-center justify-between rounded-xl bg-violet-50 border border-violet-200 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💳</span>
                <div>
                  <p className="text-sm font-bold text-violet-900">{fmtMonth(pendingPayment.month)} rent is due on {pendingPayment.due_date}</p>
                  <p className="text-xs text-violet-600">Amount: {fmt(pendingPayment.amount)}</p>
                </div>
              </div>
              <button onClick={() => setShowPayModal(true)}
                className="rounded-xl bg-violet-600 text-white text-sm font-semibold px-4 py-2 hover:bg-violet-700 transition-colors whitespace-nowrap">
                Pay Now
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 rounded-xl bg-zinc-100 p-1 w-fit flex-wrap">
            {(['overview', 'pay', 'submit', 'track'] as const).map(tab => (
              <button key={tab} onClick={() => { window.location.hash = tab === 'overview' ? '' : tab; }}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors
                  ${activeTab === tab ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                {tab === 'overview' ? '🏡 Overview' : tab === 'pay' ? '💳 Pay Rent' : tab === 'submit' ? '📝 Submit Request' : '🔍 Track Repairs'}
              </button>
            ))}
          </div>

          {dataLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-sm text-zinc-400 animate-pulse">Loading your data…</div>
            </div>
          ) : (
            <>
              {/* Overview */}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <SectionCard title="Recent Payments">
                    {payments.length === 0 ? (
                      <EmptyState icon="💳" title="No payment history yet" sub="Your rent payment records will appear here once your landlord sets them up." />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-zinc-100">
                              {['Month', 'Amount', 'Status'].map(h => (
                                <th key={h} className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {payments.slice(0, 3).map(p => (
                              <tr key={p.id} className="border-b border-zinc-50">
                                <td className="py-2.5 pr-4 text-sm text-zinc-700">{fmtMonth(p.month)}</td>
                                <td className="py-2.5 pr-4 text-sm font-semibold text-zinc-900">{fmt(p.amount)}</td>
                                <td className="py-2.5"><Badge variant={p.status} /></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </SectionCard>

                  <SectionCard title="Active Repair Requests">
                    {tickets.filter(t => t.status !== 'resolved' && t.status !== 'closed').length === 0 ? (
                      <EmptyState icon="🔧" title="No active requests" sub="You have no open maintenance requests. Submit one if you have an issue to report." />
                    ) : (
                      <div className="space-y-3">
                        {tickets.filter(t => t.status !== 'resolved' && t.status !== 'closed').slice(0, 3).map(t => (
                          <div key={t.id} className="flex items-center justify-between gap-2 py-1.5">
                            <div>
                              <p className="text-sm font-medium text-zinc-800">{t.title}</p>
                              <p className="text-xs text-zinc-400 mt-0.5">{t.submitted_date}</p>
                            </div>
                            <Badge variant={t.status} />
                          </div>
                        ))}
                      </div>
                    )}
                  </SectionCard>
                </div>
              )}

              {/* Pay Rent */}
              {activeTab === 'pay' && (
                <SectionCard title="Payment History">
                  {payments.length === 0 ? (
                    <EmptyState icon="💳" title="No payment records" sub="Your rent payment history will appear here once your landlord records them." />
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-zinc-100">
                              {['Month', 'Amount', 'Due Date', 'Paid Date', 'Method', 'Status'].map(h => (
                                <th key={h} className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>{payments.map(p => <PaymentRow key={p.id} p={p} />)}</tbody>
                        </table>
                      </div>
                      {pendingPayment && (
                        <div className="mt-4 flex justify-end">
                          <button onClick={() => setShowPayModal(true)}
                            className="rounded-xl bg-violet-600 text-white text-sm font-semibold px-5 py-2.5 hover:bg-violet-700 transition-colors">
                            💳 Pay {fmtMonth(pendingPayment.month)}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </SectionCard>
              )}

              {/* Submit Request */}
              {activeTab === 'submit' && (
                <SectionCard title="Submit a Maintenance Request">
                  <div className="flex flex-col items-center py-8 gap-4 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-3xl">📝</div>
                    <div>
                      <p className="font-semibold text-zinc-900">Report an Issue</p>
                      <p className="text-sm text-zinc-500 mt-1 max-w-sm">
                        Describe the problem in your unit and we&apos;ll get it assigned right away.
                      </p>
                    </div>
                    <button onClick={() => setShowSubmitModal(true)}
                      className="rounded-xl bg-violet-600 text-white text-sm font-semibold px-6 py-2.5 hover:bg-violet-700 transition-colors">
                      + New Maintenance Request
                    </button>
                    {tickets.length > 0 && (
                      <div className="mt-2 w-full max-w-md text-left">
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Your Recent Requests</p>
                        <div className="space-y-2">
                          {tickets.slice(0, 3).map(t => (
                            <div key={t.id} className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3">
                              <p className="text-sm text-zinc-700">{t.title}</p>
                              <Badge variant={t.status} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </SectionCard>
              )}

              {/* Track Repairs */}
              {activeTab === 'track' && (
                tickets.length === 0 ? (
                  <EmptyState icon="🔍" title="No repair requests yet" sub="Once you submit a maintenance request, you can track its progress here." />
                ) : (
                  <div className="space-y-4">
                    {tickets.map(t => <RepairCard key={t.id} t={t} />)}
                  </div>
                )
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

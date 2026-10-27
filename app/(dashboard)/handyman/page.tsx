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
  fetchTickets,
  fetchMaterialLogs,
  updateTicketStatus,
  insertMaterialLog,
  uploadTicketPhoto,
  type TicketRow,
  type MaterialLogRow,
} from '../../_lib/supabase';
import type { TicketStatus } from '../../_lib/types';

function fmt(n: number) { return '₱' + n.toLocaleString('en-PH'); }

// ── Empty state ─────────────────────────────────────────────────────
function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <span className="text-4xl">{icon}</span>
      <p className="font-semibold text-zinc-700">{title}</p>
      <p className="text-sm text-zinc-400 max-w-xs">{sub}</p>
    </div>
  );
}

// ── Task card ───────────────────────────────────────────────────────
const PRIORITY_RING: Record<string, string> = {
  urgent: 'ring-2 ring-red-400',
  high:   'ring-2 ring-orange-300',
  medium: 'ring-1 ring-amber-200',
  low:    'ring-1 ring-zinc-200',
};

function TaskCard({ t, onStart, onComplete }: {
  t: TicketRow;
  onStart: (id: string) => void;
  onComplete: (id: string) => void;
}) {
  return (
    <div className={`rounded-2xl bg-white p-5 shadow-sm flex flex-col gap-3 ${PRIORITY_RING[t.priority]}`}>
      {t.priority === 'urgent' && (
        <div className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 w-fit">
          <span className="text-sm">🚨</span>
          <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Urgent Alert</span>
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-zinc-900">{t.title}</p>
          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{t.description}</p>
        </div>
        <Badge variant={t.status} />
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-lg bg-zinc-100 px-2 py-1 font-medium text-zinc-600">📍 Unit {t.unit_number}</span>
        <span className="rounded-lg bg-zinc-100 px-2 py-1 font-medium text-zinc-600">🏷️ {t.category}</span>
        <Badge variant={t.priority} />
      </div>
      <p className="text-xs text-zinc-400">Submitted: {t.submitted_date}</p>
      <div className="flex gap-2 mt-1">
        {t.status === 'assigned' && (
          <button onClick={() => onStart(t.id)}
            className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
            Start Work
          </button>
        )}
        {t.status === 'in_progress' && (
          <button onClick={() => onComplete(t.id)}
            className="flex-1 rounded-xl bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors">
            ✓ Mark Resolved
          </button>
        )}
        {(t.status === 'resolved' || t.status === 'closed') && (
          <div className="flex-1 rounded-xl bg-zinc-100 py-2 text-center text-sm font-semibold text-zinc-400">Completed</div>
        )}
        {t.status === 'open' && (
          <div className="flex-1 rounded-xl bg-zinc-50 py-2 text-center text-sm font-semibold text-zinc-400 border border-zinc-200">Awaiting Assignment</div>
        )}
      </div>
    </div>
  );
}

// ── Material log row ────────────────────────────────────────────────
function MaterialRow({ m }: { m: MaterialLogRow }) {
  return (
    <tr className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
      <td className="py-3 pr-3 text-xs text-zinc-400 font-mono">{m.ticket_id.slice(0, 8)}…</td>
      <td className="py-3 pr-3 text-sm text-zinc-800">{m.item}</td>
      <td className="py-3 pr-3 text-sm text-zinc-600 text-center">{m.quantity}</td>
      <td className="py-3 pr-3 text-sm text-zinc-600">{fmt(m.unit_cost)}</td>
      <td className="py-3 pr-3 text-sm font-semibold text-zinc-900">{fmt(m.quantity * m.unit_cost)}</td>
      <td className="py-3 text-xs text-zinc-400">{m.date}</td>
    </tr>
  );
}

// ── Add Material modal ──────────────────────────────────────────────
function AddMaterialModal({ tickets, profileId, onClose, onSaved }: {
  tickets: TicketRow[];
  profileId: string;
  onClose: () => void;
  onSaved: (row: MaterialLogRow) => void;
}) {
  const [ticketId, setTicketId] = useState(tickets[0]?.id ?? '');
  const [item, setItem]         = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitCost, setUnitCost] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSave() {
    if (!item.trim() || !unitCost || !ticketId) { setError('All fields are required.'); return; }
    const qty  = parseFloat(quantity);
    const cost = parseFloat(unitCost);
    if (isNaN(qty) || qty <= 0)  { setError('Quantity must be a positive number.'); return; }
    if (isNaN(cost) || cost <= 0) { setError('Unit cost must be a positive number.'); return; }
    setLoading(true);
    try {
      const row = await insertMaterialLog({
        ticket_id: ticketId,
        item:      item.trim(),
        quantity:  qty,
        unit_cost: cost,
        logged_by: profileId,
        date:      new Date().toISOString().split('T')[0],
      });
      onSaved(row);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="font-bold text-zinc-900 text-lg mb-4">Log Material Used</h3>
        <div className="space-y-3">
          {/* Ticket selector */}
          <div>
            <label className="text-xs font-semibold text-zinc-600 mb-1 block">Ticket</label>
            {tickets.length === 0 ? (
              <p className="text-xs text-zinc-400">No active tickets assigned to you.</p>
            ) : (
              <select value={ticketId} onChange={e => setTicketId(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {tickets.map(t => (
                  <option key={t.id} value={t.id}>{t.title} — Unit {t.unit_number}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-600 mb-1 block">Item / Material</label>
            <input className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. Faucet washer set" value={item} onChange={e => { setItem(e.target.value); setError(''); }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-600 mb-1 block">Quantity</label>
              <input type="number" min="1" className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={quantity} onChange={e => { setQuantity(e.target.value); setError(''); }} />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-600 mb-1 block">Unit Cost (₱)</label>
              <input type="number" min="0" step="0.01" className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="0.00" value={unitCost} onChange={e => { setUnitCost(e.target.value); setError(''); }} />
            </div>
          </div>
          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 rounded-xl border border-zinc-200 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={loading || tickets.length === 0}
            className="flex-1 rounded-xl bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-60">
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Photo Upload section ────────────────────────────────────────────
function PhotoUploadSection({ tickets, profileId }: { tickets: TicketRow[]; profileId: string }) {
  const [ticketId, setTicketId] = useState(tickets[0]?.id ?? '');
  const [uploads, setUploads]   = useState<{ name: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage]   = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    setUploads(prev => [...prev, ...Array.from(files).map(f => ({ name: f.name, url: URL.createObjectURL(f) }))]);
  }

  async function handleUpload() {
    if (!ticketId || uploads.length === 0) return;
    setUploading(true);
    setMessage('');
    try {
      const fileInput = inputRef.current;
      if (!fileInput?.files) return;
      await Promise.all(Array.from(fileInput.files).map(f => uploadTicketPhoto(ticketId, f, profileId)));
      setMessage(`${uploads.length} photo${uploads.length > 1 ? 's' : ''} uploaded successfully.`);
      setUploads([]);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      {tickets.length === 0 ? (
        <EmptyState icon="📷" title="No active tickets" sub="You need an assigned ticket before you can upload photos." />
      ) : (
        <>
          <div>
            <label className="text-xs font-semibold text-zinc-600 mb-1 block">Select Ticket</label>
            <select value={ticketId} onChange={e => setTicketId(e.target.value)}
              className="w-full max-w-sm rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              {tickets.map(t => <option key={t.id} value={t.id}>{t.title} — Unit {t.unit_number}</option>)}
            </select>
          </div>
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 py-10 px-6 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
            onClick={() => inputRef.current?.click()} onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}>
            <span className="text-3xl mb-2">📷</span>
            <p className="text-sm font-medium text-zinc-700">Click or drag photos here</p>
            <p className="text-xs text-zinc-400 mt-1">JPG, PNG, HEIC — up to 10 MB each</p>
            <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => handleFiles(e.target.files)} />
          </div>
          {uploads.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {uploads.map((u, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden bg-zinc-100 aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u.url} alt={u.name} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                    <p className="text-[10px] text-white truncate">{u.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {message && (
            <p className={`text-xs font-medium ${message.includes('failed') ? 'text-red-600' : 'text-emerald-600'}`}>{message}</p>
          )}
          <button onClick={handleUpload} disabled={uploads.length === 0 || uploading}
            className="rounded-xl bg-emerald-600 text-white text-sm font-semibold px-5 py-2.5 hover:bg-emerald-700 transition-colors disabled:opacity-40">
            {uploading ? 'Uploading…' : `Upload${uploads.length > 0 ? ` (${uploads.length} photo${uploads.length > 1 ? 's' : ''})` : ''}`}
          </button>
        </>
      )}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────
export default function HandymanPage() {
  const { profile, loading: sessionLoading } = useSession();
  const router = useRouter();

  const [activeTab,      setActiveTab]      = useState<'tasks' | 'materials' | 'photos'>('tasks');
  const [tickets,        setTickets]        = useState<TicketRow[]>([]);
  const [materials,      setMaterials]      = useState<MaterialLogRow[]>([]);
  const [dataLoading,    setDataLoading]    = useState(true);
  const [showAddMaterial, setShowAddMaterial] = useState(false);

  useEffect(() => {
    const syncActiveTab = () => {
      const tab = window.location.hash.slice(1);
      setActiveTab(tab === 'materials' || tab === 'photos' ? tab : 'tasks');
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
        // Fetch tickets assigned to this handyman
        const allTickets = await fetchTickets();
        const myTickets  = allTickets.filter(
          t => t.assigned_to === profile!.id || t.status === 'open'
        );
        const logs = await fetchMaterialLogs();
        setTickets(myTickets);
        setMaterials(logs);
      } catch (err) {
        console.error('Failed to load handyman data:', err);
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

  async function handleStart(id: string) {
    try {
      await updateTicketStatus(id, 'in_progress');
      setTickets(prev => prev.map(t => t.id === id ? { ...t, status: 'in_progress' as TicketStatus } : t));
    } catch (err) { console.error(err); }
  }

  async function handleComplete(id: string) {
    try {
      await updateTicketStatus(id, 'resolved');
      setTickets(prev => prev.map(t => t.id === id ? { ...t, status: 'resolved' as TicketStatus } : t));
    } catch (err) { console.error(err); }
  }

  const assignedCount     = tickets.filter(t => t.status === 'assigned').length;
  const inProgressCount   = tickets.filter(t => t.status === 'in_progress').length;
  const resolvedCount     = tickets.filter(t => t.status === 'resolved').length;
  const urgentCount       = tickets.filter(t => t.priority === 'urgent' && t.status !== 'resolved').length;
  const totalMaterialCost = materials.reduce((s, m) => s + m.quantity * m.unit_cost, 0);

  // Only show active (non-resolved) tickets in the add material / photo selectors
  const activeTickets = tickets.filter(t => t.status !== 'resolved' && t.status !== 'closed');

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {showAddMaterial && (
        <AddMaterialModal
          tickets={activeTickets}
          profileId={profile.id}
          onClose={() => setShowAddMaterial(false)}
          onSaved={row => setMaterials(prev => [row, ...prev])}
        />
      )}

      <Sidebar role="handyman" userName={userName} userAvatar={userAvatar} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar title="Handyman Dashboard" subtitle={`${userName} · Greenview Residences`} />

        <main className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Assigned"        value={assignedCount}   sub="Waiting to start"    icon="📲" accent="violet" />
            <StatCard label="In Progress"     value={inProgressCount} sub="Currently working"   icon="🔧" accent="amber" />
            <StatCard label="Resolved"        value={resolvedCount}   sub="Completed tasks"     icon="✅" accent="emerald" />
            <StatCard label="Total Materials" value={materials.length > 0 ? fmt(totalMaterialCost) : '—'} sub="Cost logged" icon="📦" accent="blue" />
          </div>

          {urgentCount > 0 && (
            <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 px-5 py-3">
              <span className="text-xl">🚨</span>
              <div>
                <p className="text-sm font-bold text-red-800">
                  Urgent Alert: {urgentCount} critical task{urgentCount > 1 ? 's' : ''} require immediate attention!
                </p>
                <p className="text-xs text-red-600">Please address urgent tickets first.</p>
              </div>
            </div>
          )}

          {/* Tab switcher */}
          <div className="flex gap-1 rounded-xl bg-zinc-100 p-1 w-fit">
            {(['tasks', 'materials', 'photos'] as const).map(tab => (
              <button key={tab} onClick={() => { window.location.hash = tab === 'tasks' ? '' : tab; }}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors
                  ${activeTab === tab ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                {tab === 'tasks' ? '🛠️ My Tasks' : tab === 'materials' ? '📦 Materials Log' : '📷 Photo Upload'}
              </button>
            ))}
          </div>

          {dataLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-sm text-zinc-400 animate-pulse">Loading data…</div>
            </div>
          ) : (
            <>
              {/* Tasks grid */}
              {activeTab === 'tasks' && (
                tickets.length === 0 ? (
                  <EmptyState icon="🛠️" title="No tasks assigned yet"
                    sub="Tickets assigned to you by the property manager will appear here." />
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {tickets
                      .sort((a, b) => {
                        const order: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
                        return order[a.priority] - order[b.priority];
                      })
                      .map(t => <TaskCard key={t.id} t={t} onStart={handleStart} onComplete={handleComplete} />)}
                  </div>
                )
              )}

              {/* Materials log */}
              {activeTab === 'materials' && (
                <SectionCard
                  title="Materials & Parts Used"
                  action={
                    <button onClick={() => setShowAddMaterial(true)}
                      className="rounded-lg bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 hover:bg-emerald-700 transition-colors">
                      + Log Material
                    </button>
                  }
                >
                  {materials.length === 0 ? (
                    <EmptyState icon="📦" title="No materials logged yet"
                      sub="Log materials and parts you've used for repair jobs here." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-zinc-100">
                            {['Ticket', 'Item', 'Qty', 'Unit Cost', 'Total', 'Date'].map(h => (
                              <th key={h} className="pb-3 pr-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>{materials.map(m => <MaterialRow key={m.id} m={m} />)}</tbody>
                        <tfoot>
                          <tr className="border-t-2 border-zinc-200">
                            <td colSpan={4} className="pt-3 text-sm font-bold text-zinc-700">Total Materials Cost</td>
                            <td className="pt-3 text-sm font-bold text-zinc-900">{fmt(totalMaterialCost)}</td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </SectionCard>
              )}

              {/* Photo upload */}
              {activeTab === 'photos' && (
                <SectionCard title="Upload Repair Photos">
                  <PhotoUploadSection tickets={activeTickets} profileId={profile.id} />
                </SectionCard>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

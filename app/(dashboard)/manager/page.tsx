'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../_components/Sidebar';
import Topbar from '../../_components/Topbar';
import StatCard from '../../_components/StatCard';
import SectionCard from '../../_components/SectionCard';
import Badge from '../../_components/Badge';
import { useSession } from '../../_lib/useSession';
import {
  fetchTickets,
  fetchHandymen,
  fetchAnnouncements,
  updateTicketStatus,
  insertAnnouncement,
  type TicketRow,
  type AnnouncementRow,
  type ProfileRow,
} from '../../_lib/supabase';
import type { TicketStatus } from '../../_lib/types';

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

// ── Ticket row ──────────────────────────────────────────────────────
function TicketRow({ t, onAssign }: { t: TicketRow; onAssign: (id: string) => void }) {
  return (
    <tr className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
      <td className="py-3 pr-3">
        <p className="text-sm font-medium text-zinc-800">{t.title}</p>
        <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-[180px]">{t.description}</p>
      </td>
      <td className="py-3 pr-3">
        <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">
          Unit {t.unit_number}
        </span>
      </td>
      <td className="py-3 pr-3 text-sm text-zinc-600">{t.tenant_name}</td>
      <td className="py-3 pr-3"><Badge variant={t.priority} /></td>
      <td className="py-3 pr-3"><Badge variant={t.status} /></td>
      <td className="py-3 pr-3 text-xs text-zinc-400 whitespace-nowrap">{t.submitted_date}</td>
      <td className="py-3">
        {t.status === 'open' ? (
          <button onClick={() => onAssign(t.id)}
            className="rounded-lg bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 hover:bg-blue-700 transition-colors whitespace-nowrap">
            Assign
          </button>
        ) : (
          <span className="text-xs text-zinc-400">{t.assigned_to ? 'Assigned' : '—'}</span>
        )}
      </td>
    </tr>
  );
}

function AssignHandymanModal({
  ticket,
  handymen,
  onClose,
  onAssign,
}: {
  ticket: TicketRow;
  handymen: ProfileRow[];
  onClose: () => void;
  onAssign: (handyman: ProfileRow) => Promise<void>;
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function selectHandyman(handyman: ProfileRow) {
    setLoadingId(handyman.id);
    setError('');
    try {
      await onAssign(handyman);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not assign this handyman.');
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-zinc-900">Assign Handyman</h3>
          <p className="mt-1 text-sm text-zinc-500">Choose a handyman for “{ticket.title}”.</p>
        </div>

        {handymen.length === 0 ? (
          <div className="rounded-xl bg-zinc-50 px-4 py-6 text-center">
            <p className="text-sm font-semibold text-zinc-700">No handymen are available</p>
            <p className="mt-1 text-xs text-zinc-400">Create a handyman account before assigning this ticket.</p>
          </div>
        ) : (
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {handymen.map(handyman => (
              <button
                key={handyman.id}
                disabled={loadingId !== null}
                onClick={() => selectHandyman(handyman)}
                className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 px-4 py-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                  {handyman.avatar ?? handyman.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-zinc-800">{handyman.name}</span>
                  <span className="block text-xs text-emerald-600">Available handyman</span>
                </span>
                {loadingId === handyman.id && <span className="text-xs font-medium text-blue-600">Assigning…</span>}
              </button>
            ))}
          </div>
        )}

        {error && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        <button onClick={onClose} disabled={loadingId !== null}
          className="mt-5 w-full rounded-xl border border-zinc-200 py-2 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-60">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Announcement card ───────────────────────────────────────────────
const PRIORITY_BG: Record<string, string> = {
  urgent: 'border-l-4 border-red-500 bg-red-50',
  high:   'border-l-4 border-orange-400 bg-orange-50',
  medium: 'border-l-4 border-amber-400 bg-amber-50',
  low:    'border-l-4 border-zinc-300 bg-zinc-50',
};

function AnnouncementCard({ a }: { a: AnnouncementRow }) {
  const date = new Date(a.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  return (
    <div className={`rounded-xl p-4 ${PRIORITY_BG[a.priority]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-zinc-900 text-sm">{a.title}</p>
            <Badge variant={a.priority} />
          </div>
          <p className="text-xs text-zinc-600 mt-1.5 leading-relaxed">{a.content}</p>
          <p className="text-xs text-zinc-400 mt-2">Posted {date} · {a.author_name}</p>
        </div>
      </div>
    </div>
  );
}

// ── Post Announcement modal ─────────────────────────────────────────
function NewAnnouncementModal({
  onClose,
  onPost,
}: {
  onClose: () => void;
  onPost: (title: string, content: string, priority: string) => Promise<void>;
}) {
  const [form, setForm]   = useState({ title: '', content: '', priority: 'medium' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handlePost() {
    if (!form.title.trim() || !form.content.trim()) { setError('Title and content are required.'); return; }
    setLoading(true);
    try {
      await onPost(form.title.trim(), form.content.trim(), form.priority);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to post announcement.');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="font-bold text-zinc-900 text-lg mb-4">Post Announcement</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-zinc-600 mb-1 block">Title</label>
            <input className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Announcement title" value={form.title}
              onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setError(''); }} />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-600 mb-1 block">Content</label>
            <textarea rows={4} className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Announcement details..." value={form.content}
              onChange={e => { setForm(f => ({ ...f, content: e.target.value })); setError(''); }} />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-600 mb-1 block">Priority</label>
            <select className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 rounded-xl border border-zinc-200 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors">
            Cancel
          </button>
          <button onClick={handlePost} disabled={loading}
            className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60">
            {loading ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────
export default function ManagerPage() {
  const { profile, loading: sessionLoading } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab]   = useState<'complaints' | 'announcements'>('complaints');
  const [showModal, setShowModal]   = useState(false);
  const [ticketToAssign, setTicketToAssign] = useState<TicketRow | null>(null);

  const [tickets,       setTickets]       = useState<TicketRow[]>([]);
  const [handymen,      setHandymen]      = useState<ProfileRow[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [dataLoading,   setDataLoading]   = useState(true);

  useEffect(() => {
    const syncActiveTab = () => {
      setActiveTab(window.location.hash === '#announcements' ? 'announcements' : 'complaints');
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
        const [t, h, a] = await Promise.all([fetchTickets(), fetchHandymen(), fetchAnnouncements()]);
        setTickets(t);
        setHandymen(h);
        setAnnouncements(a);
      } catch (err) {
        console.error('Failed to load manager data:', err);
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

  async function handleAssign(handyman: ProfileRow) {
    if (!ticketToAssign) return;
    try {
      await updateTicketStatus(ticketToAssign.id, 'assigned', handyman.id);
      setTickets(prev => prev.map(t => t.id === ticketToAssign.id
        ? { ...t, status: 'assigned' as TicketStatus, assigned_to: handyman.id }
        : t));
    } catch (err) {
      console.error('Failed to assign ticket:', err);
      throw err;
    }
  }

  async function handlePostAnnouncement(title: string, content: string, priority: string) {
    const p = profile!;
    const row = await insertAnnouncement({
      title,
      content,
      priority:    priority as AnnouncementRow['priority'],
      author_id:   p.id,
      author_name: p.name,
    });
    setAnnouncements(prev => [row, ...prev]);
  }

  const openCount       = tickets.filter(t => t.status === 'open').length;
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;
  const urgentCount     = tickets.filter(t => t.priority === 'urgent' && t.status !== 'resolved' && t.status !== 'closed').length;
  const resolvedCount   = tickets.filter(t => t.status === 'resolved').length;

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {showModal && (
        <NewAnnouncementModal
          onClose={() => setShowModal(false)}
          onPost={handlePostAnnouncement}
        />
      )}
      {ticketToAssign && (
        <AssignHandymanModal
          ticket={ticketToAssign}
          handymen={handymen}
          onClose={() => setTicketToAssign(null)}
          onAssign={handleAssign}
        />
      )}

      <Sidebar role="manager" userName={userName} userAvatar={userAvatar} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar title="Property Manager Dashboard" subtitle={`${userName} · Greenview Residences · All Units`} />

        <main className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Open Tickets"        value={openCount}       sub="Awaiting assignment"    icon="📋" accent="blue" />
            <StatCard label="In Progress"          value={inProgressCount} sub="Currently being fixed"  icon="🔧" accent="amber" />
            <StatCard label="Urgent Issues"        value={urgentCount}     sub="Needs immediate action" icon="🚨" accent="red" />
            <StatCard label="Resolved This Month"  value={resolvedCount}   sub="Completed tickets"      icon="✅" accent="emerald" />
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 rounded-xl bg-zinc-100 p-1 w-fit">
            {(['complaints', 'announcements'] as const).map(tab => (
              <button key={tab} onClick={() => { window.location.hash = tab === 'complaints' ? '' : tab; }}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors
                  ${activeTab === tab ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                {tab === 'complaints' ? '📋 Complaints & Tasks' : '📢 Announcements'}
              </button>
            ))}
          </div>

          {dataLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-sm text-zinc-400 animate-pulse">Loading data…</div>
            </div>
          ) : (
            <>
              {/* Complaints tab */}
              {activeTab === 'complaints' && (
                <SectionCard
                  title="Maintenance Tickets"
                  action={
                    <span className="text-xs text-zinc-500">
                      {tickets.length} total · {openCount} open
                    </span>
                  }
                >
                  {tickets.length === 0 ? (
                    <EmptyState icon="📋" title="No maintenance tickets yet"
                      sub="Tickets submitted by tenants will appear here for you to review and assign." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-zinc-100">
                            {['Issue', 'Unit', 'Tenant', 'Priority', 'Status', 'Submitted', 'Action'].map(h => (
                              <th key={h} className="pb-3 pr-3 text-xs font-semibold uppercase tracking-wide text-zinc-400 whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tickets.map(t => <TicketRow key={t.id} t={t} onAssign={() => setTicketToAssign(t)} />)}
                        </tbody>
                      </table>
                    </div>
                  )}
                </SectionCard>
              )}

              {/* Announcements tab */}
              {activeTab === 'announcements' && (
                <SectionCard
                  title="Building Announcement Board"
                  action={
                    <button onClick={() => setShowModal(true)}
                      className="rounded-lg bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 hover:bg-blue-700 transition-colors">
                      + Post Announcement
                    </button>
                  }
                >
                  {announcements.length === 0 ? (
                    <EmptyState icon="📢" title="No announcements yet"
                      sub="Post an announcement to notify all residents about important updates." />
                  ) : (
                    <div className="space-y-3">
                      {announcements.map(a => <AnnouncementCard key={a.id} a={a} />)}
                    </div>
                  )}
                </SectionCard>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

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
  fetchRooms,
  insertRoom,
  updateRoom,
  fetchRoomApplications,
  approveRoomApplication,
  rejectRoomApplication,
  fetchTenants,
  type TicketRow,
  type AnnouncementRow,
  type ProfileRow,
  type RoomRow,
  type RoomApplicationRow,
  type TenantSummaryRow,
} from '../../_lib/supabase';
import type { TicketStatus } from '../../_lib/types';

type Tab = 'complaints' | 'announcements' | 'rooms' | 'tenants';

function fmt(n: number) { return '₱' + n.toLocaleString('en-PH'); }

// ── Empty state ──────────────────────────────────────────────────────
function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <span className="text-4xl">{icon}</span>
      <p className="font-semibold text-zinc-700">{title}</p>
      <p className="text-sm text-zinc-400 max-w-xs">{sub}</p>
    </div>
  );
}

// ── Ticket row ───────────────────────────────────────────────────────
function TicketRow({ t, onAssign }: { t: TicketRow; onAssign: (t: TicketRow) => void }) {
  return (
    <tr className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
      <td className="py-3 pr-3">
        <p className="text-sm font-medium text-zinc-800">{t.title}</p>
        <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-[180px]">{t.description}</p>
      </td>
      <td className="py-3 pr-3"><span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">Unit {t.unit_number}</span></td>
      <td className="py-3 pr-3 text-sm text-zinc-600">{t.tenant_name}</td>
      <td className="py-3 pr-3"><Badge variant={t.priority} /></td>
      <td className="py-3 pr-3"><Badge variant={t.status} /></td>
      <td className="py-3 pr-3 text-xs text-zinc-400 whitespace-nowrap">{t.submitted_date}</td>
      <td className="py-3">
        {t.status === 'open' ? (
          <button onClick={() => onAssign(t)}
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

// ── Assign Handyman modal ────────────────────────────────────────────
function AssignHandymanModal({ ticket, handymen, onClose, onAssign }: {
  ticket: TicketRow;
  handymen: ProfileRow[];
  onClose: () => void;
  onAssign: (h: ProfileRow) => Promise<void>;
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError]         = useState('');

  async function select(h: ProfileRow) {
    setLoadingId(h.id); setError('');
    try { await onAssign(h); onClose(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to assign.'); }
    finally { setLoadingId(null); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-zinc-900 mb-1">Assign Handyman</h3>
        <p className="text-sm text-zinc-500 mb-4">Choose a handyman for "{ticket.title}".</p>
        {handymen.length === 0 ? (
          <div className="rounded-xl bg-zinc-50 px-4 py-6 text-center">
            <p className="text-sm font-semibold text-zinc-700">No handymen available</p>
            <p className="mt-1 text-xs text-zinc-400">Create a handyman account first.</p>
          </div>
        ) : (
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {handymen.map(h => (
              <button key={h.id} disabled={loadingId !== null} onClick={() => select(h)}
                className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 px-4 py-3 text-left hover:border-blue-300 hover:bg-blue-50 disabled:opacity-60 transition-colors">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                  {h.avatar ?? h.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-zinc-800 truncate">{h.name}</span>
                  <span className="block text-xs text-emerald-600">Handyman</span>
                </span>
                {loadingId === h.id && <span className="text-xs text-blue-600">Assigning…</span>}
              </button>
            ))}
          </div>
        )}
        {error && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        <button onClick={onClose} disabled={loadingId !== null}
          className="mt-5 w-full rounded-xl border border-zinc-200 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-60">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Announcement card ────────────────────────────────────────────────
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
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <p className="font-semibold text-zinc-900 text-sm">{a.title}</p>
        <Badge variant={a.priority} />
      </div>
      <p className="text-xs text-zinc-600 leading-relaxed">{a.content}</p>
      <p className="text-xs text-zinc-400 mt-2">Posted {date} · {a.author_name}</p>
    </div>
  );
}

// ── Post Announcement modal ──────────────────────────────────────────
function NewAnnouncementModal({ onClose, onPost }: {
  onClose: () => void;
  onPost: (title: string, content: string, priority: string) => Promise<void>;
}) {
  const [form, setForm]   = useState({ title: '', content: '', priority: 'medium' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handlePost() {
    if (!form.title.trim() || !form.content.trim()) { setError('Title and content are required.'); return; }
    setLoading(true);
    try { await onPost(form.title.trim(), form.content.trim(), form.priority); onClose(); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to post.'); setLoading(false); }
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
          <button onClick={onClose} className="flex-1 rounded-xl border border-zinc-200 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors">Cancel</button>
          <button onClick={handlePost} disabled={loading}
            className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60">
            {loading ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add / Edit Room modal (manager) ──────────────────────────────────
const ROOM_TYPES = ['Studio', '1BR', '2BR', '3BR', 'Suite', 'Standard'];

function RoomModal({ editRoom, profileId, onClose, onSaved }: {
  editRoom?: RoomRow;
  profileId: string;
  onClose: () => void;
  onSaved: (row: RoomRow) => void;
}) {
  const isEdit = !!editRoom;
  const [form, setForm] = useState({
    room_number:  editRoom?.room_number  ?? '',
    floor:        editRoom?.floor?.toString() ?? '',
    type:         editRoom?.type         ?? 'Standard',
    area_sqm:     editRoom?.area_sqm?.toString() ?? '',
    monthly_rent: editRoom?.monthly_rent?.toString() ?? '',
    status:       (editRoom?.status      ?? 'available') as RoomRow['status'],
    amenities:    editRoom?.amenities    ?? '',
    description:  editRoom?.description  ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const inp = 'w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  async function handleSave() {
    if (!form.room_number.trim()) { setError('Room number is required.'); return; }
    const rent = parseFloat(form.monthly_rent);
    if (isNaN(rent) || rent < 0) { setError('Enter a valid monthly rent.'); return; }
    setLoading(true);
    try {
      const payload = {
        room_number:  form.room_number.trim(),
        floor:        form.floor ? parseInt(form.floor) : null,
        type:         form.type,
        area_sqm:     form.area_sqm ? parseFloat(form.area_sqm) : null,
        monthly_rent: rent,
        status:       form.status,
        amenities:    form.amenities.trim() || null,
        description:  form.description.trim() || null,
        created_by:   profileId,
      };
      const row = isEdit ? await updateRoom(editRoom!.id, payload) : await insertRoom(payload);
      onSaved(row);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save room.');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden my-4">
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
          <h3 className="font-bold text-zinc-900 text-lg">{isEdit ? 'Edit Room' : 'Add Room'}</h3>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 transition-colors text-lg">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block uppercase tracking-wide">Room No. *</label>
              <input type="text" placeholder="e.g. 3B" value={form.room_number}
                onChange={e => { setForm(f => ({ ...f, room_number: e.target.value })); setError(''); }} className={inp} />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block uppercase tracking-wide">Floor</label>
              <input type="number" min="1" placeholder="1" value={form.floor}
                onChange={e => setForm(f => ({ ...f, floor: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block uppercase tracking-wide">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={inp}>
                {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block uppercase tracking-wide">Area (sqm)</label>
              <input type="number" min="0" step="0.01" placeholder="25.00" value={form.area_sqm}
                onChange={e => setForm(f => ({ ...f, area_sqm: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block uppercase tracking-wide">Monthly Rent *</label>
              <input type="number" min="0" placeholder="18000" value={form.monthly_rent}
                onChange={e => { setForm(f => ({ ...f, monthly_rent: e.target.value })); setError(''); }} className={inp} />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 mb-1 block uppercase tracking-wide">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as RoomRow['status'] }))} className={inp}>
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500 mb-1 block uppercase tracking-wide">Amenities</label>
            <input type="text" placeholder="e.g. AC, WiFi, Furnished" value={form.amenities}
              onChange={e => setForm(f => ({ ...f, amenities: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500 mb-1 block uppercase tracking-wide">Description</label>
            <textarea rows={2} placeholder="Brief description…" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className={inp + ' resize-none'} />
          </div>
          {error && <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5"><span className="text-red-500">⚠</span><p className="text-xs text-red-700">{error}</p></div>}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 rounded-xl border-2 border-zinc-200 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-all disabled:opacity-60">
            {loading ? <span className="flex items-center justify-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Saving…</span> : isEdit ? 'Save Changes' : 'Add Room'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Room status helpers ──────────────────────────────────────────────
const ROOM_STATUS_STYLE: Record<RoomRow['status'], string> = {
  available:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  occupied:    'bg-blue-50 text-blue-700 border-blue-200',
  maintenance: 'bg-amber-50 text-amber-700 border-amber-200',
};

// ── Main page ────────────────────────────────────────────────────────
export default function ManagerPage() {
  const { profile, loading: sessionLoading } = useSession();
  const router = useRouter();

  const [activeTab,      setActiveTab]      = useState<Tab>('complaints');
  const [showModal,      setShowModal]      = useState(false);
  const [showRoomModal,  setShowRoomModal]  = useState(false);
  const [editingRoom,    setEditingRoom]    = useState<RoomRow | undefined>();
  const [ticketToAssign, setTicketToAssign] = useState<TicketRow | null>(null);

  const [tickets,       setTickets]       = useState<TicketRow[]>([]);
  const [handymen,      setHandymen]      = useState<ProfileRow[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [rooms,         setRooms]         = useState<RoomRow[]>([]);
  const [applications,  setApplications]  = useState<(RoomApplicationRow & { rooms: RoomRow; profiles: ProfileRow })[]>([]);
  const [tenants,       setTenants]       = useState<TenantSummaryRow[]>([]);
  const [dataLoading,   setDataLoading]   = useState(true);

  // Hash → tab sync
  useEffect(() => {
    function sync() {
      const h = window.location.hash.slice(1);
      if (h === 'announcements') setActiveTab('announcements');
      else if (h === 'rooms')    setActiveTab('rooms');
      else if (h === 'tenants')  setActiveTab('tenants');
      else                       setActiveTab('complaints');
    }
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  useEffect(() => {
    if (!sessionLoading && !profile) router.replace('/login');
  }, [sessionLoading, profile, router]);

  useEffect(() => {
    if (!profile) return;
    async function load() {
      setDataLoading(true);
      try {
        const [t, h, a, rms, apps, ten] = await Promise.all([
          fetchTickets(), fetchHandymen(), fetchAnnouncements(),
          fetchRooms(), fetchRoomApplications(), fetchTenants(),
        ]);
        setTickets(t); setHandymen(h); setAnnouncements(a);
        setRooms(rms); setApplications(apps); setTenants(ten);
      } catch (err) { console.error('Failed to load manager data:', err); }
      finally { setDataLoading(false); }
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
    await updateTicketStatus(ticketToAssign.id, 'assigned', handyman.id);
    setTickets(prev => prev.map(t => t.id === ticketToAssign.id
      ? { ...t, status: 'assigned' as TicketStatus, assigned_to: handyman.id } : t));
  }

  async function handlePostAnnouncement(title: string, content: string, priority: string) {
    const row = await insertAnnouncement({
      title, content,
      priority:    priority as AnnouncementRow['priority'],
      author_id:   profile!.id,
      author_name: profile!.name,
    });
    setAnnouncements(prev => [row, ...prev]);
  }

  async function handleApprove(appId: string) {
    await approveRoomApplication(appId);
    // Refresh rooms + applications after approval
    const [rms, apps, ten] = await Promise.all([fetchRooms(), fetchRoomApplications(), fetchTenants()]);
    setRooms(rms); setApplications(apps); setTenants(ten);
  }

  async function handleReject(appId: string) {
    await rejectRoomApplication(appId);
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: 'rejected' as const } : a));
  }

  const openCount       = tickets.filter(t => t.status === 'open').length;
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;
  const urgentCount     = tickets.filter(t => t.priority === 'urgent' && t.status !== 'resolved' && t.status !== 'closed').length;
  const resolvedCount   = tickets.filter(t => t.status === 'resolved').length;
  const availableRooms  = rooms.filter(r => r.status === 'available').length;
  const pendingApps     = applications.filter(a => a.status === 'pending').length;

  const TABS: { id: Tab; label: string; icon: string; count: number | string }[] = [
    { id: 'complaints',   label: 'Tickets',       icon: '📋', count: openCount },
    { id: 'announcements',label: 'Announcements', icon: '📢', count: announcements.length },
    { id: 'rooms',        label: 'Rooms',         icon: '🚪', count: `${availableRooms} avail.` },
    { id: 'tenants',      label: 'Tenants',       icon: '👥', count: tenants.length },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {showModal && <NewAnnouncementModal onClose={() => setShowModal(false)} onPost={handlePostAnnouncement} />}
      {showRoomModal && (
        <RoomModal
          profileId={profile.id}
          editRoom={editingRoom}
          onClose={() => { setShowRoomModal(false); setEditingRoom(undefined); }}
          onSaved={row => setRooms(prev => {
            const idx = prev.findIndex(r => r.id === row.id);
            return idx >= 0 ? prev.map(r => r.id === row.id ? row : r) : [row, ...prev];
          })}
        />
      )}
      {ticketToAssign && (
        <AssignHandymanModal
          ticket={ticketToAssign} handymen={handymen}
          onClose={() => setTicketToAssign(null)} onAssign={handleAssign}
        />
      )}

      <Sidebar role="manager" userName={userName} userAvatar={userAvatar} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar title="Property Manager Dashboard" subtitle={`${userName} · Greenview Residences`} />

        <main className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Open Tickets"        value={openCount}       sub="Awaiting assignment"    icon="📋" accent="blue" />
            <StatCard label="In Progress"          value={inProgressCount} sub="Currently being fixed"  icon="🔧" accent="amber" />
            <StatCard label="Urgent Issues"        value={urgentCount}     sub="Needs immediate action" icon="🚨" accent="red" />
            <StatCard label="Resolved This Month"  value={resolvedCount}   sub="Completed tickets"      icon="✅" accent="emerald" />
          </div>

          {/* Pending room applications alert */}
          {pendingApps > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-blue-50 border border-blue-200 px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">🏠</span>
                <p className="text-sm font-semibold text-blue-900">
                  {pendingApps} pending room application{pendingApps > 1 ? 's' : ''} need your review.
                </p>
              </div>
              <button onClick={() => { window.location.hash = 'rooms'; }}
                className="rounded-lg bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 hover:bg-blue-700 transition-colors">
                Review
              </button>
            </div>
          )}

          {/* Tab bar */}
          <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-2xl p-1.5 w-fit shadow-sm flex-wrap">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => { window.location.hash = tab.id === 'complaints' ? '' : tab.id; }}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all
                  ${activeTab === tab.id ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'}`}>
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-500'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {dataLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-sm text-zinc-400 animate-pulse">Loading data…</div>
            </div>
          ) : (
            <>
              {/* ── Tickets tab ── */}
              {activeTab === 'complaints' && (
                <SectionCard title="Maintenance Tickets"
                  action={<span className="text-xs text-zinc-500">{tickets.length} total · {openCount} open</span>}>
                  {tickets.length === 0 ? (
                    <EmptyState icon="📋" title="No maintenance tickets yet"
                      sub="Tickets submitted by tenants will appear here." />
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
                          {tickets.map(t => <TicketRow key={t.id} t={t} onAssign={t => setTicketToAssign(t)} />)}
                        </tbody>
                      </table>
                    </div>
                  )}
                </SectionCard>
              )}

              {/* ── Announcements tab ── */}
              {activeTab === 'announcements' && (
                <SectionCard title="Building Announcement Board"
                  action={
                    <button onClick={() => setShowModal(true)}
                      className="rounded-lg bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 hover:bg-blue-700 transition-colors">
                      + Post Announcement
                    </button>
                  }>
                  {announcements.length === 0 ? (
                    <EmptyState icon="📢" title="No announcements yet"
                      sub="Post an announcement to notify all residents." />
                  ) : (
                    <div className="space-y-3">
                      {announcements.map(a => <AnnouncementCard key={a.id} a={a} />)}
                    </div>
                  )}
                </SectionCard>
              )}

              {/* ── Rooms tab ── */}
              {activeTab === 'rooms' && (
                <div className="space-y-6">
                  {/* Room list */}
                  <SectionCard title="Room Directory"
                    action={
                      <button onClick={() => { setEditingRoom(undefined); setShowRoomModal(true); }}
                        className="rounded-lg bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 hover:bg-blue-700 transition-colors">
                        + Add Room
                      </button>
                    }>
                    {rooms.length === 0 ? (
                      <EmptyState icon="🚪" title="No rooms yet"
                        sub="Add rooms so tenants can browse and apply." />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-zinc-100">
                              {['Room', 'Type', 'Floor', 'Area', 'Monthly Rent', 'Status', 'Actions'].map(h => (
                                <th key={h} className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-zinc-400 whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rooms.map(room => (
                              <tr key={room.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                                <td className="py-3 pr-4 font-bold text-zinc-900">{room.room_number}</td>
                                <td className="py-3 pr-4 text-sm text-zinc-600">{room.type}</td>
                                <td className="py-3 pr-4 text-sm text-zinc-500">{room.floor ?? '—'}</td>
                                <td className="py-3 pr-4 text-sm text-zinc-500">{room.area_sqm ? `${room.area_sqm} sqm` : '—'}</td>
                                <td className="py-3 pr-4 text-sm font-semibold text-zinc-900">{fmt(room.monthly_rent)}</td>
                                <td className="py-3 pr-4">
                                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${ROOM_STATUS_STYLE[room.status]}`}>
                                    {room.status}
                                  </span>
                                </td>
                                <td className="py-3">
                                  <div className="flex gap-2">
                                    <button onClick={() => { setEditingRoom(room); setShowRoomModal(true); }}
                                      className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors">
                                      Edit
                                    </button>
                                    {room.status !== 'occupied' && (
                                      <button
                                        onClick={async () => {
                                          const next = room.status === 'available' ? 'maintenance' : 'available';
                                          const updated = await updateRoom(room.id, { status: next });
                                          setRooms(prev => prev.map(r => r.id === room.id ? updated : r));
                                        }}
                                        className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors">
                                        {room.status === 'available' ? '🔧 Maintenance' : '✅ Available'}
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </SectionCard>

                  {/* Room applications */}
                  <SectionCard title="Room Applications"
                    action={<span className="text-xs text-zinc-500">{pendingApps} pending</span>}>
                    {applications.length === 0 ? (
                      <EmptyState icon="📩" title="No applications yet"
                        sub="Tenant room applications will appear here." />
                    ) : (
                      <div className="space-y-3">
                        {applications.map(app => (
                          <div key={app.id} className="flex items-center justify-between gap-4 rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-9 w-9 shrink-0 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700">
                                {(app.profiles?.avatar ?? app.profiles?.name?.slice(0, 2) ?? '??').toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-zinc-800 truncate">{app.profiles?.name ?? '—'}</p>
                                <p className="text-xs text-zinc-500">Applying for <span className="font-semibold">Room {app.rooms?.room_number}</span> · {fmt(app.rooms?.monthly_rent)}/mo</p>
                                {app.message && <p className="text-xs text-zinc-400 mt-0.5 italic">"{app.message}"</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {app.status === 'pending' ? (
                                <>
                                  <button onClick={() => handleApprove(app.id)}
                                    className="rounded-lg bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 hover:bg-emerald-700 transition-colors">
                                    Approve
                                  </button>
                                  <button onClick={() => handleReject(app.id)}
                                    className="rounded-lg border border-red-200 text-red-600 text-xs font-semibold px-3 py-1.5 hover:bg-red-50 transition-colors">
                                    Reject
                                  </button>
                                </>
                              ) : (
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${app.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                  {app.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </SectionCard>
                </div>
              )}

              {/* ── Tenants tab ── */}
              {activeTab === 'tenants' && (
                <SectionCard title="Tenant Overview"
                  action={<span className="text-xs text-zinc-500">{tenants.length} tenant{tenants.length !== 1 ? 's' : ''}</span>}>
                  {tenants.length === 0 ? (
                    <EmptyState icon="👥" title="No tenants yet"
                      sub="Tenants added by the owner will appear here with their payment status." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-zinc-100">
                            {['Tenant', 'Unit', 'This Month', 'Amount', 'Due Date', 'Status'].map(h => (
                              <th key={h} className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-zinc-400 whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tenants
                            .sort((a, b) => {
                              const o: Record<string, number> = { overdue: 0, pending: 1, paid: 2 };
                              return (o[a.payment_status ?? 'paid'] ?? 3) - (o[b.payment_status ?? 'paid'] ?? 3);
                            })
                            .map(t => (
                              <tr key={t.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                                <td className="py-3 pr-4">
                                  <div className="flex items-center gap-2.5">
                                    <div className="h-8 w-8 shrink-0 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700">
                                      {(t.avatar ?? t.name.slice(0, 2)).toUpperCase()}
                                    </div>
                                    <span className="text-sm font-medium text-zinc-800">{t.name}</span>
                                  </div>
                                </td>
                                <td className="py-3 pr-4">
                                  {t.unit_number
                                    ? <span className="rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-bold text-zinc-600">Unit {t.unit_number}</span>
                                    : <span className="text-xs text-zinc-400">No unit</span>}
                                </td>
                                <td className="py-3 pr-4 text-xs text-zinc-400">
                                  {new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
                                </td>
                                <td className="py-3 pr-4 text-sm font-semibold text-zinc-900">
                                  {t.payment_amount ? fmt(t.payment_amount) : '—'}
                                </td>
                                <td className="py-3 pr-4 text-xs text-zinc-400 whitespace-nowrap">
                                  {t.payment_due ?? '—'}
                                </td>
                                <td className="py-3">
                                  {t.payment_status
                                    ? <Badge variant={t.payment_status} />
                                    : <span className="text-xs text-zinc-400">No record</span>}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
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

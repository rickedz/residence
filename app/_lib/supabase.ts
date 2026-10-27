import { createClient } from '@supabase/supabase-js';
import type {
  Role,
  Expense,
  RentRecord,
  Contractor,
  MaintenanceTicket,
  Announcement,
  PaymentRecord,
} from './types';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ── Database row types (snake_case from Supabase) ─────────────────

export interface ProfileRow {
  id:          string;
  name:        string;
  role:        Role;
  unit_number: string | null;
  avatar:      string | null;
  created_at:  string;
  updated_at:  string;
}

/** Returns the handymen a manager can assign to maintenance tickets. */
export async function fetchHandymen() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'handyman')
    .order('name');
  if (error) throw error;
  return data as ProfileRow[];
}

export interface ExpenseRow {
  id:          string;
  category:    string;
  description: string;
  amount:      number;
  date:        string;
  status:      Expense['status'];
  created_by:  string | null;
  created_at:  string;
  updated_at:  string;
}

export interface RentRecordRow {
  id:          string;
  tenant_id:   string | null;
  tenant_name: string;
  unit_number: string;
  amount:      number;
  due_date:    string;
  paid_date:   string | null;
  status:      RentRecord['status'];
  created_at:  string;
  updated_at:  string;
}

export interface ContractorRow {
  id:          string;
  name:        string;
  specialty:   string;
  phone:       string;
  email:       string;
  rating:      number;
  last_hired:  string | null;
  status:      Contractor['status'];
  created_at:  string;
  updated_at:  string;
}

export interface TicketRow {
  id:             string;
  title:          string;
  description:    string;
  unit_number:    string;
  tenant_id:      string | null;
  tenant_name:    string;
  submitted_date: string;
  priority:       MaintenanceTicket['priority'];
  status:         MaintenanceTicket['status'];
  assigned_to:    string | null;
  category:       string;
  created_at:     string;
  updated_at:     string;
}

export interface TicketUpdateRow {
  id:         string;
  ticket_id:  string;
  message:    string;
  author_id:  string | null;
  created_at: string;
}

export interface TicketPhotoRow {
  id:          string;
  ticket_id:   string;
  storage_url: string;
  uploaded_by: string | null;
  created_at:  string;
}

export interface AnnouncementRow {
  id:          string;
  title:       string;
  content:     string;
  priority:    Announcement['priority'];
  author_id:   string | null;
  author_name: string;
  created_at:  string;
  updated_at:  string;
}

export interface MaterialLogRow {
  id:         string;
  ticket_id:  string;
  item:       string;
  quantity:   number;
  unit_cost:  number;
  logged_by:  string | null;
  date:       string;
  created_at: string;
}

export interface PaymentRecordRow {
  id:         string;
  tenant_id:  string;
  month:      string;
  amount:     number;
  due_date:   string;
  paid_date:  string | null;
  method:     PaymentRecord['method'] | null;
  status:     PaymentRecord['status'];
  created_at: string;
  updated_at: string;
}

// ── Auth helpers ──────────────────────────────────────────────────

/** Sign up and automatically create a profile row.
 *  Returns { user, requiresConfirmation: true } when Supabase email
 *  confirmation is enabled — the profile is inserted after the user
 *  confirms and gets a real session. */
export async function signUp(
  email: string,
  password: string,
  name: string,
  role: Role,
  unitNumber?: string,
): Promise<{ user: import('@supabase/supabase-js').User; requiresConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  const user = data.user;
  if (!user) throw new Error('Sign-up succeeded but no user returned.');

  // If there is no active session the user must confirm their email first.
  // We store the pending profile data in localStorage so ensureProfile()
  // can create the row on their first sign-in.
  if (!data.session) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        `pending_profile_${user.id}`,
        JSON.stringify({ name, role, unitNumber: unitNumber ?? null }),
      );
    }
    return { user, requiresConfirmation: true };
  }

  // Email confirmation is disabled — create the profile immediately.
  await _insertProfile(user.id, name, role, unitNumber);
  return { user, requiresConfirmation: false };
}

/** Call this after every sign-in to create the profile row if it is missing
 *  (covers the "email confirmation enabled" path). */
export async function ensureProfile(userId: string): Promise<void> {
  const key = `pending_profile_${userId}`;
  const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
  if (!raw) return;

  const { name, role, unitNumber } = JSON.parse(raw) as {
    name: string;
    role: Role;
    unitNumber: string | null;
  };

  const { error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  // Only insert if the profile doesn't exist yet
  if (!error) {
    await _insertProfile(userId, name, role, unitNumber ?? undefined);
  }

  localStorage.removeItem(key);
}

function _insertProfile(
  userId: string,
  name: string,
  role: Role,
  unitNumber?: string | null,
) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return supabase.from('profiles').insert({
    id:          userId,
    name,
    role,
    unit_number: unitNumber ?? null,
    avatar:      initials,
  });
}

/** Sign in and return the user's profile */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  // Create the profile row if it was deferred during sign-up (email confirmation path).
  await ensureProfile(data.user.id);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileError) throw profileError;

  // Set a lightweight session cookie so the proxy can gate dashboard routes
  // without needing @supabase/ssr.  The cookie carries only the access token
  // expiry — no sensitive data — and is readable server-side.
  if (typeof document !== 'undefined' && data.session) {
    const maxAge = data.session.expires_in ?? 3600;
    document.cookie = `rh_session=1; path=/; max-age=${maxAge}; SameSite=Lax`;
  }

  return { user: data.user, profile: profile as ProfileRow };
}

/** Step 1 of OTP login: validate password, then send a 6-digit OTP to the email.
 *  Throws if credentials are wrong so we never send an OTP for a bad password. */
export async function signInAndSendOtp(email: string, password: string): Promise<void> {
  // Validate credentials first — this will throw on bad email/password.
  const { error: pwError } = await supabase.auth.signInWithPassword({ email, password });
  if (pwError) throw pwError;

  // Immediately sign out the temporary session — the real session is established
  // after OTP verification.
  await supabase.auth.signOut();

  // Send the OTP to the email address.
  const { error: otpError } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  if (otpError) throw otpError;
}

/** Step 2 of OTP login: verify the 6-digit token, then fetch and return the profile. */
export async function verifyOtpAndGetProfile(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;

  const user = data.user;
  if (!user) throw new Error('Verification succeeded but no user returned.');

  await ensureProfile(user.id);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) throw profileError;

  // Set session cookie for the proxy guard.
  if (typeof document !== 'undefined' && data.session) {
    const maxAge = data.session.expires_in ?? 3600;
    document.cookie = `rh_session=1; path=/; max-age=${maxAge}; SameSite=Lax`;
  }

  return { user, profile: profile as ProfileRow };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;

  // Clear the session cookie so the proxy redirects immediately.
  if (typeof document !== 'undefined') {
    document.cookie = 'rh_session=; path=/; max-age=0; SameSite=Lax';
  }
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// ── Data helpers ──────────────────────────────────────────────────

// Expenses
export async function fetchExpenses() {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return data as ExpenseRow[];
}

export async function insertExpense(row: Omit<ExpenseRow, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase.from('expenses').insert(row).select().single();
  if (error) throw error;
  return data as ExpenseRow;
}

// Rent records
export async function fetchRentRecords() {
  const { data, error } = await supabase
    .from('rent_records')
    .select('*')
    .order('due_date', { ascending: false });
  if (error) throw error;
  return data as RentRecordRow[];
}

// Contractors
export async function fetchContractors() {
  const { data, error } = await supabase
    .from('contractors')
    .select('*')
    .order('name');
  if (error) throw error;
  return data as ContractorRow[];
}

export async function insertContractor(row: Omit<ContractorRow, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase.from('contractors').insert(row).select().single();
  if (error) throw error;
  return data as ContractorRow;
}

export async function updateContractorHired(id: string) {
  const today = new Date().toISOString().split('T')[0];
  const { error } = await supabase.from('contractors').update({ last_hired: today }).eq('id', id);
  if (error) throw error;
}

// Maintenance tickets
export async function fetchTickets() {
  const { data, error } = await supabase
    .from('maintenance_tickets')
    .select('*')
    .order('submitted_date', { ascending: false });
  if (error) throw error;
  return data as TicketRow[];
}

export async function updateTicketStatus(
  id: string,
  status: MaintenanceTicket['status'],
  assignedTo?: string,
) {
  const patch: Partial<TicketRow> = { status };
  if (assignedTo) patch.assigned_to = assignedTo;
  const { error } = await supabase.from('maintenance_tickets').update(patch).eq('id', id);
  if (error) throw error;
}

export async function insertTicket(row: Omit<TicketRow, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase.from('maintenance_tickets').insert(row).select().single();
  if (error) throw error;
  return data as TicketRow;
}

// Ticket updates (timeline)
export async function fetchTicketUpdates(ticketId: string) {
  const { data, error } = await supabase
    .from('ticket_updates')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at');
  if (error) throw error;
  return data as TicketUpdateRow[];
}

export async function insertTicketUpdate(ticketId: string, message: string, authorId?: string) {
  const { error } = await supabase.from('ticket_updates').insert({
    ticket_id: ticketId,
    message,
    author_id: authorId ?? null,
  });
  if (error) throw error;
}

// Ticket photos
export async function uploadTicketPhoto(ticketId: string, file: File, uploadedBy?: string) {
  const path = `tickets/${ticketId}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from('ticket-photos')
    .upload(path, file, { upsert: false });
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from('ticket-photos').getPublicUrl(path);

  const { error: rowError } = await supabase.from('ticket_photos').insert({
    ticket_id:   ticketId,
    storage_url: urlData.publicUrl,
    uploaded_by: uploadedBy ?? null,
  });
  if (rowError) throw rowError;

  return urlData.publicUrl;
}

export async function fetchTicketPhotos(ticketId: string) {
  const { data, error } = await supabase
    .from('ticket_photos')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at');
  if (error) throw error;
  return data as TicketPhotoRow[];
}

// Announcements
export async function fetchAnnouncements() {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as AnnouncementRow[];
}

export async function insertAnnouncement(row: Omit<AnnouncementRow, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase.from('announcements').insert(row).select().single();
  if (error) throw error;
  return data as AnnouncementRow;
}

// Material logs
export async function fetchMaterialLogs(ticketId?: string) {
  let query = supabase.from('material_logs').select('*').order('date', { ascending: false });
  if (ticketId) query = query.eq('ticket_id', ticketId);
  const { data, error } = await query;
  if (error) throw error;
  return data as MaterialLogRow[];
}

export async function insertMaterialLog(row: Omit<MaterialLogRow, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('material_logs').insert(row).select().single();
  if (error) throw error;
  return data as MaterialLogRow;
}

// Payment records
export async function fetchPaymentRecords(tenantId: string) {
  const { data, error } = await supabase
    .from('payment_records')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('due_date', { ascending: false });
  if (error) throw error;
  return data as PaymentRecordRow[];
}

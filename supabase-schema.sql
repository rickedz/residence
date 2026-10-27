-- Resident property-management app schema for Supabase.
-- Run this entire file once in Supabase: SQL Editor > New query > Run.

create extension if not exists pgcrypto;

-- Keep updated_at accurate without needing to handle it in the frontend.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  role text not null check (role in ('owner', 'manager', 'handyman', 'tenant')),
  unit_number text,
  avatar text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  description text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  date date not null default current_date,
  status text not null check (status in ('paid', 'pending', 'overdue')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.rent_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.profiles(id) on delete set null,
  tenant_name text not null,
  unit_number text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  due_date date not null,
  paid_date date,
  status text not null check (status in ('paid', 'pending', 'overdue')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (paid_date is null or paid_date >= due_date - interval '1 year')
);

create table if not exists public.contractors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  specialty text not null,
  phone text not null,
  email text not null,
  rating numeric(2, 1) not null default 0 check (rating between 0 and 5),
  last_hired date,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.maintenance_tickets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  unit_number text not null,
  tenant_id uuid references public.profiles(id) on delete set null,
  tenant_name text not null,
  submitted_date date not null default current_date,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'assigned', 'in_progress', 'resolved', 'closed')),
  assigned_to uuid references public.profiles(id) on delete set null,
  category text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ticket_updates (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.maintenance_tickets(id) on delete cascade,
  message text not null check (char_length(trim(message)) > 0),
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ticket_photos (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.maintenance_tickets(id) on delete cascade,
  storage_url text not null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.material_logs (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.maintenance_tickets(id) on delete cascade,
  item text not null,
  quantity numeric(12, 2) not null check (quantity > 0),
  unit_cost numeric(12, 2) not null check (unit_cost >= 0),
  logged_by uuid references public.profiles(id) on delete set null,
  date date not null default current_date,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payment_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.profiles(id) on delete cascade,
  month date not null,
  amount numeric(12, 2) not null check (amount >= 0),
  due_date date not null,
  paid_date date,
  method text,
  status text not null check (status in ('paid', 'pending', 'overdue')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id, month)
);

create index if not exists expenses_date_idx on public.expenses (date desc);
create index if not exists rent_records_due_date_idx on public.rent_records (due_date desc);
create index if not exists maintenance_tickets_submitted_date_idx on public.maintenance_tickets (submitted_date desc);
create index if not exists maintenance_tickets_tenant_id_idx on public.maintenance_tickets (tenant_id);
create index if not exists maintenance_tickets_assigned_to_idx on public.maintenance_tickets (assigned_to);
create index if not exists ticket_updates_ticket_id_idx on public.ticket_updates (ticket_id, created_at);
create index if not exists ticket_photos_ticket_id_idx on public.ticket_photos (ticket_id, created_at);
create index if not exists material_logs_ticket_id_idx on public.material_logs (ticket_id, date desc);
create index if not exists payment_records_tenant_id_idx on public.payment_records (tenant_id, due_date desc);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at before update on public.expenses for each row execute function public.set_updated_at();
drop trigger if exists rent_records_set_updated_at on public.rent_records;
create trigger rent_records_set_updated_at before update on public.rent_records for each row execute function public.set_updated_at();
drop trigger if exists contractors_set_updated_at on public.contractors;
create trigger contractors_set_updated_at before update on public.contractors for each row execute function public.set_updated_at();
drop trigger if exists maintenance_tickets_set_updated_at on public.maintenance_tickets;
create trigger maintenance_tickets_set_updated_at before update on public.maintenance_tickets for each row execute function public.set_updated_at();
drop trigger if exists announcements_set_updated_at on public.announcements;
create trigger announcements_set_updated_at before update on public.announcements for each row execute function public.set_updated_at();
drop trigger if exists payment_records_set_updated_at on public.payment_records;
create trigger payment_records_set_updated_at before update on public.payment_records for each row execute function public.set_updated_at();

-- SECURITY DEFINER avoids recursive RLS checks while reading the current user's role.
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

alter table public.profiles enable row level security;
alter table public.expenses enable row level security;
alter table public.rent_records enable row level security;
alter table public.contractors enable row level security;
alter table public.maintenance_tickets enable row level security;
alter table public.ticket_updates enable row level security;
alter table public.ticket_photos enable row level security;
alter table public.announcements enable row level security;
alter table public.material_logs enable row level security;
alter table public.payment_records enable row level security;

-- Re-running this script safely replaces its policies.
drop policy if exists "profiles: read" on public.profiles;
drop policy if exists "profiles: insert own" on public.profiles;
drop policy if exists "profiles: update" on public.profiles;
create policy "profiles: read" on public.profiles for select to authenticated using (id = auth.uid() or public.current_user_role() in ('owner', 'manager'));
create policy "profiles: insert own" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles: update" on public.profiles for update to authenticated using (id = auth.uid() or public.current_user_role() in ('owner', 'manager')) with check (id = auth.uid() or public.current_user_role() in ('owner', 'manager'));

drop policy if exists "expenses: staff read" on public.expenses;
drop policy if exists "expenses: staff write" on public.expenses;
create policy "expenses: staff read" on public.expenses for select to authenticated using (public.current_user_role() in ('owner', 'manager'));
create policy "expenses: staff write" on public.expenses for all to authenticated using (public.current_user_role() in ('owner', 'manager')) with check (public.current_user_role() in ('owner', 'manager'));

drop policy if exists "rent: read" on public.rent_records;
drop policy if exists "rent: staff write" on public.rent_records;
create policy "rent: read" on public.rent_records for select to authenticated using (tenant_id = auth.uid() or public.current_user_role() in ('owner', 'manager'));
create policy "rent: staff write" on public.rent_records for all to authenticated using (public.current_user_role() in ('owner', 'manager')) with check (public.current_user_role() in ('owner', 'manager'));

drop policy if exists "contractors: staff access" on public.contractors;
create policy "contractors: staff access" on public.contractors for all to authenticated using (public.current_user_role() in ('owner', 'manager')) with check (public.current_user_role() in ('owner', 'manager'));

drop policy if exists "tickets: read" on public.maintenance_tickets;
drop policy if exists "tickets: create" on public.maintenance_tickets;
drop policy if exists "tickets: update" on public.maintenance_tickets;
create policy "tickets: read" on public.maintenance_tickets for select to authenticated using (tenant_id = auth.uid() or assigned_to = auth.uid() or public.current_user_role() in ('owner', 'manager'));
create policy "tickets: create" on public.maintenance_tickets for insert to authenticated with check (public.current_user_role() in ('owner', 'manager') or (public.current_user_role() = 'tenant' and tenant_id = auth.uid()));
create policy "tickets: update" on public.maintenance_tickets for update to authenticated using (assigned_to = auth.uid() or public.current_user_role() in ('owner', 'manager')) with check (assigned_to = auth.uid() or public.current_user_role() in ('owner', 'manager'));

drop policy if exists "ticket updates: read" on public.ticket_updates;
drop policy if exists "ticket updates: create" on public.ticket_updates;
create policy "ticket updates: read" on public.ticket_updates for select to authenticated using (exists (select 1 from public.maintenance_tickets t where t.id = ticket_id));
create policy "ticket updates: create" on public.ticket_updates for insert to authenticated with check (author_id is null or author_id = auth.uid());

drop policy if exists "ticket photos: read" on public.ticket_photos;
drop policy if exists "ticket photos: create" on public.ticket_photos;
create policy "ticket photos: read" on public.ticket_photos for select to authenticated using (exists (select 1 from public.maintenance_tickets t where t.id = ticket_id));
create policy "ticket photos: create" on public.ticket_photos for insert to authenticated with check (uploaded_by is null or uploaded_by = auth.uid());

drop policy if exists "announcements: authenticated read" on public.announcements;
drop policy if exists "announcements: staff write" on public.announcements;
create policy "announcements: authenticated read" on public.announcements for select to authenticated using (true);
create policy "announcements: staff write" on public.announcements for all to authenticated using (public.current_user_role() in ('owner', 'manager')) with check (public.current_user_role() in ('owner', 'manager'));

drop policy if exists "materials: staff access" on public.material_logs;
create policy "materials: staff access" on public.material_logs for all to authenticated using (public.current_user_role() in ('owner', 'manager', 'handyman')) with check (public.current_user_role() in ('owner', 'manager', 'handyman'));

drop policy if exists "payments: read" on public.payment_records;
drop policy if exists "payments: staff write" on public.payment_records;
create policy "payments: read" on public.payment_records for select to authenticated using (tenant_id = auth.uid() or public.current_user_role() in ('owner', 'manager'));
create policy "payments: staff write" on public.payment_records for all to authenticated using (public.current_user_role() in ('owner', 'manager')) with check (public.current_user_role() in ('owner', 'manager'));

-- Bucket used by uploadTicketPhoto(). It is public because the frontend stores public URLs.
insert into storage.buckets (id, name, public)
values ('ticket-photos', 'ticket-photos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "ticket photos: upload" on storage.objects;
drop policy if exists "ticket photos: update own" on storage.objects;
drop policy if exists "ticket photos: delete own" on storage.objects;
create policy "ticket photos: upload" on storage.objects for insert to authenticated with check (bucket_id = 'ticket-photos');
create policy "ticket photos: update own" on storage.objects for update to authenticated using (bucket_id = 'ticket-photos' and owner_id = auth.uid()::text);
create policy "ticket photos: delete own" on storage.objects for delete to authenticated using (bucket_id = 'ticket-photos' and owner_id = auth.uid()::text);

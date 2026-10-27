import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const allowedRoles = ['manager', 'handyman', 'tenant'] as const;
type CreatedRole = (typeof allowedRoles)[number];

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }

  const url        = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    return NextResponse.json({ error: 'User management is not configured on this server.' }, { status: 500 });
  }

  // Verify the caller is an owner
  const requesterClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await requesterClient.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Your session has expired. Please sign in again.' }, { status: 401 });
  }

  const { data: requester, error: profileError } = await requesterClient
    .from('profiles').select('role').eq('id', user.id).single();
  if (profileError || requester?.role !== 'owner') {
    return NextResponse.json({ error: 'Only a property owner can add users.' }, { status: 403 });
  }

  // Validate request body
  const body = await request.json() as {
    name?: string;
    email?: string;
    password?: string;
    role?: CreatedRole;
    unitNumber?: string;
  };

  const name       = body.name?.trim();
  const email      = body.email?.trim().toLowerCase();
  const password   = body.password;
  const unitNumber = body.unitNumber?.trim() || null;

  if (!name || !email?.includes('@') || !body.role || !allowedRoles.includes(body.role)) {
    return NextResponse.json({ error: 'Name, valid email, and role are required.' }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }
  if (body.role === 'tenant' && !unitNumber) {
    return NextResponse.json({ error: 'A unit number is required for a tenant.' }, { status: 400 });
  }

  const adminClient = createClient(url, serviceKey);

  // Create the auth user with the given password
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,           // skip email confirmation
    user_metadata: { name, role: body.role, unit_number: unitNumber },
  });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  const newUserId = created.user.id;

  // Build the avatar initials
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Insert the profile row directly
  const { error: profileInsertError } = await adminClient.from('profiles').insert({
    id:          newUserId,
    name,
    role:        body.role,
    unit_number: unitNumber,
    avatar:      initials,
  });

  if (profileInsertError) {
    // Auth user was created but profile failed — clean up to avoid orphan
    await adminClient.auth.admin.deleteUser(newUserId);
    return NextResponse.json({ error: 'Account created but profile setup failed. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ message: `Account created for ${email}.` });
}

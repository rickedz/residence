import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/rent
 * Ensures a pending rent record exists for the current month for the calling tenant.
 * The tenant's client-side Supabase client cannot INSERT into payment_records due to RLS
 * (only owner/manager can write). This route uses the service role key to bypass RLS.
 *
 * Body: { amount?: number }  — optional custom rent amount (defaults to 18000)
 * Returns: { record: PaymentRecordRow }  — the existing or newly created record
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }

  const url        = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    return NextResponse.json({ error: 'Server is not configured.' }, { status: 500 });
  }

  // Identify the caller
  const callerClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await callerClient.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Session expired. Please sign in again.' }, { status: 401 });
  }

  // Verify the caller is a tenant
  const { data: profile, error: profileError } = await callerClient
    .from('profiles').select('id, role, name, unit_number').eq('id', user.id).single();
  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
  }
  if (profile.role !== 'tenant') {
    return NextResponse.json({ error: 'Only tenants can use this endpoint.' }, { status: 403 });
  }

  // Parse optional amount from body
  let amount = 18000;
  try {
    const body = await request.json();
    if (typeof body.amount === 'number' && body.amount > 0) amount = body.amount;
  } catch { /* empty body is fine — use default */ }

  // Calculate current month dates
  const now     = new Date();
  const year    = now.getFullYear();
  const month   = now.getMonth() + 1;
  const monthStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const dueDate  = `${year}-${String(month).padStart(2, '0')}-05`;

  // Use admin client to bypass RLS
  const admin = createClient(url, serviceKey);

  // Check if a record already exists for this month
  const { data: existing, error: checkError } = await admin
    .from('payment_records')
    .select('*')
    .eq('tenant_id', user.id)
    .eq('month', monthStr)
    .maybeSingle();

  if (checkError) {
    return NextResponse.json({ error: checkError.message }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json({ record: existing, created: false });
  }

  // Create the pending rent record
  const { data: created, error: insertError } = await admin
    .from('payment_records')
    .insert({
      tenant_id: user.id,
      month:     monthStr,
      amount,
      due_date:  dueDate,
      paid_date: null,
      method:    null,
      status:    'pending',
    })
    .select()
    .single();

  // Two page loads can race here (for example, React development mode runs
  // effects twice). The unique index safely allows only one insert; return
  // the record created by the other request instead of treating that as an error.
  if (insertError) {
    if (insertError.code === '23505') {
      const { data: concurrentRecord, error: concurrentReadError } = await admin
        .from('payment_records')
        .select('*')
        .eq('tenant_id', user.id)
        .eq('month', monthStr)
        .single();

      if (!concurrentReadError && concurrentRecord) {
        return NextResponse.json({ record: concurrentRecord, created: false });
      }
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ record: created, created: true });
}

/** Records payment for a pending rent record owned by the signed-in tenant. */
export async function PATCH(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    return NextResponse.json({ error: 'Server is not configured.' }, { status: 500 });
  }

  const callerClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await callerClient.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Session expired. Please sign in again.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { paymentId?: unknown; method?: unknown } | null;
  if (typeof body?.paymentId !== 'string' || typeof body.method !== 'string') {
    return NextResponse.json({ error: 'Payment ID and method are required.' }, { status: 400 });
  }

  const admin = createClient(url, serviceKey);
  const { data: payment, error: paymentError } = await admin
    .from('payment_records')
    .select('id, tenant_id, status')
    .eq('id', body.paymentId)
    .maybeSingle();

  if (paymentError) return NextResponse.json({ error: paymentError.message }, { status: 500 });
  if (!payment || payment.tenant_id !== user.id) {
    return NextResponse.json({ error: 'Payment record not found.' }, { status: 404 });
  }
  if (payment.status === 'paid') {
    return NextResponse.json({ error: 'This payment has already been recorded.' }, { status: 409 });
  }

  const { data: updated, error: updateError } = await admin
    .from('payment_records')
    .update({
      paid_date: new Date().toISOString().split('T')[0],
      method: body.method,
      status: 'paid',
    })
    .eq('id', payment.id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ record: updated });
}

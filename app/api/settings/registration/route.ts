import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const KEY = 'registration_enabled'

// GET: read the current registration toggle. Readable by anyone authenticated
// (RLS also allows anon read directly, but this endpoint is used by the admin UI).
export async function GET() {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', KEY)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ enabled: data?.value === true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}

// POST: set the registration toggle. Superadmin only (mirrors app/api/users/*).
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as { enabled?: boolean }
    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json({ error: 'Missing boolean "enabled"' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: authError?.message || 'Not authenticated' }, { status: 401 })
    }

    const { data: callerProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('permission_level')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }
    if (!callerProfile || callerProfile.permission_level !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }
    const admin = createAdminClient(url, serviceKey)

    const { error: upsertError } = await admin
      .from('app_settings')
      .upsert(
        { key: KEY, value: body.enabled, updated_at: new Date().toISOString(), updated_by: user.id },
        { onConflict: 'key' }
      )

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, enabled: body.enabled })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}

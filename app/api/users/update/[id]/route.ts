import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase-server'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const targetUserId = params.id
    if (!targetUserId) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({})) as { displayName?: string; permissionLevel?: 'editor' | 'superadmin' | 'viewer' }
    const { displayName, permissionLevel } = body

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

    // Update profile first
    const updateProfileData: any = { updated_at: new Date().toISOString() }
    if (typeof displayName !== 'undefined') updateProfileData.display_name = displayName
    if (typeof permissionLevel !== 'undefined') updateProfileData.permission_level = permissionLevel

    if (Object.keys(updateProfileData).length > 1) {
      const { error: updErr } = await admin
        .from('user_profiles')
        .update(updateProfileData)
        .eq('user_id', targetUserId)
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    // Cascade display name to auth metadata
    if (typeof displayName !== 'undefined') {
      const { error: authUpdErr } = await admin.auth.admin.updateUserById(targetUserId, {
        user_metadata: { display_name: displayName }
      } as any)
      if (authUpdErr) return NextResponse.json({ error: authUpdErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}



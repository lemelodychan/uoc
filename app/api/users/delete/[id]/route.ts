import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase-server'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const targetUserId = params.id
    if (!targetUserId) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 })
    }

    // Verify caller is authenticated and superadmin
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

    // Service role client to delete auth user
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!serviceKey || !url) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const admin = createAdminClient(url, serviceKey)

    // 1) Delete from auth
    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(targetUserId)
    if (deleteAuthError) {
      return NextResponse.json({ error: deleteAuthError.message }, { status: 500 })
    }

    // 2) Delete profile row (best-effort if not already removed by FK/cascade)
    const { error: deleteProfileError } = await admin
      .from('user_profiles')
      .delete()
      .eq('user_id', targetUserId)

    if (deleteProfileError) {
      // Not fatal if profile already missing; return success anyway to keep UX clean
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}



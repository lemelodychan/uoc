import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * Finish a self-service signup: promote the caller from the default `viewer`
 * to `editor` and clear the one-time `needs_password` metadata flag.
 *
 * Safety:
 *  - Only ever acts when the caller's own auth metadata has needs_password === true,
 *    which is set exclusively by app/api/auth/signup/route.ts. Existing users never
 *    carry this flag, so this endpoint is a no-op for them — it can neither affect
 *    nor escalate an existing account.
 *  - Only promotes a current `viewer` to `editor` (capped at editor; never demotes
 *    or over-promotes).
 *  - Uses the service-role client so the write doesn't depend on self-update RLS.
 */
export async function POST() {
  try {
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: authError?.message || 'Not authenticated' }, { status: 401 })
    }

    const needsPassword = (user.user_metadata as any)?.needs_password === true
    if (!needsPassword) {
      // Nothing to do — not a fresh signup (or already completed).
      return NextResponse.json({ ok: true, promoted: false })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }
    const admin = createAdminClient(url, serviceKey)

    // Promote only a current viewer to editor (never demote/over-promote).
    const { data: profile } = await admin
      .from('user_profiles')
      .select('permission_level')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profile?.permission_level === 'viewer' || !profile) {
      const { error: updErr } = await admin
        .from('user_profiles')
        .update({ permission_level: 'editor', updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 })
      }
    }

    // Clear the one-time flag so the set-password guard stops redirecting.
    const { error: metaErr } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...(user.user_metadata as any), needs_password: false },
    } as any)
    if (metaErr) {
      return NextResponse.json({ error: metaErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, promoted: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}

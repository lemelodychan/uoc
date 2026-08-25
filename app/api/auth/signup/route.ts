import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Resolve the public origin the same way app/auth/callback/route.ts does, so the
// magic-link email points back at the right host in prod (behind a proxy).
function resolveOrigin(request: Request): string {
  const { origin } = new URL(request.url)
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalEnv = process.env.NODE_ENV === 'development'
  if (isLocalEnv) return origin
  if (forwardedHost) return `https://${forwardedHost}`
  return origin
}

/**
 * Self-service signup. The registration toggle is enforced HERE (server-side),
 * because the client `shouldCreateUser` flag is bypassable.
 *
 * Reuses the app's existing magic-link mechanism: signInWithOtp with
 * shouldCreateUser:true creates the auth user (if new) and emails the same link
 * the app already uses, redirecting through /auth/callback to /set-password.
 * The intended editor role is applied later, once the user finishes setting a
 * password (see app/api/auth/complete-signup/route.ts), because OTP does not
 * return the new user's id here.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { email?: string; username?: string; campaign?: string }
    const email = (body.email || '').trim().toLowerCase()
    const username = (body.username || '').trim()
    // Optional target-campaign slug from a DM's invite link (/signup?campaign=<slug>).
    // Carried on the auth user's metadata so it survives the email round-trip and
    // can point the user at the right campaign after they finish signing up.
    const rawCampaign = (body.campaign || '').trim().toLowerCase()
    const campaignSlug = /^[a-z0-9-]{1,100}$/.test(rawCampaign) ? rawCampaign : ''

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }
    if (username.length < 2 || username.length > 40) {
      return NextResponse.json({ error: 'Username must be between 2 and 40 characters.' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Enforce the toggle server-side (RLS allows anon read of app_settings).
    const { data: setting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'registration_enabled')
      .maybeSingle()

    if (setting?.value !== true) {
      return NextResponse.json({ error: 'Registration is currently closed.' }, { status: 403 })
    }

    const origin = resolveOrigin(request)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: {
          display_name: username,
          needs_password: true,
          ...(campaignSlug ? { signup_campaign: campaignSlug } : {}),
        },
        emailRedirectTo: `${origin}/auth/callback?next=/set-password`,
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}

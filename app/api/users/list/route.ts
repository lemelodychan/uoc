import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase-server'

export async function GET() {
  try {
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

    // Service role client to access auth users
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!serviceKey || !url) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const admin = createAdminClient(url, serviceKey)

    // Get all user profiles
    const { data: profiles, error: profilesError } = await admin
      .from('user_profiles')
      .select('*')
      .order('display_name', { ascending: true })

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 })
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ users: [] })
    }

    // Get auth users with last_sign_in_at
    const userIds = profiles.map(p => p.user_id)
    const { data: authUsers, error: authUsersError } = await admin.auth.admin.listUsers()

    if (authUsersError) {
      console.error('Error fetching auth users:', authUsersError)
      // Continue without auth data
    }

    // Create a map of user_id -> last_sign_in_at
    const authUserMap = new Map<string, string>()
    if (authUsers?.users) {
      authUsers.users.forEach(authUser => {
        if (authUser.last_sign_in_at) {
          authUserMap.set(authUser.id, authUser.last_sign_in_at)
        }
      })
    }

    // Sync last_sign_in_at to last_login in user_profiles and build response
    const users = []
    const updates: Array<{ userId: string; lastLogin: string }> = []

    for (const profile of profiles) {
      const lastSignInAt = authUserMap.get(profile.user_id)
      
      // If we have last_sign_in_at from auth and it's different from last_login, update it
      if (lastSignInAt && profile.last_login !== lastSignInAt) {
        updates.push({ userId: profile.user_id, lastLogin: lastSignInAt })
      }

      users.push({
        id: profile.id,
        userId: profile.user_id,
        displayName: profile.display_name,
        permissionLevel: profile.permission_level,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
        lastLogin: lastSignInAt || profile.last_login || undefined
      })
    }

    // Batch update last_login for all users that need syncing
    if (updates.length > 0) {
      for (const update of updates) {
        await admin
          .from('user_profiles')
          .update({ last_login: update.lastLogin })
          .eq('user_id', update.userId)
      }
    }

    return NextResponse.json({ users })
  } catch (e: any) {
    console.error('Error in GET /api/users/list:', e)
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}


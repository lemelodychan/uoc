"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/user-context'
import { SettingsPageClient } from '@/components/settings-page-client'
import { ROUTES } from '@/config/routes'

export default function SettingsUsersPage() {
  const { isSuperadmin, userProfile } = useUser()
  const router = useRouter()
  const isAdmin = isSuperadmin || userProfile?.permissionLevel === 'admin'

  useEffect(() => {
    if (userProfile !== undefined && !isAdmin) {
      router.replace(ROUTES.settings.campaigns)
    }
  }, [isAdmin, userProfile, router])

  if (!isAdmin) return null

  return <SettingsPageClient defaultTab="users" />
}

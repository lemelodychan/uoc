"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/user-context'
import { SettingsPageClient } from '@/components/settings-page-client'
import { ROUTES } from '@/config/routes'

export default function SettingsUsersPage() {
  const { isSuperadmin, userProfile, isLoading } = useUser()
  const router = useRouter()
  const isAdmin = isSuperadmin || userProfile?.permissionLevel === 'admin'

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.replace(ROUTES.settings.campaigns)
    }
  }, [isAdmin, isLoading, router])

  if (isLoading) return null
  if (!isAdmin) return null

  return <SettingsPageClient defaultTab="users" />
}

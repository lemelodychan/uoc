"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/user-context'
import { SettingsPageClient } from '@/components/settings-page-client'

export default function SettingsCampaignsPage() {
  const { isSuperadmin, userProfile, isLoading } = useUser()
  const router = useRouter()
  const isAdmin = isSuperadmin || userProfile?.permissionLevel === 'admin'

  // Settings is an admin area (the header nav link is admin-gated too). Editors
  // who aren't admins have no campaign-management controls, so bounce them home
  // rather than show an empty management page.
  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.replace('/')
    }
  }, [isAdmin, isLoading, router])

  if (!isLoading && !isAdmin) return null

  return <SettingsPageClient defaultTab="campaigns" />
}

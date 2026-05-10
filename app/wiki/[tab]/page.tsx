import { redirect } from 'next/navigation'
import { ROUTES } from '@/config/routes'
import { WikiPage } from '@/components/wiki-page'

const VALID_TABS = ['classes', 'spells', 'races', 'backgrounds', 'feats']

interface WikiTabPageProps {
  params: Promise<{ tab: string }>
}

export default async function WikiTabPage({ params }: WikiTabPageProps) {
  const { tab } = await params

  if (!VALID_TABS.includes(tab)) {
    redirect(ROUTES.wiki.classes)
  }

  return <WikiPage activeTab={tab} />
}

export async function generateMetadata({ params }: WikiTabPageProps) {
  const { tab } = await params
  const label = tab.charAt(0).toUpperCase() + tab.slice(1)
  return { title: `Wiki — ${label}` }
}

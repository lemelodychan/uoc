export const ROUTES = {
  home: '/',
  login: '/login',
  wiki: {
    root: '/wiki',
    classes: '/wiki/classes',
    spells: '/wiki/spells',
    races: '/wiki/races',
    backgrounds: '/wiki/backgrounds',
    feats: '/wiki/feats',
    tab: (tab: string) => `/wiki/${tab}` as const,
  },
  settings: {
    root: '/settings',
    campaigns: '/settings/campaigns',
    users: '/settings/users',
  },
  campaign: (slug: string) => `/${slug}` as const,
  character: (campaignSlug: string, charSlug: string) => `/${campaignSlug}/${charSlug}` as const,
} as const

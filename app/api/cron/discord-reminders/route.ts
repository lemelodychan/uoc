import { NextResponse } from 'next/server'
import { loadAllCampaigns, updateCampaign } from '@/lib/database'
import { formatInTimeZone } from 'date-fns-tz'

// Secure this endpoint with a secret header
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(req: Request) {
  const secret = req.headers.get('x-cron-secret')
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { campaigns, error } = await loadAllCampaigns()
  if (error) return NextResponse.json({ error }, { status: 500 })

  const nowUtc = new Date()
  const twentyFourHMs = 24 * 60 * 60 * 1000
  let sent = 0

  await Promise.all((campaigns || []).map(async (c) => {
    if (!c.discordWebhookUrl || !c.discordNotificationsEnabled || !c.nextSessionDate || !c.nextSessionNumber) return

    const sessionUtc = new Date(c.nextSessionDate)
    if (isNaN(sessionUtc.getTime())) return

    const diff = sessionUtc.getTime() - nowUtc.getTime()

    // Send only if within [24h window +/- 10m] and not already sent
    const window = 10 * 60 * 1000
    if (!c.discordReminderSent && Math.abs(diff - twentyFourHMs) <= window) {
      const eu = formatInTimeZone(sessionUtc, 'Europe/Amsterdam', 'MMMM d, yyyy HH:mm')
      const qc = formatInTimeZone(sessionUtc, 'America/Montreal', 'MMMM d, yyyy HH:mm')
      const jp = formatInTimeZone(sessionUtc, 'Asia/Tokyo', 'MMMM d, yyyy HH:mm')
      const content = `@everyone Session #${c.nextSessionNumber} of ${c.name} starts in 24 hours (Europe ${eu} / Quebec ${qc} / Tokyo ${jp})`
      try {
        await fetch(c.discordWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        })
        await updateCampaign({ ...c, updated_at: new Date().toISOString(), discordReminderSent: true })
        sent++
      } catch (e) {
        console.error('Discord webhook error', e)
      }
    }

    // After session time passes, clear fields and disable notifications
    if (nowUtc.getTime() > sessionUtc.getTime()) {
      await updateCampaign({
        ...c,
        updated_at: new Date().toISOString(),
        nextSessionDate: undefined,
        nextSessionTime: undefined,
        nextSessionTimezone: undefined,
        nextSessionNumber: undefined,
        discordNotificationsEnabled: false,
        discordReminderSent: false,
      })
    }
  }))

  return NextResponse.json({ ok: true, sent })
}



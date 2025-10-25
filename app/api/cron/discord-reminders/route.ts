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

  const { campaigns, error } = await loadAllCampaigns(true) // Use service role to bypass RLS
  if (error) return NextResponse.json({ error }, { status: 500 })

  const nowUtc = new Date()
  const twentyFourHMs = 24 * 60 * 60 * 1000
  let sent = 0

  await Promise.all((campaigns || []).map(async (c) => {
    if (!c.discordWebhookUrl || !c.discordNotificationsEnabled || !c.nextSessionDate || !c.nextSessionNumber) return

    // Parse session date and time correctly
    let sessionUtc: Date
    if (c.nextSessionDate && c.nextSessionTime && c.nextSessionTimezone) {
      // Combine date and time in the specified timezone
      const dateTimeString = `${c.nextSessionDate}T${c.nextSessionTime}`
      const localDate = new Date(dateTimeString)
      
      // Convert from the session timezone to UTC
      const { fromZonedTime } = await import('date-fns-tz')
      sessionUtc = fromZonedTime(localDate, c.nextSessionTimezone)
    } else {
      // Fallback to old method
      sessionUtc = new Date(c.nextSessionDate)
    }
    
    if (isNaN(sessionUtc.getTime())) return

    const diff = sessionUtc.getTime() - nowUtc.getTime()
    const hoursUntilSession = diff / (1000 * 60 * 60)

    // Debug logging
    console.log(`Campaign: ${c.name}`)
    console.log(`Session UTC: ${sessionUtc.toISOString()}`)
    console.log(`Now UTC: ${nowUtc.toISOString()}`)
    console.log(`Hours until session: ${hoursUntilSession.toFixed(2)}`)
    console.log(`Reminder sent: ${c.discordReminderSent}`)
    console.log(`Notifications enabled: ${c.discordNotificationsEnabled}`)

    // Send if:
    // 1. Within [24h window +/- 10m] and not already sent, OR
    // 2. Session is less than 24 hours away and reminder not sent (for immediate notifications)
    const window = 10 * 60 * 1000
    const shouldSendReminder = !c.discordReminderSent && (
      Math.abs(diff - twentyFourHMs) <= window || // Within 24h ± 10m window
      (diff < twentyFourHMs && diff > 0) // Less than 24h away but not yet passed
    )
    
    console.log(`Should send reminder: ${shouldSendReminder}`)
    
    if (shouldSendReminder) {
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



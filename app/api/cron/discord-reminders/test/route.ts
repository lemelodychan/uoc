import { NextResponse } from 'next/server'
import { loadAllCampaigns, updateCampaign } from '@/lib/database'
import { formatInTimeZone } from 'date-fns-tz'
import { createClient } from '@supabase/supabase-js'

// Test endpoint to manually trigger Discord reminders
export async function POST(req: Request) {
  const debugLogs: string[] = []
  debugLogs.push('🚀 Test endpoint called!')
  
  try {
    const body = await req.json().catch(() => ({}))
    const { campaignId } = body
    
    // Try direct database access first
    debugLogs.push(`🔍 Environment check:`)
    debugLogs.push(`- NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET'}`)
    debugLogs.push(`- SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET'}`)
    debugLogs.push(`- SUPABASE_SERVICE_KEY: ${process.env.SUPABASE_SERVICE_KEY ? 'SET' : 'NOT SET'}`)
    debugLogs.push(`- SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'}`)
    debugLogs.push(`- NEXT_PUBLIC_SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'}`)
    
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    if (!serviceRoleKey) {
      debugLogs.push(`❌ No service role key found!`)
      return NextResponse.json({ 
        error: 'Service role key not configured',
        debugLogs 
      }, { status: 500 })
    }
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    )
    
    debugLogs.push(`🔗 Testing direct database connection...`)
    
    const { data: directData, error: directError } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false })
    
    if (directError) {
      debugLogs.push(`❌ Direct database error: ${directError.message}`)
    } else {
      debugLogs.push(`✅ Direct database query returned ${directData?.length || 0} campaigns`)
    }
    
    // Now try the loadAllCampaigns function with service role
    const { campaigns, error } = await loadAllCampaigns(true) // Use service role to bypass RLS
    if (error) {
      debugLogs.push(`❌ loadAllCampaigns error: ${error}`)
      return NextResponse.json({ error }, { status: 500 })
    }
    
    const nowUtc = new Date()
    const twentyFourHMs = 24 * 60 * 60 * 1000
    let sent = 0
    let processed = 0
    
    debugLogs.push(`📋 Loaded ${campaigns?.length || 0} campaigns from database`)
    
    if (campaigns && campaigns.length > 0) {
      debugLogs.push(`📝 Campaign IDs: ${campaigns.map(c => c.id).join(', ')}`)
      
      // Debug the specific campaign data
      const targetCampaign = campaigns.find(c => c.id === campaignId)
      if (targetCampaign) {
        debugLogs.push(`🎯 Target campaign data:`)
        debugLogs.push(`   - ID: ${targetCampaign.id}`)
        debugLogs.push(`   - Name: ${targetCampaign.name}`)
        debugLogs.push(`   - nextSessionDate: ${targetCampaign.nextSessionDate}`)
        debugLogs.push(`   - nextSessionTime: ${targetCampaign.nextSessionTime}`)
        debugLogs.push(`   - nextSessionTimezone: ${targetCampaign.nextSessionTimezone}`)
        debugLogs.push(`   - nextSessionNumber: ${targetCampaign.nextSessionNumber}`)
      }
    }
    
    // If campaignId is provided, only test that specific campaign
    const campaignsToTest = campaignId 
      ? campaigns?.filter(c => c.id === campaignId) || []
      : campaigns || []
    
    debugLogs.push(`🎯 Looking for campaign ID: ${campaignId}`)
    debugLogs.push(`🔍 Found ${campaignsToTest.length} matching campaigns`)

    debugLogs.push(`Testing Discord reminders at ${nowUtc.toISOString()}`)
    debugLogs.push(`Found ${campaignsToTest.length} campaigns to test`)

    await Promise.all(campaignsToTest.map(async (c) => {
      processed++
      const campaignLog = `\n--- Processing Campaign ${processed}: ${c.name} ---`
      debugLogs.push(campaignLog)
      
      if (!c.discordWebhookUrl) {
        const log = '❌ No Discord webhook URL'
        debugLogs.push(log)
        return
      }
      
      if (!c.discordNotificationsEnabled) {
        const log = '❌ Discord notifications disabled'
        debugLogs.push(log)
        return
      }
      
      if (!c.nextSessionDate) {
        const log = '❌ No next session date'
        debugLogs.push(log)
        return
      }
      
      if (!c.nextSessionNumber) {
        const log = '❌ No next session number'
        debugLogs.push(log)
        return
      }

      // Parse session date and time correctly
      let sessionUtc: Date
      if (c.nextSessionDate && c.nextSessionTime && c.nextSessionTimezone) {
        // Combine date and time in the specified timezone
        const dateTimeString = `${c.nextSessionDate}T${c.nextSessionTime}`
        const localDate = new Date(dateTimeString)
        
        // Convert from the session timezone to UTC
        const { fromZonedTime } = await import('date-fns-tz')
        sessionUtc = fromZonedTime(localDate, c.nextSessionTimezone)
        
        debugLogs.push(`🔧 Parsed session: ${dateTimeString} in ${c.nextSessionTimezone} → ${sessionUtc.toISOString()}`)
      } else {
        // Fallback to old method
        sessionUtc = new Date(c.nextSessionDate)
      }
      
      if (isNaN(sessionUtc.getTime())) {
        const log = '❌ Invalid session date'
        debugLogs.push(log)
        return
      }

      const diff = sessionUtc.getTime() - nowUtc.getTime()
      const hoursUntilSession = diff / (1000 * 60 * 60)

      const logs = [
        `✅ Campaign has all required fields`,
        `📅 Session UTC: ${sessionUtc.toISOString()}`,
        `⏰ Now UTC: ${nowUtc.toISOString()}`,
        `⏳ Hours until session: ${hoursUntilSession.toFixed(2)}`,
        `🔔 Reminder sent: ${c.discordReminderSent}`,
        `🔧 Notifications enabled: ${c.discordNotificationsEnabled}`
      ]
      
      logs.forEach(log => {
        debugLogs.push(log)
      })
      
      // Timezone debugging
      const sessionInTokyo = formatInTimeZone(sessionUtc, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss')
      const nowInTokyo = formatInTimeZone(nowUtc, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss')
      const timezoneLogs = [
        `🌏 Session in Tokyo: ${sessionInTokyo}`,
        `🌏 Now in Tokyo: ${nowInTokyo}`
      ]
      
      timezoneLogs.forEach(log => {
        debugLogs.push(log)
      })

      // Send if:
      // 1. Within [24h window +/- 10m] and not already sent, OR
      // 2. Session is less than 24 hours away and reminder not sent (for immediate notifications)
      const window = 10 * 60 * 1000
      const within24HourWindow = Math.abs(diff - twentyFourHMs) <= window
      const lessThan24Hours = diff < twentyFourHMs && diff > 0
      // For test endpoint, allow sending even if session has passed (for testing purposes)
      const isTestMode = true // This is the test endpoint
      const shouldSendReminder = !c.discordReminderSent && (within24HourWindow || lessThan24Hours)
      
      const analysisLogs = [
        `🔍 Detailed analysis:`,
        `   - Within 24h ± 10m window: ${within24HourWindow}`,
        `   - Less than 24h away: ${lessThan24Hours}`,
        `   - Reminder not sent: ${!c.discordReminderSent}`,
        `   - Final decision: ${shouldSendReminder}`
      ]
      
      analysisLogs.forEach(log => {
        debugLogs.push(log)
      })
      
      if (!shouldSendReminder) {
        const reasonLogs = [`❌ Reasons for not sending:`]
        if (c.discordReminderSent) reasonLogs.push(`   - Reminder already sent`)
        if (!within24HourWindow && !lessThan24Hours) {
          reasonLogs.push(`   - Not within 24h window (${hoursUntilSession.toFixed(2)} hours away)`)
          if (diff <= 0) reasonLogs.push(`   - Session has already passed`)
        }
        
        reasonLogs.forEach(log => {
          debugLogs.push(log)
        })
      }
      
      if (shouldSendReminder) {
        // Debug the session UTC time first
        
        const eu = formatInTimeZone(sessionUtc, 'Europe/Amsterdam', 'MMMM d, yyyy HH:mm')
        const qc = formatInTimeZone(sessionUtc, 'America/Montreal', 'MMMM d, yyyy HH:mm')
        const jp = formatInTimeZone(sessionUtc, 'Asia/Tokyo', 'MMMM d, yyyy HH:mm')
        
        
        const content = `@everyone Session #${c.nextSessionNumber} of ${c.name} starts in 24 hours (Europe ${eu} / Quebec ${qc} / Tokyo ${jp})`
        
        
        try {
          const response = await fetch(c.discordWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
          })
          
          if (response.ok) {
            await updateCampaign({ ...c, updated_at: new Date().toISOString(), discordReminderSent: true })
            sent++
          } else {
          }
        } catch (e) {
        }
      } else {
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

    const summaryLog = `\n📊 Summary: Processed ${processed} campaigns, sent ${sent} notifications`
    debugLogs.push(summaryLog)

    return NextResponse.json({ 
      ok: true, 
      processed,
      sent,
      timestamp: nowUtc.toISOString(),
      debugLogs
    })

  } catch (error: any) {
    console.error('Error in test endpoint:', error)
    console.error('Error stack:', error?.stack)
    debugLogs.push(`❌ Error: ${error?.message}`)
    debugLogs.push(`❌ Stack: ${error?.stack}`)
    return NextResponse.json({ 
      error: 'Failed to test Discord reminders', 
      details: error?.message,
      debugLogs
    }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { formatInTimeZone } from 'date-fns-tz'

// Test endpoint to verify timezone conversions work for all timezones
export async function POST(req: Request) {
  try {
    const testTime = '22:00:00' // 10 PM
    const testDate = '2025-10-25'
    
    const results = {
      testTime,
      testDate,
      timezoneTests: [] as any[]
    }
    
    // Test each timezone as the source
    const timezones = [
      { name: 'Europe/Amsterdam', label: 'Europe' },
      { name: 'America/Montreal', label: 'Quebec' },
      { name: 'Asia/Tokyo', label: 'Tokyo' }
    ]
    
    for (const sourceTz of timezones) {
      console.log(`\n🧪 Testing ${sourceTz.label} (${sourceTz.name}) as source timezone:`)
      
      // Create the date in the source timezone
      const dateTimeString = `${testDate}T${testTime}`
      const localDate = new Date(dateTimeString)
      
      // Convert to UTC using the source timezone
      const { fromZonedTime } = await import('date-fns-tz')
      const utcDate = fromZonedTime(localDate, sourceTz.name)
      
      console.log(`   Source: ${dateTimeString} in ${sourceTz.name}`)
      console.log(`   UTC: ${utcDate.toISOString()}`)
      
      // Convert UTC back to all timezones
      const conversions = {}
      for (const targetTz of timezones) {
        const converted = formatInTimeZone(utcDate, targetTz.name, 'MMMM d, yyyy HH:mm')
        conversions[targetTz.label] = converted
        console.log(`   ${targetTz.label}: ${converted}`)
      }
      
      results.timezoneTests.push({
        sourceTimezone: sourceTz,
        sourceDateTime: dateTimeString,
        utcDateTime: utcDate.toISOString(),
        conversions
      })
    }
    
    return NextResponse.json(results)
    
  } catch (error: any) {
    console.error('Error in timezone test:', error)
    return NextResponse.json({ 
      error: 'Failed to test timezone conversions', 
      details: error?.message 
    }, { status: 500 })
  }
}

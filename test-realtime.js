// Simple test script to verify the database polling functionality
const { createClient } = require('@supabase/supabase-js')

// You'll need to set these environment variables or replace with your actual values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testLongRestEvents() {
  console.log('Testing long rest events functionality...')
  
  try {
    // Test 1: Check if the table exists and is accessible
    console.log('\n1. Testing table access...')
    const { data, error } = await supabase
      .from('long_rest_events')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Table access failed:', error.message)
      return
    }
    console.log('✅ Table access successful')
    
    // Test 2: Insert a test event
    console.log('\n2. Testing event insertion...')
    const testEvent = {
      initiated_by_character_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
      selected_character_ids: ['00000000-0000-0000-0000-000000000001'],
      event_type: 'long_rest_started',
      event_data: { test: true },
      status: 'pending'
    }
    
    const { data: insertData, error: insertError } = await supabase
      .from('long_rest_events')
      .insert(testEvent)
      .select()
      .single()
    
    if (insertError) {
      console.error('❌ Event insertion failed:', insertError.message)
      return
    }
    console.log('✅ Event insertion successful, ID:', insertData.id)
    
    // Test 3: Query for pending events
    console.log('\n3. Testing event query...')
    const { data: queryData, error: queryError } = await supabase
      .from('long_rest_events')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (queryError) {
      console.error('❌ Event query failed:', queryError.message)
      return
    }
    console.log('✅ Event query successful, found', queryData.length, 'events')
    
    // Test 4: Update event status
    console.log('\n4. Testing event update...')
    const { error: updateError } = await supabase
      .from('long_rest_events')
      .update({ 
        status: 'completed',
        processed_at: new Date().toISOString(),
        confirmed_by_character_id: '00000000-0000-0000-0000-000000000002'
      })
      .eq('id', insertData.id)
    
    if (updateError) {
      console.error('❌ Event update failed:', updateError.message)
      return
    }
    console.log('✅ Event update successful')
    
    // Test 5: Clean up test data
    console.log('\n5. Cleaning up test data...')
    const { error: deleteError } = await supabase
      .from('long_rest_events')
      .delete()
      .eq('id', insertData.id)
    
    if (deleteError) {
      console.error('❌ Cleanup failed:', deleteError.message)
      return
    }
    console.log('✅ Cleanup successful')
    
    console.log('\n🎉 All tests passed! The database polling functionality should work correctly.')
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
  }
}

testLongRestEvents()

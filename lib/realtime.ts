import { createClient } from "./supabase"
import type { CharacterData } from "./character-data"

const supabase = createClient()

export interface LongRestEvent {
  id: string
  initiated_by_character_id: string
  selected_character_ids: string[]
  event_type: string
  event_data: any
  created_at: string
  processed_at?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  confirmed_by_character_id?: string
  confirmed_at?: string
}

export interface LongRestEventData {
  effects_applied: string[]
  characters_affected: {
    id: string
    name: string
    hp_restored: number
  }[]
  modal_open: boolean
  awaiting_confirmation: boolean
}

/**
 * Subscribe to long rest events for real-time updates
 * DISABLED: Returns a no-op subscription to prevent websocket errors
 */
export const subscribeToLongRestEvents = (
  onLongRestEvent: (event: LongRestEvent) => void,
  onError?: (error: any) => void
) => {
  console.log("[Realtime] Realtime functionality is disabled to prevent production errors")
  
  // Return a mock subscription object that does nothing
  return {
    unsubscribe: () => {
      console.log("[Realtime] Mock subscription unsubscribed")
    }
  }
}

/**
 * Broadcast a long rest event to all connected clients
 * DISABLED: Returns success without actually broadcasting
 */
export const broadcastLongRestEvent = async (
  initiatedByCharacterId: string,
  selectedCharacterIds: string[],
  eventData: LongRestEventData
): Promise<{ success: boolean; error?: string; eventId?: string }> => {
  console.log("[Realtime] Broadcast functionality is disabled - returning mock success")
  return { success: true, eventId: 'mock-event-id' }
}

/**
 * Confirm a long rest event (any player can confirm)
 * DISABLED: Returns success without actually confirming
 */
export const confirmLongRestEvent = async (
  eventId: string,
  confirmedByCharacterId: string,
  finalEventData?: any
): Promise<{ success: boolean; error?: string }> => {
  console.log("[Realtime] Confirm functionality is disabled - returning mock success")
  return { success: true }
}

/**
 * Mark a long rest event as completed (legacy function, use confirmLongRestEvent instead)
 * DISABLED: Returns success without actually marking as completed
 */
export const markLongRestEventCompleted = async (
  eventId: string,
  finalEventData?: any
): Promise<{ success: boolean; error?: string }> => {
  console.log("[Realtime] Mark completed functionality is disabled - returning mock success")
  return { success: true }
}

/**
 * Get recent long rest events (for debugging or history)
 * DISABLED: Returns empty array
 */
export const getRecentLongRestEvents = async (
  limit: number = 10
): Promise<{ events: LongRestEvent[]; error?: string }> => {
  console.log("[Realtime] Get recent events functionality is disabled - returning empty array")
  return { events: [] }
}

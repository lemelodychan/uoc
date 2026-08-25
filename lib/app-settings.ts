import { createClient } from "@/lib/supabase"

/**
 * Global app settings keys stored in the `app_settings` table (see
 * scripts/108-app-settings.sql). Values are JSONB.
 */
export const APP_SETTING_KEYS = {
  registrationEnabled: "registration_enabled",
} as const

/**
 * Read whether new-user self-registration is currently enabled.
 *
 * Reads the `registration_enabled` row from `app_settings` using the browser
 * (anon) client — RLS allows public reads so this works pre-authentication on
 * the /signup and /login surfaces. Fails closed (returns false) on any error so
 * a misconfiguration never accidentally opens registration.
 */
export async function getRegistrationEnabled(): Promise<boolean> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", APP_SETTING_KEYS.registrationEnabled)
      .maybeSingle()

    if (error) return false
    // value is JSONB: `true` / `false`.
    return data?.value === true
  } catch {
    return false
  }
}

/**
 * utils/supabase/client.ts — Browser Supabase client for EXPO 365
 * ─────────────────────────────────────────────────────────────────
 * Uses @supabase/ssr createBrowserClient which manages session
 * storage in cookies (not localStorage) for SSR compatibility.
 *
 * Usage in Client Component:
 *   const supabase = createClient()
 *
 * NOTE: For a singleton pattern in Client Components, call this
 * once at the top of the component or store in a module-level ref.
 *
 * @module utils/supabase/client
 */

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "[EXPO 365] Missing Supabase env vars: " +
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required."
  );
}

export const createClient = () =>
  createBrowserClient(supabaseUrl!, supabaseKey!);

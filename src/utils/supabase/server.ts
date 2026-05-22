/**
 * utils/supabase/server.ts — SSR Supabase client for EXPO 365
 * ─────────────────────────────────────────────────────────────
 * Uses @supabase/ssr to create a per-request server client that
 * reads/writes cookies for session management in Server Components
 * and Route Handlers.
 *
 * Usage in Server Component:
 *   const cookieStore = await cookies()
 *   const supabase = createClient(cookieStore)
 *
 * @module utils/supabase/server
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "[EXPO 365] Missing Supabase env vars: " +
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required."
  );
}

export const createClient = (
  cookieStore: Awaited<ReturnType<typeof cookies>>
) => {
  return createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll called from a Server Component — safe to ignore.
          // Middleware handles session refresh for read-only components.
        }
      },
    },
  });
};

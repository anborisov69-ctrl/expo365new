/**
 * utils/supabase/middleware.ts — Middleware Supabase client for EXPO 365
 * ────────────────────────────────────────────────────────────────────────
 * Creates a Supabase client inside Next.js middleware to refresh
 * the user session on every request and propagate Set-Cookie headers
 * back to the browser.
 *
 * Must be called from middleware.ts at the project root:
 *   import { createClient } from '@/utils/supabase/middleware'
 *   export async function middleware(request: NextRequest) {
 *     return createClient(request)
 *   }
 *
 * @module utils/supabase/middleware
 */

import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "[EXPO 365] Missing Supabase env vars: " +
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required."
  );
}

export const createClient = async (request: NextRequest) => {
  // Start with an unmodified pass-through response.
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // 1. Forward cookies to the outgoing request (for downstream middleware)
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        // 2. Rebuild response so cookies are carried forward
        supabaseResponse = NextResponse.next({ request });
        // 3. Set cookies on the response so browser receives Set-Cookie headers
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // CRITICAL: must call getUser() to trigger session token refresh.
  // Without this call the session cookie is never refreshed on the client,
  // which causes authenticated users to appear as anonymous on the client side.
  // getUser() validates the token against the Supabase Auth server — always fresh.
  await supabase.auth.getUser();

  return supabaseResponse;
};


import "server-only";

import { createServerClient } from "@supabase/ssr";
import { connection } from "next/server";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  await connection();
  const cookieStore = await cookies();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Sign-in is not configured.");
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot always write cookies.
            // A session refresh mechanism will handle this.
          }
        },
      },
    }
  );
}

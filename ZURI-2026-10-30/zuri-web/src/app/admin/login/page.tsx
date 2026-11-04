
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const supabase = createBrowserSupabaseClient();

      const { error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) {
        throw new Error(authError.message);
      }

      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main id="main" className="min-h-[80vh] bg-zinc-100 px-6 py-20">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
          ZURI INTERNAL
        </p>

        <h1 className="mt-4 text-3xl font-bold text-zinc-950">
          Administrator login
        </h1>

        <p className="mt-3 text-sm text-zinc-600">
          Sign in using your authorized ZURI administrator account.
        </p>

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-zinc-800">
              Email
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-zinc-950"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-zinc-800">
              Password
            </span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-zinc-950"
            />
          </label>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-blue-700 px-6 py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in →"}
          </button>
        </form>
      </div>
    </main>
  );
}

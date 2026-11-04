import SignOut from "@/components/admin/SignOut";
import { Suspense } from "react";

import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/requireAdmin";

export const metadata = {
  title: "Admin Dashboard",
};

async function AdminContent() {
  const user = await requireAdmin();

  return (
    <main id="main" className="min-h-screen bg-[#f5f7fb] px-6 py-16 text-zinc-950">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
          ZURI INTERNAL
        </p>

        <h1 className="mt-4 text-4xl font-bold">
          Administration
        </h1>

        <p className="mt-4 text-zinc-600">
          Signed in as {user.email}
        </p>

        <div className="mt-6"><SignOut /></div><p className="mt-6"><Link className="text-blue-700 underline" href="/admin/opportunities">Opportunity sources, moderation and ingestion budgets →</Link></p><p className="mt-6"><Link className="text-blue-700 underline" href="/admin/pamoja">Claim verification, management access and Moments moderation →</Link></p>
        <p className="mt-6"><Link className="text-blue-700 underline" href="/admin/studio">Developer verification, Tool review and suspension →</Link></p>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          <Link
            href="/admin/enquiries"
            className="rounded-2xl border border-zinc-200 bg-white p-8 transition hover:border-blue-500"
          >
            <div className="mb-6 text-3xl">✉</div>
            <h2 className="text-xl font-bold">
              Customer enquiries
            </h2>
            <p className="mt-3 text-sm text-zinc-600">
              Review incoming requests and follow up with customers.
            </p>
            <p className="mt-6 font-semibold text-blue-700">
              Open enquiries →
            </p>
          </Link>

          <Link href="/admin/publishing/space" className="rounded-2xl border border-zinc-200 bg-white p-8 hover:border-blue-500">
            <div className="mb-6 text-3xl">◈</div>
            <h2 className="text-xl font-bold">
              Pamoja management
            </h2>
            <p className="mt-3 text-sm text-zinc-600">
              Curate consented public Spaces and creator profiles.
            </p>
          </Link>

          <Link href="/admin/publishing/story" className="rounded-2xl border border-zinc-200 bg-white p-8 hover:border-blue-500">
            <div className="mb-6 text-3xl">✦</div>
            <h2 className="text-xl font-bold">
              Select editorial
            </h2>
            <p className="mt-3 text-sm text-zinc-600">
              Draft, review, publish and withdraw Select stories.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function AdminPage() {
  return <Suspense fallback={<p role="status" className="p-12">Loading administration…</p>}><AdminContent /></Suspense>;
}

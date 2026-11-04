import { redirect } from "next/navigation";
import { Suspense } from "react";
import EnquiryFilters from "@/components/admin/EnquiryFilters";
import "server-only";

import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { enquiryPage } from "@/lib/enquiries/pagination";
import { createAdminClient } from "@/lib/supabase/admin";

type Enquiry = {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  wedding_date: string | null;
  location: string | null;
  guest_count: string | null;
  package_interest: string | null;
  message: string | null;
  status: string;
  created_at: string;
};

type SearchParams = Promise<{ page?: string | string[] }>;

async function EnquiriesContent({ searchParams }: { searchParams: SearchParams }) {
  // Authenticate AND authorize before reading customer data.
  await requireAdmin();

  const page = enquiryPage((await searchParams).page);
  const pageSize = 100;
  const supabase = createAdminClient();

  const { data, error, count } = await supabase
    .from("enquiries")
    .select(
      "id,name,email,phone,source,wedding_date,location,guest_count,package_interest,message,status,created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) {
    console.error("Unable to load enquiries:", error.code);
    throw new Error("Unable to load customer enquiries.");
  }

  const pageCount = Math.max(1, Math.ceil((count ?? 0) / pageSize));
  if (page > pageCount) redirect(`/admin/enquiries?page=${pageCount}`);
  const enquiries = (data ?? []) as Enquiry[];

  const total = enquiries.length;
  const newCount = enquiries.filter(
    (item) => item.status === "new"
  ).length;
  const qualifiedCount = enquiries.filter(
    (item) => item.status === "qualified"
  ).length;

  return (
    <main id="main" className="min-h-screen bg-[#f5f7fb] px-5 py-12 text-zinc-950">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/admin"
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          ← Back to administration
        </Link>

        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
            ZURI TECH / OPERATIONS
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Customer enquiries
          </h1>

          <p className="mt-3 text-zinc-600">
            Manage incoming requests for ZURI products
            and services.
          </p>
        </div>

        <section className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { label: "All enquiries", value: count ?? total },
            { label: "New on this page", value: newCount },
            { label: "Qualified on this page", value: qualifiedCount },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-zinc-200 bg-white p-6"
            >
              <p className="text-sm text-zinc-500">
                {stat.label}
              </p>
              <p className="mt-3 text-4xl font-bold">
                {stat.value}
              </p>
            </div>
          ))}
        </section>

        <p className="mt-8 text-sm text-zinc-600">Page {page} of {pageCount}. Search and status filters apply to this page.</p>
        <EnquiryFilters key={page}
  enquiries={enquiries as {
    id: string;
    name: string;
    email: string;
    phone: string;
    source: string;
    wedding_date: string | null;
    location: string | null;
    guest_count: string | null;
    package_interest: string | null;
    message: string | null;
    status: "new" | "contacted" | "qualified" | "closed";
    created_at: string;
  }[]}
/>
        <nav aria-label="Enquiry pages" className="mt-8 flex flex-wrap gap-6 text-blue-700">
          {page > 1 && <Link href={`/admin/enquiries?page=${page - 1}`}>← Previous page</Link>}
          {page * pageSize < (count ?? 0) && <Link href={`/admin/enquiries?page=${page + 1}`}>Next page →</Link>}
        </nav>
      </div>
    </main>
  );
}

export default function EnquiriesPage({ searchParams }: { searchParams: SearchParams }) {
  return <Suspense fallback={<p role="status" className="p-12">Loading administration…</p>}><EnquiriesContent searchParams={searchParams} /></Suspense>;
}

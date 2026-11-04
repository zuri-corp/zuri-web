
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

type Enquiry = {
  name: string;
  email: string;
  phone: string;
  weddingDate: string;
  location: string;
  guestCount: string;
  packageInterest: string;
  message: string;
};

const initialForm: Enquiry = {
  name: "",
  email: "",
  phone: "",
  weddingDate: "",
  location: "",
  guestCount: "",
  packageInterest: "",
  message: "",
};

export default function InvitesEnquiry({templateName,offerMessage}:{templateName?:string;offerMessage?:string}) {
  const [form, setForm] = useState<Enquiry>(()=>({...initialForm,message:offerMessage?offerMessage+'\n\n':templateName?`Preferred template: ${templateName}\n\n`:''}));
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

  function update(field: keyof Enquiry, value: string) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  if (loading) return;

  setLoading(true);
  setError("");

  try {
    const response = await fetch("/api/enquiries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Submission failed.");
    }

    setSubmitted(true);
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Something went wrong. Please try again."
    );
  } finally {
    setLoading(false);
  }
}


  if (submitted) {
    return (
      <main id="main" className="min-h-[75vh] bg-[#f5f8ff] px-6 py-24">
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-3xl text-blue-700">
            ✓
          </div>

          <h1 className="mt-6 text-3xl font-bold">
            Your enquiry has been received.
          </h1>

          <p className="mt-4 leading-relaxed text-zinc-600">
            Thank you for sharing your plans. ZURI can now review your enquiry and follow up using the contact details you provided.
          </p>
          <Link href="/tech/invites" className="mt-8 inline-block font-semibold text-blue-700">Back to ZURI Invites →</Link>
        </div>
      </main>
    );
  }

  return (
    <main id="main" className="min-h-screen bg-[#f5f8ff] px-6 py-16 text-zinc-950 md:py-24">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/tech/invites"
          className="text-sm font-semibold text-blue-700"
        >
          ← Back to Zuri Invites
        </Link>

        <div className="mt-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
            ZURI TECH / ZURI INVITES
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            Tell us about your wedding.
          </h1>

          <p className="mt-5 max-w-xl leading-relaxed text-zinc-600">
            Share a few details about your celebration so we can
            understand the wedding website you have in mind.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-10 space-y-7 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm md:p-10"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="Your name" required>
              <input
                required
                maxLength={120}
                autoComplete="name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="input-style"
                placeholder="Full name"
              />
            </Field>

            <Field label="Email address" required>
              <input
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className="input-style"
                placeholder="you@example.com"
              />
            </Field>

            <Field label="Phone / WhatsApp" required>
              <input
                type="tel"
                required
                maxLength={40}
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                className="input-style"
                placeholder="+256..."
              />
            </Field>

            <Field label="Wedding date">
              <input
                type="date"
                value={form.weddingDate}
                onChange={(e) => update("weddingDate", e.target.value)}
                className="input-style"
              />
            </Field>

            <Field label="Wedding location">
              <input
                maxLength={200}
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
                className="input-style"
                placeholder="Kampala, Uganda"
              />
            </Field>

            <Field label="Expected guests">
              <select
                value={form.guestCount}
                onChange={(e) => update("guestCount", e.target.value)}
                className="input-style"
              >
                <option value="">Select an estimate</option>
                <option value="Under 100">Under 100</option>
                <option value="100-250">100–250</option>
                <option value="250-500">250–500</option>
                <option value="Over 500">Over 500</option>
                <option value="Not sure">Not sure yet</option>
              </select>
            </Field>
          </div>

          <Field label="What would you like for your website?">
            <select
              value={form.packageInterest}
              onChange={(e) => update("packageInterest", e.target.value)}
              className="input-style"
            >
              <option value="">I&apos;m exploring options</option>
              <option value="Digital invitation">Digital invitation</option>
              <option value="Wedding website">Wedding website</option>
              <option value="Wedding website with RSVP">
                Wedding website with RSVP
              </option>
              <option value="Custom experience">Custom experience</option>
            </select>
          </Field>

          <Field label="Tell us more">
            <textarea
              rows={5}
              maxLength={4000}
                value={form.message}
              onChange={(e) => update("message", e.target.value)}
              className="input-style resize-y"
              placeholder="Your vision, theme, special requests or questions..."
            />
          </Field>

          <p className="text-sm leading-relaxed text-zinc-500">
            Your details will be sent to ZURI for reviewing and responding to this enquiry. Please avoid including sensitive personal information.
          </p>

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <button
            disabled={loading}
            type="submit"
            className="w-full rounded-full bg-blue-700 px-8 py-4 font-semibold text-white transition hover:bg-blue-600"
          >
            {loading ? "Submitting…" : "Submit enquiry →"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-zinc-800">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </span>
      {children}
    </label>
  );
}



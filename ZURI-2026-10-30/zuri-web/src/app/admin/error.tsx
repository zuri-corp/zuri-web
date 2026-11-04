"use client";
export default function AdminError({ reset }: { reset: () => void }) {
  return <main id="main" className="min-h-[60vh] bg-zinc-50 px-6 py-20 text-zinc-950"><div className="mx-auto max-w-xl"><h1 className="text-3xl font-bold">Administration is unavailable</h1><p role="alert" className="mt-4">We couldn’t load this page. Check your connection and try again. If this continues, ZURI’s administrator needs to check the service configuration.</p><button type="button" onClick={reset} className="mt-6 rounded-xl bg-blue-700 px-6 py-3 text-white">Try again</button></div></main>;
}

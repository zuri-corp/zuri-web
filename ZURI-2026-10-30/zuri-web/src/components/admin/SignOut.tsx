"use client";
import { useState, useTransition } from "react";
import { signOut } from "@/app/admin/actions";
export default function SignOut({ destination = "admin" }: { destination?: "admin" | "pamoja" }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  return <div><button type="button" disabled={pending} className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50" onClick={() => { setError(""); startTransition(async () => { const result = await signOut(destination); if (result?.error) setError(result.error); }); }}>{pending ? "Signing out…" : "Sign out"}</button>{error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}</div>;
}

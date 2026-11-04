"use server";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export async function signOut(destination: "admin" | "pamoja" = "admin") {
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) return { error: "Unable to sign out. Please try again." };
  } catch {
    return { error: "Sign-out is currently unavailable. Please try again." };
  }
  redirect(destination === "pamoja" ? "/pamoja/login" : "/admin/login");
}

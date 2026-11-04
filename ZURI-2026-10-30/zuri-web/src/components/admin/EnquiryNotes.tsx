
"use client";

import { useCallback, useEffect, useState } from "react";

type Note = {
  id: string;
  content: string;
  author_id: string;
  created_at: string;
};

function NotesPanel({
  enquiryId,
}: {
  enquiryId: string;
}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const endpoint = `/api/admin/enquiries/${encodeURIComponent(enquiryId)}/notes`;

  const loadNotes = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(endpoint, {
        cache: "no-store",
        signal,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to load notes.");
      }

      setError("");
      setNotes(result.notes);
    } catch (err) {
      if (signal?.aborted) return;

      setError(
        err instanceof Error ? err.message : "Unable to load notes."
      );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    const controller = new AbortController();

    // The effect subscribes to external fetch results; updates happen after I/O.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadNotes(controller.signal);

    return () => controller.abort();
  }, [loadNotes]);

  async function addNote() {
    if (!content.trim() || saving) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to save note.");
      }

      setContent("");
      setNotes((previous) => [result.note, ...previous]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save note."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 border-t border-zinc-200 pt-5">
      <h3 className="font-bold text-zinc-950">
        Internal notes
      </h3>

      <p className="mt-1 text-xs text-zinc-500">
        Visible only to authorized ZURI administrators.
      </p>

      <textarea
        aria-label="Internal note"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        maxLength={2000}
        rows={3}
        placeholder="Record a conversation, requirement or follow-up..."
        className="mt-4 w-full rounded-xl border border-zinc-300 p-3 text-sm text-zinc-950"
      />

      <button
        type="button"
        onClick={addNote}
        disabled={saving || !content.trim()}
        className="mt-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving ? "Saving..." : "Add note"}
      </button>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-6 space-y-3">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading notes...</p>
        ) : error && notes.length === 0 ? (
          <button type="button" className="text-sm text-blue-700 underline" onClick={() => loadNotes()}>Retry loading notes</button>
        ) : notes.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No notes recorded yet.
          </p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="rounded-xl bg-zinc-50 p-4"
            >
              <p className="whitespace-pre-wrap break-words text-sm text-zinc-800">
                {note.content}
              </p>

              <p className="mt-3 text-xs text-zinc-500">
                {new Date(note.created_at).toLocaleString(
                  "en-UG",
                  {
                    timeZone: "Africa/Kampala",
                    dateStyle: "medium",
                    timeStyle: "short",
                  }
                )}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default function EnquiryNotes({ enquiryId }: { enquiryId: string }) {
  const [open, setOpen] = useState(false);
  return <div className="mt-6">
    <button type="button" aria-expanded={open} aria-controls={`notes-${enquiryId}`} onClick={() => setOpen(!open)} className="text-sm font-semibold text-blue-700">
      {open ? "Hide internal notes ↑" : "View internal notes ↓"}
    </button>
    <div id={`notes-${enquiryId}`}>{open && <NotesPanel enquiryId={enquiryId} />}</div>
  </div>;
}

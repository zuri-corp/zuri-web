
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Status = "new" | "contacted" | "qualified" | "closed";

type Props = {
  enquiryId: string;
  initialStatus: Status;
};

const options: { value: Status; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "closed", label: "Closed" },
];

export default function EnquiryStatusSelect({
  enquiryId,
  initialStatus,
}: Props) {
  const router = useRouter();

  const [status, setStatus] = useState<Status>(initialStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function updateStatus(nextStatus: Status) {
    if (saving || nextStatus === status) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/enquiries/${encodeURIComponent(enquiryId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: nextStatus }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Update failed.");
      }

      setStatus(nextStatus);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update status."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <label
        htmlFor={`status-${enquiryId}`}
        className="text-xs font-semibold text-zinc-500"
      >
        Enquiry status
      </label>

      <select
        id={`status-${enquiryId}`}
        value={status}
        disabled={saving}
        onChange={(event) =>
          updateStatus(event.target.value as Status)
        }
        className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {saving && (
        <p className="text-xs text-blue-700">Saving...</p>
      )}

      {error && (
        <p role="alert" className="max-w-48 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

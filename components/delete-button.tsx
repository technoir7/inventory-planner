"use client";

import { useState } from "react";

export function DeleteButton({
  endpoint,
  label,
  onDeleted
}: {
  endpoint: string;
  label: string;
  onDeleted: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      if (response.ok) {
        onDeleted();
      }
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-lg bg-coral px-3 py-1 text-xs font-medium text-white hover:bg-coral/90 disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Confirm"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-ink/60 hover:text-ink"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-coral hover:text-coral/80"
      title={`Delete ${label}`}
    >
      Delete
    </button>
  );
}

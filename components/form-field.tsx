"use client";

import { ReactNode } from "react";

export function FormField({
  label,
  htmlFor,
  children,
  hint
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-ink/50">{hint}</p> : null}
    </div>
  );
}

const inputClass =
  "rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:border-pine focus:outline-none focus:ring-1 focus:ring-pine";
const selectClass = inputClass;

export { inputClass, selectClass };

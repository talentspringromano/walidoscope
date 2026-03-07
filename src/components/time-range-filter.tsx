"use client";

import type { TimeRange } from "@/lib/date-utils";

const OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "all", label: "Gesamt" },
];

export function TimeRangeFilter({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (r: TimeRange) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
            value === o.value
              ? "bg-[rgba(226,169,110,0.12)] text-[#e2a96e] border border-[rgba(226,169,110,0.25)]"
              : "text-[#78716c] border border-[rgba(255,255,255,0.06)] hover:text-[#a8a29e] hover:bg-[rgba(255,255,255,0.03)]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

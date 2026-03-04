import type { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  trend?: string;
}

export function KpiCard({ label, value, sub, icon, trend }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          {label}
        </span>
        {icon && <span className="text-zinc-600">{icon}</span>}
      </div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
      {(sub || trend) && (
        <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
          {sub && <span>{sub}</span>}
          {trend && (
            <span className="text-emerald-400">{trend}</span>
          )}
        </div>
      )}
    </div>
  );
}

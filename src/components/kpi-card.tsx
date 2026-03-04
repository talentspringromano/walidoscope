import type { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  trend?: string;
  accent?: boolean;
}

export function KpiCard({ label, value, sub, icon, trend, accent }: KpiCardProps) {
  return (
    <div className="glass-card group p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#57534e]">
          {label}
        </span>
        {icon && (
          <span className={`transition-colors duration-300 ${accent ? "text-[#e2a96e]/60 group-hover:text-[#e2a96e]" : "text-[#44403c] group-hover:text-[#57534e]"}`}>
            {icon}
          </span>
        )}
      </div>
      <div className={`mt-3 text-[28px] font-semibold tracking-tight tabular-nums ${accent ? "text-[#e2a96e]" : "text-[#fafaf9]"}`}>
        {value}
      </div>
      {(sub || trend) && (
        <div className="mt-1.5 flex items-center gap-2 text-[12px]">
          {sub && <span className="text-[#78716c]">{sub}</span>}
          {trend && (
            <span className="text-[#5eead4] glow-badge">{trend}</span>
          )}
        </div>
      )}
    </div>
  );
}

export function SectionCard({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`glass-card p-6 ${className}`}>
      {title && (
        <h2 className="mb-5 text-[13px] font-semibold tracking-wide text-[#a8a29e]">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}

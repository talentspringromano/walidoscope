"use client";

import { useState, useMemo } from "react";
import { KpiCard, SectionCard } from "@/components/kpi-card";
import { TimeRangeFilter } from "@/components/time-range-filter";
import { ActivityCalendar } from "@/components/activity-calendar";
import { TargetTracker } from "@/components/target-tracker";
import { leads } from "@/data/leads";
import { aircallSellers, aircallFetchedAt, formatDuration } from "@/data/aircall";
import { TOOLTIP_STYLE, AXIS_STYLE, PALETTE, SELLER_BAR_COLORS } from "@/components/chart-theme";
import { Phone, PhoneOutgoing, PhoneIncoming, Clock, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Legend,
} from "recharts";
import type { TimeRange } from "@/lib/date-utils";
import { filterLeadsByRange } from "@/lib/date-utils";

const sellers = ["Walid Karimi", "Nele Pfau", "Bastian Wuske", "Eric Hardt", "Michel Grosser"];

function sellerStats(name: string, leadsSubset: typeof leads) {
  const sellerLeads = leadsSubset.filter((l) => l.vertriebler === name);
  const qualified = sellerLeads.filter(
    (l) => l.leadStatus === "Vertriebsqualifiziert" || l.leadStatus === "Kennenlerngespräch gebucht" || l.leadStatus === "Beratungsgespräch gebucht"
  ).length;
  const gewonnen = sellerLeads.filter((l) => l.leadStatus === "Gewonnen").length;
  const verloren = sellerLeads.filter((l) => l.leadStatus === "Verloren").length;
  const termine = sellerLeads.filter((l) => l.terminBeimAmt).length;
  const neuerLead = sellerLeads.filter((l) => l.leadStatus === "Neuer Lead").length;
  const rueckruf = sellerLeads.filter((l) => l.leadStatus === "Rückruf").length;

  const aircall = aircallSellers.find((a) => a.name === name);

  return {
    name,
    total: sellerLeads.length,
    qualified,
    gewonnen,
    verloren,
    termine,
    neuerLead,
    rueckruf,
    conversionRate: sellerLeads.length > 0 ? ((qualified / sellerLeads.length) * 100) : 0,
    statusData: [
      { name: "Neuer Lead", count: neuerLead },
      { name: "Rückruf", count: rueckruf },
      { name: "Qualifiziert+", count: qualified },
      { name: "Gewonnen", count: gewonnen },
      { name: "Verloren", count: verloren },
    ],
    aircall,
  };
}

const RADAR_COLORS = ["#e2a96e", "#5eead4", "#818cf8", "#fb923c", "#a78bfa", "#f472b6"];

const GRADIENT_PAIRS = [
  { from: "#e2a96e", to: "#c4956a" },
  { from: "#5eead4", to: "#2dd4bf" },
  { from: "#818cf8", to: "#6366f1" },
  { from: "#fb923c", to: "#ea580c" },
  { from: "#a78bfa", to: "#7c3aed" },
  { from: "#f472b6", to: "#db2777" },
];

type BLSortKey = "total" | "qualified" | "gewonnen" | "conversionRate" | "bgConvRate" | "calls" | "avgDuration";
type BLSortDir = "asc" | "desc";

function Bestenliste({ data }: { data: ReturnType<typeof sellerStats>[] }) {
  const [sortKey, setSortKey] = useState<BLSortKey>("gewonnen");
  const [sortDir, setSortDir] = useState<BLSortDir>("desc");

  function getValue(s: ReturnType<typeof sellerStats>, key: BLSortKey): number {
    switch (key) {
      case "total": return s.total;
      case "qualified": return s.qualified;
      case "gewonnen": return s.gewonnen;
      case "conversionRate": return s.conversionRate;
      case "bgConvRate": return s.total > 0 ? (s.gewonnen / s.total) * 100 : 0;
      case "calls": return s.aircall?.totalCalls ?? 0;
      case "avgDuration": return s.aircall?.avgDurationSec ?? 0;
    }
  }

  const sorted = useMemo(() =>
    [...data].sort((a, b) => {
      const av = getValue(a, sortKey);
      const bv = getValue(b, sortKey);
      return sortDir === "desc" ? bv - av : av - bv;
    }), [data, sortKey, sortDir]);

  function toggle(key: BLSortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  function SortIcon({ col }: { col: BLSortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    return sortDir === "desc"
      ? <ArrowDown className="h-3 w-3 ml-1 text-[#e2a96e]" />
      : <ArrowUp className="h-3 w-3 ml-1 text-[#e2a96e]" />;
  }

  const cols: [BLSortKey | null, string, string][] = [
    [null, "Rang", "text-left pl-2"],
    [null, "Vertriebler", "text-left pl-4"],
    ["total", "Leads", "text-right pr-5"],
    ["qualified", "Qualifiziert+", "text-right pr-5"],
    ["gewonnen", "Gewonnen", "text-right pr-5"],
    ["conversionRate", "Conversion %", "text-right pr-5"],
    ["bgConvRate", "BG-Conv %", "text-right pr-5"],
    ["calls", "Calls", "text-right pr-5"],
    ["avgDuration", "Avg Dauer", "text-right pr-2"],
  ];

  return (
    <SectionCard title="Bestenliste">
      <div className="overflow-x-auto -mx-2">
        <table className="w-full premium-table">
          <thead>
            <tr>
              {cols.map(([key, label, cls]) => (
                <th
                  key={label}
                  className={`${cls} ${key ? "cursor-pointer select-none hover:text-[#a8a29e] transition-colors" : ""}`}
                  onClick={key ? () => toggle(key) : undefined}
                >
                  <span className="inline-flex items-center">
                    {label}
                    {key && <SortIcon col={key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => (
              <tr key={s.name}>
                <td className="pl-2">
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-bold ${
                    i === 0
                      ? "bg-gradient-to-br from-[#e2a96e] to-[#c4956a] text-[#0c0c0e] shadow-[0_0_16px_rgba(226,169,110,0.3)]"
                      : "bg-[rgba(255,255,255,0.04)] text-[#57534e]"
                  }`}>
                    {i + 1}
                  </span>
                </td>
                <td className="pl-4 text-[14px] font-medium text-[#fafaf9]">{s.name}</td>
                <td className="text-right pr-5 tabular-nums text-[#a8a29e]">{s.total}</td>
                <td className="text-right pr-5 tabular-nums text-[#a8a29e]">{s.qualified}</td>
                <td className="text-right pr-5 tabular-nums font-semibold text-[#5eead4] glow-badge">{s.gewonnen}</td>
                <td className="text-right pr-5 tabular-nums text-[#e2a96e] font-medium">
                  {s.total > 0 ? s.conversionRate.toFixed(1) : "–"}%
                </td>
                <td className="text-right pr-5 tabular-nums text-[#5eead4] font-medium">
                  {s.total > 0 ? ((s.gewonnen / s.total) * 100).toFixed(1) : "–"}%
                </td>
                <td className="text-right pr-5 tabular-nums text-[#a8a29e]">{s.aircall?.totalCalls ?? "–"}</td>
                <td className="text-right pr-2 tabular-nums text-[#a8a29e]">{s.aircall ? formatDuration(s.aircall.avgDurationSec) : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

export default function SellerPage() {
  const [range, setRange] = useState<TimeRange>("all");

  const { sellerData, comparisonData, radarData } = useMemo(() => {
    const filteredLeads = filterLeadsByRange(leads, range);
    const sellerData = sellers.map((s) => sellerStats(s, filteredLeads));

    const comparisonData = sellerData.map((s) => ({
      name: s.name.split(" ")[0],
      Leads: s.total,
      "Qualifiziert+": s.qualified,
      Gewonnen: s.gewonnen,
    }));

    const radarData = [
      { metric: "Leads", ...Object.fromEntries(sellerData.map(s => [s.name.split(" ")[0], s.total])) },
      { metric: "Qualifiziert", ...Object.fromEntries(sellerData.map(s => [s.name.split(" ")[0], s.qualified])) },
      { metric: "Gewonnen", ...Object.fromEntries(sellerData.map(s => [s.name.split(" ")[0], s.gewonnen])) },
      { metric: "Termine", ...Object.fromEntries(sellerData.map(s => [s.name.split(" ")[0], s.termine])) },
      { metric: "Calls", ...Object.fromEntries(sellerData.map(s => [s.name.split(" ")[0], s.aircall?.totalCalls ?? 0])) },
    ];

    return { sellerData, comparisonData, radarData };
  }, [range]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#fafaf9]">Vertriebler-Ansicht</h1>
          <p className="mt-1 text-[13px] text-[#57534e]">
            Performance-Vergleich der Vertriebler · Aircall-Daten vom {new Date(aircallFetchedAt).toLocaleDateString("de-DE")}
          </p>
        </div>
        <TimeRangeFilter value={range} onChange={setRange} />
      </div>

      {/* Zielerreichung */}
      <TargetTracker />

      {/* Aircall KPIs (ungefiltert — Aggregat ohne Datumsdimension) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 stagger-in">
        <KpiCard
          label="Gesamt-Calls"
          value={aircallSellers.reduce((s, a) => s + a.totalCalls, 0)}
          sub={`${aircallSellers.reduce((s, a) => s + a.outboundCalls, 0)} outbound`}
          accent
        />
        <KpiCard
          label="Gesprächszeit"
          value={formatDuration(aircallSellers.reduce((s, a) => s + a.totalDurationSec, 0))}
          sub="Alle Seller"
        />
        <KpiCard
          label="Avg Dauer"
          value={formatDuration(Math.round(aircallSellers.reduce((s, a) => s + a.avgDurationSec, 0) / aircallSellers.length))}
          sub="Pro Gespräch"
        />
        <KpiCard
          label="Längster Call"
          value={formatDuration(Math.max(...aircallSellers.map((a) => a.longestCallSec)))}
          sub={aircallSellers.reduce((best, a) => a.longestCallSec > best.longestCallSec ? a : best).name}
        />
      </div>

      {/* Bestenliste */}
      <Bestenliste data={sellerData} />

      {/* Aktivitätskalender */}
      <ActivityCalendar />

      {/* Comparison Chart + Radar */}
      <div className="grid gap-6 lg:grid-cols-2 stagger-in">
        <SectionCard title="Vertriebler-Vergleich">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={comparisonData} barGap={4}>
              <XAxis dataKey="name" {...AXIS_STYLE} axisLine={false} tickLine={false} fontSize={14} />
              <YAxis {...AXIS_STYLE} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="Leads" fill={PALETTE.indigo} radius={[6, 6, 0, 0]} />
              <Bar dataKey="Qualifiziert+" fill={PALETTE.teal} radius={[6, 6, 0, 0]} />
              <Bar dataKey="Gewonnen" fill={PALETTE.amber} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Skill-Profil">
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#292524" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: "#78716c", fontSize: 11 }} />
              {sellerData.map((s, i) => {
                const firstName = s.name.split(" ")[0];
                return (
                  <Radar key={firstName} name={firstName} dataKey={firstName} stroke={RADAR_COLORS[i % RADAR_COLORS.length]} fill={RADAR_COLORS[i % RADAR_COLORS.length]} fillOpacity={0.15} strokeWidth={2} />
                );
              })}
              <Legend wrapperStyle={{ fontSize: 12, color: "#78716c" }} />
              <Tooltip {...TOOLTIP_STYLE} />
            </RadarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* Seller Cards */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 stagger-in" style={{ gridAutoRows: "1fr" }}>
        {sellerData.map((s, idx) => (
          <div key={s.name} className="glass-card overflow-hidden flex flex-col">
            {/* Header with gradient */}
            <div className="relative px-6 pt-6 pb-6">
              <div className="absolute inset-0 opacity-[0.03]" style={{
                background: `linear-gradient(135deg, ${GRADIENT_PAIRS[idx].from}, ${GRADIENT_PAIRS[idx].to})`
              }} />
              <div className="relative flex items-center gap-4">
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center text-lg font-bold text-[#0c0c0e]"
                  style={{ background: `linear-gradient(135deg, ${GRADIENT_PAIRS[idx].from}, ${GRADIENT_PAIRS[idx].to})` }}
                >
                  {s.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-[17px] font-semibold text-[#fafaf9]">{s.name}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[12px] tabular-nums font-medium" style={{ color: GRADIENT_PAIRS[idx].from }}>
                      {s.total > 0 ? s.conversionRate.toFixed(1) : "–"}% Conversion
                    </span>
                    <span className="text-[#44403c]">·</span>
                    <span className="text-[12px] tabular-nums font-medium text-[#5eead4]">
                      {s.total > 0 ? ((s.gewonnen / s.total) * 100).toFixed(1) : "–"}% BG-Conv
                    </span>
                    <span className="text-[#44403c]">·</span>
                    <span className="text-[12px] text-[#57534e]">{s.total} Leads</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 pt-4 pb-5 flex-1 flex flex-col">
              {/* CRM Stats */}
              <div className="grid grid-cols-4 gap-3 mb-5">
                {[
                  { label: "Leads", val: s.total },
                  { label: "Qualifiziert+", val: s.qualified },
                  { label: "Gewonnen", val: s.gewonnen },
                  { label: "Verloren", val: s.verloren },
                ].map((m) => (
                  <div key={m.label} className="text-center py-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.03)]">
                    <div className="text-[20px] font-semibold tabular-nums text-[#fafaf9]">{m.val}</div>
                    <div className="text-[10px] uppercase tracking-wider text-[#57534e] mt-0.5">{m.label}</div>
                  </div>
                ))}
              </div>

              {/* Aircall Stats */}
              {s.aircall && (
                <div className="mb-5">
                  <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#57534e] mb-3 flex items-center gap-1.5">
                    <Phone className="h-3 w-3" /> Aircall
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.03)]">
                      <PhoneOutgoing className="h-3.5 w-3.5 text-[#e2a96e]" />
                      <div>
                        <div className="text-[16px] font-semibold tabular-nums text-[#fafaf9]">{s.aircall.outboundCalls}</div>
                        <div className="text-[9px] uppercase tracking-wider text-[#57534e]">Outbound</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.03)]">
                      <PhoneIncoming className="h-3.5 w-3.5 text-[#5eead4]" />
                      <div>
                        <div className="text-[16px] font-semibold tabular-nums text-[#fafaf9]">{s.aircall.inboundCalls}</div>
                        <div className="text-[9px] uppercase tracking-wider text-[#57534e]">Inbound</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.03)]">
                      <Clock className="h-3.5 w-3.5 text-[#818cf8]" />
                      <div>
                        <div className="text-[16px] font-semibold tabular-nums text-[#fafaf9]">{formatDuration(s.aircall.avgDurationSec)}</div>
                        <div className="text-[9px] uppercase tracking-wider text-[#57534e]">Avg Dauer</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.03)]">
                      <Phone className="h-3.5 w-3.5 text-[#a78bfa]" />
                      <div>
                        <div className="text-[16px] font-semibold tabular-nums text-[#fafaf9]">{s.aircall.callsPerDay}/Tag</div>
                        <div className="text-[9px] uppercase tracking-wider text-[#57534e]">Frequenz</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-[#57534e]">
                    <span>Gesprächszeit: {formatDuration(s.aircall.totalDurationSec)}</span>
                    <span>Längster: {formatDuration(s.aircall.longestCallSec)}</span>
                  </div>
                </div>
              )}

              <div className="mt-auto pt-2">
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={s.statusData} layout="vertical" barCategoryGap="25%">
                    <XAxis type="number" {...AXIS_STYLE} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={85} {...AXIS_STYLE} axisLine={false} tickLine={false} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} animationDuration={800}>
                      {s.statusData.map((_, i) => (
                        <Cell key={i} fill={SELLER_BAR_COLORS[i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

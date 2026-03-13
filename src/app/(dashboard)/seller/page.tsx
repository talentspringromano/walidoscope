"use client";

import { useState, useMemo } from "react";
import { KpiCard, SectionCard } from "@/components/kpi-card";
import { TimeRangeFilter } from "@/components/time-range-filter";
import { ActivityCalendar } from "@/components/activity-calendar";
import { TargetTracker } from "@/components/target-tracker";
import { leads } from "@/data/leads";
import type { AircallSellerDailyEntry } from "@/data/aircall";
import { aircallSellerDaily, aircallFetchedAt, formatDuration } from "@/data/aircall";
import { TOOLTIP_STYLE, AXIS_STYLE, PALETTE, SELLER_BAR_COLORS } from "@/components/chart-theme";
import { Phone, PhoneOutgoing, PhoneIncoming, Clock, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, XCircle } from "lucide-react";
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
import { filterLeadsByRange, filterAircallDailyByRange, getAnchorDate, parseDE } from "@/lib/date-utils";

const sellers = ["Walid Karimi", "Nele Pfau", "Bastian Wuske", "Eric Hardt", "Michel Grosser"];

function sellerStats(name: string, leadsSubset: typeof leads, filteredSellerDaily: AircallSellerDailyEntry[]) {
  const sellerLeads = leadsSubset.filter((l) => l.vertriebler === name);
  const gewonnen = sellerLeads.filter((l) => l.leadStatus === "Gewonnen").length;
  const verloren = sellerLeads.filter((l) => l.leadStatus === "Verloren").length;
  const termine = sellerLeads.filter((l) => l.terminBeimAmt).length;
  const neuerLead = sellerLeads.filter((l) => l.leadStatus === "Neuer Lead").length;
  const rueckruf = sellerLeads.filter((l) => l.leadStatus === "Rückruf").length;

  // High-Touch / Low-Touch distribution (only qualified+ leads, excl. Gewonnen/Verloren)
  const activeLeads = sellerLeads.filter((l) => l.leadStatus !== "Gewonnen" && l.leadStatus !== "Verloren");
  const htMitTermin = activeLeads.filter((l) => {
    const isHT = l.prozessStarten.includes("High Touch") || l.betreuungsart === "High Touch";
    return isHT && l.terminBeimAmtCheck;
  }).length;
  const htOhneTermin = activeLeads.filter((l) => {
    const isHT = l.prozessStarten.includes("High Touch") || l.betreuungsart === "High Touch";
    return isHT && !l.terminBeimAmtCheck;
  }).length;
  const ltCount = activeLeads.filter((l) => l.prozessStarten.includes("Low Touch") || l.betreuungsart === "Low Touch").length;
  const oProz = activeLeads.filter((l) =>
    ["Vertriebsqualifiziert", "Reterminierung", "Kennenlerngespräch gebucht", "Beratungsgespräch gebucht"].includes(l.leadStatus)
    && !l.prozessStarten.includes("High Touch") && l.betreuungsart !== "High Touch"
    && !l.prozessStarten.includes("Low Touch") && l.betreuungsart !== "Low Touch"
  ).length;
  const sql = htMitTermin + htOhneTermin + ltCount + oProz;
  const touchTotal = htMitTermin + htOhneTermin + ltCount;

  // Stale leads: 3+ Tage ohne Aktivität (nur aktive Leads)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const STALE_THRESHOLD_DAYS = 3;
  const staleLeads = activeLeads.filter((l) => {
    const lastActivity = l.lastModified ? parseDE(l.lastModified) : parseDE(l.createdOn);
    if (isNaN(lastActivity.getTime())) return false;
    const daysSince = (today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince >= STALE_THRESHOLD_DAYS;
  }).length;

  // Time-to-Qualify (Durchschnitt in Tagen)
  const qualiDiffs: number[] = [];
  for (const l of sellerLeads) {
    if (l.vertriebsqualifiziertAm && l.createdOn) {
      const created = parseDE(l.createdOn);
      const qualified = parseDE(l.vertriebsqualifiziertAm);
      if (!isNaN(created.getTime()) && !isNaN(qualified.getTime())) {
        const diffDays = (qualified.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays >= 0) qualiDiffs.push(diffDays);
      }
    }
  }
  const avgTimeToQualify = qualiDiffs.length > 0
    ? Math.round((qualiDiffs.reduce((a, b) => a + b, 0) / qualiDiffs.length) * 10) / 10
    : null;

  // Verlustgründe
  const verlorenLeads = sellerLeads.filter((l) => l.leadStatus === "Verloren");
  const verlustgruende: Record<string, number> = {};
  verlorenLeads.forEach((l) => {
    const grund = l.verlustgrund || "Kein Grund angegeben";
    verlustgruende[grund] = (verlustgruende[grund] || 0) + 1;
  });
  const topVerlustgruende = Object.entries(verlustgruende)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Aircall KPIs from filtered daily data
  const dailyEntries = filteredSellerDaily.filter((e) => e.seller === name);
  const outboundCalls = dailyEntries.reduce((s, e) => s + e.outboundCalls, 0);
  const inboundCalls = dailyEntries.reduce((s, e) => s + e.inboundCalls, 0);
  const totalDurationSec = dailyEntries.reduce((s, e) => s + e.totalDurationSec, 0);
  const answeredCalls = dailyEntries.reduce((s, e) => s + e.answeredCalls, 0);
  const avgDurationSec = answeredCalls > 0 ? Math.round(totalDurationSec / answeredCalls) : 0;
  const longestCallSec = Math.max(0, ...dailyEntries.map((e) => e.longestCallSec));
  const uniqueDays = new Set(dailyEntries.map((e) => e.date)).size;
  const callsPerDay = uniqueDays > 0 ? Math.round(((outboundCalls + inboundCalls) / uniqueDays) * 10) / 10 : 0;
  const totalCalls = outboundCalls + inboundCalls;
  const totalDials = dailyEntries.reduce((s, e) => s + e.dials, 0);
  const totalReached = dailyEntries.reduce((s, e) => s + e.reached, 0);
  const reachabilityPct = totalDials > 0 ? (totalReached / totalDials) * 100 : 0;

  return {
    name,
    total: sellerLeads.length,
    sql,
    gewonnen,
    verloren,
    termine,
    neuerLead,
    rueckruf,
    conversionRate: sellerLeads.length > 0 ? ((sql / sellerLeads.length) * 100) : 0,
    statusData: [
      { name: "Neuer Lead", count: neuerLead },
      { name: "Rückruf", count: rueckruf },
      { name: "SQL", count: sql },
      { name: "Gewonnen", count: gewonnen },
      { name: "Verloren", count: verloren },
    ],
    outboundCalls,
    inboundCalls,
    totalCalls,
    totalDurationSec,
    avgDurationSec,
    longestCallSec,
    callsPerDay,
    totalDials,
    totalReached,
    reachabilityPct,
    htMitTermin,
    htOhneTermin,
    ltCount,
    touchTotal,
    staleLeads,
    activeLeadsCount: activeLeads.length,
    topVerlustgruende,
    avgTimeToQualify,
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

type BLSortKey = "total" | "sql" | "gewonnen" | "conversionRate" | "bgConvRate" | "calls" | "avgDuration";
type BLSortDir = "asc" | "desc";

function Bestenliste({ data }: { data: ReturnType<typeof sellerStats>[] }) {
  const [sortKey, setSortKey] = useState<BLSortKey>("gewonnen");
  const [sortDir, setSortDir] = useState<BLSortDir>("desc");

  function getValue(s: ReturnType<typeof sellerStats>, key: BLSortKey): number {
    switch (key) {
      case "total": return s.total;
      case "sql": return s.sql;
      case "gewonnen": return s.gewonnen;
      case "conversionRate": return s.conversionRate;
      case "bgConvRate": return s.total > 0 ? (s.gewonnen / s.total) * 100 : 0;
      case "calls": return s.totalCalls;
      case "avgDuration": return s.avgDurationSec;
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
    ["sql", "SQL", "text-right pr-5"],
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
                <td className="text-right pr-5 tabular-nums text-[#a8a29e]">{s.sql}</td>
                <td className="text-right pr-5 tabular-nums font-semibold text-[#5eead4] glow-badge">{s.gewonnen}</td>
                <td className="text-right pr-5 tabular-nums text-[#e2a96e] font-medium">
                  {s.total > 0 ? s.conversionRate.toFixed(1) : "–"}%
                </td>
                <td className="text-right pr-5 tabular-nums text-[#5eead4] font-medium">
                  {s.total > 0 ? ((s.gewonnen / s.total) * 100).toFixed(1) : "–"}%
                </td>
                <td className="text-right pr-5 tabular-nums text-[#a8a29e]">{s.totalCalls}</td>
                <td className="text-right pr-2 tabular-nums text-[#a8a29e]">{formatDuration(s.avgDurationSec)}</td>
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

  const { sellerData, comparisonData, radarData, filteredDaily } = useMemo(() => {
    const filteredLeads = filterLeadsByRange(leads, range);
    const anchor = getAnchorDate(leads);
    const filteredDaily = filterAircallDailyByRange(aircallSellerDaily, anchor, range);
    const sellerData = sellers.map((s) => sellerStats(s, filteredLeads, filteredDaily));

    const comparisonData = sellerData.map((s) => ({
      name: s.name.split(" ")[0],
      Leads: s.total,
      "SQL": s.sql,
      Gewonnen: s.gewonnen,
    }));

    const radarData = [
      { metric: "Leads", ...Object.fromEntries(sellerData.map(s => [s.name.split(" ")[0], s.total])) },
      { metric: "SQL", ...Object.fromEntries(sellerData.map(s => [s.name.split(" ")[0], s.sql])) },
      { metric: "Gewonnen", ...Object.fromEntries(sellerData.map(s => [s.name.split(" ")[0], s.gewonnen])) },
      { metric: "Termine", ...Object.fromEntries(sellerData.map(s => [s.name.split(" ")[0], s.termine])) },
      { metric: "Calls", ...Object.fromEntries(sellerData.map(s => [s.name.split(" ")[0], s.totalCalls])) },
    ];

    return { sellerData, comparisonData, radarData, filteredDaily };
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

      {/* Aircall KPIs (zeitgefiltert) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 stagger-in">
        <KpiCard
          label="Gesamt-Calls"
          value={sellerData.reduce((s, a) => s + a.totalCalls, 0)}
          sub={`${sellerData.reduce((s, a) => s + a.outboundCalls, 0)} outbound`}
          accent
        />
        <KpiCard
          label="Gesprächszeit"
          value={formatDuration(sellerData.reduce((s, a) => s + a.totalDurationSec, 0))}
          sub="Alle Seller"
        />
        <KpiCard
          label="Avg Dauer"
          value={formatDuration((() => {
            const totalAnswered = sellerData.reduce((s, a) => s + (a.totalDurationSec > 0 ? 1 : 0), 0);
            const totalDur = sellerData.reduce((s, a) => s + a.totalDurationSec, 0);
            const totalAns = filteredDaily.reduce((s, e) => s + e.answeredCalls, 0);
            return totalAns > 0 ? Math.round(totalDur / totalAns) : 0;
          })())}
          sub="Pro Gespräch"
        />
        <KpiCard
          label="Längster Call"
          value={formatDuration(Math.max(0, ...sellerData.map((a) => a.longestCallSec)))}
          sub={sellerData.reduce((best, a) => a.longestCallSec > best.longestCallSec ? a : best, sellerData[0])?.name ?? "–"}
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
              <Bar dataKey="SQL" fill={PALETTE.teal} radius={[6, 6, 0, 0]} />
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
              <div className="grid grid-cols-6 gap-3 mb-5">
                {[
                  { label: "Leads", val: s.total },
                  { label: "SQL", val: s.sql },
                  { label: "Gewonnen", val: s.gewonnen },
                  { label: "Verloren", val: s.verloren },
                  { label: "Termine", val: s.termine },
                  { label: "Ø Quali-Tage", val: s.avgTimeToQualify ?? "–" },
                ].map((m) => (
                  <div key={m.label} className="text-center py-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.03)]">
                    <div className="text-[20px] font-semibold tabular-nums text-[#fafaf9]">{m.val}</div>
                    <div className="text-[10px] uppercase tracking-wider text-[#57534e] mt-0.5">{m.label}</div>
                  </div>
                ))}
              </div>

              {/* Aircall Stats */}
              {s.totalCalls > 0 && (
                <div className="mb-5">
                  <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#57534e] mb-3 flex items-center gap-1.5">
                    <Phone className="h-3 w-3" /> Aircall
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.03)]">
                      <PhoneOutgoing className="h-3.5 w-3.5 text-[#e2a96e]" />
                      <div>
                        <div className="text-[16px] font-semibold tabular-nums text-[#fafaf9]">{s.outboundCalls}</div>
                        <div className="text-[9px] uppercase tracking-wider text-[#57534e]">Outbound</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.03)]">
                      <PhoneIncoming className="h-3.5 w-3.5 text-[#5eead4]" />
                      <div>
                        <div className="text-[16px] font-semibold tabular-nums text-[#fafaf9]">{s.inboundCalls}</div>
                        <div className="text-[9px] uppercase tracking-wider text-[#57534e]">Inbound</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.03)]">
                      <Clock className="h-3.5 w-3.5 text-[#818cf8]" />
                      <div>
                        <div className="text-[16px] font-semibold tabular-nums text-[#fafaf9]">{formatDuration(s.avgDurationSec)}</div>
                        <div className="text-[9px] uppercase tracking-wider text-[#57534e]">Avg Dauer</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.03)]">
                      <Phone className="h-3.5 w-3.5 text-[#a78bfa]" />
                      <div>
                        <div className="text-[16px] font-semibold tabular-nums text-[#fafaf9]">{s.callsPerDay}/Tag</div>
                        <div className="text-[9px] uppercase tracking-wider text-[#57534e]">Frequenz</div>
                      </div>
                    </div>
                  </div>
                  {/* Erreichbarkeit */}
                  <div className="mt-2 flex items-center gap-2 py-2 px-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.03)]">
                    <PhoneOutgoing className="h-3.5 w-3.5" style={{ color: s.reachabilityPct >= 50 ? "#5eead4" : s.reachabilityPct >= 30 ? "#fbbf24" : "#ef4444" }} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[16px] font-semibold tabular-nums" style={{ color: s.reachabilityPct >= 50 ? "#5eead4" : s.reachabilityPct >= 30 ? "#fbbf24" : "#ef4444" }}>
                          {s.totalDials > 0 ? s.reachabilityPct.toFixed(1) : "–"}%
                        </span>
                        <span className="text-[9px] uppercase tracking-wider text-[#57534e]">Erreichbarkeit</span>
                      </div>
                      <div className="text-[10px] text-[#57534e]">{s.totalReached} / {s.totalDials} erreicht</div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-[#57534e]">
                    <span>Gesprächszeit: {formatDuration(s.totalDurationSec)}</span>
                    <span>Längster: {formatDuration(s.longestCallSec)}</span>
                  </div>
                </div>
              )}

              {/* High-Touch / Low-Touch Verteilung */}
              {s.touchTotal > 0 && (
                <div className="mb-5">
                  <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#57534e] mb-3 flex items-center gap-1.5">
                    <ArrowUpDown className="h-3 w-3" /> Touch-Verteilung
                  </h3>
                  {/* Stacked bar */}
                  <div className="flex h-3 rounded-full overflow-hidden mb-2">
                    {s.htMitTermin > 0 && (
                      <div className="bg-[#5eead4]" style={{ width: `${(s.htMitTermin / s.touchTotal) * 100}%` }} />
                    )}
                    {s.htOhneTermin > 0 && (
                      <div className="bg-[#fbbf24]" style={{ width: `${(s.htOhneTermin / s.touchTotal) * 100}%` }} />
                    )}
                    {s.ltCount > 0 && (
                      <div className="bg-[#818cf8]" style={{ width: `${(s.ltCount / s.touchTotal) * 100}%` }} />
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-[#5eead4]" />
                      <span className="text-[#a8a29e]">HT + Termin</span>
                      <span className="font-medium tabular-nums text-[#fafaf9]">{s.htMitTermin}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-[#fbbf24]" />
                      <span className="text-[#a8a29e]">HT ohne Termin</span>
                      <span className="font-medium tabular-nums text-[#fafaf9]">{s.htOhneTermin}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-[#818cf8]" />
                      <span className="text-[#a8a29e]">Low-Touch</span>
                      <span className="font-medium tabular-nums text-[#fafaf9]">{s.ltCount}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Stale Leads */}
              {s.staleLeads > 0 && (
                <div className="mb-5 flex items-center gap-2.5 py-2.5 px-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.03)]">
                  <AlertTriangle className={`h-4 w-4 shrink-0 ${s.staleLeads > 5 ? "text-[#f87171]" : "text-[#fbbf24]"}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[16px] font-semibold tabular-nums ${s.staleLeads > 5 ? "text-[#f87171]" : "text-[#fbbf24]"}`}>
                        {s.staleLeads}
                      </span>
                      <span className="text-[11px] text-[#a8a29e]">Stale Leads (3+ Tage ohne Aktivität)</span>
                    </div>
                    <div className="text-[10px] text-[#57534e]">
                      {s.activeLeadsCount > 0
                        ? `${s.staleLeads} von ${s.activeLeadsCount} aktiven Leads`
                        : "–"}
                    </div>
                  </div>
                </div>
              )}

              {/* Top Verlustgründe */}
              {s.verloren > 0 && s.topVerlustgruende.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#57534e] mb-3 flex items-center gap-1.5">
                    <XCircle className="h-3 w-3" /> Top Verlustgründe
                  </h3>
                  <div className="space-y-1.5">
                    {s.topVerlustgruende.map(([grund, count]) => (
                      <div key={grund} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.03)]">
                        <span className="text-[11px] text-[#a8a29e] truncate mr-2">{grund}</span>
                        <span className="text-[13px] font-semibold tabular-nums text-[#f87171] shrink-0">{count}</span>
                      </div>
                    ))}
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

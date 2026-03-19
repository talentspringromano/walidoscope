"use client";

import { useState, useMemo, Suspense, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { KpiCard, SectionCard } from "@/components/kpi-card";
import { TimeRangeFilter } from "@/components/time-range-filter";
import { leads } from "@/data/leads";
import { totalMetaSpend, totalMetaLeads, avgCPL } from "@/data/meta-ads";
import { perspectiveVisits } from "@/data/perspective";
import {
  indeedDaily,
  INDEED_CSV_HEADERS,
} from "@/data/indeed";
import {
  indeedBundesland,
  INDEED_BL_CSV_HEADERS,
} from "@/data/indeed-bundesland";
import type { IndeedBundeslandEntry } from "@/data/indeed-bundesland";
import {
  indeedStellen,
  INDEED_STELLEN_CSV_HEADERS,
} from "@/data/indeed-stellen";
import type { IndeedStelleEntry } from "@/data/indeed-stellen";
import {
  metaExport,
  metaExportTotalSpend,
  metaExportTotalResults,
  metaExportTotalImpressions,
  metaExportTotalClicks,
  metaExportAvgCPL,
  META_CSV_HEADERS,
} from "@/data/meta-export";
import type { MetaExportEntry } from "@/data/meta-export";
import type { IndeedDailyEntry } from "@/data/indeed";
import { TOOLTIP_STYLE, AXIS_STYLE, PALETTE, SEGMENT_COLORS, FUNNEL_COLORS } from "@/components/chart-theme";
import { Upload, CheckCircle, AlertCircle, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  FunnelChart,
  Funnel,
  ReferenceLine,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
  Area,
  ComposedChart,
  ReferenceArea,
} from "recharts";
import type { TimeRange } from "@/lib/date-utils";
import {
  filterLeadsByRange,
  filterPerspectiveByRange,
  computePerspectiveSummary,
  parseDE,
  getISOWeek,
  classifyLead,
} from "@/lib/date-utils";

/* ── Soll-Ist Targets pro Kanal ── */
const CHANNEL_TARGETS = {
  meta:    { leads: 80, spend: 500, cpl: 5.00, conversion: 10 },
  kursnet: { leads: 30, spend: 0,   cpl: 0,    conversion: 15 },
  indeed:  { leads: 10, spend: 0,   cpl: 0,    conversion: 10 },
} as const;

type ChannelKey = keyof typeof CHANNEL_TARGETS;

function computeChannelIST(channel: ChannelKey, leadsSubset: typeof leads) {
  const platformFilter = channel === "meta"
    ? (l: (typeof leads)[0]) => l.platform === "Instagram" || l.platform === "Facebook"
    : channel === "kursnet"
    ? (l: (typeof leads)[0]) => l.platform === "Kursnet"
    : (l: (typeof leads)[0]) => l.platform === "Indeed";

  const channelLeads = leadsSubset.filter(platformFilter);
  const leadCount = channel === "meta" ? totalMetaLeads : channelLeads.length;
  const gewonnen = channelLeads.filter((l) => l.leadStatus === "Gewonnen").length;
  const spend = channel === "meta" ? totalMetaSpend : 0;
  const cpl = channel === "meta" ? avgCPL : 0;
  const conversion = leadCount > 0 ? (gewonnen / leadCount) * 100 : 0;

  return { leads: leadCount, spend, cpl, conversion, gewonnen };
}

const CHANNELS: { key: ChannelKey; label: string }[] = [
  { key: "meta", label: "Meta" },
  { key: "kursnet", label: "Kursnet" },
  { key: "indeed", label: "Indeed" },
];

/* ── Cost per Ad (module-level, not filterable) ── */
type MarketingTab = "meta" | "indeed" | "kursnet";
const VALID_TABS: MarketingTab[] = ["meta", "indeed", "kursnet"];

export default function MarketingPage() {
  return (
    <Suspense fallback={null}>
      <MarketingContent />
    </Suspense>
  );
}

function MarketingContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as MarketingTab | null;
  const activeTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : null;
  const [range, setRange] = useState<TimeRange>("all");
  const [hiddenChannels, setHiddenChannels] = useState<Set<string>>(new Set());
  const [channelTimeMode, setChannelTimeMode] = useState<"day" | "week" | "month">("week");
  const {
    channelData, segmentCounts, allSegments, segmentWeeklyData,
    gewonnenKursnet, sqlKursnet, perspFunnelData, perspSummary,
    filteredLeads, channelWeeklyData, channelDailyData, channelMonthlyData, platformData, platformAggData,
  } = useMemo(() => {
    const filteredLeads = filterLeadsByRange(leads, range);

    const channelData = CHANNELS.map(({ key, label }) => {
      const ist = computeChannelIST(key, filteredLeads);
      const soll = CHANNEL_TARGETS[key];
      return { key, label, ist, soll };
    });

    const segmentCounts: Record<string, number> = {};
    filteredLeads.forEach((l) => {
      const seg = classifyLead(l);
      segmentCounts[seg] = (segmentCounts[seg] || 0) + 1;
    });
    const allSegments = Object.keys(segmentCounts);

    const segmentWeekMap = new Map<number, Record<string, number>>();
    filteredLeads.forEach((l) => {
      const date = parseDE(l.createdOn);
      if (isNaN(date.getTime())) return;
      const wk = getISOWeek(date);
      const seg = classifyLead(l);
      const entry = segmentWeekMap.get(wk) ?? {};
      entry[seg] = (entry[seg] || 0) + 1;
      segmentWeekMap.set(wk, entry);
    });

    const segmentWeeklyData = Array.from(segmentWeekMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([wk, counts]) => ({
        week: `KW ${wk}`,
        ...Object.fromEntries(allSegments.map((s) => [s, counts[s] || 0])),
      }));

    /* Perspective */
    const perspFiltered = filterPerspectiveByRange(perspectiveVisits, range);
    const perspSummary = computePerspectiveSummary(perspFiltered);

    const kursnetLeads = filteredLeads.filter((l) => l.platform === "Kursnet");
    const gewonnenKursnet = kursnetLeads.filter((l) => l.leadStatus === "Gewonnen").length;
    // SQL = alle Kursnet-Leads die jemals SQL-Status erreicht haben (aktive + gewonnene + verlorene mit Prozess)
    const sqlKursnet = kursnetLeads.filter((l) =>
      l.prozessStarten.includes("High Touch") || l.betreuungsart === "High Touch" ||
      l.prozessStarten.includes("Low Touch") || l.betreuungsart === "Low Touch" ||
      ["Vertriebsqualifiziert", "Reterminierung", "Kennenlerngespräch gebucht", "Beratungsgespräch gebucht", "Gewonnen"].includes(l.leadStatus)
    ).length;
    const perspFunnelData = [
      { name: "LP Visits", value: perspSummary.totalVisits },
      { name: "Konvertiert", value: perspSummary.converted },
      { name: "Gewonnen (BG)", value: gewonnenKursnet },
    ];

    /* Channel time series (day / week / month) */
    const channelWeekMap = new Map<number, { Meta: number; Kursnet: number; Indeed: number }>();
    const channelDayMap = new Map<string, { Meta: number; Kursnet: number; Indeed: number }>();
    const channelMonthMap = new Map<string, { Meta: number; Kursnet: number; Indeed: number }>();
    filteredLeads.forEach((l) => {
      const date = parseDE(l.createdOn);
      if (isNaN(date.getTime())) return;
      const ch = (l.platform === "Facebook" || l.platform === "Instagram") ? "Meta"
        : l.platform === "Kursnet" ? "Kursnet"
        : l.platform === "Indeed" ? "Indeed" : null;
      if (!ch) return;
      // week
      const wk = getISOWeek(date);
      const wEntry = channelWeekMap.get(wk) ?? { Meta: 0, Kursnet: 0, Indeed: 0 };
      wEntry[ch]++;
      channelWeekMap.set(wk, wEntry);
      // day
      const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const dEntry = channelDayMap.get(dayKey) ?? { Meta: 0, Kursnet: 0, Indeed: 0 };
      dEntry[ch]++;
      channelDayMap.set(dayKey, dEntry);
      // month
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const mEntry = channelMonthMap.get(monthKey) ?? { Meta: 0, Kursnet: 0, Indeed: 0 };
      mEntry[ch]++;
      channelMonthMap.set(monthKey, mEntry);
    });
    const channelWeeklyData = Array.from(channelWeekMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([wk, counts]) => ({ label: `KW ${wk}`, ...counts }));
    const channelDailyData = Array.from(channelDayMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, counts]) => {
        const d = new Date(day + "T00:00:00");
        const dow = d.getDay();
        return { label: `${day.slice(8)}.${day.slice(5, 7)}.`, isWeekend: dow === 0 || dow === 6, ...counts };
      });
    const channelMonthlyData = Array.from(channelMonthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([m, counts]) => {
        const months = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
        return { label: months[parseInt(m.slice(5)) - 1] + " " + m.slice(0, 4), ...counts };
      });

    /* Platform-Verteilung */
    const platformCounts: Record<string, number> = {};
    filteredLeads.forEach((l) => {
      const p = l.platform || "(leer)";
      platformCounts[p] = (platformCounts[p] || 0) + 1;
    });
    const platformData = Object.entries(platformCounts)
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count);

    /* Aggregierte Platform-Daten: Instagram + Facebook → Meta */
    const platformAggCounts: Record<string, number> = {};
    filteredLeads.forEach((l) => {
      const p = l.platform || "(leer)";
      const key = (p === "Instagram" || p === "Facebook") ? "Meta (Instagram + Facebook)" : p;
      platformAggCounts[key] = (platformAggCounts[key] || 0) + 1;
    });
    const platformAggData = Object.entries(platformAggCounts)
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count);

    return {
      channelData, segmentCounts, allSegments, segmentWeeklyData,
      gewonnenKursnet, sqlKursnet, perspFunnelData, perspSummary,
      filteredLeads, channelWeeklyData, channelDailyData, channelMonthlyData, platformData, platformAggData,
    };
  }, [range]);

  const kursnetLeadsCount = filteredLeads.filter((l) => l.platform === "Kursnet").length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#fafaf9]">Marketing-Analytik</h1>
          <p className="mt-1 text-[13px] text-[#57534e]">Ad Performance, Lead-Segmentierung & Kursnet Funnel</p>
        </div>
        <TimeRangeFilter value={range} onChange={setRange} />
      </div>

      {/* ── Übersicht (kein Tab ausgewählt) ── */}
      {!activeTab && (<>

      {/* ── Soll-Ist-Vergleich ── */}
      <div className="space-y-6">
        <h2 className="text-[13px] font-semibold tracking-wide text-[#a8a29e]">Soll-Ist pro Kanal</h2>

        {/* Channel Cards */}
        <div className="grid gap-4 lg:grid-cols-3">
          {channelData.map(({ key, label, ist, soll }) => {
            const showSpend = range === "all";
            const metrics: { name: string; istVal: string; sollVal: string; diff: number; unit: string }[] = [
              {
                name: "Leads",
                istVal: String(ist.leads),
                sollVal: String(soll.leads),
                diff: ist.leads - soll.leads,
                unit: "",
              },
              {
                name: "Spend",
                istVal: showSpend ? `€${ist.spend.toFixed(0)}` : "—",
                sollVal: `€${soll.spend}`,
                diff: showSpend && soll.spend > 0 ? ist.spend - soll.spend : 0,
                unit: "€",
              },
              {
                name: "CPL",
                istVal: showSpend && ist.cpl > 0 ? `€${ist.cpl.toFixed(2)}` : "—",
                sollVal: soll.cpl > 0 ? `€${soll.cpl.toFixed(2)}` : "—",
                diff: showSpend && soll.cpl > 0 ? -(ist.cpl - soll.cpl) : 0,
                unit: "€",
              },
              {
                name: "Conversion",
                istVal: `${ist.conversion.toFixed(1)}%`,
                sollVal: `${soll.conversion}%`,
                diff: ist.conversion - soll.conversion,
                unit: "%",
              },
            ];

            const leadProgress = soll.leads > 0 ? Math.min(100, Math.round((ist.leads / soll.leads) * 100)) : 100;
            const onTrack = ist.leads >= soll.leads;

            return (
              <div key={key} className="glass-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[15px] font-semibold text-[#fafaf9]">{label}</h3>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                    onTrack
                      ? "bg-[rgba(94,234,212,0.1)] text-[#5eead4]"
                      : "bg-[rgba(251,113,133,0.1)] text-[#fb7185]"
                  }`}>
                    {onTrack ? "Im Soll" : "Unter SOLL"}
                  </span>
                </div>

                {/* Mini-Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  {metrics.map((m) => {
                    const positive = m.diff >= 0;
                    return (
                      <div key={m.name} className="space-y-1">
                        <div className="text-[10px] font-medium uppercase tracking-wider text-[#57534e]">{m.name}</div>
                        <div className="text-[18px] font-bold tabular-nums text-[#fafaf9]">{m.istVal}</div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="text-[#57534e]">SOLL {m.sollVal}</span>
                          {m.diff !== 0 && (
                            <span className={positive ? "text-[#5eead4]" : "text-[#fb7185]"}>
                              {m.diff > 0 ? "+" : ""}{m.name === "CPL" ? (m.diff > 0 ? "besser" : "schlechter") : m.name === "Conversion" ? `${m.diff.toFixed(1)}pp` : Math.round(m.diff)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between text-[10px] mb-1.5">
                    <span className="text-[#57534e]">Lead-Fortschritt</span>
                    <span className="tabular-nums font-medium text-[#a8a29e]">{ist.leads} / {soll.leads} ({leadProgress}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-[rgba(255,255,255,0.04)] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        onTrack
                          ? "bg-gradient-to-r from-[#5eead4] to-[#2dd4bf]"
                          : "bg-gradient-to-r from-[#818cf8] to-[#6366f1]"
                      }`}
                      style={{ width: `${leadProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Leads pro Kanal im Zeitverlauf – Stacked Bar */}
        {channelWeeklyData.length > 0 && (() => {
          const chartData = channelTimeMode === "day" ? channelDailyData : channelTimeMode === "month" ? channelMonthlyData : channelWeeklyData;
          const MQL_MONTHLY = 1000;
          const mqlTarget = channelTimeMode === "month" ? MQL_MONTHLY : channelTimeMode === "week" ? Math.round(MQL_MONTHLY / 4.33) : Math.round(MQL_MONTHLY / 30);
          return (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-semibold tracking-wide text-[#a8a29e]">Leads pro Kanal im Zeitverlauf</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-[rgba(255,255,255,0.04)] rounded-lg p-0.5">
                {(["day", "week", "month"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setChannelTimeMode(mode)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                      channelTimeMode === mode
                        ? "bg-[rgba(226,169,110,0.12)] text-[#e2a96e] border border-[rgba(226,169,110,0.25)]"
                        : "text-[#57534e] border border-transparent hover:text-[#a8a29e]"
                    }`}
                  >
                    {mode === "day" ? "Tag" : mode === "week" ? "Woche" : "Monat"}
                  </button>
                ))}
              </div>
              {(["Meta", "Kursnet", "Indeed"] as const).map((ch) => {
                const active = !hiddenChannels.has(ch);
                const color = ch === "Meta" ? PALETTE.indigo : ch === "Kursnet" ? PALETTE.teal : PALETTE.amber;
                return (
                  <button
                    key={ch}
                    onClick={() =>
                      setHiddenChannels((prev) => {
                        const next = new Set(prev);
                        next.has(ch) ? next.delete(ch) : next.add(ch);
                        return next;
                      })
                    }
                    className="px-3 py-1 rounded-lg text-[11px] font-medium transition-all border"
                    style={{
                      background: active ? `${color}18` : "transparent",
                      borderColor: active ? `${color}40` : "rgba(255,255,255,0.06)",
                      color: active ? color : "#57534e",
                      opacity: active ? 1 : 0.5,
                    }}
                  >
                    {ch}
                  </button>
                );
              })}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              {channelTimeMode === "day" && chartData.filter((d: Record<string, unknown>) => d.isWeekend).map((d: Record<string, unknown>) => (
                <ReferenceArea key={d.label as string} x1={d.label as string} x2={d.label as string} fill="rgba(255,255,255,0.03)" fillOpacity={1} ifOverflow="visible" />
              ))}
              <XAxis dataKey="label" {...AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis {...AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} domain={[0, (max: number) => Math.max(max, mqlTarget * 1.1)]} />
              <Tooltip
                {...TOOLTIP_STYLE}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const total = payload.reduce((s, p) => s + (typeof p.value === "number" ? p.value : 0), 0);
                  return (
                    <div className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#1c1917] px-3 py-2 shadow-xl">
                      <div className="text-[11px] text-[#78716c] mb-1.5">{label}</div>
                      {payload.map((p) => (
                        <div key={p.name} className="flex items-center justify-between gap-4 text-[12px]">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-sm" style={{ background: p.color }} />
                            <span className="text-[#a8a29e]">{p.name}</span>
                          </span>
                          <span className="font-semibold tabular-nums text-[#fafaf9]">{p.value}</span>
                        </div>
                      ))}
                      <div className="mt-1.5 pt-1.5 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between gap-4 text-[12px]">
                        <span className="text-[#a8a29e] font-medium">Gesamt</span>
                        <span className="font-bold tabular-nums text-[#fafaf9]">{total}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-[12px]">
                        <span className="text-[#e2a96e]">Ziel</span>
                        <span className="font-semibold tabular-nums text-[#e2a96e]">{mqlTarget}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-[11px]">
                        <span className="text-[#57534e]">Erreichung</span>
                        <span className={`font-semibold tabular-nums ${total >= mqlTarget ? "text-[#5eead4]" : "text-[#ef4444]"}`}>
                          {mqlTarget > 0 ? Math.round((total / mqlTarget) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  );
                }}
              />
              <ReferenceLine
                y={mqlTarget}
                stroke="#e2a96e"
                strokeDasharray="6 3"
                strokeWidth={1.5}
                label={{
                  value: `Ziel: ${mqlTarget}`,
                  position: "right",
                  fill: "#e2a96e",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
              {(["Meta", "Kursnet", "Indeed"] as const)
                .filter((ch) => !hiddenChannels.has(ch))
                .map((ch, i, arr) => (
                  <Bar
                    key={ch}
                    dataKey={ch}
                    stackId="a"
                    fill={ch === "Meta" ? PALETTE.indigo : ch === "Kursnet" ? PALETTE.teal : PALETTE.amber}
                    radius={i === arr.length - 1 ? [4, 4, 0, 0] : undefined}
                  />
                ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
          );
        })()}

        {/* Leads nach Quelle */}
        {platformData.length > 0 && (
          <SectionCard title="Leads nach Quelle">
            <div className="space-y-2.5">
              {platformData.map(({ platform, count }) => {
                const maxCount = platformData[0].count;
                const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
                return (
                  <div key={platform} className="flex items-center gap-3">
                    <span className="text-[12px] text-[#a8a29e] w-[160px] truncate shrink-0" title={platform}>
                      {platform}
                    </span>
                    <div className="flex-1 h-[18px] rounded bg-[rgba(255,255,255,0.04)] overflow-hidden">
                      <div
                        className="h-full rounded bg-gradient-to-r from-[#818cf8] to-[#6366f1] transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[13px] font-semibold tabular-nums text-[#fafaf9] w-[36px] text-right shrink-0">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-[11px] text-[#57534e]">
              Gesamt: {platformData.reduce((sum, d) => sum + d.count, 0)} Leads
            </div>

            {/* Aggregierte Ansicht */}
            <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
              <div className="text-[11px] text-[#57534e] mb-2.5">Aggregiert</div>
              <div className="space-y-2.5">
                {platformAggData.map(({ platform, count }) => {
                  const maxCount = platformAggData[0].count;
                  const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
                  return (
                    <div key={platform} className="flex items-center gap-3">
                      <span className="text-[12px] text-[#a8a29e] w-[160px] truncate shrink-0" title={platform}>
                        {platform}
                      </span>
                      <div className="flex-1 h-[18px] rounded bg-[rgba(255,255,255,0.04)] overflow-hidden">
                        <div
                          className="h-full rounded bg-gradient-to-r from-[#e2a96e] to-[#d97706] transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[13px] font-semibold tabular-nums text-[#fafaf9] w-[36px] text-right shrink-0">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </SectionCard>
        )}
      </div>


      {/* Lead-Segmentierung im Zeitverlauf */}
      {segmentWeeklyData.length > 0 && (
        <SectionCard title="Lead-Segmentierung im Zeitverlauf">
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={segmentWeeklyData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="week" {...AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis {...AXIS_STYLE} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#78716c" }} />
              {allSegments.map((seg, i) => (
                <Bar
                  key={seg}
                  dataKey={seg}
                  stackId="seg"
                  fill={SEGMENT_COLORS[i % SEGMENT_COLORS.length]}
                  radius={i === allSegments.length - 1 ? [4, 4, 0, 0] : undefined}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      </>)}

      {/* ── Meta Tab ── */}
      {activeTab === "meta" && (
        <MetaTab />
      )}

      {/* ── Indeed Tab ── */}
      {activeTab === "indeed" && (
        <IndeedTab range={range} />
      )}

      {/* ── Kursnet Tab ── */}
      {activeTab === "kursnet" && (
        <SectionCard title="Kursnet Landing Page Funnel">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-1 flex items-stretch gap-4">
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={220}>
                  <FunnelChart>
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Funnel dataKey="value" data={perspFunnelData} isAnimationActive animationDuration={800} label={<></>}>
                      {perspFunnelData.map((_, i) => (
                        <Cell key={i} fill={FUNNEL_COLORS[i]} />
                      ))}
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col justify-around py-4">
                {perspFunnelData.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ background: FUNNEL_COLORS[i] }} />
                    <span className="text-[14px] font-semibold text-[#fafaf9] tabular-nums">{d.value}</span>
                    <span className="text-[13px] text-[#78716c]">{d.name}</span>
                  </div>
                ))}
                <div className="mt-1 pt-3 border-t border-[rgba(255,255,255,0.06)] space-y-1.5">
                  <div className="flex items-center justify-between gap-6">
                    <span className="text-[12px] text-[#57534e]">Visit → Gewonnen</span>
                    <span className="text-[16px] font-bold text-[#e2a96e] tabular-nums">
                      {perspSummary.totalVisits > 0 ? ((gewonnenKursnet / perspSummary.totalVisits) * 100).toFixed(1) : "0"}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-6">
                    <span className="text-[12px] text-[#57534e]">Konvertiert → Gewonnen</span>
                    <span className="text-[16px] font-bold text-[#5eead4] tabular-nums">
                      {perspSummary.converted > 0 ? ((gewonnenKursnet / perspSummary.converted) * 100).toFixed(1) : "0"}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-6">
                    <span className="text-[12px] text-[#57534e]">SQL → Gewonnen</span>
                    <span className="text-[16px] font-bold text-[#818cf8] tabular-nums">
                      {sqlKursnet > 0 ? ((gewonnenKursnet / sqlKursnet) * 100).toFixed(1) : "0"}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Gap Visualization */}
            <div className="flex flex-col justify-center space-y-4">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#57534e]">
                CRM-Erfassungs-Gap
              </h3>
              {[
                { label: "Perspective konvertiert", value: perspSummary.converted, color: "text-[#818cf8]" },
                { label: "Im CRM erfasst", value: kursnetLeadsCount, color: "text-[#5eead4]" },
                { label: "Fehlend", value: perspSummary.converted - kursnetLeadsCount, color: "text-amber-400" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-[12px] text-[#a8a29e]">{row.label}</span>
                  <span className={`text-[18px] font-semibold tabular-nums ${row.color}`}>{row.value}</span>
                </div>
              ))}
              <div className="h-2 rounded-full bg-[rgba(255,255,255,0.04)] overflow-hidden mt-1">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#5eead4] to-[#5eead4]"
                  style={{ width: `${perspSummary.converted > 0 ? Math.round((kursnetLeadsCount / perspSummary.converted) * 100) : 0}%` }}
                />
              </div>
              <p className="text-[11px] text-[#57534e]">
                {perspSummary.converted > 0 ? Math.round((kursnetLeadsCount / perspSummary.converted) * 100) : 0}% Erfassungsrate
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#57534e] mb-4">
                Visits nach Kurs-Titel
              </h3>
              {Object.entries(perspSummary.byTitle)
                .sort((a, b) => b[1].visits - a[1].visits)
                .slice(0, 6)
                .map(([title, data]) => {
                  const pct = perspSummary.totalVisits > 0 ? Math.round((data.visits / perspSummary.totalVisits) * 100) : 0;
                  return (
                    <div key={title} className="group">
                      <div className="flex items-center justify-between text-[12px] mb-1.5">
                        <span className="max-w-[260px] truncate text-[#a8a29e] group-hover:text-[#fafaf9] transition-colors" title={title}>
                          {title}
                        </span>
                        <div className="flex gap-3 tabular-nums">
                          <span className="text-[#57534e]">{data.visits}</span>
                          <span className="text-[#5eead4] font-medium">{data.converted}</span>
                        </div>
                      </div>
                      <div className="h-[3px] rounded-full bg-[rgba(255,255,255,0.04)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#e2a96e] to-[#818cf8] transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Meta Tab Component
   ═══════════════════════════════════════════════════════════════ */

function parseMetaCSV(text: string): MetaExportEntry[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  // Meta CSV uses quoted fields with commas inside — simple parse for quoted CSV
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; continue; }
      current += ch;
    }
    result.push(current.trim());
    return result;
  };
  const headers = parseLine(lines[0]);
  const keyMap = headers.map((h) => META_CSV_HEADERS[h]);

  return lines.slice(1).filter((l) => l.trim()).map((line) => {
    const vals = parseLine(line);
    const entry: Record<string, string | number> = {};
    keyMap.forEach((key, i) => {
      if (!key) return;
      const v = vals[i] ?? "";
      if (["adName", "delivery", "qualityRanking", "engagementRanking", "conversionRanking", "adSetName", "reportingStarts", "reportingEnds"].includes(key)) {
        entry[key] = v;
      } else {
        entry[key] = parseFloat(v) || 0;
      }
    });
    return entry as unknown as MetaExportEntry;
  }).filter((e) => e.adName);
}

function MetaTab() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = useState<"idle" | "preview" | "uploading" | "success" | "error">("idle");
  const [preview, setPreview] = useState<MetaExportEntry[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseMetaCSV(ev.target?.result as string);
        if (parsed.length === 0) {
          setErrorMsg("Keine gültigen Daten in der CSV gefunden.");
          setUploadState("error");
          return;
        }
        setPreview(parsed);
        setUploadState("preview");
      } catch {
        setErrorMsg("CSV konnte nicht gelesen werden.");
        setUploadState("error");
      }
    };
    reader.readAsText(file);
  }, []);

  const handleUpload = useCallback(async () => {
    setUploadState("uploading");
    try {
      const res = await fetch("/api/meta-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: preview }),
      });
      const result = await res.json();
      if (!res.ok) {
        setErrorMsg(result.error || "Upload fehlgeschlagen");
        setUploadState("error");
        return;
      }
      setUploadState("success");
    } catch {
      setErrorMsg("Netzwerkfehler beim Upload");
      setUploadState("error");
    }
  }, [preview]);

  const resetUpload = useCallback(() => {
    setUploadState("idle");
    setPreview([]);
    setErrorMsg("");
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  // Gewonnen aus CRM
  const metaGewonnen = leads.filter(
    (l) => (l.platform === "Instagram" || l.platform === "Facebook") && l.leadStatus === "Gewonnen"
  ).length;
  const costPerWon = metaGewonnen > 0 ? metaExportTotalSpend / metaGewonnen : 0;

  const activeAds = metaExport.filter((d) => d.delivery === "active").length;

  // Gewonnen pro Creative aus CRM — über adId zuordnen, nicht adName
  // Zuerst: welche adIds gehören zu welchem (adName + adSetName)?
  // Da Meta-Export keine adId hat, matchen wir Leads über ihre adId zu den
  // Meta-Einträgen anhand der adName+adSetName Kombination aus den Leads.
  const gewonnenByCreative = useMemo(() => {
    const metaGewonnenLeads = leads.filter(
      (l) => (l.platform === "Instagram" || l.platform === "Facebook") && l.leadStatus === "Gewonnen" && l.adId
    );
    // Map adId → adName (from CRM leads, since meta-export has no adId)
    const adIdToName = new Map<string, string>();
    leads
      .filter((l) => (l.platform === "Instagram" || l.platform === "Facebook") && l.adId)
      .forEach((l) => adIdToName.set(l.adId, l.adName));
    // Find which meta-export entries share each adId by checking if the CRM lead's
    // adId maps to the same adName. Then use adSetName from meta-export to differentiate.
    // Since we can't link adId→adSetName from CRM, we count per unique adId and assign
    // to the meta-export row with the highest spend for that adName.
    const countByAdId = new Map<string, number>();
    metaGewonnenLeads.forEach((l) => countByAdId.set(l.adId, (countByAdId.get(l.adId) || 0) + 1));
    // Aggregate: adName → total gewonnen (from distinct adIds)
    const countByAdName = new Map<string, number>();
    countByAdId.forEach((count, adId) => {
      const name = adIdToName.get(adId) || "";
      if (name) countByAdName.set(name, (countByAdName.get(name) || 0) + count);
    });
    // Assign gewonnen only to the highest-spend meta-export entry per adName
    const assigned = new Set<string>();
    const result = new Map<string, number>();
    [...metaExport].sort((a, b) => b.amountSpent - a.amountSpent).forEach((ad) => {
      const key = ad.adName;
      if (!assigned.has(key) && countByAdName.has(key)) {
        result.set(`${ad.adName}|||${ad.adSetName}`, countByAdName.get(key)!);
        assigned.add(key);
      }
    });
    return result;
  }, []);

  // Sort by spend for chart
  const chartData = [...metaExport]
    .sort((a, b) => b.amountSpent - a.amountSpent)
    .map((d) => ({
      name: d.adName.length > 30 ? d.adName.slice(0, 30) + "…" : d.adName,
      spend: d.amountSpent,
      results: d.results,
      cpl: d.costPerResult,
    }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 stagger-in">
        <KpiCard label="Gewonnen" value={metaGewonnen} sub={`von ${leads.filter((l) => l.platform === "Instagram" || l.platform === "Facebook").length} Meta-Leads`} accent />
        <KpiCard label="Cost per Won" value={costPerWon > 0 ? `${costPerWon.toFixed(2)} €` : "—"} sub={`${metaExportTotalSpend.toFixed(0)} € Spend ÷ ${metaGewonnen} Gewonnen`} />
        <KpiCard label="Leads (Meta)" value={metaExportTotalResults} sub={`Ø ${metaExportAvgCPL.toFixed(2)} € CPL`} />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 stagger-in">
        <KpiCard label="Gesamt-Spend" value={`${metaExportTotalSpend.toFixed(0)} €`} sub={`${metaExport.length} Creatives · ${activeAds} aktiv`} />
        <KpiCard label="Impressions" value={metaExportTotalImpressions.toLocaleString()} sub={`${metaExportTotalClicks.toLocaleString()} Link-Klicks`} />
        <KpiCard label="CTR (Link)" value={`${(metaExportTotalImpressions > 0 ? (metaExportTotalClicks / metaExportTotalImpressions) * 100 : 0).toFixed(2)}%`} sub={`${metaExport.length} Creatives`} />
      </div>

      {/* Creative Performance Table */}
      <SectionCard title="Creative-Leistung">
        <div className="overflow-x-auto">
          <table className="w-full premium-table">
            <thead>
              <tr>
                <th className="text-left pl-2">Creative</th>
                <th className="text-left pl-2">Ad Set</th>
                <th className="text-center">Status</th>
                <th className="text-right pr-4">Spend</th>
                <th className="text-right pr-4">Leads</th>
                <th className="text-right pr-4">CPL</th>
                <th className="text-right pr-4">Impr.</th>
                <th className="text-right pr-4">Gewonnen</th>
                <th className="text-right pr-4">Klicks</th>
                <th className="text-right pr-4">Reach</th>
              </tr>
            </thead>
            <tbody>
              {[...metaExport].sort((a, b) => b.amountSpent - a.amountSpent).map((ad) => (
                <tr key={ad.adName}>
                  <td className="pl-2 pr-4 text-[13px] font-medium text-[#fafaf9]">{ad.adName}</td>
                  <td className="pl-2 pr-4 text-[12px] text-[#57534e]">{ad.adSetName}</td>
                  <td className="text-center">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                      ad.delivery === "active"
                        ? "bg-[rgba(94,234,212,0.1)] text-[#5eead4]"
                        : "bg-[rgba(255,255,255,0.04)] text-[#57534e]"
                    }`}>
                      {ad.delivery === "active" ? "Aktiv" : ad.delivery === "inactive" ? "Inaktiv" : "Gestoppt"}
                    </span>
                  </td>
                  <td className="text-right pr-4 tabular-nums text-[#78716c]">{ad.amountSpent.toFixed(2)} €</td>
                  <td className="text-right pr-4 tabular-nums font-medium text-[#e2a96e]">{ad.results}</td>
                  <td className="text-right pr-4 tabular-nums text-[#78716c]">{ad.costPerResult > 0 ? `${ad.costPerResult.toFixed(2)} €` : "—"}</td>
                  <td className="text-right pr-4 tabular-nums text-[#78716c]">{ad.impressions.toLocaleString()}</td>
                  <td className="text-right pr-4 tabular-nums font-semibold text-[#5eead4]">{gewonnenByCreative.get(`${ad.adName}|||${ad.adSetName}`) || 0}</td>
                  <td className="text-right pr-4 tabular-nums text-[#78716c]">{ad.linkClicks}</td>
                  <td className="text-right pr-4 tabular-nums text-[#78716c]">{ad.reach.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Spend & Leads Chart */}
      <SectionCard title="Spend & Leads pro Creative">
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={chartData} barGap={4} layout="vertical">
            <XAxis type="number" {...AXIS_STYLE} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" {...AXIS_STYLE} width={200} axisLine={false} tickLine={false} interval={0} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(val, name) => {
              if (name === "spend") return [`${(val as number).toFixed(2)} €`, "Spend"];
              if (name === "cpl") return [`${(val as number).toFixed(2)} €`, "CPL"];
              return [val, "Leads"];
            }} />
            <Bar dataKey="spend" fill={PALETTE.indigo} name="spend" radius={[0, 6, 6, 0]} />
            <Bar dataKey="results" fill={PALETTE.teal} name="results" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* CSV Import */}
      <SectionCard title="Daten-Import">
        <div className="space-y-4">
          <p className="text-[13px] text-[#57534e]">
            Meta Ads CSV-Export hochladen um die Daten zu aktualisieren. Nach dem Import wird automatisch ein neuer Deploy ausgelöst.
          </p>

          {uploadState === "idle" && (
            <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-[rgba(255,255,255,0.1)] hover:border-[rgba(226,169,110,0.3)] hover:bg-[rgba(226,169,110,0.04)] transition-all cursor-pointer">
              <Upload className="h-5 w-5 text-[#57534e]" />
              <span className="text-[13px] text-[#a8a29e]">CSV-Datei auswählen</span>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
            </label>
          )}

          {uploadState === "preview" && (
            <div className="space-y-3">
              <div className="text-[13px] text-[#a8a29e]">{preview.length} Creatives erkannt</div>
              <div className="overflow-x-auto max-h-[200px] overflow-y-auto rounded-lg border border-[rgba(255,255,255,0.06)]">
                <table className="w-full premium-table text-[12px]">
                  <thead>
                    <tr>
                      <th className="text-left pl-3">Creative</th>
                      <th className="text-right pr-3">Spend</th>
                      <th className="text-right pr-3">Leads</th>
                      <th className="text-right pr-3">CPL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row) => (
                      <tr key={row.adName}>
                        <td className="pl-3 text-[#a8a29e]">{row.adName}</td>
                        <td className="text-right pr-3 tabular-nums text-[#78716c]">{row.amountSpent.toFixed(2)} €</td>
                        <td className="text-right pr-3 tabular-nums text-[#e2a96e]">{row.results}</td>
                        <td className="text-right pr-3 tabular-nums text-[#78716c]">{row.costPerResult > 0 ? `${row.costPerResult.toFixed(2)} €` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handleUpload} className="px-4 py-2 rounded-lg bg-[rgba(226,169,110,0.12)] text-[#e2a96e] text-[13px] font-medium border border-[rgba(226,169,110,0.25)] hover:bg-[rgba(226,169,110,0.2)] transition-all">
                  Importieren & Deployen
                </button>
                <button onClick={resetUpload} className="px-4 py-2 rounded-lg text-[#78716c] text-[13px] font-medium border border-[rgba(255,255,255,0.06)] hover:text-[#a8a29e] transition-all">
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {uploadState === "uploading" && (
            <div className="flex items-center gap-3 py-3">
              <Loader2 className="h-5 w-5 text-[#e2a96e] animate-spin" />
              <span className="text-[13px] text-[#a8a29e]">Daten werden importiert und committed…</span>
            </div>
          )}

          {uploadState === "success" && (
            <div className="flex items-center gap-3 py-3">
              <CheckCircle className="h-5 w-5 text-[#5eead4]" />
              <span className="text-[13px] text-[#5eead4]">Import erfolgreich! Deploy wird automatisch ausgelöst.</span>
              <button onClick={resetUpload} className="text-[12px] text-[#57534e] hover:text-[#a8a29e] ml-2">Neuer Import</button>
            </div>
          )}

          {uploadState === "error" && (
            <div className="flex items-center gap-3 py-3">
              <AlertCircle className="h-5 w-5 text-[#f87171]" />
              <span className="text-[13px] text-[#f87171]">{errorMsg}</span>
              <button onClick={resetUpload} className="text-[12px] text-[#57534e] hover:text-[#a8a29e] ml-2">Erneut versuchen</button>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Indeed Tab Component
   ═══════════════════════════════════════════════════════════════ */

function parseIndeedCSV(text: string): IndeedDailyEntry[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",");
  const keyMap = headers.map((h) => INDEED_CSV_HEADERS[h.trim()]);

  return lines.slice(1).map((line) => {
    const vals = line.split(",");
    const entry: Record<string, string | number> = {};
    keyMap.forEach((key, i) => {
      if (!key) return;
      entry[key] = key === "date" ? vals[i].trim() : parseFloat(vals[i]) || 0;
    });
    return entry as unknown as IndeedDailyEntry;
  }).filter((e) => e.date);
}

/** Quoted-field-aware CSV parser (handles commas inside quotes) */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

function parseIndeedBundeslandCSV(text: string): IndeedBundeslandEntry[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  const keyMap = headers.map((h) => INDEED_BL_CSV_HEADERS[h.trim()]);

  return lines.slice(1).map((line) => {
    const vals = parseCSVLine(line);
    const entry: Record<string, string | number> = {};
    keyMap.forEach((key, i) => {
      if (!key) return;
      entry[key] = key === "bundesland" ? vals[i].trim() : parseFloat(vals[i]) || 0;
    });
    return entry as unknown as IndeedBundeslandEntry;
  }).filter((e) => e.bundesland);
}

function parseIndeedStellenCSV(text: string): IndeedStelleEntry[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  const keyMap = headers.map((h) => INDEED_STELLEN_CSV_HEADERS[h.trim()]);

  return lines.slice(1).map((line) => {
    const vals = parseCSVLine(line);
    const entry: Record<string, string | number> = {};
    keyMap.forEach((key, i) => {
      if (!key) return;
      const strKeys = ["stelle", "bundesland", "stadt"];
      entry[key] = strKeys.includes(key) ? vals[i].trim() : parseFloat(vals[i]) || 0;
    });
    return entry as unknown as IndeedStelleEntry;
  }).filter((e) => e.stelle);
}

/** Reusable upload section component */
function IndeedUploadSection({ title, description, countLabel, fileRef, uploadState, preview, errorMsg, onFile, onUpload, onReset, previewTable }: {
  title: string;
  description: string;
  countLabel: string;
  fileRef: React.RefObject<HTMLInputElement | null>;
  uploadState: "idle" | "preview" | "uploading" | "success" | "error";
  preview: unknown[];
  errorMsg: string;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
  onReset: () => void;
  previewTable: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-[13px] font-medium text-[#a8a29e]">{title}</h4>
      <p className="text-[12px] text-[#57534e]">{description}</p>

      {uploadState === "idle" && (
        <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-[rgba(255,255,255,0.1)] hover:border-[rgba(226,169,110,0.3)] hover:bg-[rgba(226,169,110,0.04)] transition-all cursor-pointer">
          <Upload className="h-4 w-4 text-[#57534e]" />
          <span className="text-[12px] text-[#a8a29e]">CSV-Datei auswählen</span>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onFile} />
        </label>
      )}

      {uploadState === "preview" && (
        <div className="space-y-3">
          <div className="text-[12px] text-[#a8a29e]">{preview.length} {countLabel} erkannt</div>
          {previewTable}
          <div className="flex items-center gap-3">
            <button onClick={onUpload} className="px-4 py-2 rounded-lg bg-[rgba(226,169,110,0.12)] text-[#e2a96e] text-[12px] font-medium border border-[rgba(226,169,110,0.25)] hover:bg-[rgba(226,169,110,0.2)] transition-all">
              Importieren & Deployen
            </button>
            <button onClick={onReset} className="px-4 py-2 rounded-lg text-[#78716c] text-[12px] font-medium border border-[rgba(255,255,255,0.06)] hover:text-[#a8a29e] transition-all">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {uploadState === "uploading" && (
        <div className="flex items-center gap-3 py-2">
          <Loader2 className="h-4 w-4 text-[#e2a96e] animate-spin" />
          <span className="text-[12px] text-[#a8a29e]">Daten werden importiert…</span>
        </div>
      )}

      {uploadState === "success" && (
        <div className="flex items-center gap-3 py-2">
          <CheckCircle className="h-4 w-4 text-[#5eead4]" />
          <span className="text-[12px] text-[#5eead4]">Import erfolgreich!</span>
          <button onClick={onReset} className="text-[11px] text-[#57534e] hover:text-[#a8a29e] ml-2">Neuer Import</button>
        </div>
      )}

      {uploadState === "error" && (
        <div className="flex items-center gap-3 py-2">
          <AlertCircle className="h-4 w-4 text-[#f87171]" />
          <span className="text-[12px] text-[#f87171]">{errorMsg}</span>
          <button onClick={onReset} className="text-[11px] text-[#57534e] hover:text-[#a8a29e] ml-2">Erneut versuchen</button>
        </div>
      )}
    </div>
  );
}

function IndeedTab({ range }: { range: TimeRange }) {
  /* ── Daily upload state ── */
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = useState<"idle" | "preview" | "uploading" | "success" | "error">("idle");
  const [preview, setPreview] = useState<IndeedDailyEntry[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  /* ── Bundesland upload state ── */
  const blFileRef = useRef<HTMLInputElement>(null);
  const [blUploadState, setBlUploadState] = useState<"idle" | "preview" | "uploading" | "success" | "error">("idle");
  const [blPreview, setBlPreview] = useState<IndeedBundeslandEntry[]>([]);
  const [blErrorMsg, setBlErrorMsg] = useState("");

  /* ── Stellen upload state ── */
  const stFileRef = useRef<HTMLInputElement>(null);
  const [stUploadState, setStUploadState] = useState<"idle" | "preview" | "uploading" | "success" | "error">("idle");
  const [stPreview, setStPreview] = useState<IndeedStelleEntry[]>([]);
  const [stErrorMsg, setStErrorMsg] = useState("");

  /* ── Daily handlers ── */
  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseIndeedCSV(ev.target?.result as string);
        if (parsed.length === 0) { setErrorMsg("Keine gültigen Daten in der CSV gefunden."); setUploadState("error"); return; }
        setPreview(parsed);
        setUploadState("preview");
      } catch { setErrorMsg("CSV konnte nicht gelesen werden."); setUploadState("error"); }
    };
    reader.readAsText(file);
  }, []);

  const handleUpload = useCallback(async () => {
    setUploadState("uploading");
    try {
      const res = await fetch("/api/indeed-import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: preview }) });
      const result = await res.json();
      if (!res.ok) { setErrorMsg(result.error || "Upload fehlgeschlagen"); setUploadState("error"); return; }
      setUploadState("success");
    } catch { setErrorMsg("Netzwerkfehler beim Upload"); setUploadState("error"); }
  }, [preview]);

  const resetUpload = useCallback(() => {
    setUploadState("idle"); setPreview([]); setErrorMsg("");
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  /* ── Bundesland handlers ── */
  const handleBlFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseIndeedBundeslandCSV(ev.target?.result as string);
        if (parsed.length === 0) { setBlErrorMsg("Keine gültigen Daten in der CSV gefunden."); setBlUploadState("error"); return; }
        setBlPreview(parsed);
        setBlUploadState("preview");
      } catch { setBlErrorMsg("CSV konnte nicht gelesen werden."); setBlUploadState("error"); }
    };
    reader.readAsText(file);
  }, []);

  const handleBlUpload = useCallback(async () => {
    setBlUploadState("uploading");
    try {
      const res = await fetch("/api/indeed-bundesland-import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: blPreview }) });
      const result = await res.json();
      if (!res.ok) { setBlErrorMsg(result.error || "Upload fehlgeschlagen"); setBlUploadState("error"); return; }
      setBlUploadState("success");
    } catch { setBlErrorMsg("Netzwerkfehler beim Upload"); setBlUploadState("error"); }
  }, [blPreview]);

  const resetBlUpload = useCallback(() => {
    setBlUploadState("idle"); setBlPreview([]); setBlErrorMsg("");
    if (blFileRef.current) blFileRef.current.value = "";
  }, []);

  /* ── Stellen handlers ── */
  const handleStFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseIndeedStellenCSV(ev.target?.result as string);
        if (parsed.length === 0) { setStErrorMsg("Keine gültigen Daten in der CSV gefunden."); setStUploadState("error"); return; }
        setStPreview(parsed);
        setStUploadState("preview");
      } catch { setStErrorMsg("CSV konnte nicht gelesen werden."); setStUploadState("error"); }
    };
    reader.readAsText(file);
  }, []);

  const handleStUpload = useCallback(async () => {
    setStUploadState("uploading");
    try {
      const res = await fetch("/api/indeed-stellen-import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: stPreview }) });
      const result = await res.json();
      if (!res.ok) { setStErrorMsg(result.error || "Upload fehlgeschlagen"); setStUploadState("error"); return; }
      setStUploadState("success");
    } catch { setStErrorMsg("Netzwerkfehler beim Upload"); setStUploadState("error"); }
  }, [stPreview]);

  const resetStUpload = useCallback(() => {
    setStUploadState("idle"); setStPreview([]); setStErrorMsg("");
    if (stFileRef.current) stFileRef.current.value = "";
  }, []);

  // Filter indeed data by range
  const filtered = useMemo(() => {
    if (range === "all") return indeedDaily;
    const days = range === "7d" ? 7 : 30;
    const maxDate = indeedDaily.reduce((max, d) => d.date > max ? d.date : max, "");
    const cutoff = new Date(new Date(maxDate + "T00:00:00").getTime() - days * 86_400_000);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return indeedDaily.filter((d) => d.date >= cutoffStr);
  }, [range]);

  const totalSpend = filtered.reduce((s, d) => s + d.spend, 0);
  const totalClicks = filtered.reduce((s, d) => s + d.clicks, 0);
  const totalImpressions = filtered.reduce((s, d) => s + d.impressions, 0);
  const totalApplications = filtered.reduce((s, d) => s + d.applications, 0);
  const avgCPA = totalApplications > 0 ? totalSpend / totalApplications : 0;
  const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const overallCTR = totalImpressions > 0 ? totalClicks / totalImpressions : 0;

  // Indeed-Leads aus CRM (gewonnen nach gewonnenAm-Datum gefiltert)
  const indeedLeads = useMemo(() => {
    const indeedAll = leads.filter((l) => l.platform === "Indeed");
    const allFiltered = filterLeadsByRange(indeedAll, range);
    const gewonnenAll = indeedAll.filter((l) => l.leadStatus === "Gewonnen");

    let gewonnenFiltered = gewonnenAll;
    if (range !== "all") {
      const days = range === "7d" ? 7 : 30;
      const maxDate = filtered.length > 0 ? filtered[filtered.length - 1].date : "";
      if (maxDate) {
        const cutoff = new Date(new Date(maxDate + "T00:00:00").getTime() - days * 86_400_000);
        gewonnenFiltered = gewonnenAll.filter((l) => {
          if (l.gewonnenAm) {
            const parts = l.gewonnenAm.split(" ")[0].split(".");
            const d = new Date(+parts[2], +parts[1] - 1, +parts[0]);
            return d >= cutoff;
          }
          return false;
        });
      }
    }
    return { total: allFiltered.length, gewonnen: gewonnenFiltered.length };
  }, [range, filtered]);
  const costPerWon = indeedLeads.gewonnen > 0 ? totalSpend / indeedLeads.gewonnen : 0;

  const chartData = filtered.map((d) => ({
    date: new Date(d.date + "T00:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "short" }),
    clicks: d.clicks,
    applications: d.applications,
    spend: d.spend,
    cpa: d.cpa,
  }));

  const dateRange = filtered.length > 0
    ? `${new Date(filtered[0].date).toLocaleDateString("de-DE")} – ${new Date(filtered[filtered.length - 1].date).toLocaleDateString("de-DE")}`
    : "Keine Daten";

  /* ── Bundesland-Ranking (sorted by applications desc) ── */
  const blSorted = useMemo(() =>
    [...indeedBundesland].sort((a, b) => b.applications - a.applications),
  []);

  const blChartData = blSorted.map((d) => ({
    bundesland: d.bundesland.length > 20 ? d.bundesland.slice(0, 18) + "…" : d.bundesland,
    applications: d.applications,
    spend: d.spend,
    cpa: d.applications > 0 ? d.spend / d.applications : 0,
    clicks: d.clicks,
    impressions: d.impressions,
  }));

  /* ── Bundesland KPIs ── */
  const blKpis = useMemo(() => {
    if (indeedBundesland.length === 0) return null;
    const withApps = indeedBundesland.filter((d) => d.applications > 0);
    const bestCPA = withApps.length > 0 ? withApps.reduce((best, d) => (d.cpa < best.cpa && d.cpa > 0) ? d : best, withApps[0]) : null;
    const mostApps = indeedBundesland.reduce((best, d) => d.applications > best.applications ? d : best, indeedBundesland[0]);
    const bestAR = indeedBundesland.reduce((best, d) => d.ar > best.ar ? d : best, indeedBundesland[0]);
    const worstAR = indeedBundesland.filter((d) => d.clicks > 0).reduce((worst, d) => d.ar < worst.ar ? d : worst, indeedBundesland[0]);
    return { bestCPA, mostApps, bestAR, worstAR };
  }, []);

  /* ── Funnel/Conversion table per Bundesland ── */
  const blAvgCTR = useMemo(() => {
    const totalImp = indeedBundesland.reduce((s, d) => s + d.impressions, 0);
    const totalCl = indeedBundesland.reduce((s, d) => s + d.clicks, 0);
    return totalImp > 0 ? totalCl / totalImp : 0;
  }, []);
  const blAvgASR = useMemo(() => {
    const totalCl = indeedBundesland.reduce((s, d) => s + d.clicks, 0);
    const totalSt = indeedBundesland.reduce((s, d) => s + d.startedApplications, 0);
    return totalCl > 0 ? totalSt / totalCl : 0;
  }, []);
  const blAvgCR = useMemo(() => {
    const totalSt = indeedBundesland.reduce((s, d) => s + d.startedApplications, 0);
    const totalAp = indeedBundesland.reduce((s, d) => s + d.applications, 0);
    return totalSt > 0 ? totalAp / totalSt : 0;
  }, []);
  const blAvgAR = useMemo(() => {
    const totalCl = indeedBundesland.reduce((s, d) => s + d.clicks, 0);
    const totalAp = indeedBundesland.reduce((s, d) => s + d.applications, 0);
    return totalCl > 0 ? totalAp / totalCl : 0;
  }, []);

  /* ── Wochen-Kohorten aus täglichen Daten ── */
  type WeeklySort = "kw" | "impressions" | "clicks" | "applications" | "spend" | "cpa" | "cpc";
  const [weeklySortKey, setWeeklySortKey] = useState<WeeklySort>("kw");
  const [weeklySortDir, setWeeklySortDir] = useState<"asc" | "desc">("asc");

  const toggleWeeklySort = useCallback((key: WeeklySort) => {
    if (weeklySortKey === key) {
      setWeeklySortDir((d) => d === "asc" ? "desc" : "asc");
    } else {
      setWeeklySortKey(key);
      setWeeklySortDir(key === "kw" ? "asc" : "desc");
    }
  }, [weeklySortKey]);

  const weeklyData = useMemo(() => {
    const weeks: Record<string, { kw: string; kwNum: number; clicks: number; applications: number; spend: number; impressions: number }> = {};
    filtered.forEach((d) => {
      const date = new Date(d.date + "T00:00:00");
      const num = getISOWeek(date);
      const wk = `KW ${num}`;
      if (!weeks[wk]) weeks[wk] = { kw: wk, kwNum: num, clicks: 0, applications: 0, spend: 0, impressions: 0 };
      weeks[wk].clicks += d.clicks;
      weeks[wk].applications += d.applications;
      weeks[wk].spend += d.spend;
      weeks[wk].impressions += d.impressions;
    });
    const rows = Object.values(weeks).map((w) => ({
      ...w,
      cpa: w.applications > 0 ? w.spend / w.applications : 0,
      cpc: w.clicks > 0 ? w.spend / w.clicks : 0,
    }));
    rows.sort((a, b) => {
      const valA = weeklySortKey === "kw" ? a.kwNum : a[weeklySortKey];
      const valB = weeklySortKey === "kw" ? b.kwNum : b[weeklySortKey];
      return weeklySortDir === "asc" ? valA - valB : valB - valA;
    });
    return rows;
  }, [filtered, weeklySortKey, weeklySortDir]);

  /** Color helper for conversion rates */
  const rateColor = (val: number, avg: number) =>
    val >= avg * 1.1 ? "#5eead4" : val <= avg * 0.9 ? "#f87171" : "#a8a29e";

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 stagger-in">
        <KpiCard label="Gewonnen" value={indeedLeads.gewonnen} sub={`von ${indeedLeads.total} Indeed-Leads`} accent />
        <KpiCard label="Cost per Won" value={costPerWon > 0 ? `${costPerWon.toFixed(2)} €` : "—"} sub={`${totalSpend.toFixed(0)} € Spend ÷ ${indeedLeads.gewonnen} Gewonnen`} />
        <KpiCard label="Bewerbungen" value={totalApplications} sub={`Ø ${avgCPA.toFixed(2)} € CPA`} />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 stagger-in">
        <KpiCard label="Gesamt-Spend" value={`${totalSpend.toFixed(0)} €`} sub={dateRange} />
        <KpiCard label="Klicks" value={totalClicks.toLocaleString()} sub={`Ø ${avgCPC.toFixed(2)} € CPC`} />
        <KpiCard label="CTR" value={`${(overallCTR * 100).toFixed(1)}%`} sub={`${filtered.length} Tage erfasst`} />
      </div>

      {/* Klicks & Bewerbungen Chart */}
      <SectionCard title="Klicks & Bewerbungen im Zeitverlauf">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" {...AXIS_STYLE} axisLine={false} tickLine={false} angle={-35} textAnchor="end" height={55} />
            <YAxis yAxisId="left" {...AXIS_STYLE} axisLine={false} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" {...AXIS_STYLE} axisLine={false} tickLine={false} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#78716c" }} />
            <Bar yAxisId="left" dataKey="clicks" name="Klicks" fill={PALETTE.indigo} radius={[4, 4, 0, 0]} />
            <Bar yAxisId="left" dataKey="applications" name="Bewerbungen" fill={PALETTE.teal} radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="cpa" name="CPA (€)" stroke={PALETTE.amber} strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* Tägliche Ausgaben Chart */}
      <SectionCard title="Tägliche Ausgaben">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" {...AXIS_STYLE} axisLine={false} tickLine={false} angle={-35} textAnchor="end" height={55} />
            <YAxis {...AXIS_STYLE} axisLine={false} tickLine={false} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(val) => typeof val === "number" ? `${val.toFixed(2)} €` : val} />
            <Bar dataKey="spend" name="Ausgaben" fill={PALETTE.amber} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* ── Bundesland KPIs ── */}
      {blKpis && indeedBundesland.length > 0 && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 stagger-in">
          <KpiCard
            label="Günstigster CPA"
            value={blKpis.bestCPA ? `${blKpis.bestCPA.cpa.toFixed(2)} €` : "—"}
            sub={blKpis.bestCPA?.bundesland ?? ""}
            accent
          />
          <KpiCard
            label="Meiste Bewerbungen"
            value={blKpis.mostApps.applications}
            sub={blKpis.mostApps.bundesland}
          />
          <KpiCard
            label="Höchste Bew.-Rate"
            value={`${(blKpis.bestAR.ar * 100).toFixed(1)}%`}
            sub={blKpis.bestAR.bundesland}
          />
          <KpiCard
            label="Niedrigste Bew.-Rate"
            value={`${(blKpis.worstAR.ar * 100).toFixed(1)}%`}
            sub={blKpis.worstAR.bundesland}
          />
        </div>
      )}

      {/* ── Bundesland-Ranking Chart ── */}
      {blChartData.length > 0 && (
        <SectionCard title="Performance nach Bundesland">
          <ResponsiveContainer width="100%" height={Math.max(300, blChartData.length * 40)}>
            <ComposedChart data={blChartData} layout="vertical" barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis xAxisId="apps" type="number" {...AXIS_STYLE} axisLine={false} tickLine={false} orientation="bottom" />
              <XAxis xAxisId="spend" type="number" {...AXIS_STYLE} axisLine={false} tickLine={false} orientation="top" tickFormatter={(v) => `${v.toFixed(0)} €`} />
              <YAxis dataKey="bundesland" type="category" {...AXIS_STYLE} axisLine={false} tickLine={false} width={160} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(val, name) => {
                if (name === "Ausgaben" || name === "CPA") return typeof val === "number" ? `${val.toFixed(2)} €` : val;
                return val;
              }} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#78716c" }} />
              <Bar xAxisId="apps" dataKey="applications" name="Bewerbungen" fill={PALETTE.indigo} radius={[0, 4, 4, 0]} />
              <Bar xAxisId="spend" dataKey="spend" name="Ausgaben" fill={PALETTE.amber} radius={[0, 4, 4, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      {/* ── Funnel / Conversion-Tabelle pro Bundesland ── */}
      {blSorted.length > 0 && (
        <SectionCard title="Conversion-Rates nach Bundesland">
          <div className="overflow-x-auto rounded-lg border border-[rgba(255,255,255,0.06)]">
            <table className="w-full premium-table text-[12px]">
              <thead>
                <tr>
                  <th className="text-left pl-3">Bundesland</th>
                  <th className="text-right pr-3">Impressions</th>
                  <th className="text-right pr-3">Klicks</th>
                  <th className="text-right pr-3">CTR</th>
                  <th className="text-right pr-3">Begonnene</th>
                  <th className="text-right pr-3">ASR</th>
                  <th className="text-right pr-3">Bewerbungen</th>
                  <th className="text-right pr-3">Compl. Rate</th>
                  <th className="text-right pr-3">AR</th>
                  <th className="text-right pr-3">Spend</th>
                  <th className="text-right pr-3">CPA</th>
                </tr>
              </thead>
              <tbody>
                {blSorted.map((row) => (
                  <tr key={row.bundesland}>
                    <td className="pl-3 text-[#a8a29e] font-medium">{row.bundesland}</td>
                    <td className="text-right pr-3 tabular-nums text-[#78716c]">{row.impressions.toLocaleString()}</td>
                    <td className="text-right pr-3 tabular-nums text-[#78716c]">{row.clicks.toLocaleString()}</td>
                    <td className="text-right pr-3 tabular-nums" style={{ color: rateColor(row.ctr, blAvgCTR) }}>
                      {(row.ctr * 100).toFixed(1)}%
                    </td>
                    <td className="text-right pr-3 tabular-nums text-[#78716c]">{row.startedApplications}</td>
                    <td className="text-right pr-3 tabular-nums" style={{ color: rateColor(row.asr, blAvgASR) }}>
                      {(row.asr * 100).toFixed(1)}%
                    </td>
                    <td className="text-right pr-3 tabular-nums text-[#e2a96e] font-medium">{row.applications}</td>
                    <td className="text-right pr-3 tabular-nums" style={{ color: rateColor(row.completionRate, blAvgCR) }}>
                      {(row.completionRate * 100).toFixed(1)}%
                    </td>
                    <td className="text-right pr-3 tabular-nums" style={{ color: rateColor(row.ar, blAvgAR) }}>
                      {(row.ar * 100).toFixed(1)}%
                    </td>
                    <td className="text-right pr-3 tabular-nums text-[#78716c]">{row.spend.toFixed(2)} €</td>
                    <td className="text-right pr-3 tabular-nums text-[#78716c]">{row.cpa > 0 ? `${row.cpa.toFixed(2)} €` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* ── Wochen-Kohorten ── */}
      {weeklyData.length > 0 && (() => {
        const SortTh = ({ label, sortKey, align = "right" }: { label: string; sortKey: WeeklySort; align?: "left" | "right" }) => (
          <th
            className={`${align === "left" ? "text-left pl-3" : "text-right pr-3"} cursor-pointer select-none hover:text-[#e2a96e] transition-colors`}
            onClick={() => toggleWeeklySort(sortKey)}
          >
            <span className="inline-flex items-center gap-1">
              {align === "right" && weeklySortKey === sortKey && (weeklySortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
              {label}
              {align === "left" && weeklySortKey === sortKey && (weeklySortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
            </span>
          </th>
        );
        return (
          <SectionCard title="Wochen-Kohorten">
            <div className="overflow-x-auto rounded-lg border border-[rgba(255,255,255,0.06)]">
              <table className="w-full premium-table text-[12px]">
                <thead>
                  <tr>
                    <SortTh label="Woche" sortKey="kw" align="left" />
                    <SortTh label="Impressions" sortKey="impressions" />
                    <SortTh label="Klicks" sortKey="clicks" />
                    <SortTh label="Bewerbungen" sortKey="applications" />
                    <SortTh label="Spend" sortKey="spend" />
                    <SortTh label="CPA" sortKey="cpa" />
                    <SortTh label="CPC" sortKey="cpc" />
                  </tr>
                </thead>
                <tbody>
                  {weeklyData.map((w) => (
                    <tr key={w.kw}>
                      <td className="pl-3 text-[#a8a29e] font-medium">{w.kw}</td>
                      <td className="text-right pr-3 tabular-nums text-[#78716c]">{w.impressions.toLocaleString()}</td>
                      <td className="text-right pr-3 tabular-nums text-[#78716c]">{w.clicks.toLocaleString()}</td>
                      <td className="text-right pr-3 tabular-nums text-[#e2a96e] font-medium">{w.applications}</td>
                      <td className="text-right pr-3 tabular-nums text-[#78716c]">{w.spend.toFixed(2)} €</td>
                      <td className="text-right pr-3 tabular-nums text-[#78716c]">{w.cpa > 0 ? `${w.cpa.toFixed(2)} €` : "—"}</td>
                      <td className="text-right pr-3 tabular-nums text-[#78716c]">{w.cpc > 0 ? `${w.cpc.toFixed(2)} €` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        );
      })()}

      {/* ── Daten-Import (3 Bereiche) ── */}
      <SectionCard title="Daten-Import">
        <div className="space-y-6">
          {/* 1. Tägliche Daten */}
          <IndeedUploadSection
            title="Tägliche Daten"
            description="Indeed CSV-Export &quot;Nach Zeit bzw Tag&quot; hochladen."
            countLabel="Tage"
            fileRef={fileRef}
            uploadState={uploadState}
            preview={preview}
            errorMsg={errorMsg}
            onFile={handleFile}
            onUpload={handleUpload}
            onReset={resetUpload}
            previewTable={
              <div className="overflow-x-auto max-h-[200px] overflow-y-auto rounded-lg border border-[rgba(255,255,255,0.06)]">
                <table className="w-full premium-table text-[12px]">
                  <thead>
                    <tr>
                      <th className="text-left pl-3">Datum</th>
                      <th className="text-right pr-3">Impressions</th>
                      <th className="text-right pr-3">Klicks</th>
                      <th className="text-right pr-3">Bewerbungen</th>
                      <th className="text-right pr-3">Ausgaben</th>
                      <th className="text-right pr-3">CPA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 5).map((row) => (
                      <tr key={row.date}>
                        <td className="pl-3 text-[#a8a29e]">{row.date}</td>
                        <td className="text-right pr-3 tabular-nums text-[#78716c]">{row.impressions.toLocaleString()}</td>
                        <td className="text-right pr-3 tabular-nums text-[#78716c]">{row.clicks}</td>
                        <td className="text-right pr-3 tabular-nums text-[#e2a96e]">{row.applications}</td>
                        <td className="text-right pr-3 tabular-nums text-[#78716c]">{row.spend.toFixed(2)} €</td>
                        <td className="text-right pr-3 tabular-nums text-[#78716c]">{row.cpa > 0 ? `${row.cpa.toFixed(2)} €` : "—"}</td>
                      </tr>
                    ))}
                    {preview.length > 5 && (
                      <tr><td colSpan={6} className="pl-3 text-[#57534e]">… und {preview.length - 5} weitere Tage</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            }
          />

          <div className="border-t border-[rgba(255,255,255,0.06)]" />

          {/* 2. Bundesland-Daten */}
          <IndeedUploadSection
            title="Bundesland-Daten"
            description="Indeed CSV-Export &quot;Nach Bundesland&quot; hochladen."
            countLabel="Bundesländer"
            fileRef={blFileRef}
            uploadState={blUploadState}
            preview={blPreview}
            errorMsg={blErrorMsg}
            onFile={handleBlFile}
            onUpload={handleBlUpload}
            onReset={resetBlUpload}
            previewTable={
              <div className="overflow-x-auto max-h-[200px] overflow-y-auto rounded-lg border border-[rgba(255,255,255,0.06)]">
                <table className="w-full premium-table text-[12px]">
                  <thead>
                    <tr>
                      <th className="text-left pl-3">Bundesland</th>
                      <th className="text-right pr-3">Klicks</th>
                      <th className="text-right pr-3">Bewerbungen</th>
                      <th className="text-right pr-3">Ausgaben</th>
                      <th className="text-right pr-3">CPA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blPreview.slice(0, 5).map((row) => (
                      <tr key={row.bundesland}>
                        <td className="pl-3 text-[#a8a29e]">{row.bundesland}</td>
                        <td className="text-right pr-3 tabular-nums text-[#78716c]">{row.clicks}</td>
                        <td className="text-right pr-3 tabular-nums text-[#e2a96e]">{row.applications}</td>
                        <td className="text-right pr-3 tabular-nums text-[#78716c]">{row.spend.toFixed(2)} €</td>
                        <td className="text-right pr-3 tabular-nums text-[#78716c]">{row.cpa > 0 ? `${row.cpa.toFixed(2)} €` : "—"}</td>
                      </tr>
                    ))}
                    {blPreview.length > 5 && (
                      <tr><td colSpan={5} className="pl-3 text-[#57534e]">… und {blPreview.length - 5} weitere</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            }
          />

          <div className="border-t border-[rgba(255,255,255,0.06)]" />

          {/* 3. Stellen-Daten */}
          <IndeedUploadSection
            title="Stellen-Daten"
            description="Indeed CSV-Export &quot;Nach Stelle und Bundesland&quot; hochladen."
            countLabel="Einträge"
            fileRef={stFileRef}
            uploadState={stUploadState}
            preview={stPreview}
            errorMsg={stErrorMsg}
            onFile={handleStFile}
            onUpload={handleStUpload}
            onReset={resetStUpload}
            previewTable={
              <div className="overflow-x-auto max-h-[200px] overflow-y-auto rounded-lg border border-[rgba(255,255,255,0.06)]">
                <table className="w-full premium-table text-[12px]">
                  <thead>
                    <tr>
                      <th className="text-left pl-3">Stelle</th>
                      <th className="text-left pl-3">Stadt</th>
                      <th className="text-left pl-3">Bundesland</th>
                      <th className="text-right pr-3">Klicks</th>
                      <th className="text-right pr-3">Bewerbungen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stPreview.slice(0, 5).map((row, i) => (
                      <tr key={`${row.stelle}-${row.stadt}-${i}`}>
                        <td className="pl-3 text-[#a8a29e] max-w-[200px] truncate">{row.stelle}</td>
                        <td className="pl-3 text-[#78716c]">{row.stadt}</td>
                        <td className="pl-3 text-[#78716c]">{row.bundesland}</td>
                        <td className="text-right pr-3 tabular-nums text-[#78716c]">{row.clicks}</td>
                        <td className="text-right pr-3 tabular-nums text-[#e2a96e]">{row.applications}</td>
                      </tr>
                    ))}
                    {stPreview.length > 5 && (
                      <tr><td colSpan={5} className="pl-3 text-[#57534e]">… und {stPreview.length - 5} weitere</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            }
          />
        </div>
      </SectionCard>
    </div>
  );
}

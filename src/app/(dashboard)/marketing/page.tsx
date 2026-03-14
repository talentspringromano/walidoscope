"use client";

import { useState, useMemo } from "react";
import { KpiCard, SectionCard } from "@/components/kpi-card";
import { TimeRangeFilter } from "@/components/time-range-filter";
import { leads } from "@/data/leads";
import { metaAds, totalMetaSpend, totalMetaLeads, avgCPL } from "@/data/meta-ads";
import { perspectiveVisits } from "@/data/perspective";
import { TOOLTIP_STYLE, AXIS_STYLE, PALETTE, SEGMENT_COLORS, FUNNEL_COLORS } from "@/components/chart-theme";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  FunnelChart,
  Funnel,
  ReferenceLine,
  CartesianGrid,
  Legend,
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
const costData = metaAds.map((ad) => ({
  name: ad.shortName,
  spend: ad.amountSpent,
  cpl: ad.costPerResult,
}));

type SortKey = "shortName" | "amountSpent" | "impressions" | "clicksAll" | "results" | "costPerResult" | "airtableLeads" | "discovery" | "angebot";
type SortDir = "asc" | "desc";
type FilterPreset = "all" | "low-cpl" | "high-leads" | "deep-funnel";

const FILTER_PRESETS: { key: FilterPreset; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "low-cpl", label: "CPL < €5" },
  { key: "high-leads", label: "Leads ≥ 6" },
  { key: "deep-funnel", label: "Mit Angebot" },
];

export default function MarketingPage() {
  const [sortKey, setSortKey] = useState<SortKey>("results");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filter, setFilter] = useState<FilterPreset>("all");
  const [range, setRange] = useState<TimeRange>("all");
  const [hiddenChannels, setHiddenChannels] = useState<Set<string>>(new Set());
  const {
    channelData, segmentCounts, segmentData, allSegments, segmentWeeklyData,
    creativeDeepFunnel, gewonnenKursnet, sqlKursnet, perspFunnelData, perspSummary,
    filteredLeads, channelWeeklyData, platformData,
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
    const segmentData = Object.entries(segmentCounts).map(([name, value]) => ({ name, value }));

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

    /* Creative Deep-Funnel */
    const creativeDeepFunnel = metaAds.map((ad) => {
      const adLeads = filteredLeads.filter(
        (l) => l.adId === ad.adId || l.adId === `ag:${ad.adId}` || l.adId.includes(ad.adId.slice(-10))
      );
      const qualified = adLeads.filter(
        (l) => l.leadStatus === "Vertriebsqualifiziert" || l.leadStatus === "Kennenlerngespräch gebucht" || l.leadStatus === "Beratungsgespräch gebucht"
      ).length;
      const angebot = adLeads.filter(
        (l) => l.leadStatus === "Gewonnen"
      ).length;
      return { ...ad, airtableLeads: adLeads.length, discovery: qualified, angebot };
    });

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

    /* Channel weekly (stacked bar) */
    const channelWeekMap = new Map<number, { Meta: number; Kursnet: number; Indeed: number }>();
    filteredLeads.forEach((l) => {
      const date = parseDE(l.createdOn);
      if (isNaN(date.getTime())) return;
      const wk = getISOWeek(date);
      const entry = channelWeekMap.get(wk) ?? { Meta: 0, Kursnet: 0, Indeed: 0 };
      if (l.platform === "Facebook" || l.platform === "Instagram") entry.Meta++;
      else if (l.platform === "Kursnet") entry.Kursnet++;
      else if (l.platform === "Indeed") entry.Indeed++;
      channelWeekMap.set(wk, entry);
    });
    const channelWeeklyData = Array.from(channelWeekMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([wk, counts]) => ({ week: `KW ${wk}`, ...counts }));

    /* Platform-Verteilung */
    const platformCounts: Record<string, number> = {};
    filteredLeads.forEach((l) => {
      const p = l.platform || "(leer)";
      platformCounts[p] = (platformCounts[p] || 0) + 1;
    });
    const platformData = Object.entries(platformCounts)
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count);

    return {
      channelData, segmentCounts, segmentData, allSegments, segmentWeeklyData,
      creativeDeepFunnel, gewonnenKursnet, sqlKursnet, perspFunnelData, perspSummary,
      filteredLeads, channelWeeklyData, platformData,
    };
  }, [range]);

  const filteredAndSorted = useMemo(() => {
    let data = [...creativeDeepFunnel];

    if (filter === "low-cpl") data = data.filter((d) => d.costPerResult < 5);
    else if (filter === "high-leads") data = data.filter((d) => d.results >= 6);
    else if (filter === "deep-funnel") data = data.filter((d) => d.angebot > 0);

    data.sort((a, b) => {
      const aVal = a[sortKey as keyof typeof a];
      const bVal = b[sortKey as keyof typeof b];
      if (typeof aVal === "string" && typeof bVal === "string")
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    return data;
  }, [sortKey, sortDir, filter, creativeDeepFunnel]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    return sortDir === "desc"
      ? <ArrowDown className="h-3 w-3 ml-1 text-[#e2a96e]" />
      : <ArrowUp className="h-3 w-3 ml-1 text-[#e2a96e]" />;
  }

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
          </SectionCard>
        )}

        {/* Leads pro Kanal im Zeitverlauf – Stacked Bar */}
        {channelWeeklyData.length > 0 && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-semibold tracking-wide text-[#a8a29e]">Leads pro Kanal im Zeitverlauf</h3>
            <div className="flex items-center gap-2">
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
            <BarChart data={channelWeeklyData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="week" {...AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis {...AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...TOOLTIP_STYLE} />
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
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 stagger-in">
        <KpiCard label="Meta Spend" value={range === "all" ? `€${totalMetaSpend.toFixed(2)}` : "—"} sub={range === "all" ? "7 Creatives" : "Nicht filterbar"} accent />
        <KpiCard label="Meta Leads" value={range === "all" ? totalMetaLeads : filteredLeads.filter((l) => l.platform === "Facebook" || l.platform === "Instagram").length} sub={range === "all" ? `€${avgCPL.toFixed(2)} CPL` : "Gefilterte Meta-Leads"} />
        <KpiCard label="Kursnet Visits" value={perspSummary.totalVisits} sub={`${perspSummary.converted} konvertiert`} />
        <KpiCard label="Kursnet Leads" value={kursnetLeadsCount} sub={`${kursnetLeadsCount} im CRM · ${perspSummary.converted} konvertiert`} />
      </div>

      {/* Creative Performance Table */}
      <SectionCard title="Creative-Leistung (Deep-Funnel)" className="overflow-visible">
        {/* Filter Chips */}
        <div className="flex items-center gap-2 mb-4">
          {FILTER_PRESETS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
                filter === f.key
                  ? "bg-[rgba(226,169,110,0.12)] text-[#e2a96e] border border-[rgba(226,169,110,0.25)]"
                  : "text-[#78716c] border border-[rgba(255,255,255,0.06)] hover:text-[#a8a29e] hover:bg-[rgba(255,255,255,0.03)]"
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-[#44403c]">
            {filteredAndSorted.length} von {creativeDeepFunnel.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full premium-table">
            <thead>
              <tr>
                {([
                  ["shortName", "Creative", "text-left pl-2"],
                  ["amountSpent", "Spend", "text-right pr-5"],
                  ["impressions", "Impr.", "text-right pr-5"],
                  ["clicksAll", "Clicks", "text-right pr-5"],
                  ["results", "Leads", "text-right pr-5"],
                  ["costPerResult", "CPL", "text-right pr-5"],
                  ["airtableLeads", "CRM", "text-right pr-5"],
                  ["discovery", "Discovery+", "text-right pr-5"],
                  ["angebot", "Angebot", "text-right pr-8"],
                ] as [SortKey, string, string][]).map(([key, label, cls]) => (
                  <th
                    key={key}
                    className={`${cls} cursor-pointer select-none hover:text-[#a8a29e] transition-colors`}
                    onClick={() => toggleSort(key)}
                  >
                    <span className="inline-flex items-center">
                      {label}
                      <SortIcon col={key} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredAndSorted.map((ad) => (
                <tr key={ad.adId}>
                  <td className="pl-2 pr-4 text-[13px] font-medium text-[#fafaf9]">{ad.shortName}</td>
                  <td className="text-right pr-5 tabular-nums text-[#78716c]">€{ad.amountSpent.toFixed(2)}</td>
                  <td className="text-right pr-5 tabular-nums text-[#78716c]">{ad.impressions.toLocaleString()}</td>
                  <td className="text-right pr-5 tabular-nums text-[#78716c]">{ad.clicksAll}</td>
                  <td className="text-right pr-5 tabular-nums font-medium text-[#e2a96e]">{ad.results}</td>
                  <td className="text-right pr-5 tabular-nums text-[#78716c]">€{ad.costPerResult.toFixed(2)}</td>
                  <td className="text-right pr-5 tabular-nums text-[#a8a29e]">{ad.airtableLeads}</td>
                  <td className="text-right pr-5 tabular-nums text-[#a8a29e]">{ad.discovery}</td>
                  <td className="text-right pr-8 tabular-nums font-semibold text-[#5eead4] glow-badge">{ad.angebot}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2 stagger-in">
        {/* Cost Analysis */}
        <SectionCard title="Spend & CPL pro Creative">
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={costData} barGap={4} layout="vertical">
              <XAxis type="number" {...AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" {...AXIS_STYLE} width={160} axisLine={false} tickLine={false} interval={0} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(val) => typeof val === "number" ? `€${val.toFixed(2)}` : val} />
              <Bar dataKey="spend" fill={PALETTE.indigo} name="Spend" radius={[0, 6, 6, 0]} />
              <Bar dataKey="cpl" fill={PALETTE.teal} name="CPL" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        {/* Lead Segmentation Pie */}
        <SectionCard title="Lead-Segmentierung">
          <ResponsiveContainer width="100%" height={310}>
            <PieChart>
              <Pie
                data={segmentData}
                cx="50%"
                cy="52%"
                innerRadius={65}
                outerRadius={105}
                dataKey="value"
                stroke="none"
                label={({ name, value }) => `${name} (${value})`}
                labelLine={{ stroke: "#44403c", strokeWidth: 1 }}
                fontSize={11}
              >
                {segmentData.map((_, i) => (
                  <Cell key={i} fill={SEGMENT_COLORS[i % SEGMENT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip {...TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 text-[11px] text-[#57534e] leading-relaxed">
            High-Touch = Arbeitslos + Vorerfahrung/Interesse · Low-Touch = Bald arbeitslos · Nicht qualifiziert = Aktuell nicht arbeitslos
          </div>
        </SectionCard>
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

      {/* Perspective Funnel */}
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
                    {/* progress bar */}
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
    </div>
  );
}

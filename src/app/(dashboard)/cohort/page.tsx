"use client";

import { useState, useMemo } from "react";
import { KpiCard, SectionCard } from "@/components/kpi-card";
import { TimeRangeFilter } from "@/components/time-range-filter";
import { leads } from "@/data/leads";
import { metaAds } from "@/data/meta-ads";
import {
  TOOLTIP_STYLE,
  AXIS_STYLE,
  PALETTE,
  STATUS_COLORS,
} from "@/components/chart-theme";
import { CalendarDays, TrendingDown, Trophy, Target } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import type { TimeRange } from "@/lib/date-utils";
import { filterLeadsByRange, parseDE, getISOWeek, classifyLead } from "@/lib/date-utils";

function matchesAd(lead: (typeof leads)[0], adId: string): boolean {
  return (
    lead.adId === adId ||
    lead.adId === `ag:${adId}` ||
    lead.adId.includes(adId.slice(-10))
  );
}

const QUALIFIED_STATUSES = new Set([
  "Vertriebsqualifiziert",
  "Kennenlerngespräch gebucht",
  "Beratungsgespräch gebucht",
]);

type PlatformFilter = "Alle" | "Meta" | "Kursnet" | "Indeed";
const PLATFORM_FILTERS: PlatformFilter[] = ["Alle", "Meta", "Kursnet", "Indeed"];

const CREATIVE_OPTIONS = ["Alle", ...metaAds.map((ad) => ad.shortName)] as const;
type CreativeFilter = (typeof CREATIVE_OPTIONS)[number];

/* ── Pre-compute: total leads per ad (stable denominator) ── */
const adTotalLeads = new Map<string, number>();
leads.forEach((lead) => {
  metaAds.forEach((ad) => {
    if (matchesAd(lead, ad.adId)) {
      adTotalLeads.set(ad.adId, (adTotalLeads.get(ad.adId) ?? 0) + 1);
    }
  });
});

/* ── Component ── */

export default function CohortPage() {
  const [platformFilter, setPlatformFilter] =
    useState<PlatformFilter>("Alle");
  const [creativeFilter, setCreativeFilter] = useState<string>("Alle");
  const [range, setRange] = useState<TimeRange>("all");

  const cohortData = useMemo(() => {
    // First filter by time range
    const rangeFiltered = filterLeadsByRange(leads, range);

    // Then filter by platform
    const platformFiltered =
      platformFilter === "Alle"
        ? rangeFiltered
        : platformFilter === "Meta"
          ? rangeFiltered.filter(
              (l) => l.platform === "Facebook" || l.platform === "Instagram"
            )
          : rangeFiltered.filter((l) => l.platform === platformFilter);

    // Then filter by creative
    const selectedAd = metaAds.find((ad) => ad.shortName === creativeFilter);
    const filtered =
      creativeFilter === "Alle" || !selectedAd
        ? platformFiltered
        : platformFiltered.filter((l) => matchesAd(l, selectedAd.adId));

    // Group by calendar week
    const weekMap = new Map<
      number,
      { leads: (typeof leads)[number][] }
    >();

    filtered.forEach((lead) => {
      const date = parseDE(lead.createdOn);
      if (isNaN(date.getTime())) return;
      const wk = getISOWeek(date);
      const entry = weekMap.get(wk) ?? { leads: [] };
      entry.leads.push(lead);
      weekMap.set(wk, entry);
    });

    // Build sorted weekly rows
    const weeks = Array.from(weekMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([weekNum, { leads: wl }]) => {
        const totalLeads = wl.length;
        const qualified = wl.filter(
          (l) =>
            QUALIFIED_STATUSES.has(l.leadStatus) ||
            l.leadStatus === "Gewonnen"
        ).length;
        const won = wl.filter((l) => l.leadStatus === "Gewonnen").length;
        const lost = wl.filter((l) => l.leadStatus === "Verloren").length;
        const conversionRate =
          totalLeads > 0 ? (won / totalLeads) * 100 : 0;

        // Proportional spend allocation
        let weeklySpend = 0;
        metaAds.forEach((ad) => {
          const k = wl.filter((l) => matchesAd(l, ad.adId)).length;
          const n = adTotalLeads.get(ad.adId) ?? 0;
          if (n > 0 && k > 0) {
            weeklySpend += (k / n) * ad.amountSpent;
          }
        });

        const cpl = totalLeads > 0 ? weeklySpend / totalLeads : 0;
        const cpa = won > 0 ? weeklySpend / won : 0;

        const highTouch = wl.filter((l) => classifyLead(l) === "High-Touch").length;
        const lowTouchAngebote = wl.filter(
          (l) =>
            classifyLead(l) === "Low-Touch" &&
            (l.dealStatus === "Angebot schicken" ||
              l.leadStatus === "Beratungsgespräch gebucht")
        ).length;
        const kostenProHighTouch = highTouch > 0 ? weeklySpend / highTouch : 0;
        const termineAmt = wl.filter(
          (l) => l.terminBeimAmt && l.terminBeimAmt.trim() !== ""
        ).length;

        return {
          week: `KW ${weekNum}`,
          weekNum,
          totalLeads,
          qualified,
          won,
          lost,
          conversionRate,
          spend: weeklySpend,
          cpl,
          cpa,
          highTouch,
          lowTouchAngebote,
          kostenProHighTouch,
          termineAmt,
          // Stacked bar breakdown
          "Neuer Lead": wl.filter((l) => l.leadStatus === "Neuer Lead").length,
          Rückruf: wl.filter((l) => l.leadStatus === "Rückruf").length,
          Qualifiziert: wl.filter(
            (l) => l.leadStatus === "Vertriebsqualifiziert"
          ).length,
          Reterminierung: wl.filter(
            (l) => l.leadStatus === "Reterminierung"
          ).length,
          Gespräch: wl.filter(
            (l) =>
              l.leadStatus === "Kennenlerngespräch gebucht" ||
              l.leadStatus === "Beratungsgespräch gebucht"
          ).length,
          Gewonnen: won,
          Verloren: lost,
        };
      });

    // Summary KPIs
    const totalWeeks = weeks.length;
    const bestWeek =
      weeks.length > 0
        ? weeks.reduce((best, w) => (w.won > best.won ? w : best), weeks[0])
        : null;
    const weeksWithSpend = weeks.filter((w) => w.cpl > 0);
    const avgCPL =
      weeksWithSpend.length > 0
        ? weeksWithSpend.reduce((s, w) => s + w.cpl, 0) /
          weeksWithSpend.length
        : 0;
    const totalWon = weeks.reduce((s, w) => s + w.won, 0);
    const totalLeadsAll = weeks.reduce((s, w) => s + w.totalLeads, 0);
    const overallConversion =
      totalLeadsAll > 0 ? (totalWon / totalLeadsAll) * 100 : 0;

    return { weeks, totalWeeks, bestWeek, avgCPL, overallConversion };
  }, [platformFilter, creativeFilter, range]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#fafaf9]">
            Kohortenanalyse
          </h1>
          <p className="mt-1 text-[13px] text-[#57534e]">
            Woche-für-Woche ROI &amp; Conversion-Analyse
          </p>
        </div>
        <TimeRangeFilter value={range} onChange={setRange} />
      </div>

      {/* Platform Filter */}
      <div className="flex items-center gap-2">
        {PLATFORM_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setPlatformFilter(f)}
            className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
              platformFilter === f
                ? "bg-[rgba(226,169,110,0.12)] text-[#e2a96e] border border-[rgba(226,169,110,0.25)]"
                : "text-[#78716c] border border-[rgba(255,255,255,0.06)] hover:text-[#a8a29e] hover:bg-[rgba(255,255,255,0.03)]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Creative Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {CREATIVE_OPTIONS.map((c) => (
          <button
            key={c}
            onClick={() => setCreativeFilter(c)}
            className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
              creativeFilter === c
                ? "bg-[rgba(226,169,110,0.12)] text-[#e2a96e] border border-[rgba(226,169,110,0.25)]"
                : "text-[#78716c] border border-[rgba(255,255,255,0.06)] hover:text-[#a8a29e] hover:bg-[rgba(255,255,255,0.03)]"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 stagger-in">
        <KpiCard
          label="Wochen erfasst"
          value={cohortData.totalWeeks}
          sub={
            cohortData.weeks.length > 0
              ? `KW ${cohortData.weeks[0].weekNum} – KW ${cohortData.weeks.at(-1)!.weekNum}`
              : "–"
          }
          icon={<CalendarDays className="h-4 w-4" />}
        />
        <KpiCard
          label="Beste Woche"
          value={cohortData.bestWeek?.week ?? "–"}
          sub={`${cohortData.bestWeek?.won ?? 0} Gewonnen`}
          icon={<Trophy className="h-4 w-4" />}
          accent
        />
        <KpiCard
          label="Ø CPL (Wochen)"
          value={cohortData.avgCPL > 0 ? `€${cohortData.avgCPL.toFixed(2)}` : "–"}
          sub="Durchschnitt aller Wochen"
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <KpiCard
          label="Conversion Rate"
          value={`${cohortData.overallConversion.toFixed(1)}%`}
          sub="Gewonnen / Leads gesamt"
          icon={<Target className="h-4 w-4" />}
        />
      </div>

      {/* Chart 1: Stacked Bar — Leads by Status per Week */}
      <SectionCard title="Leads nach Status pro Woche">
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={cohortData.weeks} barCategoryGap="20%">
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
            />
            <XAxis dataKey="week" {...AXIS_STYLE} />
            <YAxis {...AXIS_STYLE} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#78716c" }} />
            <Bar
              dataKey="Neuer Lead"
              stackId="a"
              fill={STATUS_COLORS["Neuer Lead"]}
            />
            <Bar
              dataKey="Rückruf"
              stackId="a"
              fill={STATUS_COLORS["Rückruf"]}
            />
            <Bar
              dataKey="Qualifiziert"
              stackId="a"
              fill={STATUS_COLORS["Vertriebsqualifiziert"]}
            />
            <Bar
              dataKey="Reterminierung"
              stackId="a"
              fill={STATUS_COLORS["Reterminierung"]}
            />
            <Bar
              dataKey="Gespräch"
              stackId="a"
              fill={STATUS_COLORS["Kennenlerngespräch gebucht"]}
            />
            <Bar
              dataKey="Gewonnen"
              stackId="a"
              fill={STATUS_COLORS["Gewonnen"]}
            />
            <Bar
              dataKey="Verloren"
              stackId="a"
              fill={STATUS_COLORS["Verloren"]}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* Chart 2: CPL Trend */}
      {cohortData.weeks.some((w) => w.cpl > 0) && (
        <SectionCard title="CPL-Trend pro Woche">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={cohortData.weeks.filter((w) => w.cpl > 0)}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.04)"
              />
              <XAxis dataKey="week" {...AXIS_STYLE} />
              <YAxis
                {...AXIS_STYLE}
                tickFormatter={(v) => `€${Number(v).toFixed(0)}`}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(value) => [`€${Number(value).toFixed(2)}`, "CPL"]}
              />
              <Line
                type="monotone"
                dataKey="cpl"
                stroke={PALETTE.amber}
                strokeWidth={2}
                dot={{ fill: PALETTE.amber, r: 4 }}
                activeDot={{ r: 6, fill: PALETTE.amber }}
                name="CPL"
              />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      {/* Chart 3: Spend + Conversion Rate (Dual Axis) */}
      <SectionCard title="Spend & Conversion pro Woche">
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={cohortData.weeks}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
            />
            <XAxis dataKey="week" {...AXIS_STYLE} />
            <YAxis
              yAxisId="spend"
              orientation="left"
              {...AXIS_STYLE}
              tickFormatter={(v) => `€${Number(v).toFixed(0)}`}
            />
            <YAxis
              yAxisId="rate"
              orientation="right"
              {...AXIS_STYLE}
              tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value, name) =>
                name === "Conversion %"
                  ? [`${Number(value).toFixed(1)}%`, name]
                  : [`€${Number(value).toFixed(2)}`, name]
              }
            />
            <Legend wrapperStyle={{ fontSize: 11, color: "#78716c" }} />
            <Bar
              yAxisId="spend"
              dataKey="spend"
              fill={PALETTE.indigo}
              radius={[4, 4, 0, 0]}
              name="Spend"
              opacity={0.7}
            />
            <Line
              yAxisId="rate"
              type="monotone"
              dataKey="conversionRate"
              stroke={PALETTE.teal}
              strokeWidth={2}
              dot={{ fill: PALETTE.teal, r: 4 }}
              name="Conversion %"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* Weekly Detail Table */}
      <SectionCard title="Wochendetails">
        <div className="overflow-x-auto -mx-2">
          <table className="w-full premium-table">
            <thead>
              <tr>
                <th className="text-left pl-2">Woche</th>
                <th className="text-right">Leads</th>
                <th className="text-right">Qualifiziert</th>
                <th className="text-right">High-Touch</th>
                <th className="text-right">LT-Angebote</th>
                <th className="text-right">€/High-Touch</th>
                <th className="text-right">Amt-Termine</th>
                <th className="text-right">Gewonnen</th>
                <th className="text-right">Verloren</th>
                <th className="text-right">Spend</th>
                <th className="text-right">CPL</th>
                <th className="text-right">CPA</th>
                <th className="text-right pr-2">Conv.&nbsp;%</th>
              </tr>
            </thead>
            <tbody>
              {cohortData.weeks.map((w) => (
                <tr key={w.week}>
                  <td className="text-left pl-2 text-[#e2a96e] font-medium">
                    {w.week}
                  </td>
                  <td className="text-right">{w.totalLeads}</td>
                  <td className="text-right">{w.qualified}</td>
                  <td className="text-right">{w.highTouch}</td>
                  <td className="text-right">{w.lowTouchAngebote}</td>
                  <td className="text-right">
                    {w.kostenProHighTouch > 0
                      ? `€${w.kostenProHighTouch.toFixed(2)}`
                      : "–"}
                  </td>
                  <td className="text-right">{w.termineAmt}</td>
                  <td className="text-right text-[#fbbf24]">{w.won}</td>
                  <td className="text-right text-[#fb7185]">{w.lost}</td>
                  <td className="text-right">
                    {w.spend > 0 ? `€${w.spend.toFixed(2)}` : "–"}
                  </td>
                  <td className="text-right">
                    {w.cpl > 0 ? `€${w.cpl.toFixed(2)}` : "–"}
                  </td>
                  <td className="text-right">
                    {w.cpa > 0 && w.cpa < Infinity
                      ? `€${w.cpa.toFixed(2)}`
                      : "–"}
                  </td>
                  <td className="text-right pr-2">
                    {w.conversionRate.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

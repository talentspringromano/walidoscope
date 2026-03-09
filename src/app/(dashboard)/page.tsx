"use client";

import { useState, useMemo } from "react";
import { KpiCard, SectionCard } from "@/components/kpi-card";
import { TimeRangeFilter } from "@/components/time-range-filter";
import { leads } from "@/data/leads";
import { metaAds, totalMetaSpend, totalMetaLeads } from "@/data/meta-ads";
import { perspectiveVisits } from "@/data/perspective";
import { TOOLTIP_STYLE, AXIS_STYLE, FUNNEL_COLORS, STATUS_COLORS } from "@/components/chart-theme";
import { Users, DollarSign, MousePointerClick, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  Legend,
} from "recharts";
import type { TimeRange } from "@/lib/date-utils";
import {
  filterLeadsByRange,
  parseDEtoISO,
  parseDE,
  getISOWeek,
  classifyLead,
  filterPerspectiveByRange,
  computePerspectiveSummary,
} from "@/lib/date-utils";

/* ── Helpers for cohort spend calculation ── */

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

const adTotalLeads = new Map<string, number>();
leads.forEach((lead) => {
  metaAds.forEach((ad) => {
    if (matchesAd(lead, ad.adId)) {
      adTotalLeads.set(ad.adId, (adTotalLeads.get(ad.adId) ?? 0) + 1);
    }
  });
});

export default function OverviewPage() {
  const [range, setRange] = useState<TimeRange>("all");

  const {
    metaLeads, kursnetLeads, indeedLeads, totalLeads,
    gewonnen, terminCount, qualifiedPlusHistorical,
    funnelData, statusData, channelData, timelineData,
    perspSummary, cohortWeeks,
  } = useMemo(() => {
    const filtered = filterLeadsByRange(leads, range);
    const metaLeads = filtered.filter(
      (l) => l.platform === "Facebook" || l.platform === "Instagram"
    );
    const kursnetLeads = filtered.filter((l) => l.platform === "Kursnet");
    const indeedLeads = filtered.filter((l) => l.platform === "Indeed");
    const totalLeads = filtered.length;

    const gewonnen = filtered.filter((l) => l.leadStatus === "Gewonnen").length;
    const terminCount = filtered.filter((l) => l.terminBeimAmt).length;
    const qualifiedPlusHistorical = filtered.filter(
      (l) =>
        l.leadStatus === "Vertriebsqualifiziert" ||
        l.leadStatus === "Kennenlerngespräch gebucht" ||
        l.leadStatus === "Beratungsgespräch gebucht" ||
        l.leadStatus === "Gewonnen"
    ).length;

    const funnelData = [
      { name: "Leads", value: totalLeads },
      { name: "Qualifiziert+", value: qualifiedPlusHistorical },
      { name: "Amt-Termin", value: terminCount },
      { name: "Gewonnen (BG)", value: gewonnen },
    ];

    const statusData = [
      { name: "Neuer Lead", count: filtered.filter((l) => l.leadStatus === "Neuer Lead").length },
      { name: "Rückruf", count: filtered.filter((l) => l.leadStatus === "Rückruf").length },
      { name: "Qualifiziert", count: filtered.filter((l) => l.leadStatus === "Vertriebsqualifiziert").length },
      { name: "Reterminierung", count: filtered.filter((l) => l.leadStatus === "Reterminierung").length },
      { name: "Gespräch", count: filtered.filter((l) => l.leadStatus === "Kennenlerngespräch gebucht" || l.leadStatus === "Beratungsgespräch gebucht").length },
      { name: "Gewonnen", count: filtered.filter((l) => l.leadStatus === "Gewonnen").length },
      { name: "Verloren", count: filtered.filter((l) => l.leadStatus === "Verloren").length },
    ];

    const channelData = [
      {
        name: "Meta (FB/IG)",
        leads: metaLeads.length,
        spend: range === "all" ? totalMetaSpend : 0,
        sub: range === "all" && metaLeads.length > 0
          ? `€${(totalMetaSpend / metaLeads.length).toFixed(2)} CPL`
          : range === "all" ? "Keine Meta-Leads" : "Spend nicht filterbar",
        hasSpend: range === "all",
      },
      { name: "Indeed", leads: indeedLeads.length, spend: 0, sub: "Organisch via Indeed", hasSpend: false },
      { name: "Kursnet", leads: kursnetLeads.length, spend: 0, sub: "Organisch via Kursnet", hasSpend: false },
    ];

    /* Timeline — Meta (FB+IG zusammengefasst), Kursnet, Indeed */
    const timelineMap = new Map<string, { Meta: number; Kursnet: number; Indeed: number }>();
    filtered.forEach((l) => {
      const date = parseDEtoISO(l.createdOn);
      if (!date || date === "NaN-NaN-NaN") return;
      const entry = timelineMap.get(date) ?? { Meta: 0, Kursnet: 0, Indeed: 0 };
      if (l.platform === "Facebook" || l.platform === "Instagram") entry.Meta++;
      else if (l.platform === "Kursnet") entry.Kursnet++;
      else if (l.platform === "Indeed") entry.Indeed++;
      timelineMap.set(date, entry);
    });

    const timelineData = Array.from(timelineMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({
        date: new Date(date).toLocaleDateString("de-DE", { day: "numeric", month: "short" }),
        Meta: counts.Meta,
        Kursnet: counts.Kursnet,
        Indeed: counts.Indeed,
      }));

    /* Perspective */
    const perspFiltered = filterPerspectiveByRange(perspectiveVisits, range);
    const perspSummary = computePerspectiveSummary(perspFiltered);

    /* ── Cohort: Wochengruppierung ── */
    const weekMap = new Map<number, { leads: (typeof filtered)[number][] }>();
    filtered.forEach((lead) => {
      const date = parseDE(lead.createdOn);
      if (isNaN(date.getTime())) return;
      const wk = getISOWeek(date);
      const entry = weekMap.get(wk) ?? { leads: [] };
      entry.leads.push(lead);
      weekMap.set(wk, entry);
    });

    const cohortWeeks = Array.from(weekMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([weekNum, { leads: wl }]) => {
        const totalLeads = wl.length;
        const qualified = wl.filter(
          (l) => QUALIFIED_STATUSES.has(l.leadStatus) || l.leadStatus === "Gewonnen"
        ).length;
        const won = wl.filter((l) => l.leadStatus === "Gewonnen").length;
        const lost = wl.filter((l) => l.leadStatus === "Verloren").length;
        const conversionRate = totalLeads > 0 ? (won / totalLeads) * 100 : 0;

        let weeklySpend = 0;
        metaAds.forEach((ad) => {
          const k = wl.filter((l) => matchesAd(l, ad.adId)).length;
          const n = adTotalLeads.get(ad.adId) ?? 0;
          if (n > 0 && k > 0) weeklySpend += (k / n) * ad.amountSpent;
        });

        const cpl = totalLeads > 0 ? weeklySpend / totalLeads : 0;
        const cpa = won > 0 ? weeklySpend / won : 0;
        const highTouch = wl.filter((l) => classifyLead(l) === "High-Touch").length;
        const lowTouchAngebote = wl.filter(
          (l) =>
            classifyLead(l) === "Low-Touch" &&
            (l.dealStatus === "Angebot schicken" || l.leadStatus === "Beratungsgespräch gebucht")
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
          "Neuer Lead": wl.filter((l) => l.leadStatus === "Neuer Lead").length,
          Rückruf: wl.filter((l) => l.leadStatus === "Rückruf").length,
          Qualifiziert: wl.filter((l) => l.leadStatus === "Vertriebsqualifiziert").length,
          Reterminierung: wl.filter((l) => l.leadStatus === "Reterminierung").length,
          Gespräch: wl.filter(
            (l) =>
              l.leadStatus === "Kennenlerngespräch gebucht" ||
              l.leadStatus === "Beratungsgespräch gebucht"
          ).length,
          Gewonnen: won,
          Verloren: lost,
        };
      });

    return {
      metaLeads, kursnetLeads, indeedLeads, totalLeads,
      gewonnen, terminCount, qualifiedPlusHistorical,
      funnelData, statusData, channelData, timelineData,
      perspSummary, cohortWeeks,
    };
  }, [range]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#fafaf9]">
            Übersicht
          </h1>
          <p className="mt-1 text-[13px] text-[#57534e]">
            Talentspring Payroll Academy — Gesamtübersicht
          </p>
        </div>
        <TimeRangeFilter value={range} onChange={setRange} />
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 stagger-in">
        <KpiCard
          label="Gesamte Leads"
          value={totalLeads}
          sub={`${metaLeads.length} Meta · ${kursnetLeads.length} Kursnet · ${indeedLeads.length} Indeed`}
          icon={<Users className="h-4 w-4" />}
          accent
        />
        <KpiCard
          label="Gesamt-Spend"
          value={range === "all" ? `€${totalMetaSpend.toFixed(2)}` : "—"}
          sub={range === "all" ? "Nur Meta Ads" : "Spend nicht filterbar"}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KpiCard
          label="Avg. CPL (Meta)"
          value={range === "all" && totalMetaLeads > 0 ? `€${(totalMetaSpend / totalMetaLeads).toFixed(2)}` : "—"}
          sub={range === "all" ? `${totalMetaLeads} Leads aus Ads` : "CPL nicht filterbar"}
          icon={<MousePointerClick className="h-4 w-4" />}
        />
        <KpiCard
          label="LP Visits (Kursnet)"
          value={perspSummary.totalVisits}
          sub={`${perspSummary.converted} konvertiert`}
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2 stagger-in">
        <SectionCard title="Conversion Funnel">
          <div className="space-y-5 py-2">
            {funnelData.map((stage, i) => {
              const maxValue = funnelData[0].value;
              const widthPct = maxValue > 0 ? Math.max(8, (stage.value / maxValue) * 100) : 8;
              const overallRate = i > 0 && maxValue > 0 ? ((stage.value / maxValue) * 100).toFixed(1) : null;
              const barOpacity = 1 - i * 0.2;

              return (
                <div key={stage.name}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-[22px] font-bold tabular-nums text-[#fafaf9]">
                        {stage.value}
                      </span>
                      <span className="text-[13px] font-medium text-[#57534e]">{stage.name}</span>
                    </div>
                    {overallRate && (
                      <span className="text-[12px] tabular-nums font-medium text-[#78716c]">
                        {overallRate}%
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[rgba(255,255,255,0.04)]">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${widthPct}%`,
                        background: "#e2a96e",
                        opacity: barOpacity,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Lead-Status Verteilung">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={statusData} barCategoryGap="20%" margin={{ bottom: 20 }}>
              <XAxis dataKey="name" {...AXIS_STYLE} axisLine={false} tickLine={false} angle={-25} textAnchor="end" height={60} interval={0} />
              <YAxis {...AXIS_STYLE} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} animationDuration={800}>
                {statusData.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#818cf8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* Kanal-Vergleich Kacheln (über dem Timeline-Chart) */}
      <div className="grid gap-4 md:grid-cols-3">
        {channelData.map((ch) => (
          <div
            key={ch.name}
            className="relative rounded-2xl border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] p-6 overflow-hidden group hover:border-[rgba(255,255,255,0.08)] transition-all duration-300"
          >
            <div className={`absolute -top-12 -right-12 h-32 w-32 rounded-full blur-[60px] pointer-events-none transition-opacity duration-500 opacity-0 group-hover:opacity-100 ${ch.hasSpend ? "bg-[rgba(226,169,110,0.1)]" : "bg-[rgba(94,234,212,0.1)]"}`} />
            <div className="relative">
              <div className="text-[12px] font-medium uppercase tracking-wider text-[#57534e]">
                {ch.name}
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className={`text-[40px] font-bold tracking-tight tabular-nums ${ch.hasSpend ? "text-[#e2a96e]" : "text-[#5eead4]"}`}>
                  {ch.leads}
                </span>
                <span className="text-[13px] font-medium text-[#44403c]">Leads</span>
              </div>
              {ch.hasSpend && ch.spend > 0 ? (
                <div className="mt-2 flex gap-4 text-[12px] text-[#78716c]">
                  <span>€{ch.spend.toFixed(2)} Spend</span>
                  <span>{ch.sub}</span>
                </div>
              ) : (
                <div className="mt-2 text-[12px] text-[#57534e]">
                  {ch.sub}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Leads im Zeitverlauf — Stacked Bar Chart */}
      <SectionCard title="Leads im Zeitverlauf nach Quelle">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={timelineData} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#1c1917" vertical={false} />
            <XAxis dataKey="date" {...AXIS_STYLE} axisLine={false} tickLine={false} />
            <YAxis {...AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 12, color: "#78716c" }} />
            <Bar dataKey="Meta" stackId="a" fill="#818cf8" />
            <Bar dataKey="Kursnet" stackId="a" fill="#5eead4" />
            <Bar dataKey="Indeed" stackId="a" fill="#fb923c" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* Leads nach Status pro Woche — from Cohort */}
      <SectionCard title="Leads nach Status pro Woche">
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={cohortWeeks} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="week" {...AXIS_STYLE} />
            <YAxis {...AXIS_STYLE} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#78716c" }} />
            <Bar dataKey="Neuer Lead" stackId="a" fill={STATUS_COLORS["Neuer Lead"]} />
            <Bar dataKey="Rückruf" stackId="a" fill={STATUS_COLORS["Rückruf"]} />
            <Bar dataKey="Qualifiziert" stackId="a" fill={STATUS_COLORS["Vertriebsqualifiziert"]} />
            <Bar dataKey="Reterminierung" stackId="a" fill={STATUS_COLORS["Reterminierung"]} />
            <Bar dataKey="Gespräch" stackId="a" fill={STATUS_COLORS["Kennenlerngespräch gebucht"]} />
            <Bar dataKey="Gewonnen" stackId="a" fill={STATUS_COLORS["Gewonnen"]} />
            <Bar dataKey="Verloren" stackId="a" fill={STATUS_COLORS["Verloren"]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* Wochendetails Tabelle — from Cohort */}
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
              {cohortWeeks.map((w) => (
                <tr key={w.week}>
                  <td className="text-left pl-2 text-[#e2a96e] font-medium">{w.week}</td>
                  <td className="text-right">{w.totalLeads}</td>
                  <td className="text-right">{w.qualified}</td>
                  <td className="text-right">{w.highTouch}</td>
                  <td className="text-right">{w.lowTouchAngebote}</td>
                  <td className="text-right">
                    {w.kostenProHighTouch > 0 ? `€${w.kostenProHighTouch.toFixed(2)}` : "–"}
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
                    {w.cpa > 0 && w.cpa < Infinity ? `€${w.cpa.toFixed(2)}` : "–"}
                  </td>
                  <td className="text-right pr-2">{w.conversionRate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

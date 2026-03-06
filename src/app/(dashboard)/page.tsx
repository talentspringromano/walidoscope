"use client";

import { KpiCard, SectionCard } from "@/components/kpi-card";
import { leads } from "@/data/leads";
import { totalMetaSpend, totalMetaLeads } from "@/data/meta-ads";
import { perspectiveSummary } from "@/data/perspective";
import { TOOLTIP_STYLE, AXIS_STYLE, FUNNEL_COLORS, STATUS_COLORS } from "@/components/chart-theme";
import { Users, DollarSign, MousePointerClick, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  Legend,
} from "recharts";

const metaLeads = leads.filter(
  (l) => l.platform === "Facebook" || l.platform === "Instagram"
);
const kursnetLeads = leads.filter((l) => l.platform === "Kursnet");
const indeedLeads = leads.filter((l) => l.platform === "Indeed");
const totalLeads = leads.length;

const gewonnen = leads.filter(
  (l) => l.leadStatus === "Gewonnen"
).length;
const terminCount = leads.filter((l) => l.terminBeimAmt).length;

// Historical/cumulative: leads that reached this stage or any later stage
const qualifiedPlusHistorical = leads.filter(
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
  { name: "Neuer Lead", count: leads.filter((l) => l.leadStatus === "Neuer Lead").length },
  { name: "Rückruf", count: leads.filter((l) => l.leadStatus === "Rückruf").length },
  { name: "Qualifiziert", count: leads.filter((l) => l.leadStatus === "Vertriebsqualifiziert").length },
  { name: "Reterminierung", count: leads.filter((l) => l.leadStatus === "Reterminierung").length },
  { name: "Gespräch", count: leads.filter((l) => l.leadStatus === "Kennenlerngespräch gebucht" || l.leadStatus === "Beratungsgespräch gebucht").length },
  { name: "Gewonnen", count: leads.filter((l) => l.leadStatus === "Gewonnen").length },
  { name: "Verloren", count: leads.filter((l) => l.leadStatus === "Verloren").length },
];

const channelData = [
  { name: "Meta (FB/IG)", leads: metaLeads.length, spend: totalMetaSpend, sub: `€${(totalMetaSpend / metaLeads.length).toFixed(2)} CPL` },
  { name: "Indeed", leads: indeedLeads.length, spend: 0, sub: "Organisch via Indeed" },
  { name: "Kursnet", leads: kursnetLeads.length, spend: 0, sub: "Organisch via Kursnet/meinNOW" },
];

/* ── Leads im Zeitverlauf nach Quelle ── */
function parseDE(dateStr: string): string {
  const [day, month, year] = dateStr.split(/[. ]/);
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

const timelineMap = new Map<string, { Facebook: number; Instagram: number; Kursnet: number; Indeed: number }>();
leads.forEach((l) => {
  const date = parseDE(l.createdOn);
  if (!date || date === "NaN-NaN-NaN") return;
  const entry = timelineMap.get(date) ?? { Facebook: 0, Instagram: 0, Kursnet: 0, Indeed: 0 };
  if (l.platform === "Facebook" || l.platform === "Instagram" || l.platform === "Kursnet" || l.platform === "Indeed") {
    entry[l.platform]++;
  }
  timelineMap.set(date, entry);
});

const timelineData = Array.from(timelineMap.entries())
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([date, counts]) => ({
    date: new Date(date).toLocaleDateString("de-DE", { day: "numeric", month: "short" }),
    Facebook: counts.Facebook,
    Instagram: counts.Instagram,
    Kursnet: counts.Kursnet,
    Indeed: counts.Indeed,
  }));

export default function OverviewPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-[#fafaf9]">
          Übersicht
        </h1>
        <p className="mt-1 text-[13px] text-[#57534e]">
          Talentspring Payroll Academy — Gesamtübersicht
        </p>
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
          value={`€${totalMetaSpend.toFixed(2)}`}
          sub="Nur Meta Ads"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KpiCard
          label="Avg. CPL (Meta)"
          value={`€${(totalMetaSpend / totalMetaLeads).toFixed(2)}`}
          sub={`${totalMetaLeads} Leads aus Ads`}
          icon={<MousePointerClick className="h-4 w-4" />}
        />
        <KpiCard
          label="LP Visits (Kursnet)"
          value={perspectiveSummary.totalVisits}
          sub={`${perspectiveSummary.converted} konvertiert`}
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2 stagger-in">
        <SectionCard title="Conversion Funnel">
          <div className="space-y-5 py-2">
            {funnelData.map((stage, i) => {
              const maxValue = funnelData[0].value;
              const widthPct = Math.max(8, (stage.value / maxValue) * 100);
              const overallRate = i > 0 ? ((stage.value / maxValue) * 100).toFixed(1) : null;
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
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={statusData} layout="vertical" barCategoryGap="20%">
              <XAxis type="number" {...AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={110} {...AXIS_STYLE} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} animationDuration={800}>
                {statusData.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#818cf8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* Leads im Zeitverlauf */}
      <SectionCard title="Leads im Zeitverlauf nach Quelle">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1c1917" vertical={false} />
            <XAxis dataKey="date" {...AXIS_STYLE} axisLine={false} tickLine={false} />
            <YAxis {...AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(val, name) => [val, name]}
              labelFormatter={(label) => `${label}`}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#78716c" }} />
            <Line type="monotone" dataKey="Facebook" stroke="#818cf8" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Instagram" stroke="#e2a96e" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Kursnet" stroke="#5eead4" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Indeed" stroke="#fb923c" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* Channel Comparison */}
      <SectionCard title="Kanal-Vergleich">
        <div className="grid gap-5 md:grid-cols-2">
          {channelData.map((ch) => (
            <div
              key={ch.name}
              className="relative rounded-2xl border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] p-6 overflow-hidden group hover:border-[rgba(255,255,255,0.08)] transition-all duration-300"
            >
              {/* subtle ambient glow */}
              <div className={`absolute -top-12 -right-12 h-32 w-32 rounded-full blur-[60px] pointer-events-none transition-opacity duration-500 opacity-0 group-hover:opacity-100 ${ch.spend > 0 ? "bg-[rgba(226,169,110,0.1)]" : "bg-[rgba(94,234,212,0.1)]"}`} />

              <div className="relative">
                <div className="text-[12px] font-medium uppercase tracking-wider text-[#57534e]">
                  {ch.name}
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className={`text-[40px] font-bold tracking-tight tabular-nums ${ch.spend > 0 ? "text-[#e2a96e]" : "text-[#5eead4]"}`}>
                    {ch.leads}
                  </span>
                  <span className="text-[13px] font-medium text-[#44403c]">Leads</span>
                </div>
                {ch.spend > 0 ? (
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
      </SectionCard>
    </div>
  );
}

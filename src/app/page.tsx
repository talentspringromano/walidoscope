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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
  Cell,
  CartesianGrid,
  Legend,
} from "recharts";

const metaLeads = leads.filter(
  (l) => l.platform === "Facebook" || l.platform === "Instagram"
);
const kursnetLeads = leads.filter((l) => l.platform === "Kursnet");
const totalLeads = leads.length;

const discoveryCall = leads.filter(
  (l) =>
    l.leadStatus === "Discovery Call" ||
    l.leadStatus === "Follow up" ||
    l.leadStatus === "Angebot zuschicken"
).length;
const angebotSent = leads.filter(
  (l) =>
    l.dealStatus === "Angebot schicken" ||
    l.leadStatus === "Angebot zuschicken"
).length;
const terminCount = leads.filter((l) => l.terminBeimAmt).length;

const funnelData = [
  { name: "Leads", value: totalLeads },
  { name: "Discovery Call+", value: discoveryCall },
  { name: "Angebot", value: angebotSent },
  { name: "Amt-Termin", value: terminCount },
];

const statusData = [
  { name: "Neuer Lead", count: leads.filter((l) => l.leadStatus === "Neuer Lead").length },
  { name: "1x NE", count: leads.filter((l) => l.leadStatus === "1x NE").length },
  { name: "Discovery Call", count: leads.filter((l) => l.leadStatus === "Discovery Call").length },
  { name: "Follow up", count: leads.filter((l) => l.leadStatus === "Follow up").length },
  { name: "Angebot", count: leads.filter((l) => l.leadStatus === "Angebot zuschicken").length },
  { name: "Verloren", count: leads.filter((l) => l.leadStatus === "Verloren").length },
];

const channelData = [
  { name: "Meta (FB/IG)", leads: metaLeads.length, spend: totalMetaSpend, organic: false },
  { name: "Kursnet", leads: kursnetLeads.length, spend: 0, organic: true },
];

/* ── Leads im Zeitverlauf nach Quelle ── */
function parseDE(dateStr: string): string {
  const [day, month, year] = dateStr.split(/[. ]/);
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

const timelineMap = new Map<string, { Facebook: number; Instagram: number; Kursnet: number }>();
leads.forEach((l) => {
  const date = parseDE(l.createdOn);
  const entry = timelineMap.get(date) ?? { Facebook: 0, Instagram: 0, Kursnet: 0 };
  entry[l.platform]++;
  timelineMap.set(date, entry);
});

const timelineData = Array.from(timelineMap.entries())
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([date, counts]) => ({
    date: new Date(date).toLocaleDateString("de-DE", { day: "numeric", month: "short" }),
    Facebook: counts.Facebook,
    Instagram: counts.Instagram,
    Kursnet: counts.Kursnet,
    Gesamt: counts.Facebook + counts.Instagram + counts.Kursnet,
  }));

export default function OverviewPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-[#fafaf9]">
          Overview
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
          sub={`${metaLeads.length} Meta · ${kursnetLeads.length} Kursnet`}
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
          <ResponsiveContainer width="100%" height={280}>
            <FunnelChart>
              <Tooltip {...TOOLTIP_STYLE} />
              <Funnel dataKey="value" data={funnelData} isAnimationActive animationDuration={800}>
                <LabelList position="right" fill="#78716c" stroke="none" dataKey="name" fontSize={12} />
                <LabelList position="center" fill="#fafaf9" stroke="none" dataKey="value" fontSize={18} fontWeight={600} className="tabular-nums" />
                {funnelData.map((_, i) => (
                  <Cell key={i} fill={FUNNEL_COLORS[i]} />
                ))}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
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
          <AreaChart data={timelineData}>
            <defs>
              <linearGradient id="gFb" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#818cf8" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gIg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e2a96e" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#e2a96e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gKn" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5eead4" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#5eead4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1c1917" vertical={false} />
            <XAxis dataKey="date" {...AXIS_STYLE} axisLine={false} tickLine={false} />
            <YAxis {...AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(val, name) => [val, name]}
              labelFormatter={(label) => `${label}`}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#78716c" }} />
            <Area type="monotone" dataKey="Facebook" stackId="1" stroke="#818cf8" fill="url(#gFb)" strokeWidth={2} />
            <Area type="monotone" dataKey="Instagram" stackId="1" stroke="#e2a96e" fill="url(#gIg)" strokeWidth={2} />
            <Area type="monotone" dataKey="Kursnet" stackId="1" stroke="#5eead4" fill="url(#gKn)" strokeWidth={2} />
          </AreaChart>
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
              <div className={`absolute -top-12 -right-12 h-32 w-32 rounded-full blur-[60px] pointer-events-none transition-opacity duration-500 opacity-0 group-hover:opacity-100 ${ch.organic ? "bg-[rgba(94,234,212,0.1)]" : "bg-[rgba(226,169,110,0.1)]"}`} />

              <div className="relative">
                <div className="text-[12px] font-medium uppercase tracking-wider text-[#57534e]">
                  {ch.name}
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className={`text-[40px] font-bold tracking-tight tabular-nums ${ch.organic ? "text-[#5eead4]" : "text-[#e2a96e]"}`}>
                    {ch.leads}
                  </span>
                  <span className="text-[13px] font-medium text-[#44403c]">Leads</span>
                </div>
                {ch.spend > 0 ? (
                  <div className="mt-2 flex gap-4 text-[12px] text-[#78716c]">
                    <span>€{ch.spend.toFixed(2)} Spend</span>
                    <span>€{(ch.spend / ch.leads).toFixed(2)} CPL</span>
                  </div>
                ) : (
                  <div className="mt-2 text-[12px] text-[#57534e]">
                    Organisch via Kursnet/meinNOW
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

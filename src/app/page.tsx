"use client";

import { KpiCard } from "@/components/kpi-card";
import { leads } from "@/data/leads";
import { metaAds, totalMetaSpend, totalMetaLeads } from "@/data/meta-ads";
import { perspectiveSummary } from "@/data/perspective";
import { Users, DollarSign, MousePointerClick, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
  Cell,
} from "recharts";

const metaLeads = leads.filter(
  (l) => l.platform === "Facebook" || l.platform === "Instagram"
);
const kursnetLeads = leads.filter((l) => l.platform === "Kursnet");

const totalLeads = leads.length;
const discoveryCall = leads.filter(
  (l) => l.leadStatus === "Discovery Call" || l.leadStatus === "Follow up" || l.leadStatus === "Angebot zuschicken"
).length;
const angebotSent = leads.filter(
  (l) => l.dealStatus === "Angebot schicken" || l.leadStatus === "Angebot zuschicken"
).length;
const terminCount = leads.filter((l) => l.terminBeimAmt).length;

const funnelData = [
  { name: "Leads", value: totalLeads, fill: "#3b82f6" },
  { name: "Discovery Call+", value: discoveryCall, fill: "#6366f1" },
  { name: "Angebot", value: angebotSent, fill: "#8b5cf6" },
  { name: "Amt-Termin", value: terminCount, fill: "#a78bfa" },
];

const channelData = [
  {
    name: "Meta (FB/IG)",
    leads: metaLeads.length,
    spend: totalMetaSpend,
  },
  {
    name: "Kursnet",
    leads: kursnetLeads.length,
    spend: 0,
  },
];

const statusData = [
  { name: "Neuer Lead", count: leads.filter((l) => l.leadStatus === "Neuer Lead").length },
  { name: "1x NE", count: leads.filter((l) => l.leadStatus === "1x NE").length },
  { name: "Discovery Call", count: leads.filter((l) => l.leadStatus === "Discovery Call").length },
  { name: "Follow up", count: leads.filter((l) => l.leadStatus === "Follow up").length },
  { name: "Angebot", count: leads.filter((l) => l.leadStatus === "Angebot zuschicken").length },
  { name: "Verloren", count: leads.filter((l) => l.leadStatus === "Verloren").length },
];

export default function OverviewPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Talentspring Payroll Academy – Gesamtübersicht
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Gesamte Leads"
          value={totalLeads}
          sub={`${metaLeads.length} Meta · ${kursnetLeads.length} Kursnet`}
          icon={<Users className="h-4 w-4" />}
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
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Funnel */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5">
          <h2 className="mb-4 text-sm font-medium text-zinc-400">
            Conversion Funnel
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <FunnelChart>
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                itemStyle={{ color: "#e4e4e7" }}
              />
              <Funnel dataKey="value" data={funnelData} isAnimationActive>
                <LabelList
                  position="right"
                  fill="#a1a1aa"
                  stroke="none"
                  dataKey="name"
                  fontSize={12}
                />
                <LabelList
                  position="center"
                  fill="#fff"
                  stroke="none"
                  dataKey="value"
                  fontSize={16}
                  fontWeight={600}
                />
                {funnelData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>

        {/* Lead Status Distribution */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5">
          <h2 className="mb-4 text-sm font-medium text-zinc-400">
            Lead-Status Verteilung
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={statusData} layout="vertical">
              <XAxis type="number" stroke="#52525b" fontSize={12} />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                stroke="#52525b"
                fontSize={12}
              />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                itemStyle={{ color: "#e4e4e7" }}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Channel Comparison */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5">
        <h2 className="mb-4 text-sm font-medium text-zinc-400">
          Kanal-Vergleich
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {channelData.map((ch) => (
            <div
              key={ch.name}
              className="rounded-lg border border-zinc-800/40 bg-zinc-900/30 p-4"
            >
              <div className="text-sm font-medium text-zinc-300">{ch.name}</div>
              <div className="mt-2 text-3xl font-bold text-white">
                {ch.leads}
                <span className="ml-1 text-sm font-normal text-zinc-500">
                  Leads
                </span>
              </div>
              {ch.spend > 0 && (
                <div className="mt-1 text-xs text-zinc-500">
                  €{ch.spend.toFixed(2)} Spend · €
                  {(ch.spend / ch.leads).toFixed(2)} CPL
                </div>
              )}
              {ch.spend === 0 && (
                <div className="mt-1 text-xs text-zinc-500">
                  Organisch via Kursnet/meinNOW
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

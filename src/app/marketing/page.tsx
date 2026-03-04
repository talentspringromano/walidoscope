"use client";

import { KpiCard } from "@/components/kpi-card";
import { leads } from "@/data/leads";
import { metaAds, totalMetaSpend, totalMetaLeads, avgCPL } from "@/data/meta-ads";
import { perspectiveSummary } from "@/data/perspective";
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
  Legend,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";

/* ── Lead Segmentierung ── */
function classifyLead(l: (typeof leads)[0]) {
  const arbeitslos = l.arbeitslosGemeldet === "Ja";
  const baldArbeitslos = l.arbeitslosGemeldet.includes("3 Monaten");
  const vorerfahrung = l.vorerfahrung.includes("relevante Erfahrung");
  const interesse = l.vorerfahrung.includes("Interesse");

  if (arbeitslos && (vorerfahrung || interesse)) return "High-Touch";
  if (baldArbeitslos) return "Low-Touch";
  if (arbeitslos) return "Medium";
  return "Nicht qualifiziert";
}

const segmentCounts: Record<string, number> = {};
leads.forEach((l) => {
  const seg = classifyLead(l);
  segmentCounts[seg] = (segmentCounts[seg] || 0) + 1;
});

const segmentData = Object.entries(segmentCounts).map(([name, value]) => ({
  name,
  value,
}));

const SEGMENT_COLORS = ["#10b981", "#6366f1", "#f59e0b", "#ef4444"];

/* ── Creative Deep-Funnel ── */
const creativeDeepFunnel = metaAds.map((ad) => {
  const adLeads = leads.filter(
    (l) =>
      l.adId === ad.adId ||
      l.adId === `ag:${ad.adId}` ||
      l.adId.includes(ad.adId.slice(-10))
  );
  const discovery = adLeads.filter(
    (l) =>
      l.leadStatus === "Discovery Call" ||
      l.leadStatus === "Follow up" ||
      l.leadStatus === "Angebot zuschicken"
  ).length;
  const angebot = adLeads.filter(
    (l) =>
      l.dealStatus === "Angebot schicken" ||
      l.leadStatus === "Angebot zuschicken"
  ).length;
  return {
    ...ad,
    airtableLeads: adLeads.length,
    discovery,
    angebot,
  };
});

/* ── Perspective Funnel ── */
const perspFunnelData = [
  { name: "LP Visits", value: perspectiveSummary.totalVisits, fill: "#3b82f6" },
  { name: "Konvertiert", value: perspectiveSummary.converted, fill: "#8b5cf6" },
  { name: "Completed", value: perspectiveSummary.completed, fill: "#a78bfa" },
];

/* ── Cost per Ad Chart ── */
const costData = metaAds.map((ad) => ({
  name: ad.shortName,
  spend: ad.amountSpent,
  cpl: ad.costPerResult,
}));

export default function MarketingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Marketing Analytics</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Ad Performance, Lead-Segmentierung & Kursnet Funnel
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Meta Spend" value={`€${totalMetaSpend.toFixed(2)}`} sub="7 Creatives" />
        <KpiCard label="Meta Leads" value={totalMetaLeads} sub={`€${avgCPL.toFixed(2)} CPL`} />
        <KpiCard
          label="Kursnet Visits"
          value={perspectiveSummary.totalVisits}
          sub={`${perspectiveSummary.converted} konvertiert`}
        />
        <KpiCard
          label="Kursnet Leads"
          value={leads.filter((l) => l.platform === "Kursnet").length}
          sub="Aus Airtable CRM"
        />
      </div>

      {/* Creative Performance Table */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5">
        <h2 className="mb-4 text-sm font-medium text-zinc-400">
          Creative Performance (Deep-Funnel)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-xs uppercase text-zinc-500">
                <th className="pb-3 pr-4">Creative</th>
                <th className="pb-3 pr-4 text-right">Spend</th>
                <th className="pb-3 pr-4 text-right">Impr.</th>
                <th className="pb-3 pr-4 text-right">Clicks</th>
                <th className="pb-3 pr-4 text-right">Leads</th>
                <th className="pb-3 pr-4 text-right">CPL</th>
                <th className="pb-3 pr-4 text-right">CRM Leads</th>
                <th className="pb-3 pr-4 text-right">Discovery+</th>
                <th className="pb-3 text-right">Angebot</th>
              </tr>
            </thead>
            <tbody>
              {creativeDeepFunnel.map((ad) => (
                <tr
                  key={ad.adId}
                  className="border-b border-zinc-800/40 hover:bg-zinc-800/20"
                >
                  <td className="py-3 pr-4 font-medium text-zinc-200">
                    {ad.shortName}
                  </td>
                  <td className="py-3 pr-4 text-right text-zinc-400">
                    €{ad.amountSpent.toFixed(2)}
                  </td>
                  <td className="py-3 pr-4 text-right text-zinc-400">
                    {ad.impressions.toLocaleString()}
                  </td>
                  <td className="py-3 pr-4 text-right text-zinc-400">
                    {ad.clicksAll}
                  </td>
                  <td className="py-3 pr-4 text-right text-zinc-300 font-medium">
                    {ad.results}
                  </td>
                  <td className="py-3 pr-4 text-right text-zinc-400">
                    €{ad.costPerResult.toFixed(2)}
                  </td>
                  <td className="py-3 pr-4 text-right text-zinc-300">
                    {ad.airtableLeads}
                  </td>
                  <td className="py-3 pr-4 text-right text-zinc-300">
                    {ad.discovery}
                  </td>
                  <td className="py-3 text-right font-medium text-emerald-400">
                    {ad.angebot}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cost Analysis */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5">
          <h2 className="mb-4 text-sm font-medium text-zinc-400">
            Spend & CPL pro Creative
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costData}>
              <XAxis dataKey="name" stroke="#52525b" fontSize={11} angle={-20} textAnchor="end" height={60} />
              <YAxis stroke="#52525b" fontSize={12} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                itemStyle={{ color: "#e4e4e7" }}
                formatter={(val) =>
                  typeof val === "number" ? `€${val.toFixed(2)}` : val
                }
              />
              <Bar dataKey="spend" fill="#6366f1" name="Spend" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cpl" fill="#10b981" name="CPL" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Lead Segmentation Pie */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5">
          <h2 className="mb-4 text-sm font-medium text-zinc-400">
            Lead-Segmentierung
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={segmentData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                label={({ name, value }) => `${name} (${value})`}
                labelLine={{ stroke: "#52525b" }}
                fontSize={12}
              >
                {segmentData.map((_, i) => (
                  <Cell key={i} fill={SEGMENT_COLORS[i % SEGMENT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                itemStyle={{ color: "#e4e4e7" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 text-xs text-zinc-500">
            High-Touch = Arbeitslos + Vorerfahrung/Interesse · Low-Touch = Bald arbeitslos · Nicht qualifiziert = Aktuell nicht arbeitslos
          </div>
        </div>
      </div>

      {/* Perspective Funnel */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5">
        <h2 className="mb-4 text-sm font-medium text-zinc-400">
          Kursnet/meinNOW Landing Page Funnel (Perspective)
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <ResponsiveContainer width="100%" height={220}>
            <FunnelChart>
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                itemStyle={{ color: "#e4e4e7" }}
              />
              <Funnel dataKey="value" data={perspFunnelData} isAnimationActive>
                <LabelList position="center" fill="#fff" stroke="none" dataKey="value" fontSize={16} fontWeight={600} />
                <LabelList position="right" fill="#a1a1aa" stroke="none" dataKey="name" fontSize={12} />
                {perspFunnelData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>

          <div className="space-y-3">
            <h3 className="text-xs font-medium uppercase text-zinc-500">
              Visits nach Kurs-Titel
            </h3>
            {Object.entries(perspectiveSummary.byTitle)
              .sort((a, b) => b[1].visits - a[1].visits)
              .slice(0, 6)
              .map(([title, data]) => (
                <div key={title} className="flex items-center justify-between text-sm">
                  <span className="max-w-[280px] truncate text-zinc-300" title={title}>
                    {title}
                  </span>
                  <div className="flex gap-3 text-zinc-500">
                    <span>{data.visits} visits</span>
                    <span className="text-emerald-400">{data.converted} conv.</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

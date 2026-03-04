"use client";

import { KpiCard, SectionCard } from "@/components/kpi-card";
import { leads } from "@/data/leads";
import { metaAds, totalMetaSpend, totalMetaLeads, avgCPL } from "@/data/meta-ads";
import { perspectiveSummary } from "@/data/perspective";
import { TOOLTIP_STYLE, AXIS_STYLE, PALETTE, SEGMENT_COLORS, FUNNEL_COLORS } from "@/components/chart-theme";
import { AlertTriangle } from "lucide-react";
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
  LabelList,
} from "recharts";

/* ── Lead Segmentierung ── */
function classifyLead(l: (typeof leads)[0]) {
  if (l.platform === "Kursnet") return "High-Touch";
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
const segmentData = Object.entries(segmentCounts).map(([name, value]) => ({ name, value }));

/* ── Creative Deep-Funnel ── */
const creativeDeepFunnel = metaAds.map((ad) => {
  const adLeads = leads.filter(
    (l) => l.adId === ad.adId || l.adId === `ag:${ad.adId}` || l.adId.includes(ad.adId.slice(-10))
  );
  const discovery = adLeads.filter(
    (l) => l.leadStatus === "Discovery Call" || l.leadStatus === "Follow up" || l.leadStatus === "Angebot zuschicken"
  ).length;
  const angebot = adLeads.filter(
    (l) => l.dealStatus === "Angebot schicken" || l.leadStatus === "Angebot zuschicken"
  ).length;
  return { ...ad, airtableLeads: adLeads.length, discovery, angebot };
});

/* ── Perspective Funnel ── */
const perspFunnelData = [
  { name: `${perspectiveSummary.totalVisits} LP Visits`, value: perspectiveSummary.totalVisits },
  { name: `${perspectiveSummary.converted} Konvertiert`, value: perspectiveSummary.converted },
];

/* ── Cost per Ad ── */
const costData = metaAds.map((ad) => ({
  name: ad.shortName,
  spend: ad.amountSpent,
  cpl: ad.costPerResult,
}));

export default function MarketingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-[#fafaf9]">Marketing Analytics</h1>
        <p className="mt-1 text-[13px] text-[#57534e]">Ad Performance, Lead-Segmentierung & Kursnet Funnel</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 stagger-in">
        <KpiCard label="Meta Spend" value={`€${totalMetaSpend.toFixed(2)}`} sub="7 Creatives" accent />
        <KpiCard label="Meta Leads" value={totalMetaLeads} sub={`€${avgCPL.toFixed(2)} CPL`} />
        <KpiCard label="Kursnet Visits" value={perspectiveSummary.totalVisits} sub={`${perspectiveSummary.converted} konvertiert`} />
        <KpiCard label="Kursnet Leads" value={leads.filter((l) => l.platform === "Kursnet").length} sub={`${leads.filter((l) => l.platform === "Kursnet").length} im CRM · ${perspectiveSummary.converted} konvertiert`} />
      </div>

      {/* Creative Performance Table */}
      <SectionCard title="Creative Performance (Deep-Funnel)">
        <div className="overflow-x-auto -mx-2">
          <table className="w-full premium-table">
            <thead>
              <tr>
                <th className="text-left pl-2">Creative</th>
                <th className="text-right pr-5">Spend</th>
                <th className="text-right pr-5">Impr.</th>
                <th className="text-right pr-5">Clicks</th>
                <th className="text-right pr-5">Leads</th>
                <th className="text-right pr-5">CPL</th>
                <th className="text-right pr-5">CRM</th>
                <th className="text-right pr-5">Discovery+</th>
                <th className="text-right pr-2">Angebot</th>
              </tr>
            </thead>
            <tbody>
              {creativeDeepFunnel.map((ad) => (
                <tr key={ad.adId}>
                  <td className="pl-2 pr-4 text-[13px] font-medium text-[#fafaf9]">{ad.shortName}</td>
                  <td className="text-right pr-5 tabular-nums text-[#78716c]">€{ad.amountSpent.toFixed(2)}</td>
                  <td className="text-right pr-5 tabular-nums text-[#78716c]">{ad.impressions.toLocaleString()}</td>
                  <td className="text-right pr-5 tabular-nums text-[#78716c]">{ad.clicksAll}</td>
                  <td className="text-right pr-5 tabular-nums font-medium text-[#e2a96e]">{ad.results}</td>
                  <td className="text-right pr-5 tabular-nums text-[#78716c]">€{ad.costPerResult.toFixed(2)}</td>
                  <td className="text-right pr-5 tabular-nums text-[#a8a29e]">{ad.airtableLeads}</td>
                  <td className="text-right pr-5 tabular-nums text-[#a8a29e]">{ad.discovery}</td>
                  <td className="text-right pr-2 tabular-nums font-semibold text-[#5eead4] glow-badge">{ad.angebot}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2 stagger-in">
        {/* Cost Analysis */}
        <SectionCard title="Spend & CPL pro Creative">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costData} barGap={4}>
              <XAxis dataKey="name" {...AXIS_STYLE} angle={-18} textAnchor="end" height={65} axisLine={false} tickLine={false} />
              <YAxis {...AXIS_STYLE} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(val) => typeof val === "number" ? `€${val.toFixed(2)}` : val} />
              <Bar dataKey="spend" fill={PALETTE.indigo} name="Spend" radius={[6, 6, 0, 0]} />
              <Bar dataKey="cpl" fill={PALETTE.teal} name="CPL" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        {/* Lead Segmentation Pie */}
        <SectionCard title="Lead-Segmentierung">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={segmentData}
                cx="50%"
                cy="50%"
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

      {/* CRM Gap Warning */}
      <div className="rounded-xl border border-amber-500/30 px-5 py-4 flex items-start gap-3" style={{ background: "rgba(245, 158, 11, 0.12)" }}>
        <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-[14px] font-semibold text-amber-300">CRM-Erfassungslücke erkannt</p>
          <p className="text-[13px] text-amber-400/80 mt-1">
            12 von {perspectiveSummary.converted} Perspective-Konversionen fehlen im CRM. Nur {leads.filter((l) => l.platform === "Kursnet").length} wurden in Airtable als Kursnet-Leads erfasst.
          </p>
        </div>
      </div>

      {/* Perspective Funnel */}
      <SectionCard title="Kursnet/meinNOW Landing Page Funnel">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <ResponsiveContainer width="100%" height={220}>
              <FunnelChart>
                <Tooltip {...TOOLTIP_STYLE} />
                <Funnel dataKey="value" data={perspFunnelData} isAnimationActive animationDuration={800}>
                  <LabelList position="right" fill="#a8a29e" stroke="none" dataKey="name" fontSize={14} fontWeight={600} />
                  {perspFunnelData.map((_, i) => (
                    <Cell key={i} fill={FUNNEL_COLORS[i]} />
                  ))}
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>

          {/* Gap Visualization */}
          <div className="flex flex-col justify-center space-y-4">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#57534e]">
              CRM-Erfassungs-Gap
            </h3>
            {[
              { label: "Perspective konvertiert", value: perspectiveSummary.converted, color: "text-[#818cf8]" },
              { label: "Im CRM erfasst", value: leads.filter((l) => l.platform === "Kursnet").length, color: "text-[#5eead4]" },
              { label: "Fehlend", value: perspectiveSummary.converted - leads.filter((l) => l.platform === "Kursnet").length, color: "text-amber-400" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-[12px] text-[#a8a29e]">{row.label}</span>
                <span className={`text-[18px] font-semibold tabular-nums ${row.color}`}>{row.value}</span>
              </div>
            ))}
            <div className="h-2 rounded-full bg-[rgba(255,255,255,0.04)] overflow-hidden mt-1">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#5eead4] to-[#5eead4]"
                style={{ width: `${Math.round((leads.filter((l) => l.platform === "Kursnet").length / perspectiveSummary.converted) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-[#57534e]">
              {Math.round((leads.filter((l) => l.platform === "Kursnet").length / perspectiveSummary.converted) * 100)}% Erfassungsrate
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#57534e] mb-4">
              Visits nach Kurs-Titel
            </h3>
            {Object.entries(perspectiveSummary.byTitle)
              .sort((a, b) => b[1].visits - a[1].visits)
              .slice(0, 6)
              .map(([title, data]) => {
                const pct = Math.round((data.visits / perspectiveSummary.totalVisits) * 100);
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

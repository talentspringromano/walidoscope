"use client";

import { KpiCard } from "@/components/kpi-card";
import { leads } from "@/data/leads";
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
} from "recharts";

/* ── Status Distribution ── */
const statusOrder = [
  "Neuer Lead",
  "1x NE",
  "Discovery Call",
  "Follow up",
  "Angebot zuschicken",
  "Verloren",
] as const;

const statusData = statusOrder.map((s) => ({
  name: s,
  count: leads.filter((l) => l.leadStatus === s).length,
}));

const STATUS_COLORS: Record<string, string> = {
  "Neuer Lead": "#3b82f6",
  "1x NE": "#f59e0b",
  "Discovery Call": "#6366f1",
  "Follow up": "#8b5cf6",
  "Angebot zuschicken": "#10b981",
  Verloren: "#ef4444",
};

/* ── Verlustgründe ── */
const verlustgruende: Record<string, number> = {};
leads
  .filter((l) => l.leadStatus === "Verloren" && l.verlustgrund)
  .forEach((l) => {
    verlustgruende[l.verlustgrund] = (verlustgruende[l.verlustgrund] || 0) + 1;
  });

const verlustData = Object.entries(verlustgruende)
  .sort((a, b) => b[1] - a[1])
  .map(([name, value]) => ({ name, value }));

const LOSS_COLORS = ["#ef4444", "#f97316", "#eab308", "#a855f7", "#64748b"];

/* ── Deal Tracking ── */
const angebotLeads = leads.filter(
  (l) => l.dealStatus === "Angebot schicken" || l.leadStatus === "Angebot zuschicken"
);
const discoveryPlus = leads.filter(
  (l) =>
    l.leadStatus === "Discovery Call" ||
    l.leadStatus === "Follow up" ||
    l.leadStatus === "Angebot zuschicken"
);

/* ── Amt-Termine ── */
const leadsWithTermin = leads.filter((l) => l.terminBeimAmt);

export default function SalesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Sales Analytics</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Lead-Pipeline, Verlustgründe & Deal-Tracking
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="In Pipeline"
          value={discoveryPlus.length}
          sub="Discovery Call + Follow up + Angebot"
        />
        <KpiCard
          label="Angebote erstellt"
          value={angebotLeads.length}
          sub="Deal-Status: Angebot schicken"
        />
        <KpiCard
          label="Verloren"
          value={leads.filter((l) => l.leadStatus === "Verloren").length}
          sub={`${verlustData.length} verschiedene Gründe`}
        />
        <KpiCard
          label="Amt-Termine"
          value={leadsWithTermin.length}
          sub="Termine gebucht"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status Bar Chart */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5">
          <h2 className="mb-4 text-sm font-medium text-zinc-400">
            Lead-Status Verteilung
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData}>
              <XAxis dataKey="name" stroke="#52525b" fontSize={11} angle={-15} textAnchor="end" height={50} />
              <YAxis stroke="#52525b" fontSize={12} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                itemStyle={{ color: "#e4e4e7" }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {statusData.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#6366f1"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Verlustgründe Pie */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5">
          <h2 className="mb-4 text-sm font-medium text-zinc-400">
            Verlustgründe
          </h2>
          {verlustData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={verlustData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, value }) => `${name} (${value})`}
                  labelLine={{ stroke: "#52525b" }}
                  fontSize={11}
                >
                  {verlustData.map((_, i) => (
                    <Cell key={i} fill={LOSS_COLORS[i % LOSS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                  itemStyle={{ color: "#e4e4e7" }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-zinc-500">
              Keine Verlustgründe erfasst
            </div>
          )}
        </div>
      </div>

      {/* Deal Tracking */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5">
        <h2 className="mb-4 text-sm font-medium text-zinc-400">
          Deal-Tracking – Angebote in Pipeline
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-xs uppercase text-zinc-500">
                <th className="pb-3 pr-4">#</th>
                <th className="pb-3 pr-4">Lead Status</th>
                <th className="pb-3 pr-4">Deal Status</th>
                <th className="pb-3 pr-4">Plattform</th>
                <th className="pb-3 pr-4">Vertriebler</th>
                <th className="pb-3 pr-4">Closing %</th>
                <th className="pb-3">Erstellt</th>
              </tr>
            </thead>
            <tbody>
              {angebotLeads.map((l, i) => (
                <tr key={l.id} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                  <td className="py-3 pr-4 text-zinc-500">{i + 1}</td>
                  <td className="py-3 pr-4">
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                      {l.leadStatus}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-zinc-300">{l.dealStatus}</td>
                  <td className="py-3 pr-4 text-zinc-400">{l.platform}</td>
                  <td className="py-3 pr-4 text-zinc-300">{l.vertriebler}</td>
                  <td className="py-3 pr-4 text-zinc-400">{l.closingWahrscheinlichkeit || "–"}</td>
                  <td className="py-3 text-zinc-500">{l.createdOn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Amt-Termine */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5">
        <h2 className="mb-4 text-sm font-medium text-zinc-400">
          Amt-Termine
        </h2>
        {leadsWithTermin.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {leadsWithTermin.map((l) => (
              <div
                key={l.id}
                className="rounded-lg border border-zinc-800/40 bg-zinc-900/30 p-3"
              >
                <div className="text-sm font-medium text-zinc-200">
                  Lead #{l.id}
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  Termin: {l.terminBeimAmt}
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  Status: {l.leadStatus} · {l.platform}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-zinc-500">Keine Amt-Termine erfasst</div>
        )}
      </div>
    </div>
  );
}

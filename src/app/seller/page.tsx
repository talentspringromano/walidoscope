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
  Cell,
} from "recharts";

/* ── Seller Stats ── */
const sellers = ["Walid Karimi", "Nele Pfau"] as const;

function sellerStats(name: string) {
  const sellerLeads = leads.filter((l) => l.vertriebler === name);
  const discovery = sellerLeads.filter(
    (l) =>
      l.leadStatus === "Discovery Call" ||
      l.leadStatus === "Follow up" ||
      l.leadStatus === "Angebot zuschicken"
  ).length;
  const angebot = sellerLeads.filter(
    (l) => l.dealStatus === "Angebot schicken" || l.leadStatus === "Angebot zuschicken"
  ).length;
  const verloren = sellerLeads.filter((l) => l.leadStatus === "Verloren").length;
  const termine = sellerLeads.filter((l) => l.terminBeimAmt).length;
  const neuerLead = sellerLeads.filter((l) => l.leadStatus === "Neuer Lead").length;
  const nichtErreicht = sellerLeads.filter((l) => l.leadStatus === "1x NE").length;

  return {
    name,
    total: sellerLeads.length,
    discovery,
    angebot,
    verloren,
    termine,
    neuerLead,
    nichtErreicht,
    statusData: [
      { name: "Neuer Lead", count: neuerLead },
      { name: "1x NE", count: nichtErreicht },
      { name: "Discovery+", count: discovery },
      { name: "Verloren", count: verloren },
    ],
  };
}

const sellerData = sellers.map((s) => sellerStats(s));

const STATUS_COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444"];

const comparisonData = sellerData.map((s) => ({
  name: s.name.split(" ")[0],
  Leads: s.total,
  "Discovery+": s.discovery,
  Angebote: s.angebot,
}));

export default function SellerPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Seller-Ansicht</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Performance-Vergleich der Vertriebler
        </p>
      </div>

      {/* Comparison Chart */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5">
        <h2 className="mb-4 text-sm font-medium text-zinc-400">
          Vertriebler-Vergleich
        </h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={comparisonData}>
            <XAxis dataKey="name" stroke="#52525b" fontSize={13} />
            <YAxis stroke="#52525b" fontSize={12} />
            <Tooltip
              contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
              itemStyle={{ color: "#e4e4e7" }}
            />
            <Bar dataKey="Leads" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Discovery+" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Angebote" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Seller Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {sellerData.map((s) => (
          <div
            key={s.name}
            className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5"
          >
            <h2 className="mb-4 text-lg font-semibold text-white">{s.name}</h2>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <KpiCard label="Leads gesamt" value={s.total} />
              <KpiCard label="Discovery+" value={s.discovery} />
              <KpiCard label="Angebote" value={s.angebot} />
              <KpiCard label="Verloren" value={s.verloren} />
            </div>

            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={s.statusData} layout="vertical">
                <XAxis type="number" stroke="#52525b" fontSize={12} />
                <YAxis type="category" dataKey="name" width={90} stroke="#52525b" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                  itemStyle={{ color: "#e4e4e7" }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {s.statusData.map((_, i) => (
                    <Cell key={i} fill={STATUS_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      {/* Bestenliste */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5">
        <h2 className="mb-4 text-sm font-medium text-zinc-400">
          Bestenliste
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-xs uppercase text-zinc-500">
                <th className="pb-3 pr-4">Rang</th>
                <th className="pb-3 pr-4">Vertriebler</th>
                <th className="pb-3 pr-4 text-right">Leads</th>
                <th className="pb-3 pr-4 text-right">Discovery+</th>
                <th className="pb-3 pr-4 text-right">Angebote</th>
                <th className="pb-3 pr-4 text-right">Conversion %</th>
                <th className="pb-3 text-right">Amt-Termine</th>
              </tr>
            </thead>
            <tbody>
              {sellerData
                .sort((a, b) => b.angebot - a.angebot)
                .map((s, i) => (
                  <tr key={s.name} className="border-b border-zinc-800/40">
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          i === 0 ? "bg-amber-500/20 text-amber-400" : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-medium text-zinc-200">{s.name}</td>
                    <td className="py-3 pr-4 text-right text-zinc-300">{s.total}</td>
                    <td className="py-3 pr-4 text-right text-zinc-300">{s.discovery}</td>
                    <td className="py-3 pr-4 text-right font-medium text-emerald-400">{s.angebot}</td>
                    <td className="py-3 pr-4 text-right text-zinc-400">
                      {s.total > 0 ? ((s.discovery / s.total) * 100).toFixed(1) : 0}%
                    </td>
                    <td className="py-3 text-right text-zinc-300">{s.termine}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

"use client";

import { KpiCard, SectionCard } from "@/components/kpi-card";
import { leads } from "@/data/leads";
import { TOOLTIP_STYLE, AXIS_STYLE, STATUS_COLORS, LOSS_COLORS, PALETTE } from "@/components/chart-theme";
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
  CartesianGrid,
  Legend,
} from "recharts";

const statusOrder = [
  "Neuer Lead", "Rückruf", "Vertriebsqualifiziert", "Reterminierung",
  "Kennenlerngespräch gebucht", "Beratungsgespräch gebucht", "Gewonnen", "Verloren",
] as const;

const statusData = statusOrder.map((s) => ({
  name: s,
  count: leads.filter((l) => l.leadStatus === s).length,
}));

const lostLeads = leads.filter((l) => l.leadStatus === "Verloren");
const lostWithReason = lostLeads.filter((l) => l.verlustgrund);
const lostNoReason = lostLeads.filter((l) => !l.verlustgrund);

const verlustgruende: Record<string, number> = {};
lostWithReason.forEach((l) => {
  verlustgruende[l.verlustgrund] = (verlustgruende[l.verlustgrund] || 0) + 1;
});
// Add "Kein Grund angegeben" to pie
if (lostNoReason.length > 0) {
  verlustgruende["Kein Grund angegeben"] = lostNoReason.length;
}
const verlustData = Object.entries(verlustgruende)
  .sort((a, b) => b[1] - a[1])
  .map(([name, value]) => ({ name, value }));

/* ── Helpers: week grouping ── */
function parseDE(dateStr: string): Date {
  const [dayMonthYear] = dateStr.split(" ");
  const [day, month, year] = dayMonthYear.split(".");
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/* ── Verlustgründe im Zeitverlauf ── */
const lossWeekMap = new Map<number, Record<string, number>>();
lostLeads.forEach((l) => {
  const date = parseDE(l.createdOn);
  if (isNaN(date.getTime())) return;
  const wk = getISOWeek(date);
  const entry = lossWeekMap.get(wk) ?? {};
  const reason = l.verlustgrund || "Kein Grund angegeben";
  entry[reason] = (entry[reason] || 0) + 1;
  lossWeekMap.set(wk, entry);
});

const allLossReasons = Array.from(
  new Set(lostLeads.map((l) => l.verlustgrund || "Kein Grund angegeben"))
);

const lossWeeklyData = Array.from(lossWeekMap.entries())
  .sort((a, b) => a[0] - b[0])
  .map(([wk, counts]) => ({
    week: `KW ${wk}`,
    ...Object.fromEntries(allLossReasons.map((r) => [r, counts[r] || 0])),
  }));

// Lost by seller
const lostBySeller: Record<string, { total: number; noReason: number }> = {};
lostLeads.forEach((l) => {
  const entry = lostBySeller[l.vertriebler] ?? { total: 0, noReason: 0 };
  entry.total++;
  if (!l.verlustgrund) entry.noReason++;
  lostBySeller[l.vertriebler] = entry;
});

const gewonnenLeads = leads.filter((l) => l.leadStatus === "Gewonnen");
const gewonnenBySeller: Record<string, number> = {};
gewonnenLeads.forEach((l) => {
  gewonnenBySeller[l.vertriebler] = (gewonnenBySeller[l.vertriebler] || 0) + 1;
});

const angebotLeads = leads.filter(
  (l) => l.dealStatus === "Angebot schicken" || l.leadStatus === "Beratungsgespräch gebucht"
);
const pipelineLeads = leads.filter(
  (l) =>
    l.leadStatus === "Vertriebsqualifiziert" ||
    l.leadStatus === "Kennenlerngespräch gebucht" ||
    l.leadStatus === "Beratungsgespräch gebucht"
);
const leadsWithTermin = leads.filter((l) => l.terminBeimAmt);

/* ── Termine im Zeitverlauf ── */
function parseTerminDateDE(s: string): Date {
  const [day, month, year] = s.split(".").map(Number);
  return new Date(year, month - 1, day);
}

const terminWeekMap = new Map<number, number>();
leadsWithTermin.forEach((l) => {
  const date = parseTerminDateDE(l.terminBeimAmt);
  if (isNaN(date.getTime())) return;
  const wk = getISOWeek(date);
  terminWeekMap.set(wk, (terminWeekMap.get(wk) || 0) + 1);
});

const terminWeeklyData = Array.from(terminWeekMap.entries())
  .sort((a, b) => a[0] - b[0])
  .map(([wk, count]) => ({ week: `KW ${wk}`, Termine: count }));

/* ── Amt-Termine: parse, filter auf diese + nächste Woche, sortieren ── */
function parseTerminDate(s: string): Date {
  const [day, month, year] = s.split(".").map(Number);
  return new Date(year, month - 1, day);
}

const today = new Date();
// Montag dieser Woche (getDay: 0=So,1=Mo…)
const dayOfWeek = today.getDay();
const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
const thisMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - diffToMonday);
const nextSunday = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() + 13, 23, 59, 59);
const nextMonday = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() + 7);

const termineSorted = leadsWithTermin
  .map((l) => ({ ...l, _terminDate: parseTerminDate(l.terminBeimAmt) }))
  .filter((l) => l._terminDate >= thisMonday && l._terminDate <= nextSunday)
  .sort((a, b) => a._terminDate.getTime() - b._terminDate.getTime());

const termineThisWeek = termineSorted.filter((l) => l._terminDate < nextMonday);
const termineNextWeek = termineSorted.filter((l) => l._terminDate >= nextMonday);

function weekLabel(start: Date): string {
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  const fmt = (d: Date) => `${d.getDate()}.${d.getMonth() + 1}.`;
  return `${fmt(start)} – ${fmt(end)}`;
}

const STATUS_BADGE: Record<string, string> = {
  "Vertriebsqualifiziert": "bg-[rgba(226,169,110,0.12)] text-[#e2a96e]",
  "Reterminierung": "bg-[rgba(167,139,250,0.12)] text-[#a78bfa]",
  "Kennenlerngespräch gebucht": "bg-[rgba(94,234,212,0.12)] text-[#5eead4]",
  "Beratungsgespräch gebucht": "bg-[rgba(52,211,153,0.12)] text-[#34d399]",
  "Gewonnen": "bg-[rgba(251,191,36,0.12)] text-[#fbbf24]",
};

export default function SalesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-[#fafaf9]">Sales Analytics</h1>
        <p className="mt-1 text-[13px] text-[#57534e]">Lead-Pipeline, Verlustgründe & Deal-Tracking</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5 stagger-in">
        <KpiCard label="In Pipeline" value={pipelineLeads.length} sub="VQ + KLG + BG" accent />
        <KpiCard label="BGs (Gewonnen)" value={gewonnenLeads.length} sub={Object.entries(gewonnenBySeller).map(([name, count]) => `${name.split(" ")[0]}: ${count}`).join(" · ") || "Keine"} />
        <KpiCard label="Angebote erstellt" value={angebotLeads.length} sub="Deal: Angebot schicken" />
        <KpiCard label="Verloren" value={lostLeads.length} sub={`${lostNoReason.length} ohne Grund`} />
        <KpiCard label="Amt-Termine" value={leadsWithTermin.length} sub="Termine gebucht" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 stagger-in">
        <SectionCard title="Lead-Status Verteilung">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData} barCategoryGap="18%">
              <XAxis dataKey="name" {...AXIS_STYLE} angle={-15} textAnchor="end" height={55} axisLine={false} tickLine={false} />
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

        <SectionCard title="Verlustgründe">
          {verlustData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={verlustData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    dataKey="value"
                    stroke="none"
                    label={({ name, value }) => `${name} (${value})`}
                    labelLine={{ stroke: "#44403c", strokeWidth: 1 }}
                    fontSize={10}
                  >
                    {verlustData.map((_, i) => (
                      <Cell key={i} fill={LOSS_COLORS[i % LOSS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-3">
                {verlustData.map((d, i) => (
                  <span key={d.name} className="flex items-center gap-1.5 text-[11px] text-[#78716c]">
                    <span className="h-2 w-2 rounded-full" style={{ background: LOSS_COLORS[i % LOSS_COLORS.length] }} />
                    {d.name}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-[#44403c]">Keine Verlustgründe erfasst</div>
          )}
        </SectionCard>
      </div>

      {/* Verlustgründe im Zeitverlauf */}
      {lossWeeklyData.length > 0 && (
        <SectionCard title="Verlustgründe im Zeitverlauf">
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={lossWeeklyData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="week" {...AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis {...AXIS_STYLE} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#78716c" }} />
              {allLossReasons.map((reason, i) => (
                <Bar
                  key={reason}
                  dataKey={reason}
                  stackId="loss"
                  fill={LOSS_COLORS[i % LOSS_COLORS.length]}
                  radius={i === allLossReasons.length - 1 ? [4, 4, 0, 0] : undefined}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      {/* Verluste pro Vertriebler */}
      {lostLeads.length > 0 && (
        <SectionCard title="Verluste pro Vertriebler">
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            {Object.entries(lostBySeller)
              .sort((a, b) => b[1].total - a[1].total)
              .map(([name, data]) => (
                <div key={name} className="rounded-xl border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] p-4">
                  <div className="text-[14px] font-medium text-[#fafaf9]">{name}</div>
                  <div className="flex items-baseline gap-3 mt-2">
                    <span className="text-[28px] font-bold tabular-nums text-[#f87171]">{data.total}</span>
                    <span className="text-[12px] text-[#57534e]">Verloren</span>
                  </div>
                  {data.noReason > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] w-fit">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      <span className="text-[11px] font-medium text-amber-400">{data.noReason}× kein Grund angegeben</span>
                    </div>
                  )}
                  <div className="mt-3 h-1.5 rounded-full bg-[rgba(255,255,255,0.04)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#f87171]"
                      style={{ width: `${Math.round((data.noReason / data.total) * 100)}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-[#57534e] mt-1">
                    {Math.round(((data.total - data.noReason) / data.total) * 100)}% mit Grund erfasst
                  </div>
                </div>
              ))}
          </div>

          {/* Detail-Tabelle der Leads ohne Grund */}
          {lostNoReason.length > 0 && (
            <div>
              <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-amber-400 mb-3 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Verluste ohne Grund — Nachpflege nötig
              </h3>
              <div className="overflow-x-auto -mx-2">
                <table className="w-full premium-table">
                  <thead>
                    <tr>
                      <th className="text-left pl-2">#</th>
                      <th className="text-left pl-4">Name</th>
                      <th className="text-left pl-4">Vertriebler</th>
                      <th className="text-left pl-4">Plattform</th>
                      <th className="text-right pr-2">Erstellt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lostNoReason.map((l) => (
                      <tr key={l.id}>
                        <td className="pl-2 tabular-nums text-[#44403c] text-[12px]">{l.id}</td>
                        <td className="pl-4 text-[13px] font-medium text-[#fafaf9]">{l.name}</td>
                        <td className="pl-4 text-[13px] text-[#a8a29e]">{l.vertriebler}</td>
                        <td className="pl-4 text-[12px] text-[#57534e]">{l.platform}</td>
                        <td className="text-right pr-2 tabular-nums text-[12px] text-[#57534e]">{l.createdOn}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </SectionCard>
      )}

      {/* Deal Tracking */}
      <SectionCard title="Deal-Tracking — Angebote in Pipeline">
        <div className="overflow-x-auto -mx-2">
          <table className="w-full premium-table">
            <thead>
              <tr>
                <th className="text-left pl-2">#</th>
                <th className="text-left pl-4">Name</th>
                <th className="text-left pl-4">Status</th>
                <th className="text-left pl-4">Deal</th>
                <th className="text-left pl-4">Vertriebler</th>
                <th className="text-right pr-5">Closing %</th>
                <th className="text-right pr-2">Erstellt</th>
              </tr>
            </thead>
            <tbody>
              {angebotLeads.map((l, i) => (
                <tr key={l.id}>
                  <td className="pl-2 tabular-nums text-[#44403c] text-[12px]">{i + 1}</td>
                  <td className="pl-4 text-[13px] font-medium text-[#fafaf9]">{l.name}</td>
                  <td className="pl-4">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_BADGE[l.leadStatus] || "bg-[rgba(255,255,255,0.05)] text-[#a8a29e]"}`}>
                      {l.leadStatus}
                    </span>
                  </td>
                  <td className="pl-4 text-[13px] text-[#a8a29e]">{l.dealStatus}</td>
                  <td className="pl-4 text-[13px] text-[#fafaf9] font-medium">{l.vertriebler}</td>
                  <td className="text-right pr-5 tabular-nums text-[#e2a96e] font-medium text-[13px]">{l.closingWahrscheinlichkeit || "—"}</td>
                  <td className="text-right pr-2 tabular-nums text-[12px] text-[#57534e]">{l.createdOn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Amt-Termine */}
      <SectionCard title="Amt-Termine">
        {termineSorted.length > 0 ? (
          <div className="space-y-6">
            {[
              { label: `Diese Woche · ${weekLabel(thisMonday)}`, items: termineThisWeek },
              { label: `Nächste Woche · ${weekLabel(nextMonday)}`, items: termineNextWeek },
            ].map((group) => group.items.length > 0 && (
              <div key={group.label}>
                <div className="mb-3 text-[12px] font-medium text-[#78716c] uppercase tracking-wider">{group.label}</div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 stagger-in">
                  {group.items.map((l) => (
                    <div
                      key={l.id}
                      className="relative rounded-xl border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] p-4 hover:border-[rgba(226,169,110,0.15)] transition-all duration-300 group"
                    >
                      <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-[#5eead4] shadow-[0_0_8px_rgba(94,234,212,0.4)]" />
                      <div className="text-[13px] font-medium text-[#fafaf9]">{l.name}</div>
                      <div className="mt-2 flex items-center gap-2 text-[12px] text-[#e2a96e] tabular-nums font-medium">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="12" height="11" rx="2"/><path d="M5 1v3m6-3v3M2 7h12"/></svg>
                        {l.terminBeimAmt}
                      </div>
                      <div className="mt-1.5 text-[11px] text-[#57534e]">
                        {l.leadStatus} · {l.platform}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[#44403c]">Keine Amt-Termine in dieser oder nächster Woche</div>
        )}
      </SectionCard>

      {/* Termine im Zeitverlauf */}
      {terminWeeklyData.length > 0 && (
        <SectionCard title="Amt-Termine im Zeitverlauf">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={terminWeeklyData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="week" {...AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis {...AXIS_STYLE} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="Termine" fill={PALETTE.teal} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}
    </div>
  );
}

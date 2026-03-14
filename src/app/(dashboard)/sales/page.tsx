"use client";

import { useState, useMemo } from "react";
import { KpiCard, SectionCard } from "@/components/kpi-card";
import { TimeRangeFilter } from "@/components/time-range-filter";
import { leads } from "@/data/leads";
import { TOOLTIP_STYLE, AXIS_STYLE, STATUS_COLORS, LOSS_COLORS, PALETTE } from "@/components/chart-theme";
import { aircallDaily, aircallSellerDaily } from "@/data/aircall";
import { Lightbulb, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import type { ReactNode } from "react";
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
  ComposedChart,
  Line,
} from "recharts";
import type { TimeRange } from "@/lib/date-utils";
import { filterLeadsByRange, filterAircallDailyByRange, getAnchorDate, parseDE, getISOWeek } from "@/lib/date-utils";

const statusOrder = [
  "Neuer Lead", "Rückruf", "Vertriebsqualifiziert", "Reterminierung",
  "Kennenlerngespräch gebucht", "Beratungsgespräch gebucht", "Gewonnen", "Verloren",
] as const;

/* ── Amt-Termine: parse, filter auf diese + nächste Woche, sortieren (real-date-based) ── */
function parseTerminDate(s: string): Date {
  const [day, month, year] = s.split(".").map(Number);
  return new Date(year, month - 1, day);
}

const today = new Date();
const dayOfWeek = today.getDay();
const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
const thisMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - diffToMonday);
const nextSunday = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() + 13, 23, 59, 59);
const nextMonday = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() + 7);

const allLeadsWithTermin = leads.filter((l) => l.terminBeimAmt);
const termineSorted = allLeadsWithTermin
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

/* ── Priority types ── */
type Priority = "high" | "medium" | "low";
interface Recommendation {
  icon: ReactNode;
  priority: Priority;
  title: string;
  detail: string;
}

const PRIORITY_STYLES: Record<Priority, { badge: string; border: string; bg: string; icon: string }> = {
  high: {
    badge: "bg-[rgba(248,113,113,0.12)] text-[#f87171] border-[rgba(248,113,113,0.2)]",
    border: "border-[rgba(248,113,113,0.2)]",
    bg: "bg-[rgba(248,113,113,0.05)]",
    icon: "text-[#f87171]",
  },
  medium: {
    badge: "bg-[rgba(245,158,11,0.12)] text-amber-400 border-[rgba(245,158,11,0.2)]",
    border: "border-[rgba(245,158,11,0.2)]",
    bg: "bg-[rgba(245,158,11,0.05)]",
    icon: "text-amber-400",
  },
  low: {
    badge: "bg-[rgba(129,140,248,0.12)] text-[#818cf8] border-[rgba(129,140,248,0.2)]",
    border: "border-[rgba(129,140,248,0.15)]",
    bg: "bg-[rgba(129,140,248,0.04)]",
    icon: "text-[#818cf8]",
  },
};

const PRIORITY_LABELS: Record<Priority, string> = { high: "Hoch", medium: "Mittel", low: "Niedrig" };

const STATUS_BADGE: Record<string, string> = {
  "Neuer Lead": "bg-[rgba(129,140,248,0.12)] text-[#818cf8]",
  "Rückruf": "bg-[rgba(251,191,36,0.12)] text-[#fbbf24]",
  "Vertriebsqualifiziert": "bg-[rgba(226,169,110,0.12)] text-[#e2a96e]",
  "Reterminierung": "bg-[rgba(167,139,250,0.12)] text-[#a78bfa]",
  "Kennenlerngespräch gebucht": "bg-[rgba(94,234,212,0.12)] text-[#5eead4]",
  "Beratungsgespräch gebucht": "bg-[rgba(52,211,153,0.12)] text-[#34d399]",
  "Gewonnen": "bg-[rgba(251,191,36,0.12)] text-[#fbbf24]",
};

export default function SalesPage() {
  const [range, setRange] = useState<TimeRange>("all");

  const {
    statusData, lostLeads, lostNoReason, verlustData,
    lossWeeklyData, allLossReasons,
    lostBySeller, gewonnenLeads, gewonnenBySeller,
    angebotLeads, pipelineLeads, leadsWithTermin,
    terminWeeklyData, recommendations, pipelineWeeklyData,
    funnelStages,
    nochNichtAngerufen, nichtErreichtLeads, erreichtLeads,
    erreichbarkeit, attemptDistribution, reachWeeklyData,
    staleStageData, totalStale,
    htOhneAmtWithDays,
    angebotWeeklyData,
    openSQLs,
    avgDealCycle,
  } = useMemo(() => {
    const filtered = filterLeadsByRange(leads, range);

    const statusData = statusOrder.map((s) => ({
      name: s,
      count: filtered.filter((l) => l.leadStatus === s).length,
    }));

    const lostLeads = filtered.filter((l) => l.leadStatus === "Verloren");
    const lostWithReason = lostLeads.filter((l) => l.verlustgrund);
    const lostNoReason = lostLeads.filter((l) => !l.verlustgrund);

    const verlustgruende: Record<string, number> = {};
    lostWithReason.forEach((l) => {
      verlustgruende[l.verlustgrund] = (verlustgruende[l.verlustgrund] || 0) + 1;
    });
    if (lostNoReason.length > 0) {
      verlustgruende["Kein Grund angegeben"] = lostNoReason.length;
    }
    const verlustData = Object.entries(verlustgruende)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    /* Loss weekly */
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

    /* Lost/Won by seller */
    const lostBySeller: Record<string, { total: number; noReason: number }> = {};
    lostLeads.forEach((l) => {
      const entry = lostBySeller[l.vertriebler] ?? { total: 0, noReason: 0 };
      entry.total++;
      if (!l.verlustgrund) entry.noReason++;
      lostBySeller[l.vertriebler] = entry;
    });

    const gewonnenLeads = filtered.filter((l) => l.leadStatus === "Gewonnen");
    const gewonnenBySeller: Record<string, number> = {};
    gewonnenLeads.forEach((l) => {
      gewonnenBySeller[l.vertriebler] = (gewonnenBySeller[l.vertriebler] || 0) + 1;
    });

    const angebotLeads = filtered.filter(
      (l) => l.angebotVerschicken
    );

    // Angebote pro KW — nur Leads wo angebotsprozessDatum !== createdOn
    const angebotWeekMap = new Map<number, { htMitAmt: number; htOhneAmt: number; lt: number }>();
    filtered.forEach((l) => {
      if (!l.angebotsprozessDatum || l.angebotsprozessDatum === l.createdOn) return;
      const date = parseDE(l.angebotsprozessDatum);
      if (isNaN(date.getTime())) return;
      const wk = getISOWeek(date);
      const entry = angebotWeekMap.get(wk) ?? { htMitAmt: 0, htOhneAmt: 0, lt: 0 };
      const isHT = l.prozessStarten.includes("High Touch") || l.betreuungsart === "High Touch";
      const isLT = l.prozessStarten.includes("Low Touch") || l.betreuungsart === "Low Touch";
      if (isHT && l.terminBeimAmtCheck) entry.htMitAmt++;
      else if (isHT) entry.htOhneAmt++;
      else if (isLT) entry.lt++;
      angebotWeekMap.set(wk, entry);
    });
    const angebotWeeklyData = Array.from(angebotWeekMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([wk, counts]) => ({
        week: `KW ${wk}`,
        "HT + Amt": counts.htMitAmt,
        "HT ohne Amt": counts.htOhneAmt,
        "Low-Touch": counts.lt,
      }));

    const pipelineLeads = filtered.filter(
      (l) =>
        l.leadStatus === "Vertriebsqualifiziert" ||
        l.leadStatus === "Kennenlerngespräch gebucht" ||
        l.leadStatus === "Beratungsgespräch gebucht"
    );
    const leadsWithTermin = filtered.filter((l) => l.terminBeimAmt);

    /* Termine im Zeitverlauf */
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

    /* Recommendations */
    const recommendations: Recommendation[] = [];

    const noReasonPct = lostLeads.length > 0 ? (lostNoReason.length / lostLeads.length) * 100 : 0;
    if (noReasonPct > 30) {
      recommendations.push({
        icon: <AlertTriangle className="h-4 w-4" />,
        priority: "high",
        title: "Verlustgründe konsequent dokumentieren",
        detail: `${lostNoReason.length} von ${lostLeads.length} Verlusten ohne Grund (${Math.round(noReasonPct)}%). Ohne Verlustgrund-Daten kann die Pipeline nicht optimiert werden.`,
      });
    }

    const falscheKontakte = lostLeads.filter((l) => l.verlustgrund === "Falsche Kontaktinformationen").length;
    const falscheKontaktePct = lostLeads.length > 0 ? (falscheKontakte / lostLeads.length) * 100 : 0;
    if (falscheKontaktePct > 10) {
      recommendations.push({
        icon: <AlertTriangle className="h-4 w-4" />,
        priority: "high",
        title: "Kontaktdaten-Validierung bei Lead-Erfassung einführen",
        detail: `${falscheKontakte} Verluste (${Math.round(falscheKontaktePct)}%) wegen falscher Kontaktinformationen. Eine Validierung bei der Erfassung spart Vertriebszeit.`,
      });
    }

    const STALE_THRESHOLD_DAYS = 3;
    const activeStages: string[] = ["Neuer Lead", "Rückruf", "Vertriebsqualifiziert", "Reterminierung",
      "Kennenlerngespräch gebucht", "Beratungsgespräch gebucht"];

    const staleByStage = new Map<string, { total: number; sellers: Record<string, number> }>();
    filtered.forEach((l) => {
      if (!activeStages.includes(l.leadStatus)) return;
      const lastActivity = l.lastModified ? parseDE(l.lastModified) : parseDE(l.createdOn);
      if (isNaN(lastActivity.getTime())) return;
      const daysSince = (today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < STALE_THRESHOLD_DAYS) return;
      const entry = staleByStage.get(l.leadStatus) ?? { total: 0, sellers: {} };
      entry.total++;
      const seller = l.vertriebler || "Unbekannt";
      entry.sellers[seller] = (entry.sellers[seller] || 0) + 1;
      staleByStage.set(l.leadStatus, entry);
    });
    const totalStale = Array.from(staleByStage.values()).reduce((s, e) => s + e.total, 0);
    const staleStageData = statusOrder
      .filter((s) => staleByStage.has(s))
      .map((s) => ({ stage: s, ...staleByStage.get(s)! }));

    if (totalStale > 0) {
      recommendations.push({
        icon: <Clock className="h-4 w-4" />,
        priority: "high",
        title: `${totalStale} Leads seit 3+ Tagen ohne Aktivität`,
        detail: `${totalStale} Leads in aktiven Stages ohne Update — Details im Stale-Leads-Block unten.`,
      });
    }

    const angestelltLost = lostLeads.filter((l) =>
      l.verlustgrund === "Angestellt" || l.verlustgrund === "Arbeitet nebenher"
    ).length;
    const angestelltPct = lostLeads.length > 0 ? (angestelltLost / lostLeads.length) * 100 : 0;
    if (angestelltPct > 15) {
      recommendations.push({
        icon: <Lightbulb className="h-4 w-4" />,
        priority: "medium",
        title: "Arbeitslos-Status vor Qualifizierung verifizieren",
        detail: `${angestelltLost} Verluste (${Math.round(angestelltPct)}%) weil Leads angestellt sind oder nebenher arbeiten. Früherer Filter spart Vertriebskapazität.`,
      });
    }

    const sprachLost = lostLeads.filter((l) =>
      l.verlustgrund === "Sprachkenntnisse" || l.verlustgrund?.includes("Sprach")
    ).length;
    const sprachPct = lostLeads.length > 0 ? (sprachLost / lostLeads.length) * 100 : 0;
    if (sprachPct > 5) {
      recommendations.push({
        icon: <Lightbulb className="h-4 w-4" />,
        priority: "medium",
        title: "Sprachkenntnisse früher im Funnel prüfen",
        detail: `${sprachLost} Verluste (${Math.round(sprachPct)}%) wegen Sprachkenntnissen. Frühzeitige Prüfung im Qualifizierungsprozess empfohlen.`,
      });
    }

    const sellerTotal: Record<string, { won: number; lost: number }> = {};
    filtered.forEach((l) => {
      if (!l.vertriebler) return;
      const entry = sellerTotal[l.vertriebler] ?? { won: 0, lost: 0 };
      if (l.leadStatus === "Gewonnen") entry.won++;
      if (l.leadStatus === "Verloren") entry.lost++;
      sellerTotal[l.vertriebler] = entry;
    });
    const teamLossRate = (() => {
      const totalWon = Object.values(sellerTotal).reduce((s, e) => s + e.won, 0);
      const totalLost = Object.values(sellerTotal).reduce((s, e) => s + e.lost, 0);
      return totalWon + totalLost > 0 ? (totalLost / (totalWon + totalLost)) * 100 : 0;
    })();
    Object.entries(sellerTotal).forEach(([name, data]) => {
      const total = data.won + data.lost;
      if (total < 5) return;
      const lossRate = (data.lost / total) * 100;
      if (lossRate > teamLossRate * 1.5) {
        recommendations.push({
          icon: <Lightbulb className="h-4 w-4" />,
          priority: "medium",
          title: `${name.split(" ")[0]}: Überdurchschnittliche Verlustquote`,
          detail: `${Math.round(lossRate)}% Verlustquote (Team: ${Math.round(teamLossRate)}%). ${data.lost} verloren bei ${total} abgeschlossenen Leads — Coaching-Gespräch prüfen.`,
        });
      }
    });

    const nichtArbeitslosLeads = filtered.filter((l) => l.arbeitslosGemeldet === "Nein, aktuell nicht");
    const nichtArbeitslosLost = nichtArbeitslosLeads.filter((l) => l.leadStatus === "Verloren").length;
    const nichtArbeitslosPct = nichtArbeitslosLeads.length > 0 ? (nichtArbeitslosLost / nichtArbeitslosLeads.length) * 100 : 0;
    if (nichtArbeitslosPct > 50 && nichtArbeitslosLeads.length > 5) {
      recommendations.push({
        icon: <Lightbulb className="h-4 w-4" />,
        priority: "low",
        title: "Nicht-arbeitslose Leads haben niedrige Conversion",
        detail: `${Math.round(nichtArbeitslosPct)}% der nicht-arbeitslosen Leads gehen verloren (${nichtArbeitslosLost} von ${nichtArbeitslosLeads.length}). Vorfilter oder niedrigere Priorität in der Bearbeitung empfohlen.`,
      });
    }

    const priorityOrder: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    /* Pipeline-Entwicklung im Zeitverlauf */
    const pipelineSegments = ["Gewonnen", "Verloren", "HT + Amt", "HT ohne Amt", "Low-Touch", "SQL o. Prozess", "Nicht erreicht", "Nicht angerufen"] as const;
    const pipelineWeekMap = new Map<number, Record<string, number>>();
    filtered.forEach((l) => {
      const date = parseDE(l.createdOn);
      if (isNaN(date.getTime())) return;
      const wk = getISOWeek(date);
      const entry = pipelineWeekMap.get(wk) ?? {};
      // Exklusive Zuordnung: jeder Lead in genau einer Kategorie
      let seg: string;
      if (l.leadStatus === "Gewonnen") { seg = "Gewonnen"; }
      else if (l.leadStatus === "Verloren") { seg = "Verloren"; }
      else if (l.prozessStarten.includes("High Touch") || l.betreuungsart === "High Touch") {
        seg = l.terminBeimAmtCheck ? "HT + Amt" : "HT ohne Amt";
      }
      else if (l.prozessStarten.includes("Low Touch") || l.betreuungsart === "Low Touch") { seg = "Low-Touch"; }
      else if (["Vertriebsqualifiziert", "Reterminierung", "Kennenlerngespräch gebucht", "Beratungsgespräch gebucht"].includes(l.leadStatus)) { seg = "SQL o. Prozess"; }
      else if (l.anrufversuch.includes("nicht erreicht")) { seg = "Nicht erreicht"; }
      else { seg = "Nicht angerufen"; }
      entry[seg] = (entry[seg] || 0) + 1;
      pipelineWeekMap.set(wk, entry);
    });

    const pipelineWeeklyData = Array.from(pipelineWeekMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([wk, counts]) => ({
        week: `KW ${wk}`,
        ...Object.fromEntries(pipelineSegments.map((s) => [s, counts[s] || 0])),
      }));

    /* ── Stage-to-Stage Funnel ── */
    const mqlCount = filtered.length;
    // Erreicht = Lead wurde erfolgreich kontaktiert und weiterqualifiziert
    // (alles außer "Neuer Lead" und "Rückruf", die noch im Erstkontakt stecken)
    const erreichtCount = filtered.filter((l) =>
      l.leadStatus !== "Neuer Lead" && l.leadStatus !== "Rückruf"
    ).length;

    // SQL = High Touch + Low Touch + ohne Prozess (aktiver Vertrieb)
    let htCount = 0;
    let ltCount = 0;
    let oProzCount = 0;
    filtered.forEach((l) => {
      if (l.leadStatus === "Gewonnen" || l.leadStatus === "Verloren") return;
      if (l.prozessStarten.includes("High Touch") || l.betreuungsart === "High Touch") {
        htCount++;
      } else if (l.prozessStarten.includes("Low Touch") || l.betreuungsart === "Low Touch") {
        ltCount++;
      } else if (
        ["Vertriebsqualifiziert", "Reterminierung", "Kennenlerngespräch gebucht", "Beratungsgespräch gebucht"].includes(l.leadStatus)
      ) {
        oProzCount++;
      }
    });
    // Gewonnene die HT/LT waren zählen auch zum SQL-Trichter
    const gewonnenHT = filtered.filter(
      (l) => l.leadStatus === "Gewonnen" && (l.prozessStarten.includes("High Touch") || l.betreuungsart === "High Touch")
    ).length;
    const gewonnenLT = filtered.filter(
      (l) => l.leadStatus === "Gewonnen" && (l.prozessStarten.includes("Low Touch") || l.betreuungsart === "Low Touch")
    ).length;
    const totalHT = htCount + gewonnenHT;
    const totalLT = ltCount + gewonnenLT;
    const sqlCount = totalHT + totalLT + oProzCount;
    const htMitAmt = filtered.filter(
      (l) =>
        (l.prozessStarten.includes("High Touch") || l.betreuungsart === "High Touch") &&
        l.terminBeimAmtCheck
    ).length;
    const gewonnenCount = filtered.filter((l) => l.leadStatus === "Gewonnen").length;

    // High-Touch ohne Amt-Termin — kritische Follow-up-Gruppe
    const htOhneAmt = filtered.filter((l) => {
      if (l.leadStatus === "Gewonnen" || l.leadStatus === "Verloren") return false;
      const isHT = l.prozessStarten.includes("High Touch") || l.betreuungsart === "High Touch";
      return isHT && !l.terminBeimAmtCheck;
    });
    const htOhneAmtWithDays = htOhneAmt.map((l) => {
      const lastActivity = l.lastModified ? parseDE(l.lastModified) : parseDE(l.createdOn);
      const daysSince = !isNaN(lastActivity.getTime())
        ? Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      return { ...l, daysSince };
    }).sort((a, b) => (b.daysSince ?? 0) - (a.daysSince ?? 0));

    /* ── Erreichbarkeitsquote ── */
    const nochNichtAngerufen = filtered.filter(
      (l) => l.anrufversuch === "Noch nicht angerufen" || l.anrufversuch === ""
    );
    const nichtErreichtLeads = filtered.filter((l) => l.anrufversuch.includes("nicht erreicht"));
    const erreichtLeads = filtered.filter(
      (l) => !l.anrufversuch.includes("nicht erreicht") && l.anrufversuch !== "Noch nicht angerufen" && l.anrufversuch !== ""
    );
    const kontaktiert = nichtErreichtLeads.length + erreichtLeads.length;
    const erreichbarkeit = kontaktiert > 0 ? (erreichtLeads.length / kontaktiert) * 100 : 0;

    // Versuchsverteilung: wie viele Leads stecken bei 1x, 2x, ... nicht erreicht
    const attemptDistribution: { attempts: string; count: number }[] = [];
    for (let n = 1; n <= 10; n++) {
      const count = nichtErreichtLeads.filter((l) => l.anrufversuch === `${n}x nicht erreicht`).length;
      if (count > 0) attemptDistribution.push({ attempts: `${n}×`, count });
    }

    // Erreichbarkeit pro Woche
    const reachWeekMap = new Map<number, { erreicht: number; nichtErreicht: number }>();
    filtered.forEach((l) => {
      if (l.anrufversuch === "Noch nicht angerufen" || l.anrufversuch === "") return;
      const date = parseDE(l.createdOn);
      if (isNaN(date.getTime())) return;
      const wk = getISOWeek(date);
      const entry = reachWeekMap.get(wk) ?? { erreicht: 0, nichtErreicht: 0 };
      if (l.anrufversuch.includes("nicht erreicht")) entry.nichtErreicht++;
      else entry.erreicht++;
      reachWeekMap.set(wk, entry);
    });
    const reachWeeklyData = Array.from(reachWeekMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([wk, counts]) => ({
        week: `KW ${wk}`,
        Erreicht: counts.erreicht,
        "Nicht erreicht": counts.nichtErreicht,
        quote: counts.erreicht + counts.nichtErreicht > 0
          ? Math.round((counts.erreicht / (counts.erreicht + counts.nichtErreicht)) * 100)
          : 0,
      }));

    const funnelStages = {
      mql: { name: "MQL", desc: "Alle Leads", value: mqlCount },
      erreicht: { name: "Erreicht", desc: "Kontakt hergestellt", value: erreichtCount },
      sql: { name: "SQL", desc: "Sales Qualified (HT + LT + o.Proz)", value: sqlCount },
      ht: { name: "High-Touch", desc: "Intensivbetreuung", value: totalHT },
      lt: { name: "Low-Touch", desc: "Leichtbetreuung", value: totalLT },
      htAmt: { name: "HT + Amt", desc: "Termin beim Amt bestätigt", value: htMitAmt },
      gewonnen: { name: "Gewonnen", desc: "Abschluss (BG)", value: gewonnenCount },
      gewonnenHT,
      gewonnenLT,
      oProzCount,
    };

    // Offene SQLs: aktive Leads mit SQL-Status (nicht Gewonnen/Verloren)
    const openSQLs = htCount + ltCount + oProzCount;

    // Deal Cycle Length: Ø Tage von createdOn bis lastModified für Gewonnene
    const cycleDays = gewonnenLeads
      .map((l) => {
        const created = parseDE(l.createdOn);
        const closed = l.lastModified ? parseDE(l.lastModified) : null;
        if (!closed || isNaN(created.getTime()) || isNaN(closed.getTime())) return null;
        return Math.max(0, Math.floor((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
      })
      .filter((d): d is number => d !== null);
    const avgDealCycle = cycleDays.length > 0 ? Math.round(cycleDays.reduce((s, d) => s + d, 0) / cycleDays.length) : null;

    return {
      statusData, lostLeads, lostNoReason, verlustData,
      lossWeeklyData, allLossReasons,
      lostBySeller, gewonnenLeads, gewonnenBySeller,
      angebotLeads, pipelineLeads, leadsWithTermin,
      terminWeeklyData, recommendations, pipelineWeeklyData,
      funnelStages,
      nochNichtAngerufen, nichtErreichtLeads, erreichtLeads,
      erreichbarkeit, attemptDistribution, reachWeeklyData,
      staleStageData, totalStale,
      htOhneAmtWithDays,
      angebotWeeklyData,
      openSQLs,
      avgDealCycle,
    };
  }, [range]);

  /* ── Aircall-basierte Erreichbarkeitsquote ── */
  const aircall = useMemo(() => {
    const anchor = getAnchorDate(leads);
    const filteredAircallDaily = filterAircallDailyByRange(aircallDaily, anchor, range);
    const filteredAircallSellerDaily = filterAircallDailyByRange(aircallSellerDaily, anchor, range);

    const totalDials = filteredAircallDaily.reduce((s, d) => s + d.dials, 0);
    const totalReached = filteredAircallDaily.reduce((s, d) => s + d.reached, 0);
    const totalNotReached = totalDials - totalReached;
    const reachPct = totalDials > 0 ? (totalReached / totalDials) * 100 : 0;

    // Weekly aggregation
    const weekMap = new Map<string, { reached: number; notReached: number }>();
    for (const d of filteredAircallDaily) {
      const date = new Date(d.date);
      const wk = getISOWeek(date);
      const year = date.getFullYear();
      const key = `${year}-KW ${wk}`;
      const entry = weekMap.get(key) ?? { reached: 0, notReached: 0 };
      entry.reached += d.reached;
      entry.notReached += d.dials - d.reached;
      weekMap.set(key, entry);
    }
    const weeklyData = Array.from(weekMap.entries())
      .sort((a, b) => {
        const [yA, wA] = a[0].split("-KW ");
        const [yB, wB] = b[0].split("-KW ");
        return +yA - +yB || +wA - +wB;
      })
      .map(([key, v]) => ({
        week: key.split("-")[1],
        Erreicht: v.reached,
        "Nicht erreicht": v.notReached,
        Dials: v.reached + v.notReached,
        quote: v.reached + v.notReached > 0
          ? Math.round((v.reached / (v.reached + v.notReached)) * 100)
          : 0,
      }));

    // Per-seller aggregation
    const sellerMap = new Map<string, { dials: number; reached: number }>();
    for (const d of filteredAircallSellerDaily) {
      const entry = sellerMap.get(d.seller) ?? { dials: 0, reached: 0 };
      entry.dials += d.dials;
      entry.reached += d.reached;
      sellerMap.set(d.seller, entry);
    }
    const sellerData = Array.from(sellerMap.entries())
      .map(([seller, v]) => ({
        seller: seller.split(" ")[0],
        Erreicht: v.reached,
        "Nicht erreicht": v.dials - v.reached,
        quote: v.dials > 0 ? Math.round((v.reached / v.dials) * 100) : 0,
      }))
      .sort((a, b) => b.quote - a.quote);

    return { totalDials, totalReached, totalNotReached, reachPct, weeklyData, sellerData };
  }, [range]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#fafaf9]">Vertriebs-Analytik</h1>
          <p className="mt-1 text-[13px] text-[#57534e]">Lead-Pipeline & Verlustgründe</p>
        </div>
        <TimeRangeFilter value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-7 stagger-in">
        <KpiCard label="In Pipeline" value={pipelineLeads.length} sub="VQ + KLG + BG" accent />
        <KpiCard label="BGs (Gewonnen)" value={gewonnenLeads.length} sub={Object.entries(gewonnenBySeller).map(([name, count]) => `${name.split(" ")[0]}: ${count}`).join(" · ") || "Keine"} />
        <KpiCard label="Angebote erstellt" value={angebotLeads.length} sub="Deal: Angebot schicken" />
        <KpiCard label="Verloren" value={lostLeads.length} sub={`${lostNoReason.length} ohne Grund`} />
        <KpiCard label="Amt-Termine" value={leadsWithTermin.length} sub="Termine gebucht" />
        <KpiCard label="Offene SQLs" value={openSQLs} sub="HT + LT + ohne Prozess" accent />
        <KpiCard label="Ø Deal Cycle" value={avgDealCycle !== null ? `${avgDealCycle}d` : "—"} sub={avgDealCycle !== null ? `Ø ${avgDealCycle} Tage bis Abschluss` : "Keine Daten"} />
      </div>

      {/* Stage-to-Stage Conversion Funnel */}
      <SectionCard title="Conversion Rate — Stage zu Stage">
        <div className="space-y-1">
          {(() => {
            const mainPath = [
              funnelStages.mql,
              funnelStages.erreicht,
              funnelStages.sql,
              funnelStages.gewonnen,
            ];
            const stageColors = ["#818cf8", "#a78bfa", "#e2a96e", "#5eead4"];

            return (
              <>
                {mainPath.map((stage, i) => {
                  const maxVal = mainPath[0].value;
                  const widthPct = maxVal > 0 ? Math.max(10, (stage.value / maxVal) * 100) : 10;
                  const prevStage = i > 0 ? mainPath[i - 1] : null;
                  const stageRate = prevStage && prevStage.value > 0
                    ? ((stage.value / prevStage.value) * 100).toFixed(1)
                    : null;

                  return (
                    <div key={stage.name}>
                      {stageRate && prevStage && (
                        <div className="flex items-center gap-3 py-2 pl-4">
                          <div className="flex items-center gap-1.5">
                            <svg className="h-3.5 w-3.5 text-[#44403c]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M8 3v10m0 0l-3-3m3 3l3-3" />
                            </svg>
                            <span className="text-[13px] font-semibold tabular-nums text-[#e2a96e]">{stageRate}%</span>
                            <span className="text-[11px] text-[#57534e]">
                              von {prevStage.value} {prevStage.name}
                            </span>
                          </div>
                          {prevStage.value - stage.value > 0 && (
                            <span className="text-[11px] text-[#fb7185] tabular-nums">
                              −{prevStage.value - stage.value} verloren
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-4">
                        <div className="w-[100px] shrink-0 text-right">
                          <div className="text-[13px] font-medium text-[#fafaf9]">{stage.name}</div>
                          <div className="text-[10px] text-[#57534e]">{stage.desc}</div>
                        </div>
                        <div className="flex-1 relative">
                          <div className="h-9 w-full rounded-lg bg-[rgba(255,255,255,0.02)]">
                            <div
                              className="h-full rounded-lg flex items-center justify-end pr-3 transition-all duration-700"
                              style={{
                                width: `${widthPct}%`,
                                background: `linear-gradient(90deg, ${stageColors[i]}30, ${stageColors[i]}60)`,
                                borderLeft: `3px solid ${stageColors[i]}`,
                              }}
                            >
                              <span className="text-[15px] font-bold tabular-nums text-[#fafaf9]">
                                {stage.value}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* SQL Aufschlüsselung */}
                <div className="mt-6 pt-5 border-t border-[rgba(255,255,255,0.06)]">
                  <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#57534e] mb-4">
                    SQL-Aufschlüsselung — Wohin gehen die {funnelStages.sql.value} SQLs?
                  </h3>
                  <div className="grid gap-3 md:grid-cols-3">
                    {[
                      { label: "High-Touch", value: funnelStages.ht.value, color: "#5eead4", desc: "Intensivbetreuung" },
                      { label: "Low-Touch", value: funnelStages.lt.value, color: "#818cf8", desc: "Leichtbetreuung" },
                      { label: "Ohne Prozess", value: funnelStages.oProzCount, color: "#78716c", desc: "Noch kein Prozess zugewiesen" },
                    ].map((seg) => {
                      const sqlTotal = funnelStages.sql.value;
                      const pct = sqlTotal > 0 ? ((seg.value / sqlTotal) * 100).toFixed(1) : "0";
                      return (
                        <div key={seg.label} className="rounded-xl border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[13px] font-medium text-[#fafaf9]">{seg.label}</span>
                            <span className="text-[13px] font-bold tabular-nums" style={{ color: seg.color }}>{pct}%</span>
                          </div>
                          <div className="text-[22px] font-bold tabular-nums text-[#fafaf9]">{seg.value}</div>
                          <div className="text-[10px] text-[#57534e] mt-1">{seg.desc}</div>
                          <div className="mt-3 h-1.5 rounded-full bg-[rgba(255,255,255,0.04)] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, background: seg.color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* HT/LT → Gewonnen */}
                <div className="mt-5 pt-5 border-t border-[rgba(255,255,255,0.06)]">
                  <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#57534e] mb-4">
                    Abschlussquote nach Betreuungsart
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      {
                        label: "High-Touch → Gewonnen",
                        total: funnelStages.ht.value,
                        won: funnelStages.gewonnenHT,
                        color: "#5eead4",
                        amtCount: funnelStages.htAmt.value,
                      },
                      {
                        label: "Low-Touch → Gewonnen",
                        total: funnelStages.lt.value,
                        won: funnelStages.gewonnenLT,
                        color: "#818cf8",
                        amtCount: null,
                      },
                    ].map((seg) => {
                      const pct = seg.total > 0 ? ((seg.won / seg.total) * 100).toFixed(1) : "0";
                      return (
                        <div key={seg.label} className="rounded-xl border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] p-5">
                          <div className="text-[13px] font-medium text-[#fafaf9] mb-3">{seg.label}</div>
                          <div className="flex items-end gap-3">
                            <div>
                              <div className="text-[36px] font-bold tabular-nums" style={{ color: seg.color }}>{pct}%</div>
                              <div className="text-[11px] text-[#57534e]">
                                {seg.won} von {seg.total} Leads
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="h-3 rounded-full bg-[rgba(255,255,255,0.04)] overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%`, background: seg.color }}
                                />
                              </div>
                              {seg.amtCount !== null && (
                                <div className="mt-2 text-[11px] text-[#78716c]">
                                  davon {seg.amtCount} mit Amt-Termin
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </SectionCard>

      {/* Erreichbarkeitsquote (Aircall-basiert) */}
      <SectionCard title="Erreichbarkeitsquote (Aircall)">
        {/* KPI-Zeile */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-6">
          {[
            { label: "Gesamt Dials", value: aircall.totalDials, color: "text-[#fafaf9]", sub: "Outbound-Anrufe" },
            { label: "Erreicht", value: aircall.totalReached, color: "text-[#5eead4]", sub: "Anruf angenommen" },
            { label: "Nicht erreicht", value: aircall.totalNotReached, color: "text-[#fb7185]", sub: "Nicht rangegangen" },
            { label: "Erreichbarkeitsquote", value: `${aircall.reachPct.toFixed(1)}%`, color: aircall.reachPct >= 50 ? "text-[#5eead4]" : aircall.reachPct >= 30 ? "text-[#e2a96e]" : "text-[#fb7185]", sub: "Reached / Dials" },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] p-4">
              <div className="text-[10px] font-medium uppercase tracking-wider text-[#57534e]">{kpi.label}</div>
              <div className={`text-[24px] font-bold tabular-nums mt-1 ${kpi.color}`}>{kpi.value}</div>
              <div className="text-[10px] text-[#57534e] mt-0.5">{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Erreichbarkeitsquote Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-[12px] mb-2">
            <span className="text-[#a8a29e] font-medium">Erreichbarkeitsquote (Aircall-Daten)</span>
            <span className="tabular-nums font-bold text-[16px]" style={{ color: aircall.reachPct >= 50 ? "#5eead4" : aircall.reachPct >= 30 ? "#e2a96e" : "#fb7185" }}>
              {aircall.reachPct.toFixed(1)}%
            </span>
          </div>
          <div className="h-3 rounded-full bg-[rgba(255,255,255,0.04)] overflow-hidden flex">
            <div
              className="h-full rounded-l-full bg-[#5eead4] transition-all duration-500"
              style={{ width: `${aircall.reachPct}%` }}
            />
            <div
              className="h-full rounded-r-full bg-[#fb7185] transition-all duration-500"
              style={{ width: `${100 - aircall.reachPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5 text-[10px]">
            <span className="text-[#5eead4]">{aircall.totalReached} erreicht</span>
            <span className="text-[#fb7185]">{aircall.totalNotReached} nicht erreicht</span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Erreichbarkeit pro Woche */}
          {aircall.weeklyData.length > 0 && (
            <div>
              <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#57534e] mb-3">
                Erreichbarkeit pro Woche
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={aircall.weeklyData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="week" {...AXIS_STYLE} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" {...AXIS_STYLE} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} {...AXIS_STYLE} axisLine={false} tickLine={false} />
                  <Tooltip
                    {...TOOLTIP_STYLE}
                    formatter={(val, name) => {
                      if (name === "Quote %") return [`${val}%`, name];
                      return [val, name];
                    }}
                    labelFormatter={(label) => {
                      const w = aircall.weeklyData.find((d) => d.week === label);
                      return w ? `${label} — ${w.quote}% Erreichbarkeit` : label;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: "#78716c" }} />
                  <Bar yAxisId="left" dataKey="Erreicht" stackId="r" fill="#5eead4" />
                  <Bar yAxisId="left" dataKey="Nicht erreicht" stackId="r" fill="#fb7185" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="quote" name="Quote %" stroke={PALETTE.gold} strokeWidth={2} dot={{ fill: PALETTE.gold, r: 3 }} activeDot={{ r: 5 }} />
                </ComposedChart>
              </ResponsiveContainer>

              {/* Diagnostik */}
              {aircall.weeklyData.length >= 2 && (() => {
                const data = aircall.weeklyData;
                const last = data[data.length - 1];
                const prev = data[data.length - 2];
                const quoteDiff = last.quote - prev.quote;
                const dialsDiff = last.Dials - prev.Dials;

                let icon: ReactNode;
                let color: string;
                let message: string;

                if (quoteDiff < -5 && dialsDiff >= 0) {
                  icon = <AlertTriangle className="h-4 w-4 text-[#fb7185]" />;
                  color = "border-[rgba(251,113,133,0.2)] bg-[rgba(251,113,133,0.05)]";
                  message = "Erreichbarkeit sinkt — möglicherweise schlechte Kontaktdaten oder ungünstige Anrufzeiten";
                } else if (Math.abs(quoteDiff) <= 5 && dialsDiff < -10) {
                  icon = <Clock className="h-4 w-4 text-amber-400" />;
                  color = "border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.05)]";
                  message = "Weniger Anrufversuche — Kapazitätsproblem?";
                } else if (quoteDiff > 3) {
                  icon = <CheckCircle className="h-4 w-4 text-[#5eead4]" />;
                  color = "border-[rgba(94,234,212,0.2)] bg-[rgba(94,234,212,0.05)]";
                  message = "Erreichbarkeit verbessert sich";
                } else {
                  icon = <Lightbulb className="h-4 w-4 text-[#a8a29e]" />;
                  color = "border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]";
                  message = "Erreichbarkeit stabil";
                }

                return (
                  <div className={`mt-3 flex items-start gap-2.5 rounded-lg border p-3 ${color}`}>
                    <div className="mt-0.5 shrink-0">{icon}</div>
                    <div className="text-[12px] leading-relaxed text-[#d6d3d1]">
                      <span className="font-medium">{message}</span>
                      <span className="ml-2 text-[#78716c]">
                        {last.week}: {last.quote}% ({last.Dials} Dials) vs. {prev.week}: {prev.quote}% ({prev.Dials} Dials)
                        {quoteDiff !== 0 && (
                          <span className={quoteDiff > 0 ? "text-[#5eead4]" : "text-[#fb7185]"}>
                            {" "}({quoteDiff > 0 ? "+" : ""}{quoteDiff}pp)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Erreichbarkeit pro Seller */}
          {aircall.sellerData.length > 0 && (
            <div>
              <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#57534e] mb-3">
                Erreichbarkeit pro Seller
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={aircall.sellerData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="seller" {...AXIS_STYLE} axisLine={false} tickLine={false} />
                  <YAxis {...AXIS_STYLE} axisLine={false} tickLine={false} />
                  <Tooltip
                    {...TOOLTIP_STYLE}
                    formatter={(val, name) => [val, name]}
                    labelFormatter={(label) => {
                      const s = aircall.sellerData.find((d) => d.seller === label);
                      return s ? `${label} — ${s.quote}% Erreichbarkeit` : label;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: "#78716c" }} />
                  <Bar dataKey="Erreicht" stackId="r" fill="#5eead4" />
                  <Bar dataKey="Nicht erreicht" stackId="r" fill="#fb7185" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </SectionCard>

      {/* CRM-Kontaktversuche */}
      {attemptDistribution.length > 0 && (
        <SectionCard title="CRM-Kontaktversuche">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#57534e] mb-3">
                Kontaktversuche — Wo bleiben Leads stecken?
              </h3>
              <ResponsiveContainer width="100%" height={attemptDistribution.length * 36 + 20}>
                <BarChart data={attemptDistribution} layout="vertical" barCategoryGap="25%" margin={{ left: 5, right: 20 }}>
                  <XAxis type="number" {...AXIS_STYLE} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="attempts" {...AXIS_STYLE} axisLine={false} tickLine={false} width={35} />
                  <Tooltip
                    {...TOOLTIP_STYLE}
                    formatter={(val) => [`${val} Leads`, "Nicht erreicht"]}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} animationDuration={600}>
                    {attemptDistribution.map((_, i) => (
                      <Cell key={i} fill={i < 3 ? "#fb923c" : i < 6 ? "#fb7185" : "#f87171"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-[#57534e] mt-2">
                {attemptDistribution.filter((d) => parseInt(d.attempts) >= 5).reduce((s, d) => s + d.count, 0)} Leads mit 5+ Versuchen — ggf. Kontaktdaten prüfen
              </p>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Amt-Termine im Zeitverlauf */}
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

      {/* Pipeline-Entwicklung im Zeitverlauf */}
      {pipelineWeeklyData.length > 0 && (
        <SectionCard title="Pipeline-Entwicklung im Zeitverlauf">
          <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={pipelineWeeklyData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="week" {...AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis {...AXIS_STYLE} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#78716c" }} />
              <Bar dataKey="Gewonnen" stackId="seg" fill="#5eead4" radius={undefined} />
              <Bar dataKey="Verloren" stackId="seg" fill="#f87171" radius={undefined} />
              <Bar dataKey="HT + Amt" stackId="seg" fill="#34d399" radius={undefined} />
              <Bar dataKey="HT ohne Amt" stackId="seg" fill="#fbbf24" radius={undefined} />
              <Bar dataKey="Low-Touch" stackId="seg" fill="#a78bfa" radius={undefined} />
              <Bar dataKey="SQL o. Prozess" stackId="seg" fill="#818cf8" radius={undefined} />
              <Bar dataKey="Nicht erreicht" stackId="seg" fill="#fb923c" radius={undefined} />
              <Bar dataKey="Nicht angerufen" stackId="seg" fill="#57534e" radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      {/* Handlungsempfehlungen */}
      <SectionCard title="Handlungsempfehlungen">
        {recommendations.length > 0 ? (
          <div className="space-y-3">
            {recommendations.map((rec, i) => {
              const styles = PRIORITY_STYLES[rec.priority];
              return (
                <div
                  key={i}
                  className={`rounded-xl border ${styles.border} ${styles.bg} p-4 flex items-start gap-3`}
                >
                  <span className={`mt-0.5 shrink-0 ${styles.icon}`}>{rec.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-medium text-[#fafaf9]">{rec.title}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${styles.badge}`}>
                        {PRIORITY_LABELS[rec.priority]}
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] text-[#a8a29e] leading-relaxed">{rec.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-[rgba(94,234,212,0.2)] bg-[rgba(94,234,212,0.05)]">
            <CheckCircle className="h-5 w-5 text-[#5eead4] shrink-0" />
            <div>
              <p className="text-[14px] font-medium text-[#5eead4]">Alles im grünen Bereich</p>
              <p className="text-[12px] text-[#78716c] mt-0.5">Keine kritischen Muster erkannt — weiter so!</p>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Stale Leads nach Stage */}
      <SectionCard title="Stale Leads (3+ Tage ohne Aktivität)">
        {totalStale > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 mb-1">
              <AlertTriangle className={`h-5 w-5 shrink-0 ${totalStale > 10 ? "text-[#f87171]" : "text-amber-400"}`} />
              <span className={`text-[20px] font-bold tabular-nums ${totalStale > 10 ? "text-[#f87171]" : "text-amber-400"}`}>
                {totalStale}
              </span>
              <span className="text-[13px] text-[#a8a29e]">Leads ohne Aktivität seit 3+ Tagen</span>
            </div>
            {staleStageData.map((row) => {
              const sortedSellers = Object.entries(row.sellers).sort((a, b) => b[1] - a[1]);
              return (
                <div
                  key={row.stage}
                  className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 flex items-center gap-4 flex-wrap"
                >
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_BADGE[row.stage] || "bg-[rgba(255,255,255,0.05)] text-[#a8a29e]"}`}>
                    {row.stage}
                  </span>
                  <span className="text-[16px] font-bold tabular-nums text-[#fafaf9]">{row.total}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {sortedSellers.map(([name, count]) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1 rounded-md bg-[rgba(255,255,255,0.05)] px-2 py-0.5 text-[11px] text-[#d6d3d1]"
                      >
                        {name.split(" ")[0]}
                        <span className="font-semibold tabular-nums text-[#e2a96e]">{count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-[rgba(94,234,212,0.2)] bg-[rgba(94,234,212,0.05)]">
            <CheckCircle className="h-5 w-5 text-[#5eead4] shrink-0" />
            <div>
              <p className="text-[14px] font-medium text-[#5eead4]">Alles aktuell</p>
              <p className="text-[12px] text-[#78716c] mt-0.5">Keine Leads seit 3+ Tagen ohne Aktivität — Pipeline läuft!</p>
            </div>
          </div>
        )}
      </SectionCard>

      {/* High-Touch ohne Amt-Termin — kritische Follow-up-Gruppe */}
      <SectionCard title="High-Touch ohne Amt-Termin">
        {htOhneAmtWithDays.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className={`h-5 w-5 shrink-0 ${htOhneAmtWithDays.length > 5 ? "text-[#f87171]" : "text-amber-400"}`} />
              <span className={`text-[20px] font-bold tabular-nums ${htOhneAmtWithDays.length > 5 ? "text-[#f87171]" : "text-amber-400"}`}>
                {htOhneAmtWithDays.length}
              </span>
              <span className="text-[13px] text-[#a8a29e]">Nur Angebot hochladen — kein Amt-Termin bestätigt</span>
            </div>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full premium-table">
                <thead>
                  <tr>
                    <th className="text-left pl-2">Name</th>
                    <th className="text-left pl-4">Status</th>
                    <th className="text-left pl-4">Vertriebler</th>
                    <th className="text-right pr-6 w-[180px]">Tage ohne Aktivität</th>
                    <th className="text-center w-[80px]">Angebot</th>
                  </tr>
                </thead>
                <tbody>
                  {htOhneAmtWithDays.map((l) => (
                    <tr key={l.id}>
                      <td className="pl-2 text-[13px] font-medium text-[#fafaf9]">{l.name}</td>
                      <td className="pl-4">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_BADGE[l.leadStatus] || "bg-[rgba(255,255,255,0.05)] text-[#a8a29e]"}`}>
                          {l.leadStatus}
                        </span>
                      </td>
                      <td className="pl-4 text-[13px] text-[#fafaf9] font-medium">{l.vertriebler}</td>
                      <td className="text-right pr-6 tabular-nums text-[13px] font-medium">
                        <span className={
                          l.daysSince === null ? "text-[#57534e]"
                            : l.daysSince <= 3 ? "text-[#5eead4]"
                            : l.daysSince <= 7 ? "text-amber-400"
                            : "text-[#f87171]"
                        }>
                          {l.daysSince !== null ? `${l.daysSince}d` : "—"}
                        </span>
                      </td>
                      <td className="text-center text-[13px]">
                        {l.angebotVerschicken
                          ? <span className="text-[#5eead4]">Ja</span>
                          : <span className="text-[#57534e]">Nein</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-[rgba(94,234,212,0.2)] bg-[rgba(94,234,212,0.05)]">
            <CheckCircle className="h-5 w-5 text-[#5eead4] shrink-0" />
            <div>
              <p className="text-[14px] font-medium text-[#5eead4]">Alle High-Touch-Leads haben Amt-Termin</p>
              <p className="text-[12px] text-[#78716c] mt-0.5">Kein Follow-up nötig — alle HT-Leads sind versorgt.</p>
            </div>
          </div>
        )}
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2 stagger-in">
        <SectionCard title="Lead-Status Verteilung">
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={statusData} layout="vertical" barCategoryGap="18%" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" {...AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                {...AXIS_STYLE}
                axisLine={false}
                tickLine={false}
                width={130}
                tickFormatter={(v: string) => {
                  const SHORT: Record<string, string> = {
                    "Vertriebsqualifiziert": "Qualifiziert",
                    "Kennenlerngespräch gebucht": "Kennenlernen",
                    "Beratungsgespräch gebucht": "Beratung",
                  };
                  return SHORT[v] ?? v;
                }}
              />
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
                      style={{ width: `${data.total > 0 ? Math.round((data.noReason / data.total) * 100) : 0}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-[#57534e] mt-1">
                    {data.total > 0 ? Math.round(((data.total - data.noReason) / data.total) * 100) : 100}% mit Grund erfasst
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

      {/* Angebote rausgeschickt pro KW */}
      {angebotWeeklyData.length > 0 && (
        <SectionCard title="Angebote rausgeschickt pro KW">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={angebotWeeklyData} barCategoryGap="20%" margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="week" {...AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis {...AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#78716c" }} />
              <Bar dataKey="HT + Amt" stackId="a" fill="#5eead4" />
              <Bar dataKey="HT ohne Amt" stackId="a" fill="#f87171" />
              <Bar dataKey="Low-Touch" stackId="a" fill="#a78bfa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      {/* Amt-Termine (always real-date-based, independent of range filter) */}
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

    </div>
  );
}

import type { Lead, PerspectiveVisit } from "@/data/types";

/* ── Lead Segmentierung ── */
export function classifyLead(l: Lead): string {
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

export type TimeRange = "7d" | "30d" | "all";

/** Parse German date string "DD.M.YYYY HH:mm" → Date */
export function parseDE(dateStr: string): Date {
  const [dayMonthYear] = dateStr.split(" ");
  const [day, month, year] = dayMonthYear.split(".");
  return new Date(Number(year), Number(month) - 1, Number(day));
}

/** Parse German date string "DD.M.YYYY HH:mm" → ISO date string "YYYY-MM-DD" */
export function parseDEtoISO(dateStr: string): string {
  const [day, month, year] = dateStr.split(/[. ]/);
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/** ISO week number */
export function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Anchor date = newest createdOn among leads */
export function getAnchorDate(leads: Lead[]): Date {
  let max = 0;
  for (const l of leads) {
    const d = parseDE(l.createdOn);
    if (!isNaN(d.getTime()) && d.getTime() > max) max = d.getTime();
  }
  return new Date(max);
}

/** Filter leads by time range relative to anchor date */
export function filterLeadsByRange(leads: Lead[], range: TimeRange): Lead[] {
  if (range === "all") return leads;
  const anchor = getAnchorDate(leads);
  const days = range === "7d" ? 7 : 30;
  const cutoff = new Date(anchor.getTime() - days * 24 * 60 * 60 * 1000);
  return leads.filter((l) => {
    const d = parseDE(l.createdOn);
    return !isNaN(d.getTime()) && d >= cutoff;
  });
}

/** Filter perspective visits by time range relative to max firstSeenAt */
export function filterPerspectiveByRange(
  visits: PerspectiveVisit[],
  range: TimeRange
): PerspectiveVisit[] {
  if (range === "all") return visits;
  let max = 0;
  for (const v of visits) {
    const t = new Date(v.firstSeenAt).getTime();
    if (t > max) max = t;
  }
  const days = range === "7d" ? 7 : 30;
  const cutoff = max - days * 24 * 60 * 60 * 1000;
  return visits.filter((v) => new Date(v.firstSeenAt).getTime() >= cutoff);
}

export interface PerspectiveSummary {
  totalVisits: number;
  converted: number;
  byTitle: Record<string, { visits: number; converted: number }>;
  bySource: Record<string, number>;
}

/** Compute perspective summary from a (possibly filtered) array of visits */
export function computePerspectiveSummary(
  visits: PerspectiveVisit[]
): PerspectiveSummary {
  const byTitle: Record<string, { visits: number; converted: number }> = {};
  const bySource: Record<string, number> = {};
  let converted = 0;

  for (const v of visits) {
    if (v.hasConverted) converted++;

    const title = v.utmTitle || "Unbekannt";
    const entry = byTitle[title] ?? { visits: 0, converted: 0 };
    entry.visits++;
    if (v.hasConverted) entry.converted++;
    byTitle[title] = entry;

    const src = v.utmSource || "other";
    bySource[src] = (bySource[src] || 0) + 1;
  }

  return { totalVisits: visits.length, converted, byTitle, bySource };
}

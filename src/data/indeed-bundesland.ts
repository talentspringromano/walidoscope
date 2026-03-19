import data from "./indeed-bundesland-data.json";

export interface IndeedBundeslandEntry {
  bundesland: string;
  impressions: number;
  ctr: number;
  clicks: number;
  asr: number;
  startedApplications: number;
  completionRate: number;
  applications: number;
  ar: number;
  spend: number;
  cpc: number;
  cpas: number;
  cpa: number;
}

export const indeedBundesland: IndeedBundeslandEntry[] = data;

/* ── Aggregierte Kennzahlen ── */
export const indeedBLTotalSpend = indeedBundesland.reduce((s, d) => s + d.spend, 0);
export const indeedBLTotalApplications = indeedBundesland.reduce((s, d) => s + d.applications, 0);
export const indeedBLTotalClicks = indeedBundesland.reduce((s, d) => s + d.clicks, 0);

/** CSV-Header-Mapping für den Import */
export const INDEED_BL_CSV_HEADERS: Record<string, keyof IndeedBundeslandEntry> = {
  "Bundesland/Region": "bundesland",
  "Impressions": "impressions",
  "Click-Through-Rate (CTR)": "ctr",
  "Klicks": "clicks",
  "Rate begonnener Bewerbungen (ASR)": "asr",
  "Begonnene Bewerbungen": "startedApplications",
  "Rate abgeschlossener Bewerbungen": "completionRate",
  "Bewerbungen": "applications",
  "Bewerbungsrate (AR)": "ar",
  "Ausgaben": "spend",
  "Cost-per-Click (CPC)": "cpc",
  "Cost-per-Apply-Start (CPAS)": "cpas",
  "Cost-per-Apply (CPA)": "cpa",
};

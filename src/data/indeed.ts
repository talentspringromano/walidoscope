import data from "./indeed-data.json";

export interface IndeedDailyEntry {
  date: string;
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

export const indeedDaily: IndeedDailyEntry[] = data;

/* ── Aggregierte Kennzahlen ── */
export const indeedTotalSpend = indeedDaily.reduce((s, d) => s + d.spend, 0);
export const indeedTotalClicks = indeedDaily.reduce((s, d) => s + d.clicks, 0);
export const indeedTotalImpressions = indeedDaily.reduce((s, d) => s + d.impressions, 0);
export const indeedTotalApplications = indeedDaily.reduce((s, d) => s + d.applications, 0);
export const indeedTotalStarted = indeedDaily.reduce((s, d) => s + d.startedApplications, 0);
export const indeedAvgCPA = indeedTotalApplications > 0 ? indeedTotalSpend / indeedTotalApplications : 0;
export const indeedAvgCPC = indeedTotalClicks > 0 ? indeedTotalSpend / indeedTotalClicks : 0;
export const indeedOverallCTR = indeedTotalImpressions > 0 ? indeedTotalClicks / indeedTotalImpressions : 0;
export const indeedOverallAR = indeedTotalClicks > 0 ? indeedTotalApplications / indeedTotalClicks : 0;

/** CSV-Header-Mapping für den Import */
export const INDEED_CSV_HEADERS: Record<string, keyof IndeedDailyEntry> = {
  "Zeitraum: täglich": "date",
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

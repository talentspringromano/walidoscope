import data from "./indeed-stellen-data.json";

export interface IndeedStelleEntry {
  stelle: string;
  bundesland: string;
  stadt: string;
  clicks: number;
  startedApplications: number;
  completionRate: number;
  applications: number;
  ar: number;
}

export const indeedStellen: IndeedStelleEntry[] = data;

/** CSV-Header-Mapping für den Import */
export const INDEED_STELLEN_CSV_HEADERS: Record<string, keyof IndeedStelleEntry> = {
  "Stelle": "stelle",
  "Bundesland/Region": "bundesland",
  "Stadt": "stadt",
  "Klicks": "clicks",
  "Begonnene Bewerbungen": "startedApplications",
  "Rate abgeschlossener Bewerbungen": "completionRate",
  "Bewerbungen": "applications",
  "Bewerbungsrate (AR)": "ar",
};

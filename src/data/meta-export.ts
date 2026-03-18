import data from "./meta-export-data.json";

export interface MetaExportEntry {
  adName: string;
  delivery: string;
  results: number;
  costPerResult: number;
  amountSpent: number;
  impressions: number;
  reach: number;
  frequency: number;
  cpm: number;
  linkClicks: number;
  qualityRanking: string;
  engagementRanking: string;
  conversionRanking: string;
  adSetName: string;
  reportingStarts: string;
  reportingEnds: string;
}

export const metaExport: MetaExportEntry[] = data;

export const metaExportTotalSpend = metaExport.reduce((s, d) => s + d.amountSpent, 0);
export const metaExportTotalResults = metaExport.reduce((s, d) => s + d.results, 0);
export const metaExportTotalImpressions = metaExport.reduce((s, d) => s + d.impressions, 0);
export const metaExportTotalClicks = metaExport.reduce((s, d) => s + d.linkClicks, 0);
export const metaExportAvgCPL = metaExportTotalResults > 0 ? metaExportTotalSpend / metaExportTotalResults : 0;

/** CSV-Header-Mapping für den Import */
export const META_CSV_HEADERS: Record<string, keyof MetaExportEntry> = {
  "Ad name": "adName",
  "Ad delivery": "delivery",
  "Results": "results",
  "Cost per results": "costPerResult",
  "Amount spent (EUR)": "amountSpent",
  "Impressions": "impressions",
  "Reach": "reach",
  "Frequency": "frequency",
  "CPM (cost per 1,000 impressions) (EUR)": "cpm",
  "Link clicks": "linkClicks",
  "Quality ranking": "qualityRanking",
  "Engagement rate ranking": "engagementRanking",
  "Conversion rate ranking": "conversionRanking",
  "Ad set name": "adSetName",
  "Reporting starts": "reportingStarts",
  "Reporting ends": "reportingEnds",
};

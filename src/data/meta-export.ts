import data from "./meta-export-data.json";

export interface MetaExportEntry {
  adName: string;
  delivery: string;
  results: number;
  costPerResult: number;
  amountSpent: number;
  impressions: number;
  cpm: number;
  linkClicks: number;
  adSetName: string;
  reportingStarts: string;
  reportingEnds: string;
  // Optional — nicht jeder Meta-Export hat alle Spalten
  reach: number;
  frequency: number;
  qualityRanking: string;
  engagementRanking: string;
  conversionRanking: string;
  campaignName: string;
  adSetBudget: number;
  adSetBudgetType: string;
  clicksAll: number;
  cpcAll: number;
  ctrLink: number;
  uniqueLinkClicks: number;
  resultIndicator: string;
  resultRate: number;
  outboundClicks: number;
  uniqueOutboundCtr: number;
  adId: string;
  adSetId: string;
  campaignId: string;
  [key: string]: string | number;
}

const STRING_FIELDS = new Set([
  "adName", "delivery", "qualityRanking", "engagementRanking", "conversionRanking",
  "adSetName", "reportingStarts", "reportingEnds", "campaignName", "adSetBudgetType",
  "resultIndicator", "adId", "adSetId", "campaignId",
]);

/** Defaults für fehlende Felder */
function withDefaults(raw: Record<string, string | number>): MetaExportEntry {
  return {
    adName: "", delivery: "", results: 0, costPerResult: 0, amountSpent: 0,
    impressions: 0, cpm: 0, linkClicks: 0, adSetName: "", reportingStarts: "", reportingEnds: "",
    reach: 0, frequency: 0, qualityRanking: "-", engagementRanking: "-", conversionRanking: "-",
    campaignName: "", adSetBudget: 0, adSetBudgetType: "", clicksAll: 0, cpcAll: 0, ctrLink: 0,
    uniqueLinkClicks: 0, resultIndicator: "", resultRate: 0, outboundClicks: 0, uniqueOutboundCtr: 0,
    adId: "", adSetId: "", campaignId: "",
    ...raw,
  } as MetaExportEntry;
}

export const metaExport: MetaExportEntry[] = (data as Record<string, string | number>[]).map(withDefaults);

export const metaExportTotalSpend = metaExport.reduce((s, d) => s + d.amountSpent, 0);
export const metaExportTotalResults = metaExport.reduce((s, d) => s + d.results, 0);
export const metaExportTotalImpressions = metaExport.reduce((s, d) => s + d.impressions, 0);
export const metaExportTotalClicks = metaExport.reduce((s, d) => s + d.linkClicks, 0);
export const metaExportAvgCPL = metaExportTotalResults > 0 ? metaExportTotalSpend / metaExportTotalResults : 0;

/** CSV-Header-Mapping für den Import — deckt alte + neue Meta-Exporte ab */
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
  "Campaign name": "campaignName",
  "Ad set budget": "adSetBudget",
  "Ad set budget type": "adSetBudgetType",
  "Clicks (all)": "clicksAll",
  "CPC (all) (EUR)": "cpcAll",
  "CTR (link click-through rate)": "ctrLink",
  "Unique link clicks": "uniqueLinkClicks",
  "Result indicator": "resultIndicator",
  "Result rate": "resultRate",
  "Outbound clicks": "outboundClicks",
  "Unique outbound CTR (click-through rate)": "uniqueOutboundCtr",
  "Ad ID": "adId",
  "Ad set ID": "adSetId",
  "Campaign ID": "campaignId",
};

export { STRING_FIELDS as META_STRING_FIELDS };

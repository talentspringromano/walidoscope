export interface MetaAd {
  adName: string;
  shortName: string;
  amountSpent: number;
  impressions: number;
  cpm: number;
  clicksAll: number;
  cpcAll: number;
  ctrAll: number;
  linkClicks: number;
  uniqueLinkClicks: number;
  results: number;
  resultRate: number;
  costPerResult: number;
  adId: string;
}

export type LeadStatus =
  | "Neuer Lead"
  | "1x NE"
  | "Discovery Call"
  | "Follow up"
  | "Angebot zuschicken"
  | "Verloren";

export type DealStatus = "Neuer Lead" | "Angebot schicken" | "";

export type Platform = "Facebook" | "Instagram" | "Kursnet";

export interface Lead {
  id: number;
  name: string;
  leadStatus: LeadStatus;
  dealStatus: DealStatus;
  verlustgrund: string;
  adId: string;
  adName: string;
  platform: Platform;
  arbeitslosGemeldet: string;
  deutschkenntnisse: string;
  alter: string;
  vorerfahrung: string;
  vertriebler: string;
  createdOn: string;
  terminBeimAmt: string;
  closingWahrscheinlichkeit: string;
  utmTitle: string;
}

export interface PerspectiveVisit {
  contactId: string;
  firstSeenAt: string;
  utmSource: string;
  utmTitle: string;
  hasConverted: boolean;
  hasCompleted: boolean;
  hasEmail: boolean;
}

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
  | "Rückruf"
  | "Vertriebsqualifiziert"
  | "Reterminierung"
  | "Kennenlerngespräch gebucht"
  | "Beratungsgespräch gebucht"
  | "Gewonnen"
  | "Verloren"
  | "Onboarding";

export type Platform = "Facebook" | "Instagram" | "Kursnet" | "Indeed" | "Unsicher" | "";

export interface Lead {
  id: number;
  name: string;
  leadStatus: LeadStatus;
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
  hotLead: boolean;
  angebotVerschicken: boolean;
  prozessStarten: string;
  terminBeimAmtCheck: boolean;
  bgVerschickt: string;
  anrufversuch: string;
  kennenlernDatum: string;
  betreuungsart: string;
  lastModified?: string;
  angebotsprozessDatum?: string;
  vertriebsqualifiziertAm?: string;
}

export interface PerspectiveVisit {
  contactId: string;
  firstSeenAt: string;
  utmSource: string;
  utmTitle: string;
  hasConverted: boolean;
  hasCompleted: boolean;
  hasEmail: boolean;
  firstName?: string;
  lastName?: string;
}

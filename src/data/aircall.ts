import data from "./aircall-data.json";

export interface AircallSeller {
  name: string;
  userId: number;
  outboundCalls: number;
  inboundCalls: number;
  answeredCalls: number;
  missedCalls: number;
  voicemailCalls: number;
  totalDurationSec: number;
  avgDurationSec: number;
  longestCallSec: number;
  reachabilityPct: number;
  callsPerDay: number;
  totalCalls: number;
  firstCallDate: string;
  lastCallDate: string;
}

export interface AircallDailyEntry {
  date: string;
  dials: number;
  reached: number;
  calltimeSec: number;
}

export interface AircallSellerDailyEntry extends AircallDailyEntry {
  seller: string;
  outboundCalls: number;
  inboundCalls: number;
  answeredCalls: number;
  totalDurationSec: number;
  longestCallSec: number;
}

export const aircallSellers: AircallSeller[] = data.sellers;
export const aircallDaily: AircallDailyEntry[] = (data as { daily?: AircallDailyEntry[] }).daily ?? [];
const SELLER_DAILY_DEFAULTS = { outboundCalls: 0, inboundCalls: 0, answeredCalls: 0, totalDurationSec: 0, longestCallSec: 0 };
export const aircallSellerDaily: AircallSellerDailyEntry[] = ((data as unknown as { sellerDaily?: Partial<AircallSellerDailyEntry>[] }).sellerDaily ?? []).map((e) => ({
  ...SELLER_DAILY_DEFAULTS,
  ...e,
} as AircallSellerDailyEntry));
export const aircallFetchedAt: string = data.fetchedAt;

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

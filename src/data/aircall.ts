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

export const aircallSellers: AircallSeller[] = data.sellers;
export const aircallFetchedAt: string = data.fetchedAt;

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * Pre-build script: Fetches Aircall call data (GET only) and writes aggregated JSON.
 * Usage: npx tsx scripts/fetch-aircall.ts
 */

const API_ID = process.env.AIRCALL_API_ID;
const API_TOKEN = process.env.AIRCALL_API_TOKEN;

if (!API_ID || !API_TOKEN) {
  console.error("Missing AIRCALL_API_ID or AIRCALL_API_TOKEN environment variables.");
  process.exit(1);
}
const AUTH = Buffer.from(`${API_ID}:${API_TOKEN}`).toString("base64");

const SELLERS: Record<number, string> = {
  1093878: "Walid Karimi",
  1862427: "Nele Pfau",
  1875176: "Bastian Wuske",
  1862760: "Eric Hardt",
  1862761: "Michel Grosser",
};
const SELLER_IDS = new Set(Object.keys(SELLERS).map(Number));

interface RawCall {
  id: number;
  direction: "inbound" | "outbound";
  status: string;
  missed_call_reason: string | null;
  started_at: number;
  answered_at: number | null;
  ended_at: number | null;
  duration: number;
  voicemail: string | null;
  user: { id: number; name: string } | null;
}

interface SellerAgg {
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

async function fetchAllCalls(): Promise<RawCall[]> {
  const allCalls: RawCall[] = [];
  let page = 1;
  const perPage = 50;

  while (true) {
    const url = `https://api.aircall.io/v1/calls?per_page=${perPage}&page=${page}&order=desc`;
    console.log(`  GET page ${page}...`);

    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Basic ${AUTH}` },
    });

    if (!res.ok) {
      console.error(`API error ${res.status}: ${await res.text()}`);
      break;
    }

    const data = await res.json();
    const calls: RawCall[] = data.calls || [];

    // Filter for our sellers
    for (const c of calls) {
      if (c.user && SELLER_IDS.has(c.user.id)) {
        allCalls.push(c);
      }
    }

    // Check pagination
    if (!data.meta?.next_page_link) break;
    page++;

    // Rate limit: Aircall allows 60 req/min
    if (page % 50 === 0) {
      console.log("  Pausing for rate limit...");
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  return allCalls;
}

function aggregate(calls: RawCall[]): SellerAgg[] {
  const result: SellerAgg[] = [];

  for (const [idStr, name] of Object.entries(SELLERS)) {
    const userId = Number(idStr);
    const sellerCalls = calls.filter((c) => c.user?.id === userId);

    const outbound = sellerCalls.filter((c) => c.direction === "outbound");
    const inbound = sellerCalls.filter((c) => c.direction === "inbound");
    const answered = sellerCalls.filter((c) => c.status === "done" || c.status === "answered");
    const missed = sellerCalls.filter((c) => c.status === "missed" || c.missed_call_reason);
    const voicemail = sellerCalls.filter((c) => c.voicemail !== null);

    const totalDuration = answered.reduce((sum, c) => sum + (c.duration || 0), 0);
    const longestCall = answered.reduce((max, c) => Math.max(max, c.duration || 0), 0);
    const avgDuration = answered.length > 0 ? Math.round(totalDuration / answered.length) : 0;

    const inboundTotal = inbound.length;
    const inboundAnswered = inbound.filter((c) => c.status === "done" || c.status === "answered").length;
    const reachability = inboundTotal > 0 ? Math.round((inboundAnswered / inboundTotal) * 100) : 0;

    // Date range
    const timestamps = sellerCalls.map((c) => c.started_at).filter(Boolean).sort();
    const firstDate = timestamps.length > 0 ? new Date(timestamps[0] * 1000).toISOString().split("T")[0] : "";
    const lastDate = timestamps.length > 0 ? new Date(timestamps[timestamps.length - 1] * 1000).toISOString().split("T")[0] : "";

    // Calls per day
    const daySpan = timestamps.length >= 2
      ? Math.max(1, Math.ceil((timestamps[timestamps.length - 1] - timestamps[0]) / 86400))
      : 1;
    const callsPerDay = Math.round((sellerCalls.length / daySpan) * 10) / 10;

    result.push({
      name,
      userId,
      outboundCalls: outbound.length,
      inboundCalls: inbound.length,
      answeredCalls: answered.length,
      missedCalls: missed.length,
      voicemailCalls: voicemail.length,
      totalDurationSec: totalDuration,
      avgDurationSec: avgDuration,
      longestCallSec: longestCall,
      reachabilityPct: reachability,
      callsPerDay,
      totalCalls: sellerCalls.length,
      firstCallDate: firstDate,
      lastCallDate: lastDate,
    });
  }

  return result;
}

interface DailyEntry {
  date: string;        // YYYY-MM-DD
  dials: number;       // total outbound calls
  reached: number;     // answered outbound calls
  calltimeSec: number; // total talk time in seconds
}

interface SellerDailyEntry extends DailyEntry {
  seller: string;
}

function aggregateDaily(calls: RawCall[]): DailyEntry[] {
  const map = new Map<string, { dials: number; reached: number; calltimeSec: number }>();

  for (const c of calls) {
    if (!c.started_at) continue;
    const date = new Date(c.started_at * 1000).toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
    const entry = map.get(date) ?? { dials: 0, reached: 0, calltimeSec: 0 };

    if (c.direction === "outbound") {
      entry.dials++;
      if (c.status === "done" || c.status === "answered") {
        entry.reached++;
        entry.calltimeSec += c.duration || 0;
      }
    }

    map.set(date, entry);
  }

  return Array.from(map.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function aggregateSellerDaily(calls: RawCall[]): SellerDailyEntry[] {
  const map = new Map<string, { dials: number; reached: number; calltimeSec: number }>();

  for (const c of calls) {
    if (!c.started_at || !c.user) continue;
    const sellerName = SELLERS[c.user.id];
    if (!sellerName) continue;
    const date = new Date(c.started_at * 1000).toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
    const key = `${sellerName}::${date}`;
    const entry = map.get(key) ?? { dials: 0, reached: 0, calltimeSec: 0 };

    if (c.direction === "outbound") {
      entry.dials++;
      if (c.status === "done" || c.status === "answered") {
        entry.reached++;
        entry.calltimeSec += c.duration || 0;
      }
    }

    map.set(key, entry);
  }

  return Array.from(map.entries())
    .map(([key, v]) => {
      const [seller, date] = key.split("::");
      return { seller, date, ...v };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.seller.localeCompare(b.seller));
}

async function main() {
  console.log("Fetching Aircall calls (GET only)...");
  const calls = await fetchAllCalls();
  console.log(`Found ${calls.length} calls for target sellers.`);

  const sellers = aggregate(calls);
  const daily = aggregateDaily(calls);
  const sellerDaily = aggregateSellerDaily(calls);

  for (const s of sellers) {
    console.log(`  ${s.name}: ${s.totalCalls} calls (${s.outboundCalls} out, ${s.inboundCalls} in), avg ${s.avgDurationSec}s`);
  }
  console.log(`  Daily entries: ${daily.length} days, ${sellerDaily.length} seller-daily entries`);

  const outPath = new URL("../src/data/aircall-data.json", import.meta.url);
  const fs = await import("fs");
  fs.writeFileSync(new URL(outPath), JSON.stringify({ sellers, daily, sellerDaily, fetchedAt: new Date().toISOString() }, null, 2));
  console.log(`Written to src/data/aircall-data.json`);
}

main().catch(console.error);

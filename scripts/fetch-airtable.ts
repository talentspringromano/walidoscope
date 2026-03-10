/**
 * Fetches leads from Airtable API and writes to src/data/leads.ts
 * Usage: npx tsx scripts/fetch-airtable.ts
 */

const PAT = process.env.AIRTABLE_PAT;
if (!PAT) {
  console.error("Missing AIRTABLE_PAT environment variable.");
  process.exit(1);
}

const BASE_ID = "appvQdGrxUcb0vcZH";
const TABLE_ID = "tbl0s6tkRlfrRE2FW";
const API_URL = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`;

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

async function fetchAllRecords(): Promise<AirtableRecord[]> {
  const all: AirtableRecord[] = [];
  let offset: string | undefined;

  while (true) {
    const url = new URL(API_URL);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);

    console.log(`  Fetching page... (${all.length} records so far)`);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${PAT}` },
    });

    if (!res.ok) {
      console.error(`API error ${res.status}: ${await res.text()}`);
      process.exit(1);
    }

    const data = await res.json();
    all.push(...(data.records as AirtableRecord[]));

    if (data.offset) {
      offset = data.offset;
    } else {
      break;
    }
  }

  return all;
}

function str(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "string") return val.trim();
  // Linked records come as arrays: [{id, name}] or ["name"]
  if (Array.isArray(val)) {
    return val.map((v) => (typeof v === "object" && v?.name ? v.name : String(v))).join(", ");
  }
  if (typeof val === "object" && (val as { name?: string }).name) {
    return (val as { name: string }).name;
  }
  return String(val);
}

function formatDateDE(val: unknown): string {
  if (!val || typeof val !== "string") return "";
  // ISO format "2026-01-27T18:09:00.000Z" → "27.1.2026 18:09"
  if (val.includes("T") || val.includes("-")) {
    const d = new Date(val);
    if (isNaN(d.getTime())) return str(val);
    return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }
  return str(val);
}

function formatDateShort(val: unknown): string {
  if (!val || typeof val !== "string") return "";
  // "2026-02-02" → "2.2.2026"
  if (val.includes("-")) {
    const [y, m, d] = val.split("-");
    return `${parseInt(d)}.${parseInt(m)}.${y}`;
  }
  return str(val);
}

function mapRecord(record: AirtableRecord, index: number) {
  const f = record.fields;

  return {
    id: index + 1,
    name: str(f["Name"]),
    leadStatus: str(f["Status"]) || str(f["Lead - Status"]),
    verlustgrund: str(f["Verlustgrund"]),
    adId: str(f["Ad ID"]),
    adName: str(f["Ad Name"]),
    platform: str(f["Source"]) || str(f["Platform"]),
    arbeitslosGemeldet: str(f["Arbeitslos gemeldet"]),
    deutschkenntnisse: str(f["Deutschkenntnisse"]),
    alter: str(f["Alter"]),
    vorerfahrung: str(f["Vorerfahrung im Personalwesen"]),
    vertriebler: str(f["Zuständiger Vertriebler"]),
    createdOn: formatDateDE(f["Datum - Created on"] || f["Timestamp - Created on"] || record.createdTime),
    terminBeimAmt: formatDateShort(f["Termin beim Amt"]),
    closingWahrscheinlichkeit: str(f["Closing Chance"]),
    utmTitle: str(f["utm_title"]),
    hotLead: f["Hot Lead"] === "checked" || f["Hot Lead"] === true,
    angebotVerschicken: f["Angebot verschicken"] === "checked" || f["Angebot verschicken"] === true,
    bgVerschickt: str(f["BG verschickt"]),
    anrufversuch: str(f["Anrufversuch"]),
    kennenlernDatum: formatDateShort(f["Datum - Kennenlerngespräch am"]),
    betreuungsart: str(f["Prozess - Betreuungsart"]),
  };
}

async function main() {
  console.log("Fetching Airtable leads...");
  const records = await fetchAllRecords();
  console.log(`Found ${records.length} records.`);

  // Sort by created time
  records.sort((a, b) => {
    const aTime = (a.fields["Datum - Created on"] || a.fields["Timestamp - Created on"] || a.createdTime) as string;
    const bTime = (b.fields["Datum - Created on"] || b.fields["Timestamp - Created on"] || b.createdTime) as string;
    return new Date(aTime).getTime() - new Date(bTime).getTime();
  });

  const leads = records.map((r, i) => mapRecord(r, i));

  // Write leads.ts
  const output = `import { Lead } from "./types";\n\nexport const leads: Lead[] = ${JSON.stringify(leads, null, 2)};\n`;
  const fs = await import("fs");
  const outPath = new URL("../src/data/leads.ts", import.meta.url);
  fs.writeFileSync(new URL(outPath), output);

  console.log(`Written ${leads.length} leads to src/data/leads.ts`);

  // Summary
  const statuses: Record<string, number> = {};
  for (const l of leads) {
    const s = l.leadStatus || "Unknown";
    statuses[s] = (statuses[s] || 0) + 1;
  }
  console.log("Status breakdown:", statuses);
}

main().catch(console.error);

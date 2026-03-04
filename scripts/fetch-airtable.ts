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

// Field name mapping: Airtable column → our Lead field
const FIELD_MAP: Record<string, string> = {
  "Name": "name",
  "Lead - Status": "leadStatus",
  "Deal - Status": "dealStatus",
  "Verlustgrund": "verlustgrund",
  "Ad ID": "adId",
  "Ad Name": "adName",
  "Platform": "platform",
  "Arbeitslos gemeldet": "arbeitslosGemeldet",
  "Deutschkenntnisse": "deutschkenntnisse",
  "Alter": "alter",
  "Vorerfahrung im Personalwesen": "vorerfahrung",
  "Zuständiger Vertriebler": "vertriebler",
  "Timestamp - Created on": "createdOn",
  "Termin beim Amt": "terminBeimAmt",
  "Closing Wahrscheinlichkeit": "closingWahrscheinlichkeit",
  "utm_title": "utmTitle",
};

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

function mapRecord(record: AirtableRecord, index: number) {
  const f = record.fields;
  const lead: Record<string, unknown> = { id: index + 1 };

  for (const [airtableField, ourField] of Object.entries(FIELD_MAP)) {
    let val = f[airtableField] ?? "";

    // Normalize createdOn to German format "27.1.2026 18:09"
    if (ourField === "createdOn" && typeof val === "string" && val.includes("T")) {
      const d = new Date(val);
      val = `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    }

    // Normalize terminBeimAmt to "2.2.2026" format
    if (ourField === "terminBeimAmt" && typeof val === "string" && val.includes("-")) {
      const [y, m, d] = val.split("-");
      val = `${parseInt(d)}.${parseInt(m)}.${y}`;
    }

    lead[ourField] = typeof val === "string" ? val.trim() : String(val ?? "");
  }

  return lead;
}

async function main() {
  console.log("Fetching Airtable leads...");
  const records = await fetchAllRecords();
  console.log(`Found ${records.length} records.`);

  // Sort by created time
  records.sort((a, b) => {
    const aTime = a.fields["Timestamp - Created on"] as string || a.createdTime;
    const bTime = b.fields["Timestamp - Created on"] as string || b.createdTime;
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
    const s = l.leadStatus as string || "Unknown";
    statuses[s] = (statuses[s] || 0) + 1;
  }
  console.log("Status breakdown:", statuses);
}

main().catch(console.error);

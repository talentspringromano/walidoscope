/**
 * Quick script to list all Aircall users.
 * Usage: AIRCALL_API_ID=xxx AIRCALL_API_TOKEN=xxx npx tsx scripts/list-aircall-users.ts
 */

const API_ID = process.env.AIRCALL_API_ID;
const API_TOKEN = process.env.AIRCALL_API_TOKEN;

if (!API_ID || !API_TOKEN) {
  console.error("Missing AIRCALL_API_ID or AIRCALL_API_TOKEN environment variables.");
  process.exit(1);
}

const AUTH = Buffer.from(`${API_ID}:${API_TOKEN}`).toString("base64");

async function main() {
  const res = await fetch("https://api.aircall.io/v1/users?per_page=50", {
    headers: { Authorization: `Basic ${AUTH}` },
  });

  if (!res.ok) {
    console.error(`API error ${res.status}: ${await res.text()}`);
    process.exit(1);
  }

  const data = await res.json();
  const users = data.users || [];

  console.log(`\nFound ${users.length} Aircall users:\n`);
  console.log("ID\t\tName\t\t\t\tEmail");
  console.log("─".repeat(70));

  for (const u of users) {
    console.log(`${u.id}\t\t${u.name}\t\t\t${u.email || "—"}`);
  }

  // Output as JSON for easy copy
  console.log("\n\nJSON for SELLERS map:");
  console.log(JSON.stringify(
    Object.fromEntries(users.map((u: any) => [u.id, u.name])),
    null,
    2
  ));
}

main().catch(console.error);

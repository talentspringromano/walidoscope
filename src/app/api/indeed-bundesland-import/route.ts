import { NextRequest, NextResponse } from "next/server";

const REPO = "talentspringromano/walidoscope";
const FILE_PATH = "src/data/indeed-bundesland-data.json";
const BRANCH = "main";

export async function POST(req: NextRequest) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "GITHUB_TOKEN nicht konfiguriert" }, { status: 500 });
  }

  const { data } = await req.json();
  if (!Array.isArray(data) || data.length === 0) {
    return NextResponse.json({ error: "Keine Daten erhalten" }, { status: 400 });
  }

  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2) + "\n")));

  const getRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
  });

  let sha: string | undefined;
  if (getRes.ok) {
    const existing = await getRes.json();
    sha = existing.sha;
  }

  const putRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `chore: Indeed-Bundesland-Daten aktualisiert (${data.length} Bundesländer) [automated]`,
      content,
      branch: BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!putRes.ok) {
    const err = await putRes.text();
    return NextResponse.json({ error: "GitHub API Fehler", details: err }, { status: putRes.status });
  }

  const result = await putRes.json();
  return NextResponse.json({
    success: true,
    rows: data.length,
    commitUrl: result.commit?.html_url,
  });
}

# Walidoscope — Talentspring Analytics Dashboard

## Übersicht

**Walidoscope** ist ein internes Analytics-Dashboard für die **Talentspring Payroll Academy** — eine deutschsprachige HR/Payroll-Weiterbildungsorganisation. Es ersetzt manuelles Excel-Reporting durch ein interaktives Echtzeit-Dashboard mit automatischer Datenaktualisierung.

**Version:** PoC v1.0
**Sprache:** Deutsch (de-DE)
**Deployment:** Vercel (Auto-Deploy bei Push auf `main`)

---

## Tech-Stack

| Technologie | Version | Zweck |
|-------------|---------|-------|
| **Next.js** | 16.1.6 | Framework (Static Site Generation) |
| **React** | 19.2.4 | UI-Library |
| **TypeScript** | 5.9.3 | Typsicherheit (Strict Mode) |
| **Tailwind CSS** | 4.2.1 | Styling (Dark Theme, Glassmorphism) |
| **Recharts** | 3.7.0 | Charts (Bar, Stacked Bar, Line, Pie, Funnel, Radar, Composed) |
| **Lucide React** | 0.577.0 | Icons (30+) |
| **PostCSS** | 8.5.8 | CSS-Processing mit @tailwindcss/postcss |

---

## Projektstruktur

```
walidoscope/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root Layout (de-DE, Dark Theme)
│   │   ├── globals.css                   # Globale Styles
│   │   ├── (dashboard)/                  # Route-Group für geschützte Seiten
│   │   │   ├── layout.tsx                # Dashboard-Layout mit Sidebar
│   │   │   ├── page.tsx                  # Overview-Seite
│   │   │   ├── marketing/page.tsx        # Marketing-Analytics
│   │   │   ├── sales/page.tsx            # Sales-Pipeline & Verlustanalyse
│   │   │   ├── cohort/page.tsx           # Kohortenanalyse (Woche-für-Woche)
│   │   │   └── seller/page.tsx           # Vertriebler-Performance
│   │   ├── api/
│   │   │   └── auth/route.ts             # POST (Login), DELETE (Logout)
│   │   └── login/
│   │       ├── page.tsx                  # Login-Formular
│   │       └── layout.tsx                # Login-Layout
│   ├── components/
│   │   ├── sidebar.tsx                   # Hauptnavigation (kollapsbar)
│   │   ├── kpi-card.tsx                  # KPI-Card & Section-Card
│   │   ├── chart-theme.ts               # Gemeinsame Chart-Styles & Farbpaletten (TOOLTIP_STYLE, AXIS_STYLE, PALETTE, STATUS_COLORS, LOSS_COLORS, SEGMENT_COLORS, FUNNEL_COLORS)
│   │   ├── activity-calendar.tsx         # Aircall Wochen-Heatmap
│   │   └── target-tracker.tsx            # Tägliche Dial-Ziele vs. Ist
│   ├── data/
│   │   ├── types.ts                      # TypeScript-Interfaces
│   │   ├── leads.ts                      # ~96 Lead-Records (aus Airtable)
│   │   ├── meta-ads.ts                   # 7 Meta-Ad-Creatives
│   │   ├── aircall.ts                    # Aircall Daten-Loader & Typen
│   │   ├── aircall-data.json             # Aggregierte Aircall-Metriken
│   │   └── perspective.ts                # 167 LP-Visit-Records
│   ├── lib/
│   │   └── auth.ts                       # Auth-Utilities (HMAC-SHA256)
│   └── middleware.ts                     # Route-Schutz Middleware
├── scripts/
│   ├── fetch-airtable.ts                 # Airtable Lead-Daten Fetcher
│   ├── fetch-aircall.ts                  # Aircall API Daten-Aggregator
│   └── list-aircall-users.ts            # Aircall User-Lookup
├── .github/workflows/
│   ├── refresh-airtable.yml              # Cron: alle 6h Airtable-Refresh
│   ├── refresh-aircall.yml              # Cron: alle 6h Aircall-Refresh
│   ├── deploy.yml                        # GitHub Pages (deaktiviert, jetzt Vercel)
│   └── list-aircall-users.yml           # Aircall User-Lookup Workflow
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
└── .env.local                            # AUTH_SECRET (dev)
```

---

## Datenquellen & API-Integrationen

### 1. Airtable (Lead-CRM)

| Detail | Wert |
|--------|------|
| **Base ID** | `appvQdGrxUcb0vcZH` |
| **Table ID** | `tbl0s6tkRlfrRE2FW` |
| **Auth** | Personal Access Token (PAT) |
| **Script** | `scripts/fetch-airtable.ts` |
| **Output** | `src/data/leads.ts` (~96 Leads) |
| **Aktualisierung** | Automatisch alle 6h via GitHub Actions |

**Feld-Mapping Airtable → TypeScript:**

```
Airtable-Feld                →  TypeScript-Feld
──────────────────────────────────────────────────
"Lead Status"                →  leadStatus
"Deal Status"                →  dealStatus
"Verlustgrund"               →  verlustgrund
"Plattform"                  →  platform
"Vertriebler"                →  vertriebler
"Arbeitslos gemeldet?"       →  arbeitslosGemeldet
"Deutschkenntnisse"          →  deutschkenntnisse
"Vorerfahrung"               →  vorerfahrung
"Alter"                      →  alter
"Ad ID"                      →  adId
"Ad Name"                    →  adName
"Created on"                 →  createdOn
"Termin beim Amt"            →  terminBeimAmt
"Closing Wahrscheinlichkeit" →  closingWahrscheinlichkeit
"UTM Title"                  →  utmTitle
```

### 2. Aircall (Telefon-Analytics)

| Detail | Wert |
|--------|------|
| **Auth** | Base64-encoded `API_ID:API_TOKEN` |
| **Endpoints** | `GET /v1/users`, `GET /v1/calls` |
| **Script** | `scripts/fetch-aircall.ts` |
| **Output** | `src/data/aircall-data.json` |
| **Aktualisierung** | Automatisch alle 6h via GitHub Actions |

**Vertriebler User-ID-Mapping:**

```
User-ID    →  Name
────────────────────────
1093878    →  Walid Karimi
1862427    →  Nele Pfau
1875176    →  Bastian Wuske
1862760    →  Eric H.
1862761    →  Michel G.
```

**Aggregierte Metriken pro Seller:**
- Outbound/Inbound/Answered/Missed Calls
- Total & durchschnittliche Gesprächsdauer
- Erreichbarkeit (%)
- Calls pro Tag
- Tägliche Aktivität (für Heatmap & Target Tracker)

**Output-Struktur (`aircall-data.json`):**

```json
{
  "sellers": [...],         // Pro-Seller Gesamtmetriken
  "daily": [...],           // Tägliche Team-Werte
  "sellerDaily": [...]      // Tägliche Werte pro Seller
}
```

### 3. Perspective (Landing-Page-Tracking)

| Detail | Wert |
|--------|------|
| **Datei** | `src/data/perspective.ts` |
| **Records** | 167 LP-Besuche |
| **Quellen** | meinNOW, Kursnet |
| **Aktualisierung** | Manuell |

**Felder:** `contactId`, `firstSeenAt`, `utmSource`, `utmTitle`, `hasConverted`, `hasCompleted`, `hasEmail`

### 4. Meta Ads (Facebook/Instagram)

| Detail | Wert |
|--------|------|
| **Datei** | `src/data/meta-ads.ts` |
| **Creatives** | 7 Ads (C1–C7) |
| **Gesamtausgaben** | €341,17 |
| **Aktualisierung** | Manuell (hardcoded) |

**Metriken pro Ad:** Spend, Impressions, CPM, Clicks, CPC, CTR, Link Clicks, Unique Link Clicks, Results, Result Rate, Cost per Result, Ad ID

---

## Daten-Mapping zwischen Quellen

```
Meta Ads ──(Ad ID)──→ Airtable Leads (Platform: Facebook/Instagram)
                              ↑
Kursnet/meinNOW ──(utm_title)──→ Perspective LP ──(E-Mail)──→ Airtable (Platform: Kursnet)
```

---

## Automatische Aktualisierung (alle 6 Stunden)

Zwei **GitHub Actions Cron-Jobs** halten die Daten aktuell:

### Aircall-Refresh (`refresh-aircall.yml`)
- **Cron:** `0 */6 * * *` → 00:00, 06:00, 12:00, 18:00 UTC
- Fetcht Anruf-Daten → updated `src/data/aircall-data.json`
- Commitet & pusht automatisch, nur wenn sich Daten geändert haben

### Airtable-Refresh (`refresh-airtable.yml`)
- **Cron:** `30 */6 * * *` → 00:30, 06:30, 12:30, 18:30 UTC (30 Min versetzt)
- Fetcht Lead-Daten → updated `src/data/leads.ts`
- Commitet & pusht automatisch, nur wenn sich Daten geändert haben

### Ablauf

```
Alle 6 Stunden:
  :00  Aircall-Workflow  → fetcht Calls  → pushed aircall-data.json
  :30  Airtable-Workflow → fetcht Leads  → pushed leads.ts
          ↓
  Push auf main triggert Vercel Auto-Deploy
          ↓
  Dashboard ist aktuell (~5 Min nach Push)
```

Die beiden Workflows sind bewusst **30 Minuten versetzt**, damit keine Git-Konflikte entstehen.

### Was NICHT automatisch aktualisiert wird
- **Meta Ads** (`meta-ads.ts`) — manuell, hardcoded
- **Perspective** (`perspective.ts`) — manuell, hardcoded

### Benötigte GitHub Secrets

| Secret | Verwendung |
|--------|-----------|
| `AIRTABLE_PAT` | Airtable Personal Access Token |
| `AIRCALL_API_ID` | Aircall API ID |
| `AIRCALL_API_TOKEN` | Aircall API Token |

---

## Datenmodelle

### Lead (`types.ts`)

```typescript
export interface Lead {
  id: number;                          // Sequentielle ID (1–96+)
  name: string;                        // Vollständiger Name
  leadStatus: LeadStatus;              // 8 mögliche Status (siehe unten)
  dealStatus: DealStatus;              // "Neuer Lead" | "Angebot schicken" | ""
  verlustgrund: string;                // Verlustgrund
  adId: string;                        // Meta Ad ID
  adName: string;                      // Ad-Kampagnenname
  platform: Platform;                  // "Facebook" | "Instagram" | "Kursnet" | "Indeed" | ""
  arbeitslosGemeldet: string;          // Ja / Nein / 3 Monaten
  deutschkenntnisse: string;           // Sprachniveau
  alter: string;                       // Altersgruppe (z.B. "25 – 45 Jahre")
  vorerfahrung: string;                // HR-Vorerfahrung
  vertriebler: string;                 // Zugewiesener Vertriebler
  createdOn: string;                   // Datum "DD.MM.YYYY HH:MM"
  terminBeimAmt: string;               // Amt-Termin Datum
  closingWahrscheinlichkeit: string;   // Abschlusswahrscheinlichkeit
  utmTitle: string;                    // UTM-Parameter für LP-Tracking
}
```

### Lead-Status (Pipeline)

| Status | Beschreibung |
|--------|-------------|
| **Neuer Lead** | Noch nicht kontaktiert |
| **Rückruf** | Rückruf vereinbart |
| **Vertriebsqualifiziert** | Qualifiziert für Vertrieb |
| **Reterminierung** | Neuer Termin nötig |
| **Kennenlerngespräch gebucht** | Erstgespräch gebucht |
| **Beratungsgespräch gebucht** | Beratung gebucht |
| **Gewonnen** | Abschluss |
| **Verloren** | Kein Abschluss |

### Verlustgründe
- Falsche Kontaktinformationen
- Sprachkenntnisse
- Arbeitet nebenher
- Angestellt
- Kein Interesse an HR/Payroll

### Lead-Segmentierung
- **High-Touch:** Arbeitslos gemeldet + Vorerfahrung/Interesse an HR
- **Low-Touch:** Bald arbeitslos (in 3 Monaten)
- **Medium:** Arbeitslos, aber ohne spezifische HR-Affinität
- **Nicht qualifiziert:** Aktuell nicht arbeitslos

### Funnel

```
Impressions → Clicks → Lead (Meta-Formular / Kursnet LP)
  → Neuer Lead → Rückruf → Vertriebsqualifiziert → Kennenlerngespräch
    → Beratungsgespräch → Amt-Termin → Gewonnen
```

### Zeitverlauf-Patterns (wiederverwendbar)

Alle Zeitverlauf-Charts nutzen die gleichen Hilfsfunktionen:

- **`parseDE(dateStr)`** — Parst deutsches Datumsformat `"DD.M.YYYY HH:MM"` in ein `Date`-Objekt
- **`getISOWeek(date)`** — Berechnet die ISO-Kalenderwoche (KW) aus einem `Date`
- **Wochen-Gruppierung:** Leads werden nach KW gruppiert, pro KW werden Metriken gezählt
- **Stacked BarChart:** X-Achse = KW, Y-Achse = Anzahl, Stacks = Kategorien (Verlustgründe, Segmente, Status)
- **Farb-Paletten:** `LOSS_COLORS`, `SEGMENT_COLORS`, `STATUS_COLORS` aus `chart-theme.ts`

Diese Patterns sind in `cohort/page.tsx`, `sales/page.tsx` und `marketing/page.tsx` implementiert.

---

## Dashboard-Seiten

### Overview (`/`)

**KPIs:** Total Leads, Meta-Leads & Spend, Leads nach Plattform, CPL, Conversions

**Charts:**
- **Funnel:** Lead → Qualified → Amt-Termin → Gewonnen
- **Status-Verteilung:** Balkendiagramm aller 8 Lead-Status
- **Kanal-Vergleich:** Meta vs. Kursnet vs. Indeed (Leads & Spend)
- **Timeline:** Lead-Akquise über Zeit nach Plattform (Liniendiagramm)

### Marketing (`/marketing`)

**Sektionen:**
- **Soll-Ist-Vergleich:** Pro-Kanal-Karten (Meta, Kursnet, Indeed) mit Lead-Fortschritt, Spend, CPL, Conversion vs. Zielwerten
- **IST vs. SOLL Balkendiagramm:** Leads pro Kanal gegenüber Soll-Werten
- **Creative Deep-Funnel:** Performance pro Meta-Ad (Spend → Impressions → Leads → Qualified → Won), sortierbar mit Filterpresets
- **Kosten pro Ad:** Spend vs. CPL (Balkendiagramm)
- **Lead-Segmentierung:** High-Touch / Low-Touch / Medium / Nicht qualifiziert (Tortendiagramm)
- **Lead-Segmentierung im Zeitverlauf:** Stacked BarChart — Segmente pro Kalenderwoche (KW), zeigt Entwicklung der Lead-Qualität über die Wochen
- **CRM-Erfassungslücke:** Warnung bei Differenz zwischen Perspective-Konversionen und CRM-Einträgen
- **Perspective-Funnel:** LP-Besuche → Converted → Won (Kursnet/meinNOW) mit Gap-Visualisierung und Visits nach Kurs-Titel

### Sales (`/sales`)

**Sektionen:**
- **Pipeline-Metriken:** In Pipeline, BGs (Gewonnen), Angebote, Verloren, Amt-Termine
- **Lead-Status Verteilung:** Balkendiagramm aller 8 Lead-Status
- **Verlustanalyse:** Tortendiagramm der Verlustgründe + Verluste pro Seller + Tabelle der Leads ohne Verlustgrund
- **Verlustgründe im Zeitverlauf:** Stacked BarChart — Verlustgründe pro Kalenderwoche (KW), zeigt Entwicklung der Verlustmuster über die Wochen
- **Deal-Tracking:** Tabelle der Leads im Status "Angebot schicken" mit Closing-Wahrscheinlichkeit
- **Amt-Termine:** Karten für diese & nächste Woche mit Datum und Status
- **Amt-Termine im Zeitverlauf:** BarChart — gebuchte Termine pro Kalenderwoche (KW)

### Cohort (`/cohort`)

**Sektionen:**
- **Plattform-Filter:** Alle / Meta / Kursnet / Indeed
- **KPIs:** Wochen erfasst, Beste Woche, Ø CPL, Conversion Rate
- **Leads nach Status pro Woche:** Stacked BarChart — alle 7 Lead-Status pro KW
- **CPL-Trend:** Liniendiagramm — Cost per Lead pro Woche
- **Spend & Conversion:** Dual-Axis ComposedChart — Spend (Balken) + Conversion % (Linie) pro Woche
- **Wochendetails:** Detailtabelle mit Leads, Qualified, Won, Lost, Spend, CPL, CPA, Conv.%

### Seller (`/seller`)

**Sektionen:**
- **Vertriebler-Vergleich:** Balkendiagramm (Leads, Qualified, Won)
- **Radar-Chart:** Multi-Metrik-Vergleich (Leads, Qualified, Won, Termine, Calls)
- **Aircall-Integration:** Anrufmetriken pro Seller (Outbound, Answered, Dauer, Erreichbarkeit)
- **Activity Calendar:** Wöchentliche Anruf-Heatmap
- **Target Tracker:** 75 Dials/Tag Teamziel vs. tatsächlich (Liniendiagramm)
- **Seller-Einzelkarten:** Detaillierte Stats mit Conversion-Raten

---

## UI-Komponenten

| Komponente | Datei | Beschreibung |
|-----------|-------|-------------|
| **KpiCard** | `components/kpi-card.tsx` | Einzelne Metrik mit Label, Icon, Trend, Subtext |
| **SectionCard** | `components/kpi-card.tsx` | Container mit Titel, einheitliches Styling |
| **Sidebar** | `components/sidebar.tsx` | Kollapsbare Navigation (232px → 68px), 4 Routen, Logout |
| **ActivityCalendar** | `components/activity-calendar.tsx` | Wochen-Heatmap der Aircall-Dials pro Seller |
| **TargetTracker** | `components/target-tracker.tsx` | Tägliche Dials vs. 75er-Ziel, On-Track/Behind-Status |

### Design & Farbpalette

- **Dark Theme Basis:** `#0c0c0e` (fast schwarz), `#fafaf9` (fast weiß)
- **Glassmorphism-Effekte** auf allen Cards

```
Amber     #e2a96e   – Primary/Brand
Teal      #5eead4   – Akzent 1
Indigo    #818cf8   – Akzent 2
Violet    #a78bfa   – Akzent 3
Rose      #fb7185   – Fehler/Verlust
Emerald   #34d399   – Erfolg/Gewonnen
Orange    #fb923c   – Warnung
Gold      #fbbf24   – Abschluss
```

---

## Authentifizierung

### Architektur
- **Typ:** HMAC-SHA256 Token-basiert (kein externer Auth-Provider)
- **Datei:** `src/lib/auth.ts`

### Benutzer

| E-Mail | Rolle |
|--------|-------|
| `romano@talentspring-academy.com` | Admin |
| `lennard@talentspring-academy.com` | User |

Passwörter sind als SHA-256-Hashes in `auth.ts` gespeichert.

### Session-Flow

1. **Login** (`POST /api/auth`) — Prüft E-Mail + Passwort-Hash, erstellt HMAC-signierten Token, setzt `session`-Cookie (httpOnly, 7 Tage)
2. **Route-Schutz** (`middleware.ts`) — Alle Dashboard-Routen (`/`, `/marketing`, `/sales`, `/cohort`, `/seller`) erfordern gültigen Session-Token
3. **Logout** (`DELETE /api/auth`) — Löscht Session-Cookie, Redirect zu `/login`

### Environment Variables

| Variable | Zweck |
|----------|-------|
| `AUTH_SECRET` | HMAC-Signing-Key (Pflicht in Production) |
| `AIRTABLE_PAT` | Airtable Personal Access Token (für Fetch-Scripts) |
| `AIRCALL_API_ID` | Aircall API ID (für Fetch-Scripts) |
| `AIRCALL_API_TOKEN` | Aircall API Token (für Fetch-Scripts) |

---

## Lokale Entwicklung

```bash
# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev          # http://localhost:3000

# Daten manuell aktualisieren
npx tsx scripts/fetch-airtable.ts    # Leads aus Airtable
npm run fetch-aircall                # Calls aus Aircall

# Production Build
npm run build        # Static Export nach /out
```

---

## Zusammenfassung

Walidoscope ist ein schlankes, gut strukturiertes Analytics-MVP mit:
- **4 Datenquellen** (Airtable, Aircall, Perspective, Meta Ads)
- **5 Dashboard-Seiten** (Overview, Marketing, Sales, Cohort, Seller)
- **Automatische Aktualisierung** alle 6 Stunden (Airtable + Aircall via GitHub Actions)
- **Vercel Auto-Deploy** bei jedem Push auf `main`
- **HMAC-Auth** mit 2 Benutzern
- **Dark-Theme Design** mit Glassmorphism

Es liefert dem Talentspring-Sales-Team actionable KPIs zu Leads, Marketing-Performance, Pipeline und Vertriebler-Produktivität.

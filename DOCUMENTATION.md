# Walidoscope – Talentspring Analytics Dashboard

## Übersicht

PoC-Dashboard für Talentspring Payroll Academy. Ersetzt manuelles Excel-Reporting durch ein interaktives Analytics-Dashboard mit statischen Daten, gehostet auf GitHub Pages.

## Datenquellen

| Quelle | Datei | Beschreibung |
|--------|-------|-------------|
| **Meta Ads** | `src/data/meta-ads.ts` | 7 Ad Creatives: Spend, Impressions, Clicks, Leads, CPL |
| **Airtable CRM** | `src/data/leads.ts` | 96 Leads: Status, Deal-Status, Quelle, Qualifikation |
| **Perspective** | `src/data/perspective.ts` | 167 LP-Visits: Kursnet/meinNOW Funnel |

## Daten-Mapping

```
Meta Ads ──(Ad ID)──→ Airtable (Platform: Facebook/Instagram)
                         ↑
Kursnet/meinNOW ──(utm_title)──→ Perspective LP ──(E-Mail)──→ Airtable (Platform: Kursnet)
```

## Feld-Definitionen

### Lead-Status (Airtable)
- **Neuer Lead** – Noch nicht kontaktiert
- **1x NE** – 1x nicht erreicht
- **Discovery Call** – Erstgespräch geführt
- **Follow up** – In Nachverfolgung
- **Angebot zuschicken** – Angebot wird erstellt/versendet
- **Verloren** – Lead abgeschlossen ohne Abschluss

### Verlustgründe
- Falsche Kontaktinformationen
- Sprachkenntnisse
- Arbeitet nebenher
- Angestellt
- Kein Interesse an HR/Payroll

### Lead-Segmentierung
- **High-Touch**: Arbeitslos gemeldet + Vorerfahrung/Interesse an HR
- **Low-Touch**: Bald arbeitslos (in 3 Monaten)
- **Medium**: Arbeitslos, aber ohne spezifische HR-Affinität
- **Nicht qualifiziert**: Aktuell nicht arbeitslos

## Funnel

```
Impressions → Clicks → Lead (Meta-Formular / Kursnet LP)
    → 1x NE → Discovery Call → Follow up → Angebot → Amt-Termin → Abschluss
```

## Dashboard-Seiten

| Route | Beschreibung |
|-------|-------------|
| `/` | Overview – Core KPIs, Funnel, Kanal-Vergleich |
| `/marketing` | Marketing – Creative Performance, Segmentierung, Kursnet Funnel |
| `/sales` | Sales – Pipeline, Verlustgründe, Deal-Tracking, Amt-Termine |
| `/seller` | Seller – Vertriebler-Vergleich, Bestenliste |

## Tech Stack

- Next.js 16 (Static Export)
- Tailwind CSS 4
- Recharts (Charts)
- Lucide React (Icons)
- GitHub Pages Deployment

## Lokale Entwicklung

```bash
npm install
npm run dev    # http://localhost:3000
npm run build  # Static export nach /out
```

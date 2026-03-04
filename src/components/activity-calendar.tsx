"use client";

import { useState, useMemo } from "react";
import { Phone, PhoneOutgoing, Clock, ChevronDown } from "lucide-react";
import { aircallDaily, aircallSellerDaily, type AircallDailyEntry } from "@/data/aircall";
import { formatDuration } from "@/data/aircall";

type Mode = "dials" | "calltime";

const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const SELLER_NAMES = ["Walid Karimi", "Nele Pfau", "Bastian Wuske", "Eric H.", "Michel G."];

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatWeekLabel(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const mStart = monday.toLocaleDateString("de-DE", { day: "numeric" });
  const mEnd = sunday.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
  const sameMonth = monday.getMonth() === sunday.getMonth();
  if (sameMonth) {
    return `${mStart}–${mEnd}`;
  }
  const mStartFull = monday.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
  return `${mStartFull} – ${mEnd}`;
}

interface WeekRow {
  monday: Date;
  label: string;
  totalDials: number;
  totalCalltimeSec: number;
  days: (AircallDailyEntry | null)[];
}

function buildWeeks(entries: AircallDailyEntry[]): WeekRow[] {
  if (entries.length === 0) return [];

  const byDate = new Map<string, AircallDailyEntry>();
  for (const e of entries) {
    const existing = byDate.get(e.date);
    if (existing) {
      existing.dials += e.dials;
      existing.reached += e.reached;
      existing.calltimeSec += e.calltimeSec;
    } else {
      byDate.set(e.date, { ...e });
    }
  }

  const allDates = [...byDate.keys()].map((d) => new Date(d + "T00:00:00"));
  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

  const firstMonday = getMonday(minDate);
  const lastMonday = getMonday(maxDate);

  const weeks: WeekRow[] = [];
  const current = new Date(firstMonday);

  while (current <= lastMonday) {
    const days: (AircallDailyEntry | null)[] = [];
    let totalDials = 0;
    let totalCalltimeSec = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(current);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().split("T")[0];
      const entry = byDate.get(iso) ?? null;
      days.push(entry);
      if (entry) {
        totalDials += entry.dials;
        totalCalltimeSec += entry.calltimeSec;
      }
    }

    weeks.push({
      monday: new Date(current),
      label: formatWeekLabel(new Date(current)),
      totalDials,
      totalCalltimeSec,
      days,
    });

    current.setDate(current.getDate() + 7);
  }

  return weeks.reverse(); // newest first
}

function BubbleCell({ entry, mode, maxVal }: { entry: AircallDailyEntry | null; mode: Mode; maxVal: number }) {
  const today = new Date().toISOString().split("T")[0];

  if (!entry || (mode === "dials" && entry.dials === 0) || (mode === "calltime" && entry.calltimeSec === 0)) {
    if (entry && entry.date === today) {
      return (
        <div className="flex flex-col items-center gap-1">
          <span className="text-[11px] text-[#57534e] border border-[rgba(255,255,255,0.08)] rounded-md px-2 py-0.5">Heute</span>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center h-12">
        <span className="text-[#44403c] text-[13px]">–</span>
      </div>
    );
  }

  const value = mode === "dials" ? entry.dials : entry.calltimeSec;
  const ratio = maxVal > 0 ? value / maxVal : 0;
  const minSize = 32;
  const maxSize = 64;
  const size = Math.round(minSize + ratio * (maxSize - minSize));

  const displayValue = mode === "dials" ? entry.dials : formatDuration(entry.calltimeSec);
  const subLabel = mode === "dials" ? `${entry.reached} erreicht` : `${entry.dials} Dials`;
  const isToday = entry.date === today;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="rounded-full bg-gradient-to-br from-[#e2a96e] to-[#d4915a] flex items-center justify-center text-[#0c0c0e] font-bold tabular-nums shadow-[0_0_12px_rgba(226,169,110,0.25)]"
        style={{
          width: size,
          height: size,
          fontSize: size < 40 ? 11 : size < 52 ? 13 : 15,
        }}
      >
        {displayValue}
      </div>
      <span className="text-[10px] text-[#78716c]">{subLabel}</span>
      {isToday && <span className="text-[9px] text-[#57534e]">Heute</span>}
    </div>
  );
}

export function ActivityCalendar() {
  const [mode, setMode] = useState<Mode>("dials");
  const [selectedSeller, setSelectedSeller] = useState<string>("all");
  const [selectedWeek, setSelectedWeek] = useState<string>("all");

  // Get filtered daily entries based on seller selection
  const filteredEntries = useMemo(() => {
    if (selectedSeller === "all") {
      return aircallDaily;
    }
    // Filter sellerDaily for selected seller
    return aircallSellerDaily.filter((e) => e.seller === selectedSeller);
  }, [selectedSeller]);

  const weeks = useMemo(() => buildWeeks(filteredEntries), [filteredEntries]);

  // Filter weeks based on selection
  const displayedWeeks = useMemo(() => {
    if (selectedWeek === "all") return weeks;
    const idx = parseInt(selectedWeek);
    if (isNaN(idx) || idx < 0 || idx >= weeks.length) return weeks;
    return [weeks[idx]];
  }, [weeks, selectedWeek]);

  const maxVal = useMemo(() => {
    const entries = displayedWeeks.flatMap((w) => w.days.filter(Boolean) as AircallDailyEntry[]);
    return Math.max(1, ...entries.map((e) => (mode === "dials" ? e.dials : e.calltimeSec)));
  }, [displayedWeeks, mode]);

  if (weeks.length === 0) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-1">
          <Phone className="h-5 w-5 text-[#e2a96e]" />
          <h2 className="text-[17px] font-semibold text-[#fafaf9]">Aktivitätskalender</h2>
        </div>
        <p className="text-[13px] text-[#57534e]">
          {selectedSeller !== "all"
            ? "Keine Daten für diesen Seller vorhanden."
            : "Tägliche Daten werden beim nächsten Aircall-Refresh geladen."}
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Phone className="h-5 w-5 text-[#e2a96e]" />
            <h2 className="text-[17px] font-semibold text-[#fafaf9]">Aktivitätskalender</h2>
          </div>
          <p className="text-[13px] text-[#57534e]">Anwahlversuche pro Tag</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Seller Filter */}
          <div className="relative">
            <select
              value={selectedSeller}
              onChange={(e) => setSelectedSeller(e.target.value)}
              className="appearance-none rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-3.5 py-1.5 pr-8 text-[12px] font-medium text-[#a8a29e] cursor-pointer hover:border-[rgba(255,255,255,0.12)] focus:outline-none focus:border-[#e2a96e] transition-colors"
            >
              <option value="all">Alle Seller</option>
              {SELLER_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[#57534e] pointer-events-none" />
          </div>

          {/* Week Filter */}
          <div className="relative">
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="appearance-none rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-3.5 py-1.5 pr-8 text-[12px] font-medium text-[#a8a29e] cursor-pointer hover:border-[rgba(255,255,255,0.12)] focus:outline-none focus:border-[#e2a96e] transition-colors"
            >
              <option value="all">Alle Wochen</option>
              {weeks.map((w, i) => (
                <option key={i} value={i}>
                  {w.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[#57534e] pointer-events-none" />
          </div>

          {/* Mode Toggle */}
          <div className="flex rounded-xl border border-[rgba(255,255,255,0.06)] overflow-hidden">
            <button
              onClick={() => setMode("calltime")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-medium transition-all ${
                mode === "calltime"
                  ? "bg-[rgba(226,169,110,0.1)] text-[#e2a96e] border-r border-[rgba(255,255,255,0.06)]"
                  : "text-[#78716c] hover:text-[#a8a29e] border-r border-[rgba(255,255,255,0.06)]"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              Calltime
            </button>
            <button
              onClick={() => setMode("dials")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-medium transition-all ${
                mode === "dials"
                  ? "bg-[rgba(226,169,110,0.1)] text-[#e2a96e]"
                  : "text-[#78716c] hover:text-[#a8a29e]"
              }`}
            >
              <PhoneOutgoing className="h-3.5 w-3.5" />
              Dials
            </button>
          </div>
        </div>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-[140px_repeat(7,1fr)] gap-2 mb-2">
        <div />
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[12px] font-medium text-[#78716c]">{d}</div>
        ))}
      </div>

      {/* Weeks */}
      <div className="space-y-1">
        {displayedWeeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-[140px_repeat(7,1fr)] gap-2 items-center py-4 border-t border-[rgba(255,255,255,0.03)]">
            <div>
              <div className="text-[13px] font-medium text-[#fafaf9]">{week.label}</div>
              <div className="text-[11px] font-medium text-[#e2a96e]">
                {mode === "dials"
                  ? `${week.totalDials} Dials`
                  : formatDuration(week.totalCalltimeSec)}
              </div>
            </div>
            {week.days.map((entry, i) => (
              <BubbleCell key={i} entry={entry} mode={mode} maxVal={maxVal} />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-[rgba(255,255,255,0.03)]">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-gradient-to-br from-[#e2a96e] to-[#d4915a]" />
          <span className="text-[11px] text-[#78716c]">
            {mode === "dials" ? "Dials (Größe = Anzahl)" : "Calltime (Größe = Dauer)"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-[#44403c]">–</span>
          <span className="text-[11px] text-[#78716c]">Keine Aktivität</span>
        </div>
      </div>
    </div>
  );
}

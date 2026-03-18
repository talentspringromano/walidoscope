"use client";

import { useState, useMemo } from "react";
import { aircallSellers } from "@/data/aircall";
import { formatDuration } from "@/data/aircall";
import type { AircallDailyEntry, AircallSellerDailyEntry } from "@/data/aircall";
import { TOOLTIP_STYLE, AXIS_STYLE } from "@/components/chart-theme";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Target } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
} from "recharts";

/* ── Targets ── */
const DAILY_TARGET = 100; // Dials pro Tag (Team)
const DAILY_TARGET_PER_SELLER = 20; // Dials pro Tag (Einzelperson)
const WORKING_DAYS_MONTH = 20;

const sellerNames = aircallSellers.map((s) => s.name);

/* ── Progress Ring SVG ── */
function ProgressRing({ percent, size = 36 }: { percent: number; size?: number }) {
  const strokeWidth = 3.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference;
  const color = percent >= 90 ? "#5eead4" : percent >= 70 ? "#818cf8" : "#f87171";

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
    </svg>
  );
}

interface TargetTrackerProps {
  filteredDaily: AircallDailyEntry[];
  filteredSellerDaily: AircallSellerDailyEntry[];
}

export function TargetTracker({ filteredDaily, filteredSellerDaily }: TargetTrackerProps) {
  const [activeSeller, setActiveSeller] = useState("all");

  // Fill in all calendar days (including weekends & zero-activity days)
  const rawDaily =
    activeSeller === "all"
      ? filteredDaily
      : filteredSellerDaily.filter((e) => e.seller === activeSeller);

  const daily = useMemo(() => {
    if (rawDaily.length === 0) return rawDaily;
    const byDate = new Map(rawDaily.map((d) => [d.date, d]));
    const dates = rawDaily.map((d) => d.date).sort();
    const start = new Date(dates[0] + "T00:00:00");
    const end = new Date(dates[dates.length - 1] + "T00:00:00");
    const filled: typeof rawDaily = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const iso = d.toISOString().split("T")[0];
      filled.push(byDate.get(iso) ?? { date: iso, dials: 0, reached: 0, calltimeSec: 0 } as typeof rawDaily[0]);
    }
    return filled;
  }, [rawDaily]);

  const target = activeSeller === "all" ? DAILY_TARGET : DAILY_TARGET_PER_SELLER;
  const monthlyTarget = target * WORKING_DAYS_MONTH;

  if (daily.length === 0) return null;

  const totalDials = daily.reduce((s, d) => s + d.dials, 0);
  const totalReached = daily.reduce((s, d) => s + d.reached, 0);
  const activeDays = daily.filter((d) => d.dials > 0).length || 1;
  const avgPerDay = Math.round(totalDials / activeDays);

  // Days remaining in the month (assume 20 working days total)
  const daysElapsed = activeDays;
  const daysRemaining = Math.max(1, WORKING_DAYS_MONTH - daysElapsed);

  // Target for elapsed days
  const sollBisher = target * daysElapsed;
  const abweichung = totalDials - sollBisher;
  const abweichungPct = Math.round((totalDials / sollBisher) * 100);

  // Catch-up rate needed to still hit monthly target
  const remainingDials = monthlyTarget - totalDials;
  const catchUpRate = Math.max(0, Math.round(remainingDials / daysRemaining));

  const overTarget = abweichung >= 0;

  // Progress percentage for the combined card
  const progressPct = Math.round((totalDials / sollBisher) * 100);

  // Sparkline data — daily dials
  const sparklineData = daily.map((d) => ({ dials: d.dials }));

  // Trend: compare avg of last 3 days vs previous 3 days
  const recentDays = daily.slice(-3);
  const previousDays = daily.slice(-6, -3);
  const recentAvg = recentDays.length > 0 ? recentDays.reduce((s, d) => s + d.dials, 0) / recentDays.length : 0;
  const previousAvg = previousDays.length > 0 ? previousDays.reduce((s, d) => s + d.dials, 0) / previousDays.length : 0;
  const trendUp = recentAvg >= previousAvg;

  // Chart data
  const chartData = daily.map((d) => ({
    date: new Date(d.date + "T00:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "short" }),
    fullDate: d.date,
    dials: d.dials,
    reached: d.reached,
  }));

  const maxDials = Math.max(...daily.map((d) => d.dials), target);

  // Empfehlung logic (bug-fixed)
  const empfehlungLabel = overTarget
    ? "Über Target"
    : catchUpRate === 0
      ? "Im Plan"
      : "Aufholen";

  const empfehlungIsPositive = overTarget || catchUpRate === 0;

  const daysRemainingLabel = daysRemaining === 1 ? "Tag" : "Tage";

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* 1. Fortschritt (combined IST/SOLL) */}
        <div className="glass-card p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium uppercase tracking-wider text-[#57534e]">Fortschritt</div>
              <div className="text-[32px] font-bold tracking-tight tabular-nums text-[#fafaf9] mt-1">
                {totalDials} <span className="text-[18px] font-semibold text-[#57534e]">/ {sollBisher}</span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden mt-2 mb-1.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    progressPct >= 100
                      ? "bg-gradient-to-r from-[#5eead4] to-[#2dd4bf]"
                      : "bg-gradient-to-r from-[#818cf8] to-[#6366f1]"
                  }`}
                  style={{ width: `${Math.min(100, progressPct)}%` }}
                />
              </div>
              <div className="text-[11px] text-[#57534e]">
                {abweichungPct}% · {activeDays} Arbeitstage
              </div>
            </div>
            <div className="h-9 w-9 rounded-xl bg-[rgba(129,140,248,0.08)] flex items-center justify-center ml-3">
              <ProgressRing percent={progressPct} />
            </div>
          </div>
        </div>

        {/* 2. Ø Dials/Tag (Sparkline + Trend) */}
        <div className="glass-card p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium uppercase tracking-wider text-[#57534e]">Ø Dials/Tag</div>
              <div className="flex items-baseline gap-2 mt-1">
                <div className="text-[32px] font-bold tracking-tight tabular-nums text-[#fafaf9]">{avgPerDay}</div>
                <div className={`flex items-center gap-0.5 text-[11px] font-medium ${trendUp ? "text-[#5eead4]" : "text-[#f87171]"}`}>
                  {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {trendUp ? "steigend" : "fallend"}
                </div>
              </div>
              {/* Sparkline */}
              {sparklineData.length > 1 && (
                <div className="mt-1.5 -mx-1">
                  <ResponsiveContainer width="100%" height={40}>
                    <LineChart data={sparklineData}>
                      <Line
                        type="monotone"
                        dataKey="dials"
                        stroke={trendUp ? "#5eead4" : "#f87171"}
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. Abweichung */}
        <div className="glass-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-[#57534e]">Abweichung</div>
              <div className={`text-[32px] font-bold tracking-tight tabular-nums mt-1 ${overTarget ? "text-[#5eead4]" : "text-[#f87171]"}`}>
                {abweichung > 0 ? "+" : ""}{abweichung}
              </div>
              <div className={`text-[11px] mt-0.5 ${overTarget ? "text-[#5eead4]" : "text-[#f87171]"}`}>
                {abweichungPct}% vom SOLL
              </div>
            </div>
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${overTarget ? "bg-[rgba(94,234,212,0.1)]" : "bg-[rgba(248,113,113,0.1)]"}`}>
              {overTarget
                ? <TrendingUp className="h-4 w-4 text-[#5eead4]" />
                : <TrendingDown className="h-4 w-4 text-[#f87171]" />
              }
            </div>
          </div>
        </div>

        {/* 4. Empfehlung (bug-fixed) */}
        <div className="glass-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-[#57534e]">Empfehlung</div>
              <div className={`text-[18px] font-bold mt-1 ${empfehlungIsPositive ? "text-[#5eead4]" : "text-[#e2a96e]"}`}>
                {empfehlungLabel}
              </div>
              <div className={`text-[11px] mt-0.5 ${empfehlungIsPositive ? "text-[#5eead4]" : "text-[#e2a96e]"}`}>
                {overTarget
                  ? `${avgPerDay}/Tag halten · +${abweichung} Puffer`
                  : catchUpRate === 0
                    ? `${avgPerDay}/Tag halten · im Zeitplan`
                    : `${catchUpRate}/Tag nötig · noch ${daysRemaining} ${daysRemainingLabel}`
                }
              </div>
            </div>
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${empfehlungIsPositive ? "bg-[rgba(94,234,212,0.1)]" : "bg-[rgba(226,169,110,0.1)]"}`}>
              {empfehlungIsPositive
                ? <CheckCircle className="h-4 w-4 text-[#5eead4]" />
                : <AlertTriangle className="h-4 w-4 text-[#e2a96e]" />
              }
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-[17px] font-semibold text-[#fafaf9]">Dials vs. Tagesziel</h2>
            <p className="text-[13px] text-[#57534e]">
              Tägliche Outbound-Calls{activeSeller !== "all" ? ` — ${activeSeller}` : ""} im Vergleich zum SOLL
            </p>
          </div>
        </div>

        {/* Seller filter chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[{ key: "all", label: "Alle" }, ...sellerNames.map((n) => ({ key: n, label: n.split(" ")[0] }))].map(
            ({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveSeller(key)}
                className={`px-3 py-1 rounded-lg text-[12px] font-medium transition-colors ${
                  activeSeller === key
                    ? "bg-[rgba(226,169,110,0.15)] text-[#e2a96e] border border-[rgba(226,169,110,0.3)]"
                    : "bg-[rgba(255,255,255,0.04)] text-[#78716c] border border-[rgba(255,255,255,0.06)] hover:text-[#a8a29e]"
                }`}
              >
                {label}
              </button>
            )
          )}
        </div>

        {/* Legend chips */}
        <div className="flex flex-wrap gap-3 mb-5">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border border-[rgba(255,255,255,0.06)] text-[11px] font-medium text-[#78716c]">
            <span className="w-4 border-t-2 border-dashed border-[#78716c]" />
            SOLL {target}/Tag
          </span>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border border-[rgba(94,234,212,0.2)] text-[11px] font-medium text-[#5eead4]">
            <span className="w-4 border-t-2 border-[#5eead4]" />
            Ø IST {avgPerDay}/Tag
          </span>
          {!overTarget && (
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border border-[rgba(248,113,113,0.2)] text-[11px] font-medium text-[#f87171]">
              <span className="w-4 border-t-2 border-dashed border-[#f87171]" />
              Aufholen {catchUpRate}/Tag
            </span>
          )}
          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[11px] font-medium ${
            overTarget
              ? "border border-[rgba(94,234,212,0.2)] text-[#5eead4]"
              : "border border-[rgba(248,113,113,0.2)] text-[#f87171]"
          }`}>
            {abweichung > 0 ? "+" : ""}{abweichung} vs. Plan
          </span>
        </div>

        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#1c1917" vertical={false} />
            <XAxis dataKey="date" {...AXIS_STYLE} axisLine={false} tickLine={false} angle={-35} textAnchor="end" height={55} />
            <YAxis {...AXIS_STYLE} axisLine={false} tickLine={false} domain={[0, Math.ceil(maxDials * 1.15)]} />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(val, name) => {
                if (name === "dials") return [val, "Dials"];
                return [val, name];
              }}
              labelFormatter={(label) => label}
            />

            {/* SOLL line */}
            <ReferenceLine
              y={target}
              stroke="#78716c"
              strokeDasharray="6 4"
              strokeWidth={1.5}
            />

            {/* IST avg line */}
            <ReferenceLine
              y={avgPerDay}
              stroke="#5eead4"
              strokeWidth={1.5}
            />

            {/* Catch-up line if behind */}
            {!overTarget && (
              <ReferenceLine
                y={catchUpRate}
                stroke="#f87171"
                strokeDasharray="6 4"
                strokeWidth={1.5}
              />
            )}

            <Bar dataKey="dials" radius={[4, 4, 0, 0]} animationDuration={600}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.dials >= target ? "#818cf8" : "rgba(129,140,248,0.5)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Progress bar */}
        <div className="mt-5 pt-4 border-t border-[rgba(255,255,255,0.04)]">
          <div className="flex items-center justify-between text-[11px] mb-2">
            <span className="text-[#78716c]">Monatsziel: {monthlyTarget} Dials</span>
            <span className="tabular-nums font-medium text-[#a8a29e]">{totalDials} / {monthlyTarget} ({Math.round((totalDials / monthlyTarget) * 100)}%)</span>
          </div>
          <div className="h-2 rounded-full bg-[rgba(255,255,255,0.04)] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                totalDials >= monthlyTarget
                  ? "bg-gradient-to-r from-[#5eead4] to-[#2dd4bf]"
                  : "bg-gradient-to-r from-[#818cf8] to-[#6366f1]"
              }`}
              style={{ width: `${Math.min(100, Math.round((totalDials / monthlyTarget) * 100))}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

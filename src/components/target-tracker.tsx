"use client";

import { useState } from "react";
import { aircallDaily, aircallSellerDaily, aircallSellers } from "@/data/aircall";
import { formatDuration } from "@/data/aircall";
import { TOOLTIP_STYLE, AXIS_STYLE } from "@/components/chart-theme";
import { Target, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";
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
} from "recharts";

/* ── Targets ── */
const DAILY_TARGET = 75; // Dials pro Tag (Team)
const DAILY_TARGET_PER_SELLER = 15; // Dials pro Tag (Einzelperson)
const WORKING_DAYS_MONTH = 20;

const sellerNames = aircallSellers.map((s) => s.name);

export function TargetTracker() {
  const [activeSeller, setActiveSeller] = useState("all");

  const daily =
    activeSeller === "all"
      ? aircallDaily
      : aircallSellerDaily.filter((e) => e.seller === activeSeller);

  const target = activeSeller === "all" ? DAILY_TARGET : DAILY_TARGET_PER_SELLER;
  const monthlyTarget = target * WORKING_DAYS_MONTH;

  if (daily.length === 0) return null;

  const totalDials = daily.reduce((s, d) => s + d.dials, 0);
  const totalReached = daily.reduce((s, d) => s + d.reached, 0);
  const activeDays = daily.length;
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

  // Chart data
  const chartData = daily.map((d) => ({
    date: new Date(d.date + "T00:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "short" }),
    fullDate: d.date,
    dials: d.dials,
    reached: d.reached,
  }));

  const maxDials = Math.max(...daily.map((d) => d.dials), target);

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* IST */}
        <div className="glass-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-[#57534e]">IST</div>
              <div className="text-[32px] font-bold tracking-tight tabular-nums text-[#fafaf9] mt-1">{totalDials}</div>
              <div className="text-[11px] text-[#57534e] mt-0.5">{activeDays} Arbeitstage</div>
            </div>
            <div className="h-9 w-9 rounded-xl bg-[rgba(129,140,248,0.1)] flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-[#818cf8]" />
            </div>
          </div>
        </div>

        {/* SOLL */}
        <div className="glass-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-[#57534e]">SOLL</div>
              <div className="text-[32px] font-bold tracking-tight tabular-nums text-[#fafaf9] mt-1">{sollBisher}</div>
              <div className="text-[11px] text-[#57534e] mt-0.5">{target}/Tag × {daysElapsed} Tage</div>
            </div>
            <div className="h-9 w-9 rounded-xl bg-[rgba(255,255,255,0.04)] flex items-center justify-center">
              <Target className="h-4 w-4 text-[#78716c]" />
            </div>
          </div>
        </div>

        {/* Abweichung */}
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

        {/* Empfehlung */}
        <div className="glass-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-[#57534e]">Empfehlung</div>
              <div className={`text-[18px] font-bold mt-1 ${overTarget ? "text-[#5eead4]" : "text-[#e2a96e]"}`}>
                {overTarget ? "Über Target" : "Aufholen"}
              </div>
              <div className={`text-[11px] mt-0.5 ${overTarget ? "text-[#5eead4]" : "text-[#e2a96e]"}`}>
                {overTarget
                  ? `${avgPerDay}/Tag halten · +${abweichung} Puffer`
                  : `${catchUpRate}/Tag nötig · noch ${daysRemaining} Tage`
                }
              </div>
            </div>
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${overTarget ? "bg-[rgba(94,234,212,0.1)]" : "bg-[rgba(226,169,110,0.1)]"}`}>
              {overTarget
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

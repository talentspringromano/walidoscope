"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

const SUBHEADLINES = [
  "Lass uns die Zahlen von heute analysieren.",
  "Deine neuesten Metriken warten auf dich.",
  "Zeit für datengetriebene Entscheidungen.",
  "Die Performance auf einen Blick.",
  "Dein Überblick für strategische Klarheit.",
];

function WelcomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const firstName = searchParams.get("name") || "";
  const [subheadline] = useState(
    () => SUBHEADLINES[Math.floor(Math.random() * SUBHEADLINES.length)]
  );
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setLeaving(true), 3600);
    const redirectTimer = setTimeout(() => router.replace("/"), 4000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(redirectTimer);
    };
  }, [router]);

  const greeting = firstName
    ? `Willkommen zurück, ${firstName}.`
    : "Willkommen zurück.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#0c0c0e]">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Accent glow */}
        <motion.div
          className="absolute top-[20%] left-[15%] h-[600px] w-[600px] rounded-full bg-[rgba(226,169,110,0.05)] blur-[150px]"
          animate={{ opacity: [0.03, 0.08, 0.03], scale: [1, 1.05, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Teal glow */}
        <motion.div
          className="absolute bottom-[15%] right-[15%] h-[500px] w-[500px] rounded-full bg-[rgba(94,234,212,0.04)] blur-[120px]"
          animate={{ opacity: [0.02, 0.06, 0.02], scale: [1, 1.08, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Faint grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Dashboard wireframe */}
        <motion.svg
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[520px]"
          viewBox="0 0 900 520"
          fill="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.04 }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
        >
          {/* Sidebar */}
          <rect x="0" y="0" width="80" height="520" rx="12" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
          <circle cx="40" cy="40" r="14" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
          <rect x="20" y="80" width="40" height="4" rx="2" fill="rgba(255,255,255,0.3)" />
          <rect x="20" y="100" width="40" height="4" rx="2" fill="rgba(255,255,255,0.3)" />
          <rect x="20" y="120" width="40" height="4" rx="2" fill="rgba(255,255,255,0.3)" />
          <rect x="20" y="140" width="40" height="4" rx="2" fill="rgba(255,255,255,0.3)" />

          {/* KPI cards row */}
          <rect x="110" y="10" width="180" height="90" rx="10" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
          <rect x="305" y="10" width="180" height="90" rx="10" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
          <rect x="500" y="10" width="180" height="90" rx="10" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
          <motion.rect
            x="695" y="10" width="180" height="90" rx="10"
            stroke="#e2a96e" strokeWidth="1" opacity="0.6"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* KPI card inner labels */}
          <rect x="125" y="30" width="50" height="4" rx="2" fill="rgba(255,255,255,0.2)" />
          <rect x="125" y="55" width="80" height="8" rx="3" fill="rgba(255,255,255,0.25)" />
          <rect x="320" y="30" width="50" height="4" rx="2" fill="rgba(255,255,255,0.2)" />
          <rect x="320" y="55" width="80" height="8" rx="3" fill="rgba(255,255,255,0.25)" />
          <rect x="515" y="30" width="50" height="4" rx="2" fill="rgba(255,255,255,0.2)" />
          <rect x="515" y="55" width="80" height="8" rx="3" fill="rgba(255,255,255,0.25)" />
          <rect x="710" y="30" width="50" height="4" rx="2" fill="rgba(226,169,110,0.2)" />
          <rect x="710" y="55" width="80" height="8" rx="3" fill="rgba(226,169,110,0.25)" />

          {/* Main chart area */}
          <rect x="110" y="120" width="560" height="280" rx="10" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />

          {/* Bar chart bars — staggered scaleY animation */}
          {[
            { x: 165, h: 140, color: "rgba(255,255,255,0.3)" },
            { x: 245, h: 190, color: "rgba(226,169,110,0.4)" },
            { x: 325, h: 120, color: "rgba(255,255,255,0.3)" },
            { x: 405, h: 220, color: "rgba(94,234,212,0.35)" },
            { x: 485, h: 160, color: "rgba(255,255,255,0.3)" },
            { x: 565, h: 200, color: "rgba(226,169,110,0.4)" },
          ].map((bar, i) => (
            <motion.rect
              key={i}
              x={bar.x}
              y={380 - bar.h}
              width="50"
              height={bar.h}
              rx="6"
              fill={bar.color}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.8 + i * 0.12 }}
              style={{ transformOrigin: `${bar.x + 25}px 380px` }}
            />
          ))}

          {/* Chart baseline */}
          <line x1="140" y1="385" x2="640" y2="385" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />

          {/* Side panel */}
          <rect x="695" y="120" width="180" height="130" rx="10" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
          <rect x="695" y="265" width="180" height="135" rx="10" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />

          {/* Side panel inner details */}
          <circle cx="730" cy="150" r="6" fill="rgba(94,234,212,0.3)" />
          <rect x="745" y="147" width="60" height="4" rx="2" fill="rgba(255,255,255,0.2)" />
          <circle cx="730" cy="172" r="6" fill="rgba(226,169,110,0.3)" />
          <rect x="745" y="169" width="45" height="4" rx="2" fill="rgba(255,255,255,0.2)" />
          <circle cx="730" cy="194" r="6" fill="rgba(255,255,255,0.2)" />
          <rect x="745" y="191" width="55" height="4" rx="2" fill="rgba(255,255,255,0.2)" />

          {/* Bottom cards */}
          <rect x="110" y="420" width="270" height="90" rx="10" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
          <rect x="400" y="420" width="270" height="90" rx="10" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
        </motion.svg>
      </div>

      {/* Content */}
      <motion.div
        className="relative z-10 flex flex-col items-center text-center px-6"
        animate={{ opacity: leaving ? 0 : 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Logo icon */}
        <motion.div
          className="mb-8 h-12 w-12 rounded-2xl bg-gradient-to-br from-[#e2a96e] to-[#c4956a] flex items-center justify-center text-[#0c0c0e] text-xl font-bold shadow-[0_0_40px_rgba(226,169,110,0.3)]"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          W
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="text-[36px] md:text-[44px] font-semibold tracking-tight text-[#fafaf9]"
          style={{ fontFamily: "var(--font-family-display)" }}
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
        >
          {greeting}
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          className="mt-3 text-[15px] text-[#a8a29e]"
          initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.5 }}
        >
          {subheadline}
        </motion.p>

        {/* Status line */}
        <motion.div
          className="mt-10 flex items-center gap-2.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#e2a96e] opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#e2a96e]" />
          </span>
          <span
            className="text-[11px] tracking-[0.08em] uppercase text-[#57534e]"
            style={{ fontFamily: "var(--font-family-display)" }}
          >
            Dein Dashboard wird vorbereitet ...
          </span>
        </motion.div>

        {/* Progress bar */}
        <motion.div
          className="mt-5 h-[2px] w-[220px] rounded-full bg-[rgba(255,255,255,0.04)] overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.3 }}
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#e2a96e] to-[#5eead4]"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 3.2, ease: [0.25, 0.1, 0.25, 1], delay: 0.4 }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-[#0c0c0e]" />}>
      <WelcomeContent />
    </Suspense>
  );
}

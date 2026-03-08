"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

/* ── Particle system ── */
interface Particle {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
  color: string;
}

const PARTICLE_COLORS = ["#e2a96e", "#5eead4", "#818cf8", "#a78bfa"];
const PARTICLE_COUNT = 16;
const LINE_DISTANCE = 400;

function createParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    dx: (Math.random() - 0.5) * 6,
    dy: (Math.random() - 0.5) * 6,
    size: 2 + Math.random() * 3,
    color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
  }));
}

function ParticleField() {
  const particles = useMemo(() => createParticles(), []);

  // Calculate lines between nearby particles (based on initial positions)
  const lines = useMemo(() => {
    const result: { x1: number; y1: number; x2: number; y2: number; opacity: number }[] = [];
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b = particles[j];
        // Use viewport-relative distance (percentage * 10 for rough px equivalent)
        const dist = Math.hypot((a.x - b.x) * 10, (a.y - b.y) * 10);
        if (dist < LINE_DISTANCE) {
          result.push({
            x1: a.x,
            y1: a.y,
            x2: b.x,
            y2: b.y,
            opacity: 1 - dist / LINE_DISTANCE,
          });
        }
      }
    }
    return result;
  }, [particles]);

  return (
    <div className="absolute inset-0">
      {/* Lines between nearby particles */}
      <svg className="absolute inset-0 w-full h-full">
        {lines.map((line, i) => (
          <motion.line
            key={i}
            x1={`${line.x1}%`}
            y1={`${line.y1}%`}
            x2={`${line.x2}%`}
            y2={`${line.y2}%`}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
            initial={{ opacity: 0 }}
            animate={{ opacity: line.opacity }}
            transition={{ duration: 0.6, delay: 0.2 + i * 0.03 }}
          />
        ))}
      </svg>

      {/* Particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            left: `${p.x}%`,
            top: `${p.y}%`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 0.6, 0.4, 0.6],
            scale: [0, 1, 0.8, 1],
            x: [0, p.dx * 8, p.dx * 16, p.dx * 24],
            y: [0, p.dy * 8, p.dy * 16, p.dy * 24],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: p.id * 0.1,
          }}
        />
      ))}
    </div>
  );
}

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

        {/* Particle network */}
        <ParticleField />
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

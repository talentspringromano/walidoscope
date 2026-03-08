"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

/* ── Canvas Particle Network ── */
const COLORS = ["#e2a96e", "#5eead4", "#818cf8", "#a78bfa"];
const PARTICLE_COUNT = 20;
const LINE_DIST = 180; // px distance for connections
const SPEED = 0.4;

interface Dot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const rafRef = useRef<number>(0);

  const init = useCallback((w: number, h: number) => {
    dotsRef.current = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * SPEED * 2,
      vy: (Math.random() - 0.5) * SPEED * 2,
      r: 1.5 + Math.random() * 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
      if (dotsRef.current.length === 0) init(window.innerWidth, window.innerHeight);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      const dots = dotsRef.current;

      // Update positions
      for (const d of dots) {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 0 || d.x > w) d.vx *= -1;
        if (d.y < 0 || d.y > h) d.vy *= -1;
        d.x = Math.max(0, Math.min(w, d.x));
        d.y = Math.max(0, Math.min(h, d.y));
      }

      // Draw lines with gradient colors
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const a = dots[i];
          const b = dots[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < LINE_DIST) {
            const alpha = (1 - dist / LINE_DIST) * 0.15;
            const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
            const [r1, g1, b1] = hexToRgb(a.color);
            const [r2, g2, b2] = hexToRgb(b.color);
            grad.addColorStop(0, `rgba(${r1},${g1},${b1},${alpha})`);
            grad.addColorStop(1, `rgba(${r2},${g2},${b2},${alpha})`);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      // Draw particles with glow
      for (const d of dots) {
        const [r, g, b] = hexToRgb(d.color);
        // Glow
        const glow = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 4);
        glow.addColorStop(0, `rgba(${r},${g},${b},0.15)`);
        glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r * 4, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
        // Core
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},0.45)`;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [init]);

  return (
    <motion.canvas
      ref={canvasRef}
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    />
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
    const fadeTimer = setTimeout(() => setLeaving(true), 3200);
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
        <ParticleCanvas />
      </div>

      {/* Content */}
      <motion.div
        className="relative z-10 flex flex-col items-center text-center px-6"
        animate={{ opacity: leaving ? 0 : 1 }}
        transition={{ duration: leaving ? 0.8 : 0.3, ease: "easeInOut" }}
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

export const TOOLTIP_STYLE = {
  contentStyle: {
    background: "rgba(12, 12, 14, 0.95)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    padding: "10px 14px",
  },
  itemStyle: { color: "#fafaf9", fontSize: 12 },
  labelStyle: { color: "#a8a29e", fontSize: 11, fontWeight: 500 },
};

export const AXIS_STYLE = {
  stroke: "#292524",
  fontSize: 11,
  fontFamily: "'Outfit', sans-serif",
  tick: { fill: "#57534e" },
};

export const PALETTE = {
  amber: "#e2a96e",
  amberDim: "#c4956a",
  teal: "#5eead4",
  tealDim: "rgba(94,234,212,0.15)",
  indigo: "#818cf8",
  violet: "#a78bfa",
  rose: "#fb7185",
  emerald: "#34d399",
  orange: "#fb923c",
  slate: "#64748b",
  gold: "#fbbf24",
};

export const FUNNEL_COLORS = ["#e2a96e", "#818cf8", "#5eead4", "#a78bfa"];
export const STATUS_COLORS: Record<string, string> = {
  "Neuer Lead": "#818cf8",
  "1x NE": "#fb923c",
  "Discovery Call": "#e2a96e",
  "Follow up": "#a78bfa",
  "Angebot zuschicken": "#5eead4",
  Verloren: "#fb7185",
};
export const SEGMENT_COLORS = ["#5eead4", "#818cf8", "#e2a96e", "#fb7185"];
export const LOSS_COLORS = ["#fb7185", "#fb923c", "#fbbf24", "#a78bfa", "#64748b"];
export const SELLER_BAR_COLORS = ["#818cf8", "#fb923c", "#5eead4", "#fb7185"];

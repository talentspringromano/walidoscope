"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Megaphone,
  HandshakeIcon,
  Users,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/marketing", label: "Marketing", icon: Megaphone },
  { href: "/sales", label: "Sales", icon: HandshakeIcon },
  { href: "/seller", label: "Seller", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const basePath = process.env.NODE_ENV === "production" ? "/walidoscope" : "";

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[232px] flex-col bg-[#0c0c0e] px-4 py-7 border-r border-[rgba(255,255,255,0.04)]">
      {/* Ambient glow */}
      <div className="absolute -top-20 -left-20 h-60 w-60 rounded-full bg-[rgba(226,169,110,0.06)] blur-[80px] pointer-events-none" />

      <Link href="/" className="relative mb-10 px-3 group">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#e2a96e] to-[#c4956a] flex items-center justify-center text-[#0c0c0e] text-sm font-bold shadow-[0_0_20px_rgba(226,169,110,0.3)]">
            W
          </div>
          <div>
            <span className="text-[15px] font-semibold tracking-tight text-[#fafaf9]">
              Walidoscope
            </span>
            <span className="block text-[10px] font-medium tracking-wider uppercase text-[#57534e]">
              Analytics
            </span>
          </div>
        </div>
      </Link>

      <div className="px-3 mb-3">
        <span className="text-[10px] font-medium tracking-[0.1em] uppercase text-[#44403c]">
          Dashboard
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const fullHref = basePath + href;
          const isActive =
            href === "/"
              ? pathname === fullHref || pathname === "/"
              : pathname.startsWith(fullHref);

          return (
            <Link
              key={href}
              href={href}
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                isActive
                  ? "bg-[rgba(226,169,110,0.08)] text-[#e2a96e]"
                  : "text-[#78716c] hover:bg-[rgba(255,255,255,0.03)] hover:text-[#a8a29e]"
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[2px]">
                  <div className="active-dot" />
                </div>
              )}
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-3 pt-4 border-t border-[rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#292524] to-[#1c1917] flex items-center justify-center text-[10px] font-bold text-[#78716c]">
            TS
          </div>
          <div>
            <div className="text-[11px] font-medium text-[#a8a29e]">Talentspring</div>
            <div className="text-[10px] text-[#44403c]">PoC v1.0</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

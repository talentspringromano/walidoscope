"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Megaphone,
  HandshakeIcon,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/marketing", label: "Marketing", icon: Megaphone },
  { href: "/sales", label: "Sales", icon: HandshakeIcon },
  { href: "/seller", label: "Seller", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  }

  return (
    <>
      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen flex-col bg-[#0c0c0e] py-7 border-r border-[rgba(255,255,255,0.04)] transition-all duration-300 ${
          collapsed ? "w-[68px] px-2" : "w-[232px] px-4"
        }`}
      >
        {/* Ambient glow */}
        <div className="absolute -top-20 -left-20 h-60 w-60 rounded-full bg-[rgba(226,169,110,0.06)] blur-[80px] pointer-events-none" />

        {/* Header */}
        <div className={`relative mb-10 flex items-center ${collapsed ? "justify-center" : "px-3 justify-between"}`}>
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#e2a96e] to-[#c4956a] flex items-center justify-center text-[#0c0c0e] text-sm font-bold shadow-[0_0_20px_rgba(226,169,110,0.3)] shrink-0">
              W
            </div>
            {!collapsed && (
              <div>
                <span className="text-[15px] font-semibold tracking-tight text-[#fafaf9]">
                  Walidoscope
                </span>
                <span className="block text-[10px] font-medium tracking-wider uppercase text-[#57534e]">
                  Analytics
                </span>
              </div>
            )}
          </Link>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="text-[#44403c] hover:text-[#a8a29e] transition-colors"
              title="Sidebar einklappen"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {!collapsed && (
          <div className="px-3 mb-3">
            <span className="text-[10px] font-medium tracking-[0.1em] uppercase text-[#44403c]">
              Dashboard
            </span>
          </div>
        )}

        <nav className={`flex flex-1 flex-col gap-0.5 ${collapsed ? "px-0 items-center" : "px-1"}`}>
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/"
                ? pathname === href
                : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={`relative flex items-center rounded-xl text-[13px] font-medium transition-all duration-200 ${
                  collapsed
                    ? "justify-center w-10 h-10 p-0"
                    : "gap-3 px-3 py-2.5"
                } ${
                  isActive
                    ? "bg-[rgba(226,169,110,0.08)] text-[#e2a96e]"
                    : "text-[#78716c] hover:bg-[rgba(255,255,255,0.03)] hover:text-[#a8a29e]"
                }`}
              >
                {isActive && !collapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[2px]">
                    <div className="active-dot" />
                  </div>
                )}
                <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
                {!collapsed && label}
              </Link>
            );
          })}
        </nav>

        {/* Expand button (collapsed) */}
        {collapsed && (
          <div className="flex justify-center mb-4">
            <button
              onClick={() => setCollapsed(false)}
              className="text-[#44403c] hover:text-[#a8a29e] transition-colors"
              title="Sidebar ausklappen"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Footer */}
        <div className={`mt-auto pt-4 border-t border-[rgba(255,255,255,0.04)] ${collapsed ? "flex flex-col items-center gap-3" : "px-3 space-y-3"}`}>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#292524] to-[#1c1917] flex items-center justify-center text-[10px] font-bold text-[#78716c] shrink-0">
              TS
            </div>
            {!collapsed && (
              <div>
                <div className="text-[11px] font-medium text-[#a8a29e]">Talentspring</div>
                <div className="text-[10px] text-[#44403c]">PoC v1.0</div>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            title="Abmelden"
            className={`flex items-center text-[13px] font-medium text-[#78716c] hover:text-red-400 transition-colors ${
              collapsed ? "justify-center w-10 h-10" : "gap-3 px-3 py-2 rounded-xl hover:bg-[rgba(255,255,255,0.03)]"
            }`}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
            {!collapsed && "Abmelden"}
          </button>
        </div>
      </aside>

      {/* Spacer for main content */}
      <div className={`transition-all duration-300 ${collapsed ? "w-[68px]" : "w-[232px]"}`} />
    </>
  );
}

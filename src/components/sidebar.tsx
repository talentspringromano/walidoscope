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
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-56 flex-col border-r border-zinc-800/60 bg-zinc-950 px-3 py-6">
      <Link href="/" className="mb-8 px-3">
        <span className="text-lg font-semibold tracking-tight text-white">
          Walidoscope
        </span>
        <span className="mt-0.5 block text-[11px] text-zinc-500">
          Talentspring Analytics
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
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
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-zinc-800/80 text-white font-medium"
                  : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-3 text-[11px] text-zinc-600">
        PoC v1.0 &middot; Statische Daten
      </div>
    </aside>
  );
}

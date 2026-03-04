import type { Metadata } from "next";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Walidoscope – Talentspring Analytics",
  description: "Internes Analytics-Dashboard für Talentspring",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="flex text-[#fafaf9] antialiased">
        <Sidebar />
        <main className="flex-1 min-h-screen px-10 py-8">
          <div className="page-enter">{children}</div>
        </main>
      </body>
    </html>
  );
}

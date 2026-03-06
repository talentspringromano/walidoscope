import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Walidoscope – Talentspring Analytik",
  description: "Internes Analytik-Dashboard für Talentspring",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="flex text-[#fafaf9] antialiased">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
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
      <body className="flex text-[#fafaf9] antialiased">{children}</body>
    </html>
  );
}

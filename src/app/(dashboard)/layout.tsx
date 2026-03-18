import { Suspense } from "react";
import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>
      <main className="flex-1 min-h-screen px-10 py-8">
        <div className="page-enter">{children}</div>
      </main>
    </>
  );
}

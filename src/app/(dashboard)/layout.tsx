import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Sidebar />
      <main className="flex-1 min-h-screen px-10 py-8">
        <div className="page-enter">{children}</div>
      </main>
    </>
  );
}

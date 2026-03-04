export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-bold tracking-tight">
          Walidoscope
        </h1>
        <p className="text-xl text-zinc-400 max-w-md">
          Talentspring Analytics Dashboard
        </p>
        <div className="flex gap-3 justify-center text-sm text-zinc-500">
          <span className="px-3 py-1 rounded-full border border-zinc-800">
            Marketing
          </span>
          <span className="px-3 py-1 rounded-full border border-zinc-800">
            Sales
          </span>
          <span className="px-3 py-1 rounded-full border border-zinc-800">
            Seller
          </span>
        </div>
        <p className="text-sm text-zinc-600 pt-4">
          Coming soon – Proof of Concept mit statischen Daten
        </p>
      </div>
    </main>
  );
}

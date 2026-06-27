export default function Loading() {
  return (
    <main className="daily-ping-surface min-h-screen p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="h-10 w-72 animate-pulse rounded-md bg-muted" />
        <div className="grid gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-lg border border-border bg-card" />
          ))}
        </div>
        <div className="h-[520px] animate-pulse rounded-lg border border-border bg-card" />
      </div>
    </main>
  );
}

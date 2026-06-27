"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="daily-ping-surface min-h-screen p-6">
      <section className="mx-auto max-w-3xl rounded-lg border border-destructive/30 bg-card p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-destructive">Dashboard error</p>
        <h1 className="mt-3 text-2xl font-semibold">Daily Ping could not load this view.</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          onClick={reset}
          type="button"
        >
          Retry
        </button>
      </section>
    </main>
  );
}

import type { ReactNode } from "react";
import Link from "next/link";

export function LegalPage({
  title,
  updated,
  summary,
  children,
}: {
  title: string;
  updated: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <main className="daily-ping-surface min-h-screen p-4 sm:p-6">
      <article className="mx-auto max-w-3xl rounded-lg border border-border bg-card p-6 sm:p-8">
        <Link className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground" href="/">
          Daily Ping home
        </Link>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Pilot legal notice</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{summary}</p>
        <p className="mt-2 text-xs text-muted-foreground">Last updated: {updated}</p>
        <div className="mt-8 space-y-8 text-sm leading-7 text-foreground/90">{children}</div>
        <footer className="mt-10 border-t border-border pt-5 text-xs text-muted-foreground">
          Daily Ping is a wellness and entertainment pilot. Nothing here is financial, medical, legal, deterministic, political, or fear-based advice.
        </footer>
      </article>
    </main>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-foreground">{heading}</h2>
      <div className="mt-2 space-y-3 text-sm leading-7 text-muted-foreground">{children}</div>
    </section>
  );
}

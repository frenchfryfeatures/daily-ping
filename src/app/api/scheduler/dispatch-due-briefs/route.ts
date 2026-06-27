import { NextResponse } from "next/server";
import { isDatabaseUnavailableError } from "@/lib/db/errors";
import { envValue } from "@/lib/env";
import { dispatchDueBriefs } from "@/lib/server/operations";

export const runtime = "nodejs";

function authorized(request: Request) {
  const expected = envValue("SCHEDULER_SECRET");
  if (!expected) return process.env.NODE_ENV !== "production";
  return request.headers.get("x-scheduler-secret") === expected;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized scheduler request." }, { status: 401 });
  }

  const url = new URL(request.url);
  const nowParam = url.searchParams.get("now");
  const now = nowParam ? new Date(nowParam) : new Date();
  try {
    const result = await dispatchDueBriefs(now);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dispatch failed.";
    if (isDatabaseUnavailableError(message)) {
      return NextResponse.json({
        ok: true,
        demo: true,
        checked: 36,
        results: [{ status: "demo_dispatch", detail: "Attach DATABASE_URL for persistent dispatch." }],
      });
    }
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

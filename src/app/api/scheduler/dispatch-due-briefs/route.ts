import { NextResponse } from "next/server";
import { isDatabaseUnavailableError } from "@/lib/db/errors";
import { envValue } from "@/lib/env";
import { dispatchDueBriefs } from "@/lib/server/operations";

export const runtime = "nodejs";

function authorized(request: Request) {
  const schedulerSecret = envValue("SCHEDULER_SECRET");
  const cronSecret = envValue("CRON_SECRET");
  const authHeader = request.headers.get("authorization");

  if (schedulerSecret && request.headers.get("x-scheduler-secret") === schedulerSecret) return true;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  // No secret configured: allow only outside production for local dev.
  if (!schedulerSecret && !cronSecret) return process.env.NODE_ENV !== "production";
  return false;
}

async function runDispatch(request: Request) {
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

// Vercel Cron sends GET with `Authorization: Bearer ${CRON_SECRET}`.
export async function GET(request: Request) {
  return runDispatch(request);
}

// External cron sources send POST with `x-scheduler-secret: ${SCHEDULER_SECRET}`.
export async function POST(request: Request) {
  return runDispatch(request);
}

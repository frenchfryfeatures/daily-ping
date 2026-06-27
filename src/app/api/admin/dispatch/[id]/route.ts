import { NextResponse } from "next/server";
import { isDatabaseUnavailableError } from "@/lib/db/errors";
import { getDeliveryJobDetail } from "@/lib/server/operations";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    const detail = await getDeliveryJobDetail(params.id);
    return NextResponse.json({ ok: true, ...detail });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Job detail failed.";
    if (isDatabaseUnavailableError(message)) {
      return NextResponse.json({ ok: true, demo: true, next: "Demo mode: attach DATABASE_URL for job detail." });
    }
    return NextResponse.json({ ok: false, error: message }, { status: 404 });
  }
}

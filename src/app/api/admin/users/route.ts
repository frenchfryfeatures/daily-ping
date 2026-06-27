import { NextResponse } from "next/server";
import { isDatabaseUnavailableError } from "@/lib/db/errors";
import { listUsersForAdmin } from "@/lib/server/operations";

export const runtime = "nodejs";

export async function GET() {
  try {
    const users = await listUsersForAdmin();
    return NextResponse.json({ ok: true, users });
  } catch (error) {
    const message = error instanceof Error ? error.message : "User list failed.";
    if (isDatabaseUnavailableError(message)) {
      return NextResponse.json({ ok: true, demo: true, users: [], next: "Demo mode: attach DATABASE_URL to list users." });
    }
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

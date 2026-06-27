import { NextResponse } from "next/server";
import { isDatabaseUnavailableError } from "@/lib/db/errors";
import { onboardUser } from "@/lib/server/operations";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await onboardUser(body);
    return NextResponse.json({
      ok: true,
      userId: user.id,
      streakStartsOn: user.streakStartsOn,
      next: "Daily streak begins from the next local-calendar day.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onboarding failed.";
    if (isDatabaseUnavailableError(message)) {
      return NextResponse.json({
        ok: true,
        demo: true,
        userId: "demo-onboarding",
        streakStartsOn: new Date(Date.now() + 86_400_000).toISOString(),
        next: "Demo mode: attach DATABASE_URL for persistent onboarding.",
      });
    }
    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 400 },
    );
  }
}

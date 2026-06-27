import { NextRequest, NextResponse } from "next/server";

function unauthorized(message = "Authentication required.") {
  return new NextResponse(message, {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Daily Dose Operations", charset="UTF-8"' },
  });
}

export function proxy(request: NextRequest) {
  const authEnabled = process.env.DASHBOARD_AUTH_ENABLED?.trim().toLowerCase() !== "false";
  if (!authEnabled) return NextResponse.next();

  const expectedUser = process.env.ADMIN_BASIC_USER;
  const expectedPassword = process.env.ADMIN_BASIC_PASSWORD;
  if (!expectedUser || !expectedPassword) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    return new NextResponse("Admin authentication is not configured.", { status: 503 });
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Basic ")) return unauthorized();

  try {
    const [user, password] = atob(authorization.slice(6)).split(":");
    if (user === expectedUser && password === expectedPassword) return NextResponse.next();
  } catch {
    return unauthorized("Invalid authentication header.");
  }

  return unauthorized("Invalid operator credentials.");
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/api/admin/:path*",
    "/api/onboarding/:path*",
    "/api/voice/:path*",
  ],
};

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

// Routes always public — no auth needed
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/welcome(.*)",
  "/pricing(.*)",
  "/api/webhooks/(.*)",
  "/api/stripe/checkout(.*)",
]);

// Routes ONLY accessible from the Electron app (x-pulse-client: electron header)
// If this header is absent, redirect to /dashboard — browser can't reach /app
const isElectronOnlyRoute = createRouteMatcher(["/app(.*)"]);

function mockMiddleware(_req: NextRequest) {
  return NextResponse.next();
}

const liveMiddleware = clerkMiddleware(async (auth, req) => {
  // ── Block browser access to /app routes ───────────────────────────────────
  if (isElectronOnlyRoute(req)) {
    const clientHeader = req.headers.get("x-pulse-client");
    if (clientHeader !== "electron") {
      // Not from Electron — redirect to account hub
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    // Electron request — allow through without Clerk auth
    // (Electron app manages its own session via config.json)
    return NextResponse.next();
  }

  // ── Protect all other non-public routes with Clerk ────────────────────────
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export default MOCK_MODE ? mockMiddleware : liveMiddleware;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

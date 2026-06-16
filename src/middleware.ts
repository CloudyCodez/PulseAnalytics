import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

// Routes that are always public (no auth required)
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/welcome(.*)",
  "/pricing(.*)",
  "/api/webhooks/(.*)",        // Stripe + Inngest webhooks — must be public
  "/api/stripe/checkout(.*)",  // Checkout session creation — called from landing page
]);

// In mock mode, skip Clerk entirely — all routes open
function mockMiddleware(_req: NextRequest) {
  return NextResponse.next();
}

// In live mode, protect /dashboard and all API routes except the public ones above
const liveMiddleware = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export default MOCK_MODE ? mockMiddleware : liveMiddleware;

export const config = {
  matcher: [
    // Match everything except Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

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
  "/api/webhooks/(.*)",
  "/api/stripe/checkout(.*)",
]);

// In mock mode, skip Clerk entirely — all routes open
function mockMiddleware(_req: NextRequest) {
  return NextResponse.next();
}

// In live mode, protect /dashboard and all API routes except the public ones above
const liveMiddleware = clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    auth().protect();
  }
});

export default MOCK_MODE ? mockMiddleware : liveMiddleware;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

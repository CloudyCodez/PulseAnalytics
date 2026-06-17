import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/welcome(.*)",
  "/pricing(.*)",
  "/api/webhooks/(.*)",
  "/api/stripe/checkout(.*)",
]);

const isElectronOnlyRoute = createRouteMatcher(["/app(.*)"]);

function mockMiddleware(_req: NextRequest) {
  return NextResponse.next();
}

const liveMiddleware = clerkMiddleware((auth, req) => {
  // Block browser access to /app — only Electron can reach it
  if (isElectronOnlyRoute(req)) {
    const clientHeader = req.headers.get("x-pulse-client");
    if (clientHeader !== "electron") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Protect non-public routes
  if (!isPublicRoute(req)) {
    auth().protect();
  }

  return NextResponse.next();
});

export default MOCK_MODE ? mockMiddleware : liveMiddleware;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

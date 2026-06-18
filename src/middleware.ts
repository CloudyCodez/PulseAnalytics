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
  // Called from the Electron app's license screen before any Clerk session
  // exists -- the user is just typing the email they purchased with, so this
  // must be reachable without an auth handshake. The route itself does its
  // own Supabase lookup and is not a general-purpose endpoint.
  "/api/desktop/verify(.*)",
  // Electron app API routes — no Clerk session exists in the desktop app
  "/api/pulse-ai/(.*)",
  "/api/integrations/(.*)",
  "/api/reports/(.*)",
  // /app is Electron-only and is never gated by a Clerk session -- the
  // desktop app's setup wizard has no Clerk sign-in step at all, and the
  // x-pulse-client header check below is the real access boundary for it.
  // Routing it through Clerk's auth handshake anyway, with no real Clerk
  // session ever present in Electron's BrowserWindow, is what was causing
  // the /app redirect loop (hundreds of identical requests/sec, eventual
  // 500). Treating it as public here skips Clerk's handshake for this
  // route entirely while isElectronOnlyRoute below still blocks any
  // non-Electron client from reaching it.
  "/app(.*)",
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
    auth().protect({ unauthenticatedUrl: new URL("/sign-in", req.url).toString() });
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

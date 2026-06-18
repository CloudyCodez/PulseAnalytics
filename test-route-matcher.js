// One-off diagnostic: confirms whether Clerk's createRouteMatcher actually
// matches "/app" against the pattern "/app(.*)" using the exact same
// installed package version as the running app. Run with:
//   node test-route-matcher.js
const { createRouteMatcher } = require("./node_modules/@clerk/nextjs/dist/cjs/server/routeMatcher.js");

const isElectronOnlyRoute = createRouteMatcher(["/app(.*)"]);

// Minimal fake NextRequest-like object — createRouteMatcher only reads
// req.nextUrl.pathname, so this is sufficient to exercise the real matcher.
function fakeReq(pathname) {
  return { nextUrl: { pathname } };
}

const cases = ["/app", "/app/", "/app/settings", "/dashboard", "/"];
for (const p of cases) {
  console.log(p, "=>", isElectronOnlyRoute(fakeReq(p)));
}

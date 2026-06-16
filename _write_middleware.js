var fs = require('fs');
var middleware = [
  'import { NextResponse } from "next/server";',
  'import type { NextRequest } from "next/server";',
  '',
  '// Mock mode: no Clerk, no auth checks, all routes open',
  'export function middleware(req: NextRequest) {',
  '  return NextResponse.next();',
  '}',
  '',
  'export const config = {',
  '  matcher: [',
  '    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",',
  '    "/(api|trpc)(.*)",',
  '  ],',
  '};',
].join('\n');
fs.writeFileSync('src/middleware.ts', middleware);
console.log('done');

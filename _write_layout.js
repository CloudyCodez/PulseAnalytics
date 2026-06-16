var fs = require('fs');
var path = require('path');
var dashDir = path.join(process.cwd(), 'src', 'app', 'dashboard');
fs.mkdirSync(dashDir, { recursive: true });

var layout = [
  '"use client";',
  'import Link from "next/link";',
  'import { usePathname } from "next/navigation";',
  '',
  'const navItems = [',
  '  { href: "/dashboard", label: "Overview" },',
  '  { href: "/dashboard/reports", label: "Reports" },',
  '  { href: "/dashboard/integrations", label: "Integrations" },',
  '  { href: "/dashboard/alerts", label: "Alerts" },',
  '  { href: "/dashboard/settings", label: "Settings" },',
  '];',
  '',
  'export default function DashboardLayout({ children }: { children: React.ReactNode }) {',
  '  const pathname = usePathname();',
  '  return (',
  '    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0f1e" }}>',
  '      <aside style={{ width: 220, flexShrink: 0, background: "#0d1526", borderRight: "1px solid #1e293b", display: "flex", flexDirection: "column", padding: "24px 0", position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 50 }}>',
  '        <div style={{ padding: "0 20px 24px", borderBottom: "1px solid #1e293b" }}>',
  '          <Link href="/"><span style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>Pulse<span style={{ color: "#00e5cc" }}>.</span></span></Link>',
  '        </div>',
  '        <nav style={{ flex: 1, padding: "16px 12px" }}>',
  '          {navItems.map(function(item) {',
  '            var active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));',
  '            return (',
  '              <Link key={item.href} href={item.href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, fontSize: 14, fontWeight: 500, marginBottom: 2, background: active ? "rgba(0,229,204,0.08)" : "transparent", color: active ? "#00e5cc" : "#64748b", border: active ? "1px solid rgba(0,229,204,0.15)" : "1px solid transparent", textDecoration: "none" }}>',
  '                {item.label}',
  '              </Link>',
  '            );',
  '          })}',
  '        </nav>',
  '        <div style={{ padding: "16px 20px", borderTop: "1px solid #1e293b", display: "flex", alignItems: "center", gap: 10 }}>',
  '          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#00e5cc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#0a0f1e" }}>C</div>',
  '          <div>',
  '            <div style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>Connor (Demo)</div>',
  '            <div style={{ fontSize: 11, color: "#64748b" }}>Mock mode active</div>',
  '          </div>',
  '        </div>',
  '      </aside>',
  '      <main style={{ flex: 1, marginLeft: 220, minHeight: "100vh", color: "#fff" }}>{children}</main>',
  '    </div>',
  '  );',
  '}',
].join('\n');

fs.writeFileSync(path.join(dashDir, 'layout.tsx'), layout);
console.log('done');

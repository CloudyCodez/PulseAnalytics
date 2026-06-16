"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: "⚡" },
  { href: "/dashboard/reports", label: "Reports", icon: "📄" },
  { href: "/dashboard/integrations", label: "Integrations", icon: "🔗" },
  { href: "/dashboard/alerts", label: "Alerts", icon: "🔔" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 240,
        flexShrink: 0,
        background: "var(--navy-2)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "24px 0",
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "0 20px 24px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Link href="/">
          <span
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 20,
              fontWeight: 700,
              color: "var(--white)",
            }}
          >
            Pulse<span style={{ color: "var(--cyan)" }}>.</span>
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "16px 12px" }}>
        {navItems.map(({ href, label, icon }) => {
          const active =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                marginBottom: 2,
                transition: "background .15s",
                background: active ? "rgba(0,229,204,0.08)" : "transparent",
                color: active ? "var(--cyan)" : "var(--muted)",
                border: active
                  ? "1px solid rgba(0,229,204,0.15)"
                  : "1px solid transparent",
              }}
            >
              <span style={{ fontSize: 16 }}>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <UserButton afterSignOutUrl="/" />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--white)" }}>
            Account
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>
            Manage profile
          </div>
        </div>
      </div>
    </aside>
  );
}

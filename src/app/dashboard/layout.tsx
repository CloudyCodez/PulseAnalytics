"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";

const navItems = [
  {
    href: "/dashboard",
    label: "Download",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M7.5 1v8M4.5 6l3 3 3-3M1.5 11.5v1a1 1 0 001 1h10a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/settings",
    label: "Account",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <circle cx="7.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M2 13c0-3.038 2.462-5.5 5.5-5.5S13 9.962 13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  const plan      = (user?.publicMetadata?.plan as string) ?? "starter";
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  const initials  = user?.firstName
    ? (user.firstName[0] + (user.lastName?.[0] ?? "")).toUpperCase()
    : (user?.emailAddresses?.[0]?.emailAddress?.[0] ?? "U").toUpperCase();
  const displayName = user?.fullName ?? user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ?? "User";
  const email       = user?.emailAddresses?.[0]?.emailAddress ?? "";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0f1e" }}>

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside style={{
        width: 216, flexShrink: 0,
        background: "#0d1526",
        borderRight: "1px solid #1e293b",
        display: "flex", flexDirection: "column",
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{ padding: "22px 20px 20px", borderBottom: "1px solid #1e293b" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px", marginBottom: 10 }}>
            Pulse<span style={{ color: "#00e5cc" }}>.</span>
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(0,229,204,0.08)",
            border: "1px solid rgba(0,229,204,0.15)",
            borderRadius: 100, padding: "4px 10px",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00e5cc", display: "block", flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#00e5cc", letterSpacing: "0.3px" }}>
              {isLoaded ? planLabel : "…"} plan
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "14px 10px" }}>
          {navItems.map(({ href, label, icon }) => {
            const active = href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
            return (
              <Link key={href} href={href} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 8, marginBottom: 2,
                fontSize: 13, fontWeight: 500,
                color: active ? "#00e5cc" : "#64748b",
                background: active ? "rgba(0,229,204,0.08)" : "transparent",
                border: `1px solid ${active ? "rgba(0,229,204,0.15)" : "transparent"}`,
                textDecoration: "none",
              }}>
                {icon}
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div style={{ padding: "12px 10px", borderTop: "1px solid #1e293b" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 4 }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg, #00e5cc, #0099ff)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, color: "#0a0f1e",
            }}>
              {isLoaded ? initials : "…"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {isLoaded ? displayName : "Loading…"}
              </div>
              <div style={{ fontSize: 11, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {isLoaded ? email : ""}
              </div>
            </div>
          </div>
          <button
            onClick={() => signOut({ redirectUrl: "/" })}
            style={{
              width: "100%", padding: "8px 12px", borderRadius: 7,
              background: "transparent", border: "1px solid #1e293b",
              fontSize: 12, fontWeight: 500, color: "#475569",
              cursor: "pointer", textAlign: "left",
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────── */}
      <main style={{ flex: 1, marginLeft: 216, minHeight: "100vh", color: "#fff" }}>
        {children}
      </main>
    </div>
  );
}

"use client";

import { SignIn } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { useEffect, useState, Suspense } from "react";

// ─── Token sign-in (magic link from welcome email) ────────────────────────────
function TokenSignIn({ token }: { token: string }) {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    if (!isLoaded) return;
    (async () => {
      try {
        const result = await signIn!.create({ strategy: "ticket", ticket: token });
        if (result.status === "complete") {
          await setActive!({ session: result.createdSessionId });
          router.push("/dashboard");
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
    })();
  }, [isLoaded, token, signIn, setActive, router]);

  if (status === "error") {
    return (
      <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0" }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>⚠️</div>
        <p style={{ marginBottom: 16, lineHeight: 1.6 }}>
          This sign-in link has expired or already been used.
        </p>
        <a href="/sign-in" style={{ color: "#00e5cc" }}>Sign in manually →</a>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0" }}>
      <div style={{ fontSize: 14, marginBottom: 8 }}>Signing you in…</div>
      <div style={{
        width: 24, height: 24, margin: "0 auto",
        border: "2px solid #1e293b", borderTop: "2px solid #00e5cc",
        borderRadius: "50%", animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Inner content (needs search params) ─────────────────────────────────────
function SignInContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0a0f1e",
    }}>
      <div style={{ width: "100%", maxWidth: 420, padding: "0 24px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px" }}>
            Pulse<span style={{ color: "#00e5cc" }}>.</span>
          </span>
          <p style={{ color: "#64748b", fontSize: 14, marginTop: 8 }}>
            {token ? "Completing your sign in…" : "Sign in to your account"}
          </p>
        </div>

        {token ? (
          <TokenSignIn token={token} />
        ) : (
          <SignIn
            routing="path"
            path="/sign-in"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-[#0d1526] border border-[rgba(255,255,255,0.06)] rounded-2xl shadow-none",
                headerTitle: "text-white",
                headerSubtitle: "text-[#64748b]",
                socialButtonsBlockButton:
                  "bg-[#121c2e] border border-[rgba(255,255,255,0.08)] text-white hover:bg-[#1a2540]",
                formFieldInput:
                  "bg-[#121c2e] border border-[rgba(255,255,255,0.08)] text-white placeholder:text-[#475569]",
                formButtonPrimary:
                  "bg-[#00e5cc] text-[#0a0f1e] hover:opacity-90 font-bold",
                footerActionLink: "text-[#00e5cc] hover:text-[#00b8a4]",
              },
            }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────
export default function SignInCatchAll() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}

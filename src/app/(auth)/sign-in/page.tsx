"use client";

import { SignIn, useSignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

function TokenSignIn({ token }: { token: string }) {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    if (!isLoaded) return;
    async function consumeToken() {
      try {
        const result = await signIn!.create({
          strategy: "ticket",
          ticket: token,
        });
        if (result.status === "complete") {
          await setActive!({ session: result.createdSessionId });
          router.push("/dashboard");
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
    }
    consumeToken();
  }, [isLoaded, token, signIn, setActive, router]);

  if (status === "error") {
    return (
      <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0" }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>⚠️</div>
        <p style={{ marginBottom: 16 }}>This access link has expired or already been used.</p>
        <a href="/sign-in" style={{ color: "#00e5cc" }}>Sign in manually →</a>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0" }}>
      <div style={{ fontSize: 32, marginBottom: 16, animation: "spin 1s linear infinite" }}>⟳</div>
      <p>Signing you in...</p>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function SignInPage() {
  if (MOCK_MODE) redirect("/dashboard");

  return <SignInContent />;
}

function SignInContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--navy)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420, padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span
            style={{
              fontFamily: "'Space Grotesk',sans-serif",
              fontSize: 24,
              fontWeight: 700,
              color: "var(--white)",
            }}
          >
            Pulse<span style={{ color: "var(--cyan)" }}>.</span>
          </span>
          <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 8 }}>
            {token ? "Completing your sign in..." : "Sign in to your account"}
          </p>
        </div>

        {token ? (
          <TokenSignIn token={token} />
        ) : (
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-[#111827] border border-white/[0.08] rounded-2xl shadow-none",
                headerTitle: "text-[#F0F4FF] font-[Space_Grotesk]",
                headerSubtitle: "text-[#8892A4]",
                socialButtonsBlockButton:
                  "bg-[#1A2235] border border-white/[0.08] text-[#F0F4FF] hover:bg-[#1A2235]/80",
                formFieldInput:
                  "bg-[#1A2235] border border-white/[0.08] text-[#F0F4FF] placeholder:text-[#8892A4]",
                formButtonPrimary:
                  "bg-[#00E5CC] text-[#0A0F1E] hover:opacity-90 font-bold",
                footerActionLink: "text-[#00E5CC] hover:text-[#00B8A4]",
              },
            }}
          />
        )}
      </div>
    </div>
  );
}

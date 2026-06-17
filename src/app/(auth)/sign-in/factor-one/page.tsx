"use client";
import { SignIn } from "@clerk/nextjs";

export default function FactorOne() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      alignItems: "center", justifyContent: "center",
      background: "#0a0f1e",
    }}>
      <div style={{ width: "100%", maxWidth: 420, padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px" }}>
            Pulse<span style={{ color: "#00e5cc" }}>.</span>
          </span>
        </div>
        <SignIn
          routing="path"
          path="/sign-in"
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-[#0d1526] border border-[rgba(255,255,255,0.06)] rounded-2xl shadow-none",
              headerTitle: "text-white",
              headerSubtitle: "text-[#64748b]",
              formFieldInput: "bg-[#121c2e] border border-[rgba(255,255,255,0.08)] text-white",
              formButtonPrimary: "bg-[#00e5cc] text-[#0a0f1e] font-bold",
              footerActionLink: "text-[#00e5cc]",
            },
          }}
        />
      </div>
    </div>
  );
}

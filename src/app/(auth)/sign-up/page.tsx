import { SignUp } from "@clerk/nextjs";
import { redirect } from "next/navigation";

const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

export default function SignUpPage() {
  if (MOCK_MODE) redirect("/dashboard");

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
            Start your 14-day free trial — no credit card required
          </p>
        </div>
        <SignUp
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
      </div>
    </div>
  );
}

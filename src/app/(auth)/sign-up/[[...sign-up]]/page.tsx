import { SignUp } from "@clerk/nextjs";

export default function SignUpCatchAll() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0a0f1e",
    }}>
      <div style={{ width: "100%", maxWidth: 420, padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px" }}>
            Pulse<span style={{ color: "#00e5cc" }}>.</span>
          </span>
          <p style={{ color: "#64748b", fontSize: 14, marginTop: 8 }}>
            Start your 14-day free trial
          </p>
        </div>
        <SignUp
          routing="path"
          path="/sign-up"
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
      </div>
    </div>
  );
}

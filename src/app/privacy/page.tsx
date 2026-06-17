export const metadata = { title: "Privacy Policy – Pulse Analytics" };

export default function PrivacyPage() {
  return (
    <div style={{
      background: "#0a0f1e", minHeight: "100vh", color: "#fff",
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "80px 32px" }}>

        <div style={{ marginBottom: 48 }}>
          <a href="/" style={{ fontSize: 13, color: "#00e5cc", textDecoration: "none" }}>← Back to Pulse</a>
          <h1 style={{ fontSize: 36, fontWeight: 700, marginTop: 24, marginBottom: 8, letterSpacing: "-0.5px" }}>
            Privacy Policy
          </h1>
          <p style={{ color: "#64748b", fontSize: 14 }}>Last updated: June 2026</p>
        </div>

        {[
          {
            title: "Overview",
            body: `Pulse Analytics ("Pulse", "we", "us") is a desktop analytics application that runs locally on your machine. This policy explains what data we collect, how we use it, and your rights. We take privacy seriously — your marketing data never leaves your computer.`,
          },
          {
            title: "Data That Stays On Your Machine",
            body: `Pulse connects to your marketing platforms (Google Ads, Google Analytics 4, Meta Ads, Shopify, Klaviyo) using OAuth tokens you authorize during setup. All raw data fetched from these platforms is processed and stored locally on your machine. We do not transmit, store, or have access to your marketing data, ad performance figures, revenue numbers, or customer data.`,
          },
          {
            title: "Account Data We Collect",
            body: `When you create a Pulse account (via our website at pulseanalytics.space), we collect your email address and billing information. Email is used to send you your account credentials and product updates. Billing is handled entirely by Stripe — we do not store payment card details.`,
          },
          {
            title: "OAuth Tokens",
            body: `To connect your platforms, Pulse requests read-only OAuth access tokens from Google and Meta. These tokens are stored encrypted on your local machine and are used solely to fetch your analytics and advertising data. You can revoke access at any time from your Google Account settings or Meta Business settings.`,
          },
          {
            title: "AI Processing",
            body: `Pulse's AI features (report generation and Pulse AI chat) run entirely on your local machine using a locally installed AI model. Your data is never sent to any external AI service or third party for processing.`,
          },
          {
            title: "Cookies & Tracking",
            body: `Our website (pulseanalytics.space) does not use tracking cookies or third-party analytics. The Pulse desktop application does not track usage or send telemetry.`,
          },
          {
            title: "Data Sharing",
            body: `We do not sell, rent, or share your personal data with third parties. The only third-party services that receive any data are Stripe (payment processing) and Resend (transactional email delivery for account setup).`,
          },
          {
            title: "Data Retention",
            body: `Your account email is retained for as long as your account is active. If you cancel your account and request deletion, we will remove your email and account data within 30 days. Your locally stored marketing data can be deleted at any time by uninstalling Pulse.`,
          },
          {
            title: "Your Rights",
            body: `You have the right to access, correct, or delete any personal data we hold about you. To make a request, email us at privacy@pulseanalytics.space. We will respond within 30 days.`,
          },
          {
            title: "Contact",
            body: `For any privacy-related questions, contact us at privacy@pulseanalytics.space.`,
          },
        ].map(({ title, body }) => (
          <div key={title} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fff", marginBottom: 10 }}>{title}</h2>
            <p style={{ fontSize: 15, color: "#94a3b8", lineHeight: 1.8 }}>{body}</p>
          </div>
        ))}

      </div>
    </div>
  );
}

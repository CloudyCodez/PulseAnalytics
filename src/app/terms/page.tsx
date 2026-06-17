export const metadata = { title: "Terms of Service – Pulse Analytics" };

export default function TermsPage() {
  return (
    <div style={{
      background: "#0a0f1e", minHeight: "100vh", color: "#fff",
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "80px 32px" }}>

        <div style={{ marginBottom: 48 }}>
          <a href="/" style={{ fontSize: 13, color: "#00e5cc", textDecoration: "none" }}>← Back to Pulse</a>
          <h1 style={{ fontSize: 36, fontWeight: 700, marginTop: 24, marginBottom: 8, letterSpacing: "-0.5px" }}>
            Terms of Service
          </h1>
          <p style={{ color: "#64748b", fontSize: 14 }}>Last updated: June 2026</p>
        </div>

        {[
          {
            title: "1. Acceptance of Terms",
            body: `By downloading, installing, or using Pulse Analytics ("Pulse", "the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service. These Terms constitute a legally binding agreement between you ("User", "you") and Pulse Analytics ("we", "us", "our").`,
          },
          {
            title: "2. Description of Service",
            body: `Pulse is a desktop analytics application that connects to your marketing and ecommerce platforms — including Google Ads, Google Analytics 4, Meta Ads, Shopify, and Klaviyo — and generates AI-powered performance reports. The application runs locally on your machine. Access to the Service requires a paid subscription, which is billed through Stripe.`,
          },
          {
            title: "3. Subscriptions and Billing",
            body: `Pulse is offered on a subscription basis. By starting a free trial or subscribing to a paid plan, you authorize us to charge your payment method on a recurring basis at the then-current rate for your selected plan. All pricing is listed in USD. Your subscription will automatically renew unless cancelled before the renewal date. Free trials automatically convert to paid subscriptions at the end of the trial period unless cancelled. We reserve the right to change pricing with 30 days' notice.`,
          },
          {
            title: "4. Cancellation and Refunds",
            body: `You may cancel your subscription at any time through your account settings. Cancellation takes effect at the end of your current billing period — you will retain access to the Service until that date. We do not offer refunds for partial billing periods. If you experience a technical issue that prevents you from using the Service, contact us at support@pulseanalytics.space and we will review your case on an individual basis.`,
          },
          {
            title: "5. Free Trial",
            body: `New users may be offered a free trial period. Only one free trial is permitted per person and per business. We reserve the right to terminate trials that appear to be abused or duplicated. At the end of the trial, your account will be charged unless you cancel before the trial period ends.`,
          },
          {
            title: "6. Acceptable Use",
            body: `You agree to use Pulse only for lawful purposes and in accordance with these Terms. You may not: (a) use the Service to violate any applicable law or regulation; (b) attempt to reverse engineer, decompile, or disassemble the software; (c) share your account credentials with third parties; (d) resell or sublicense the Service without our written consent; (e) use the Service to infringe on any third party's intellectual property rights.`,
          },
          {
            title: "7. Third-Party Integrations",
            body: `Pulse connects to third-party platforms including Google, Meta, Shopify, and Klaviyo. Your use of those platforms is governed by their respective terms of service. We are not responsible for any changes, outages, or policy updates made by those platforms that may affect the functionality of Pulse. You are responsible for ensuring you have the right to access and export data from any platform you connect to Pulse.`,
          },
          {
            title: "8. Data and Privacy",
            body: `Your marketing data is processed locally on your machine and is not transmitted to our servers. We collect only the minimum account data necessary to provide the Service (your email address and billing information). Our full data practices are described in our Privacy Policy at pulseanalytics.space/privacy, which is incorporated into these Terms by reference.`,
          },
          {
            title: "9. Intellectual Property",
            body: `Pulse Analytics and all associated software, branding, and content are the intellectual property of Pulse Analytics. Your subscription grants you a limited, non-exclusive, non-transferable license to use the software for your own business purposes. Nothing in these Terms transfers any ownership rights to you.`,
          },
          {
            title: "10. Disclaimer of Warranties",
            body: `The Service is provided "as is" and "as available" without warranties of any kind, express or implied. We do not warrant that the Service will be uninterrupted, error-free, or that the AI-generated reports and insights will be accurate or suitable for any particular business decision. You use any AI-generated analysis at your own risk and should verify material decisions independently.`,
          },
          {
            title: "11. Limitation of Liability",
            body: `To the maximum extent permitted by law, Pulse Analytics shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business opportunities, arising from your use of or inability to use the Service. Our total liability to you for any claim arising from these Terms or your use of the Service shall not exceed the amount you paid us in the three months preceding the claim.`,
          },
          {
            title: "12. Termination",
            body: `We reserve the right to suspend or terminate your account at any time if you violate these Terms, engage in fraudulent activity, or if we determine your use of the Service is harmful to other users or to us. Upon termination, your right to use the Service immediately ceases. You may terminate your account at any time by cancelling your subscription and contacting us to delete your account data.`,
          },
          {
            title: "13. Changes to Terms",
            body: `We may update these Terms from time to time. When we do, we will update the "Last updated" date at the top of this page and notify you by email. Continued use of the Service after changes take effect constitutes your acceptance of the revised Terms.`,
          },
          {
            title: "14. Governing Law",
            body: `These Terms are governed by and construed in accordance with the laws of the United States. Any disputes arising under these Terms shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association, except that either party may seek injunctive relief in a court of competent jurisdiction.`,
          },
          {
            title: "15. Contact",
            body: `For any questions about these Terms, contact us at support@pulseanalytics.space.`,
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

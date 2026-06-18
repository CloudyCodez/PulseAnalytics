import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pulse Analytics — Automated Client Reporting for Agencies",
  description: "Pulse Analytics sends your clients a polished, AI-written performance report every Monday morning — automatically. No more manual reporting.",
};

export default function HomePage() {
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --navy: #080D1A; --navy-2: #0E1627; --card: #121C2E; --card-2: #172035;
          --border: rgba(0,212,170,0.12); --teal: #00D4AA; --teal-dim: #00B892;
          --teal-glow: rgba(0,212,170,0.18); --white: #F0F4FF; --muted: #8A9BC0;
          --danger: #FF5A5A; --warn: #FFB547;
        }
        html { scroll-behavior: smooth; }
        body { background: var(--navy); color: var(--white); font-family: 'DM Sans', sans-serif; font-size: 16px; line-height: 1.6; -webkit-font-smoothing: antialiased; }
        nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; padding: 0 5%; height: 68px; background: rgba(8,13,26,0.85); backdrop-filter: blur(14px); border-bottom: 1px solid var(--border); }
        .nav-logo { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 700; font-size: 1.35rem; letter-spacing: -0.02em; color: var(--white); text-decoration: none; display: flex; align-items: center; gap: 9px; }
        .nav-logo .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--teal); box-shadow: 0 0 10px var(--teal); animation: pulse-dot 2s ease-in-out infinite; }
        @keyframes pulse-dot { 0%,100% { box-shadow: 0 0 6px var(--teal); opacity: 1; } 50% { box-shadow: 0 0 16px var(--teal); opacity: 0.7; } }
        .nav-links { display: flex; align-items: center; gap: 32px; }
        .nav-links a { color: var(--muted); text-decoration: none; font-size: 0.9rem; font-weight: 500; transition: color .2s; }
        .nav-links a:hover { color: var(--white); }
        .nav-cta { background: var(--teal) !important; color: var(--navy) !important; padding: 9px 20px; border-radius: 8px; font-weight: 600 !important; font-size: 0.875rem !important; transition: background .2s, transform .15s !important; }
        .nav-cta:hover { background: var(--teal-dim) !important; transform: translateY(-1px); }
        .hero { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100px 5% 80px; position: relative; overflow: hidden; text-align: center; }
        .hero-glow { position: absolute; top: -120px; left: 50%; transform: translateX(-50%); width: 800px; height: 600px; border-radius: 50%; background: radial-gradient(ellipse, rgba(0,212,170,0.12) 0%, transparent 70%); pointer-events: none; }
        .hero-eyebrow { display: inline-flex; align-items: center; gap: 8px; background: rgba(0,212,170,0.08); border: 1px solid rgba(0,212,170,0.25); border-radius: 100px; padding: 6px 16px; font-size: 0.8rem; font-weight: 600; color: var(--teal); letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 28px; }
        .hero-eyebrow span { display: inline-block; width: 6px; height: 6px; background: var(--teal); border-radius: 50%; }
        .hero h1 { font-family: 'Bricolage Grotesque', sans-serif; font-size: clamp(2.6rem, 5.5vw, 4.2rem); font-weight: 800; line-height: 1.08; letter-spacing: -0.03em; max-width: 820px; margin-bottom: 24px; }
        .hero h1 em { font-style: normal; color: var(--teal); }
        .hero-sub { font-size: clamp(1rem, 2vw, 1.2rem); color: var(--muted); max-width: 560px; margin-bottom: 40px; line-height: 1.7; }
        .hero-actions { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; justify-content: center; margin-bottom: 64px; }
        .btn-primary { background: var(--teal); color: var(--navy); padding: 15px 32px; border-radius: 10px; font-weight: 700; font-size: 1rem; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; transition: background .2s, transform .15s, box-shadow .2s; box-shadow: 0 0 30px rgba(0,212,170,0.25); }
        .btn-primary:hover { background: var(--teal-dim); transform: translateY(-2px); box-shadow: 0 0 40px rgba(0,212,170,0.4); }
        .btn-secondary { color: var(--white); padding: 15px 28px; border-radius: 10px; font-weight: 600; font-size: 1rem; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; border: 1px solid rgba(255,255,255,0.15); transition: border-color .2s, background .2s; }
        .btn-secondary:hover { border-color: rgba(0,212,170,0.4); background: rgba(0,212,170,0.05); }
        .report-card { width: 100%; max-width: 720px; background: var(--card); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; box-shadow: 0 32px 80px rgba(0,0,0,0.5), 0 0 60px rgba(0,212,170,0.06); }
        .report-card-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: var(--card-2); border-bottom: 1px solid var(--border); }
        .report-card-header .rc-title { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 700; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; }
        .rc-badge { background: rgba(0,212,170,0.12); color: var(--teal); font-size: 0.7rem; font-weight: 700; letter-spacing: 0.05em; padding: 3px 9px; border-radius: 4px; text-transform: uppercase; }
        .rc-dots { display: flex; gap: 6px; }
        .rc-dots span { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,0.1); }
        .rc-dots span:nth-child(1) { background: #FF5F57; }
        .rc-dots span:nth-child(2) { background: #FEBC2E; }
        .rc-dots span:nth-child(3) { background: #28C840; }
        .report-card-body { padding: 20px; }
        .rc-client-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .rc-client-info { display: flex; align-items: center; gap: 10px; }
        .rc-avatar { width: 34px; height: 34px; border-radius: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; color: white; }
        .rc-client-name { font-weight: 600; font-size: 0.9rem; }
        .rc-client-period { font-size: 0.75rem; color: var(--muted); }
        .rc-status { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 600; color: var(--teal); }
        .rc-status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--teal); animation: pulse-dot 1.5s ease-in-out infinite; }
        .rc-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
        .rc-metric { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 12px; }
        .rc-metric-label { font-size: 0.7rem; color: var(--muted); margin-bottom: 4px; font-weight: 500; }
        .rc-metric-value { font-family: 'Bricolage Grotesque', sans-serif; font-size: 1.3rem; font-weight: 700; line-height: 1; margin-bottom: 4px; }
        .rc-metric-delta { font-size: 0.7rem; font-weight: 600; }
        .delta-up { color: var(--teal); } .delta-down { color: var(--danger); }
        .rc-chart-area { margin-bottom: 18px; }
        .rc-chart-label { font-size: 0.72rem; color: var(--muted); font-weight: 500; margin-bottom: 10px; }
        .rc-bars { display: flex; align-items: flex-end; gap: 5px; height: 70px; }
        .rc-bar { flex: 1; border-radius: 4px 4px 0 0; background: rgba(0,212,170,0.25); position: relative; transition: height 1s cubic-bezier(.34,1.56,.64,1); }
        .rc-bar.active { background: var(--teal); }
        .rc-bar::after { content: attr(data-val); position: absolute; bottom: -18px; left: 50%; transform: translateX(-50%); font-size: 0.62rem; color: var(--muted); white-space: nowrap; }
        .rc-ai-box { background: linear-gradient(135deg, rgba(0,212,170,0.07) 0%, rgba(0,212,170,0.03) 100%); border: 1px solid rgba(0,212,170,0.18); border-radius: 10px; padding: 14px 16px; display: flex; gap: 10px; }
        .rc-ai-icon { width: 26px; height: 26px; flex-shrink: 0; background: rgba(0,212,170,0.15); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; }
        .rc-ai-text { font-size: 0.8rem; color: var(--muted); line-height: 1.55; }
        .rc-ai-text strong { color: var(--white); font-weight: 600; }
        .proof-strip { padding: 22px 5%; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: center; gap: 48px; flex-wrap: wrap; }
        .proof-stat { text-align: center; }
        .proof-stat strong { display: block; font-family: 'Bricolage Grotesque', sans-serif; font-size: 1.6rem; font-weight: 800; color: var(--teal); letter-spacing: -0.02em; }
        .proof-stat span { font-size: 0.82rem; color: var(--muted); font-weight: 500; }
        .proof-div { width: 1px; height: 36px; background: var(--border); }
        section { padding: 100px 5%; }
        .section-eyebrow { font-size: 0.78rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--teal); margin-bottom: 14px; }
        .section-heading { font-family: 'Bricolage Grotesque', sans-serif; font-size: clamp(1.9rem, 3.5vw, 2.8rem); font-weight: 800; letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 18px; }
        .section-sub { font-size: 1.05rem; color: var(--muted); max-width: 520px; line-height: 1.7; }
        .section-header { max-width: 620px; }
        .how-it-works { background: var(--navy-2); }
        .steps-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px; margin-top: 56px; }
        .step-card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 28px 24px; transition: border-color .25s, transform .25s; }
        .step-card:hover { border-color: rgba(0,212,170,0.35); transform: translateY(-4px); }
        .step-icon { width: 44px; height: 44px; border-radius: 10px; background: rgba(0,212,170,0.1); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; margin-bottom: 18px; }
        .step-card h3 { font-family: 'Bricolage Grotesque', sans-serif; font-size: 1.05rem; font-weight: 700; margin-bottom: 8px; }
        .step-card p { font-size: 0.88rem; color: var(--muted); line-height: 1.65; }
        .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 56px; }
        .feature-card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 28px 26px; transition: border-color .25s, transform .25s; }
        .feature-card:hover { border-color: rgba(0,212,170,0.3); transform: translateY(-3px); }
        .feature-card.featured { border-color: rgba(0,212,170,0.3); background: linear-gradient(135deg, rgba(0,212,170,0.06) 0%, var(--card) 60%); }
        .feature-icon { font-size: 1.5rem; margin-bottom: 16px; display: block; }
        .feature-card h3 { font-family: 'Bricolage Grotesque', sans-serif; font-size: 1.05rem; font-weight: 700; margin-bottom: 10px; }
        .feature-card p { font-size: 0.88rem; color: var(--muted); line-height: 1.65; }
        .integrations { background: var(--navy-2); text-align: center; }
        .integrations-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 48px; }
        .int-pill { display: flex; align-items: center; gap: 8px; background: var(--card); border: 1px solid var(--border); border-radius: 100px; padding: 8px 16px; font-size: 0.85rem; font-weight: 500; color: var(--white); }
        .int-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; }
        .pricing-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 32px 28px; position: relative; transition: border-color .25s, transform .25s; }
        .pricing-card:hover { border-color: rgba(0,212,170,0.3); transform: translateY(-4px); }
        .pricing-card.popular { border-color: rgba(0,212,170,0.4); background: linear-gradient(160deg, rgba(0,212,170,0.07) 0%, var(--card) 50%); }
        .popular-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--teal); color: var(--navy); font-size: 0.72rem; font-weight: 700; letter-spacing: 0.06em; padding: 4px 14px; border-radius: 100px; white-space: nowrap; }
        .plan-name { font-family: 'Bricolage Grotesque', sans-serif; font-size: 1rem; font-weight: 700; color: var(--muted); margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em; }
        .plan-price { font-family: 'Bricolage Grotesque', sans-serif; font-size: 3.2rem; font-weight: 800; letter-spacing: -0.04em; line-height: 1; }
        .plan-price sup { font-size: 1.4rem; vertical-align: super; line-height: 0; font-weight: 700; }
        .plan-period { font-size: 0.85rem; color: var(--muted); margin-top: 4px; }
        .plan-clients { font-size: 0.85rem; color: var(--teal); font-weight: 600; margin-top: 12px; }
        .plan-divider { border: none; border-top: 1px solid var(--border); margin: 20px 0; }
        .plan-features { list-style: none; display: flex; flex-direction: column; gap: 10px; margin-bottom: 28px; }
        .plan-features li { display: flex; align-items: flex-start; gap: 10px; font-size: 0.87rem; color: var(--muted); }
        .plan-features li.active { color: var(--white); }
        .check { color: var(--teal); font-weight: 700; flex-shrink: 0; }
        .cross { color: #334155; flex-shrink: 0; }
        .plan-cta { display: block; text-align: center; padding: 13px 20px; border-radius: 10px; font-weight: 700; font-size: 0.95rem; text-decoration: none; transition: all .2s; }
        .plan-cta.primary { background: var(--teal); color: var(--navy); }
        .plan-cta.primary:hover { background: var(--teal-dim); transform: translateY(-1px); }
        .plan-cta.outline { border: 1px solid rgba(0,212,170,0.35); color: var(--teal); }
        .plan-cta.outline:hover { background: rgba(0,212,170,0.07); }
        .pricing-note { text-align: center; color: var(--muted); font-size: 0.85rem; margin-top: 32px; }
        .testimonials { background: var(--navy-2); }
        .testimonials-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
        .testimonial-card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 28px; }
        .t-stars { color: var(--teal); font-size: 1rem; margin-bottom: 14px; letter-spacing: 2px; }
        .t-quote { font-size: 0.92rem; color: var(--white); line-height: 1.7; margin-bottom: 20px; font-style: italic; }
        .t-author { display: flex; align-items: center; gap: 12px; }
        .t-avatar { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; color: white; flex-shrink: 0; }
        .t-name { font-size: 0.88rem; font-weight: 700; color: var(--white); }
        .t-role { font-size: 0.78rem; color: var(--muted); }
        .final-cta { padding: 120px 5%; text-align: center; position: relative; overflow: hidden; }
        .final-cta-glow { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 600px; height: 400px; border-radius: 50%; background: radial-gradient(ellipse, rgba(0,212,170,0.1) 0%, transparent 70%); pointer-events: none; }
        .final-cta h2 { font-family: 'Bricolage Grotesque', sans-serif; font-size: clamp(2rem, 4vw, 3.2rem); font-weight: 800; letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 20px; }
        .final-cta p { font-size: 1.05rem; color: var(--muted); max-width: 520px; margin: 0 auto 40px; line-height: 1.7; }
        .final-cta-actions { display: flex; align-items: center; justify-content: center; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
        .no-card-note { font-size: 0.82rem; color: var(--muted); }
        footer { padding: 40px 5%; border-top: 1px solid var(--border); display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center; }
        .footer-logo { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 700; font-size: 1.1rem; color: var(--white); text-decoration: none; display: flex; align-items: center; gap: 8px; }
        .footer-logo .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--teal); }
        footer p { font-size: 0.82rem; color: var(--muted); }
        .footer-links { display: flex; gap: 24px; }
        .footer-links a { font-size: 0.82rem; color: var(--muted); text-decoration: none; transition: color .2s; }
        .footer-links a:hover { color: var(--white); }
        .reveal { opacity: 1; transform: none; transition: opacity .6s ease, transform .6s ease; }
        .reveal.visible { opacity: 1; transform: none; }
        .stagger { opacity: 1; transform: none; transition: opacity .6s ease, transform .6s ease; }
        .stagger.visible { opacity: 1; transform: none; }
      `}</style>

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap" rel="stylesheet" />

      {/* NAV */}
      <nav>
        <a href="#" className="nav-logo">
          <span className="dot"></span>
          Pulse Analytics
        </a>
        <div className="nav-links">
          <a href="#how-it-works">How it works</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="/demo">Live Demo</a>
          <a href="#pricing" className="nav-cta">Start Free Trial</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-glow"></div>
        <div className="hero-eyebrow"><span></span> Automated Client Reporting</div>
        <h1>Your clients get a <em>polished report</em><br />every Monday. You do nothing.</h1>
        <p className="hero-sub">Pulse Analytics connects to your clients&apos; ad accounts, pulls every number, writes the analysis with AI, and delivers a branded report — automatically, every week.</p>
        <div className="hero-actions">
          <a href="#pricing" className="btn-primary">
            Start your free 14-day trial
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M7.5 3.5 11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </a>
          <a href="/demo" className="btn-secondary">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/><path d="M7 4v3.5l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            See a live demo
          </a>
        </div>

        {/* REPORT CARD */}
        <div className="report-card reveal">
          <div className="report-card-header">
            <div className="rc-dots"><span></span><span></span><span></span></div>
            <div className="rc-title">Weekly Performance Report <span className="rc-badge">Auto-generated</span></div>
            <div style={{fontSize:'.75rem',color:'var(--muted)'}}>Jun 9 – Jun 15</div>
          </div>
          <div className="report-card-body">
            <div className="rc-client-row">
              <div className="rc-client-info">
                <div className="rc-avatar">SK</div>
                <div>
                  <div className="rc-client-name">Stellar Kitchen Co.</div>
                  <div className="rc-client-period">Week 24 · Sent Mon 8:00 AM</div>
                </div>
              </div>
              <div className="rc-status"><span className="rc-status-dot"></span> Delivered</div>
            </div>
            <div className="rc-metrics" id="hero-metrics">
              <div className="rc-metric"><div className="rc-metric-label">Ad Spend</div><div className="rc-metric-value" id="m-spend">$0</div><div className="rc-metric-delta delta-down">↓ 4.2%</div></div>
              <div className="rc-metric"><div className="rc-metric-label">ROAS</div><div className="rc-metric-value" id="m-roas">0.0×</div><div className="rc-metric-delta delta-up">↑ 18.6%</div></div>
              <div className="rc-metric"><div className="rc-metric-label">Conversions</div><div className="rc-metric-value" id="m-conv">0</div><div className="rc-metric-delta delta-up">↑ 31.4%</div></div>
              <div className="rc-metric"><div className="rc-metric-label">Cost / Conv.</div><div className="rc-metric-value" id="m-cpa">$0</div><div className="rc-metric-delta delta-up">↓ 8.1%</div></div>
            </div>
            <div className="rc-chart-area">
              <div className="rc-chart-label">Daily conversions this week</div>
              <div className="rc-bars">
                <div className="rc-bar" style={{height:'40%'}} data-val="Mon"></div>
                <div className="rc-bar" style={{height:'55%'}} data-val="Tue"></div>
                <div className="rc-bar" style={{height:'48%'}} data-val="Wed"></div>
                <div className="rc-bar" style={{height:'70%'}} data-val="Thu"></div>
                <div className="rc-bar" style={{height:'62%'}} data-val="Fri"></div>
                <div className="rc-bar active" style={{height:'88%'}} data-val="Sat"></div>
                <div className="rc-bar" style={{height:'75%'}} data-val="Sun"></div>
              </div>
            </div>
            <div style={{marginTop:'24px'}} className="rc-ai-box">
              <div className="rc-ai-icon">✦</div>
              <div className="rc-ai-text">
                <strong>AI Summary:</strong> Strong week overall — ROAS climbed to <strong>4.7×</strong> on the back of Saturday&apos;s spike, your best single-day performance in 6 weeks. Meta prospecting outperformed retargeting by <strong>2.1×</strong>. Recommend shifting 15–20% of weekly budget toward the 25–34 demo on Instagram Reels.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROOF STRIP */}
      <div className="proof-strip">
        <div className="proof-stat"><strong>12–18</strong><span>hours saved per client per month</span></div>
        <div className="proof-div"></div>
        <div className="proof-stat"><strong>6</strong><span>platforms connected in one place</span></div>
        <div className="proof-div"></div>
        <div className="proof-stat"><strong>Every Monday</strong><span>reports land before clients wake up</span></div>
        <div className="proof-div"></div>
        <div className="proof-stat"><strong>14-day</strong><span>free trial on all plans</span></div>
      </div>

      {/* HOW IT WORKS */}
      <section className="how-it-works" id="how-it-works">
        <div className="section-header reveal">
          <div className="section-eyebrow">How it works</div>
          <h2 className="section-heading">Set it up once.<br />Reports go out forever.</h2>
          <p className="section-sub">Connect your clients&apos; accounts in minutes. Pulse handles everything after that — pulling data, writing analysis, and sending the report.</p>
        </div>
        <div className="steps-grid stagger">
          <div className="step-card"><div className="step-icon">🔗</div><h3>Connect your clients&apos; accounts</h3><p>OAuth into Meta Ads, Google Ads, GA4, Shopify, and more. Takes under 2 minutes per client — no spreadsheets, no API tokens.</p></div>
          <div className="step-card"><div className="step-icon">⚙️</div><h3>Pulse pulls and analyzes the data</h3><p>Every Sunday night, Pulse automatically fetches that week&apos;s numbers, spots anomalies, calculates week-over-week changes, and writes the AI commentary.</p></div>
          <div className="step-card"><div className="step-icon">📨</div><h3>Your client gets the report Monday morning</h3><p>A polished, branded email report lands in their inbox at 8 AM — with your logo, their metrics, and plain-English explanations of what happened and why.</p></div>
          <div className="step-card"><div className="step-icon">🚨</div><h3>Alerts fire when something&apos;s off</h3><p>If ROAS drops, spend spikes, or a campaign stops converting — you and your client get an instant alert before your client even notices.</p></div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features">
        <div className="section-header reveal">
          <div className="section-eyebrow">Features</div>
          <h2 className="section-heading">Everything your reporting workflow needs.</h2>
        </div>
        <div className="features-grid stagger">
          <div className="feature-card featured"><span className="feature-icon">✦</span><h3>AI-written performance commentary</h3><p>Every report includes a plain-English summary of what happened, what drove results, and what to do next week — written by AI, delivered automatically.</p></div>
          <div className="feature-card"><span className="feature-icon">📊</span><h3>Multi-platform data in one report</h3><p>Meta Ads, Google Ads, GA4, Shopify, TikTok Ads, and email — all pulled into a single report. No more logging into six platforms every Friday afternoon.</p></div>
          <div className="feature-card"><span className="feature-icon">🎨</span><h3>White-label branding</h3><p>Reports go out with your agency&apos;s logo, colors, and domain. Your clients think you built this from scratch. You didn&apos;t. That&apos;s the point.</p></div>
          <div className="feature-card"><span className="feature-icon">🚨</span><h3>Anomaly detection & instant alerts</h3><p>Pulse watches for unusual patterns 24/7. When ROAS tanks or spend spikes unexpectedly, you get a Slack or email alert before your client even notices.</p></div>
          <div className="feature-card"><span className="feature-icon">📅</span><h3>Scheduled weekly delivery</h3><p>Reports hit inboxes every Monday at 8 AM — before the weekly client call. You walk in prepared. Every time, without lifting a finger.</p></div>
          <div className="feature-card"><span className="feature-icon">📈</span><h3>Week-over-week trend tracking</h3><p>Every metric shows the delta vs. last week with clear visual indicators. Clients see progress at a glance, which makes retaining them significantly easier.</p></div>
        </div>
      </section>

      {/* INTEGRATIONS */}
      <section className="integrations" id="integrations">
        <div className="section-header reveal" style={{maxWidth:'100%',textAlign:'center',margin:'0 auto'}}>
          <div className="section-eyebrow">Integrations</div>
          <h2 className="section-heading">Connects to every platform your clients use.</h2>
          <p className="section-sub" style={{margin:'0 auto'}}>OAuth-powered connections — no API keys, no developer, no spreadsheet exports. Just click and connect.</p>
        </div>
        <div className="integrations-row stagger">
          <div className="int-pill"><span className="int-dot" style={{background:'#1877F2'}}></span> Meta Ads</div>
          <div className="int-pill"><span className="int-dot" style={{background:'#4285F4'}}></span> Google Ads</div>
          <div className="int-pill"><span className="int-dot" style={{background:'#E8710A'}}></span> Google Analytics 4</div>
          <div className="int-pill"><span className="int-dot" style={{background:'#96BF48'}}></span> Shopify</div>
          <div className="int-pill"><span className="int-dot" style={{background:'#000000'}}></span> TikTok Ads</div>
          <div className="int-pill"><span className="int-dot" style={{background:'#FFE01B'}}></span> Mailchimp</div>
          <div className="int-pill"><span className="int-dot" style={{background:'#17A2B8'}}></span> Klaviyo</div>
          <div className="int-pill"><span className="int-dot" style={{background:'#00D4AA'}}></span> More coming soon</div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing">
        <div className="section-header reveal" style={{maxWidth:'100%',textAlign:'center',margin:'0 auto'}}>
          <div className="section-eyebrow">Pricing</div>
          <h2 className="section-heading">Simple pricing. No per-client fees.</h2>
          <p className="section-sub" style={{margin:'0 auto 0'}}>Flat monthly rate. Connect as many platforms as you need. Cancel anytime.</p>
        </div>
        <div className="pricing-grid stagger" style={{marginTop:'56px',maxWidth:'960px',marginLeft:'auto',marginRight:'auto'}}>
          <div className="pricing-card">
            <div className="plan-name">Starter</div>
            <div className="plan-price"><sup>$</sup>49</div>
            <div className="plan-period">per month</div>
            <div className="plan-clients">Up to 5 clients</div>
            <hr className="plan-divider" />
            <ul className="plan-features">
              <li className="active"><span className="check">✓</span> Automated weekly reports</li>
              <li className="active"><span className="check">✓</span> Meta Ads + Google Ads + GA4</li>
              <li className="active"><span className="check">✓</span> Week-over-week trend tracking</li>
              <li className="active"><span className="check">✓</span> Email delivery to clients</li>
              <li><span className="cross">–</span> AI commentary</li>
              <li><span className="cross">–</span> Anomaly detection & alerts</li>
              <li><span className="cross">–</span> White-label branding</li>
            </ul>
            <a href="https://buy.stripe.com/00waEX1C9gAV2LPadY6c002" className="plan-cta outline">Start free trial</a>
          </div>
          <div className="pricing-card popular">
            <div className="popular-badge">Most Popular</div>
            <div className="plan-name">Growth</div>
            <div className="plan-price"><sup>$</sup>97</div>
            <div className="plan-period">per month</div>
            <div className="plan-clients">Up to 20 clients</div>
            <hr className="plan-divider" />
            <ul className="plan-features">
              <li className="active"><span className="check">✓</span> Everything in Starter</li>
              <li className="active"><span className="check">✓</span> All 7 platform integrations</li>
              <li className="active"><span className="check">✓</span> AI-written performance commentary</li>
              <li className="active"><span className="check">✓</span> Anomaly detection & instant alerts</li>
              <li className="active"><span className="check">✓</span> White-label branding (your logo)</li>
              <li className="active"><span className="check">✓</span> Slack + email alert routing</li>
              <li><span className="cross">–</span> Custom sending domain</li>
            </ul>
            <a href="https://buy.stripe.com/9B67sLgx3doJfyB99U6c001" className="plan-cta primary">Start free trial</a>
          </div>
          <div className="pricing-card">
            <div className="plan-name">Agency</div>
            <div className="plan-price"><sup>$</sup>197</div>
            <div className="plan-period">per month</div>
            <div className="plan-clients">Unlimited clients</div>
            <hr className="plan-divider" />
            <ul className="plan-features">
              <li className="active"><span className="check">✓</span> Everything in Growth</li>
              <li className="active"><span className="check">✓</span> Unlimited clients</li>
              <li className="active"><span className="check">✓</span> Custom sending domain</li>
              <li className="active"><span className="check">✓</span> Priority support</li>
              <li className="active"><span className="check">✓</span> Early access to new integrations</li>
              <li className="active"><span className="check">✓</span> Onboarding call with our team</li>
            </ul>
            <a href="https://buy.stripe.com/dRmfZheoV84p9adgCm6c000" className="plan-cta outline">Start free trial</a>
          </div>
        </div>
        <p className="pricing-note">14-day free trial on all plans · Card required at checkout · Cancel anytime</p>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials" id="testimonials">
        <div className="section-header reveal" style={{textAlign:'center',maxWidth:'100%',margin:'0 auto'}}>
          <div className="section-eyebrow">Early feedback</div>
          <h2 className="section-heading">Agencies are already saving hours every week.</h2>
        </div>
        <div className="testimonials-grid stagger" style={{marginTop:'52px'}}>
          <div className="testimonial-card"><div className="t-stars">★★★★★</div><p className="t-quote">&ldquo;I used to spend 4–5 hours every Friday pulling reports for my 12 clients. Now I spend zero. The AI summaries are genuinely good — clients actually read them.&rdquo;</p><div className="t-author"><div className="t-avatar" style={{background:'linear-gradient(135deg,#667eea,#764ba2)'}}>JM</div><div><div className="t-name">Jamie M.</div><div className="t-role">Performance Marketing Agency · 14 clients</div></div></div></div>
          <div className="testimonial-card"><div className="t-stars">★★★★★</div><p className="t-quote">&ldquo;My clients love the Monday morning reports. One of them literally emailed me saying it&apos;s the best thing our agency has ever done for them. It took me 10 minutes to set up.&rdquo;</p><div className="t-author"><div className="t-avatar" style={{background:'linear-gradient(135deg,#f093fb,#f5576c)'}}>AR</div><div><div className="t-name">Alicia R.</div><div className="t-role">Social & Paid Ads Freelancer · 7 clients</div></div></div></div>
          <div className="testimonial-card"><div className="t-stars">★★★★★</div><p className="t-quote">&ldquo;The anomaly alerts paid for the entire subscription in the first week. Caught a Meta campaign burning budget with zero conversions for two days. Saved us $800.&rdquo;</p><div className="t-author"><div className="t-avatar" style={{background:'linear-gradient(135deg,#4facfe,#00f2fe)'}}>DK</div><div><div className="t-name">Derek K.</div><div className="t-role">E-commerce Agency Owner · 22 clients</div></div></div></div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final-cta">
        <div className="final-cta-glow"></div>
        <h2>Stop spending Fridays on reports.<br />Start Monday already done.</h2>
        <p>Join agencies saving 12–18 hours a month on client reporting. Free for 14 days — cancel anytime.</p>
        <div className="final-cta-actions">
          <a href="#pricing" className="btn-primary">
            Start your free 14-day trial
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M7.5 3.5 11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </a>
          <a href="/demo" className="btn-secondary">See live demo first</a>
        </div>
        <p className="no-card-note">Card required · Cancel anytime · Set up in under 10 minutes</p>
      </section>

      {/* FOOTER */}
      <footer>
        <a className="footer-logo" href="#"><span className="dot"></span> Pulse Analytics</a>
        <p>© 2026 Pulse Analytics. All rights reserved.</p>
        <div className="footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="/demo">Live Demo</a>
          <a href="#pricing">Pricing</a>
          <a href="/sign-in">Sign In</a>
        </div>
      </footer>

      <script dangerouslySetInnerHTML={{__html: `
        function animateCounter(el, target, prefix, suffix, decimals, duration) {
          const start = performance.now();
          function step(now) {
            const p = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            const val = target * ease;
            el.textContent = prefix + (decimals ? val.toFixed(decimals) : Math.floor(val)) + suffix;
            if (p < 1) requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
        }
        const metricsObserver = new IntersectionObserver((entries) => {
          entries.forEach(e => {
            if (e.isIntersecting) {
              animateCounter(document.getElementById('m-spend'), 4820, '$', '', 0, 1400);
              animateCounter(document.getElementById('m-roas'), 4.7, '', '×', 1, 1600);
              animateCounter(document.getElementById('m-conv'), 312, '', '', 0, 1400);
              animateCounter(document.getElementById('m-cpa'), 15, '$', '', 0, 1400);
              metricsObserver.disconnect();
            }
          });
        }, { threshold: 0.4 });
        const heroMetrics = document.getElementById('hero-metrics');
        if (heroMetrics) metricsObserver.observe(heroMetrics);
        const revealEls = document.querySelectorAll('.reveal, .stagger');
        const revealObserver = new IntersectionObserver((entries) => {
          entries.forEach(e => {
            if (e.isIntersecting) { e.target.classList.add('visible'); revealObserver.unobserve(e.target); }
          });
        }, { threshold: 0.12 });
        revealEls.forEach(el => revealObserver.observe(el));
        setTimeout(() => {
          document.querySelectorAll('.hero .reveal, .hero .stagger').forEach(el => el.classList.add('visible'));
        }, 200);
      `}} />
    </>
  );
}

import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/pulse-ai/chat
 *
 * Shared endpoint for:
 *   1. The Pulse AI drawer (real-time chat about connected data)
 *   2. Weekly report commentary generation (called server-side by the report job)
 *
 * Body:
 *   { messages: { role: "user"|"assistant", content: string }[] }
 *   { reportMode: true, data: ReportDataSnapshot }  ← for report commentary
 *
 * In live mode: calls Anthropic claude-sonnet-4-6 via the API.
 * If ANTHROPIC_API_KEY is not set (local dev): returns a canned reply.
 */

const SYSTEM_PROMPT = `You are Pulse AI — the built-in intelligence engine for Pulse Analytics.

You have full context of the user's connected marketing and ecommerce data: Google Ads, Meta Ads, GA4, Shopify, and Klaviyo (where connected). Your job is to:

1. Answer questions about their data clearly and concisely — no jargon unless asked
2. Surface what actually matters: ROAS trends, budget allocation opportunities, anomalies, campaign-level insights
3. Give actionable recommendations — never just describe the numbers, always say what to DO about them
4. Write weekly report commentary when asked (structured, professional, plain English)

Rules:
- Never make up numbers. If you don't have data, say so clearly
- Keep answers focused — 3-5 sentences for chat, longer structured paragraphs for reports
- Use dollar amounts and percentages when the data supports it
- Be direct — the user is a business owner or marketer, not a data analyst
- Never mention Ollama, llama, or any underlying model name — you are Pulse AI`;

type Message = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  let body: { messages?: Message[]; reportMode?: boolean; data?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  // ── Dev fallback — no API key ────────────────────────────────────────────────
  if (!apiKey || apiKey.startsWith("sk-ant-mock")) {
    return NextResponse.json({
      reply: "Pulse AI is connected. To enable live AI responses, add your ANTHROPIC_API_KEY to .env.local and restart the server.",
    });
  }

  // ── Report commentary mode ────────────────────────────────────────────────────
  if (body.reportMode && body.data) {
    const prompt = `You are writing the AI commentary section of a weekly Pulse Analytics report.

Here is the data snapshot for this week:
${JSON.stringify(body.data, null, 2)}

Write a structured commentary with exactly these three sections:
1. **What happened this week** — 2-3 sentences summarising the key numbers
2. **What's driving performance** — 2-3 sentences identifying the biggest factors (good or bad)
3. **What to do next** — 3-4 specific, actionable recommendations with reasoning

Keep it professional but plain-English. No bullet points — full sentences only. Use the actual numbers from the data.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await res.json();
      const text = data.content?.[0]?.text ?? "Could not generate commentary.";
      return NextResponse.json({ commentary: text });
    } catch (err) {
      console.error("[Pulse AI] Report commentary error:", err);
      return NextResponse.json({ error: "AI unavailable" }, { status: 500 });
    }
  }

  // ── Chat mode ─────────────────────────────────────────────────────────────────
  const messages: Message[] = body.messages ?? [];
  if (messages.length === 0) {
    return NextResponse.json({ error: "No messages provided" }, { status: 400 });
  }

  // Cap history to last 20 messages to stay within context limits
  const trimmed = messages.slice(-20);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: trimmed,
      }),
    });

    const data = await res.json();
    const reply = data.content?.[0]?.text ?? "Sorry, I couldn't get a response. Try again.";
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[Pulse AI] Chat error:", err);
    return NextResponse.json({ error: "AI unavailable" }, { status: 500 });
  }
}

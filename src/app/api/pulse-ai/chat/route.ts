import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/pulse-ai/chat
 *
 * Shared endpoint for:
 *   1. The Pulse AI drawer (real-time chat about connected data)
 *   2. Weekly report commentary generation
 *
 * Hits the local Ollama instance at http://localhost:11434
 * Model: llama3.1 (pulled during setup wizard)
 * No external API calls — fully on-device, works offline.
 *
 * Body (chat mode):
 *   { messages: { role: "user"|"assistant", content: string }[] }
 *
 * Body (report mode):
 *   { reportMode: true, data: ReportDataSnapshot }
 */

const OLLAMA_URL = "http://localhost:11434/api/chat";
const MODEL      = "llama3.1";

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

async function callOllama(messages: Message[]): Promise<string> {
  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama returned ${res.status}`);
  }

  const data = await res.json();
  return data.message?.content ?? "No response from Pulse AI.";
}

export async function POST(req: NextRequest) {
  let body: { messages?: Message[]; reportMode?: boolean; data?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ── Report commentary mode ─────────────────────────────────────────────────
  if (body.reportMode && body.data) {
    const prompt = `You are writing the AI commentary section of a weekly Pulse Analytics report.

Here is the data snapshot for this week:
${JSON.stringify(body.data, null, 2)}

Write a structured commentary with exactly these three sections:
1. What happened this week — 2-3 sentences summarising the key numbers
2. What's driving performance — 2-3 sentences identifying the biggest factors (good or bad)
3. What to do next — 3-4 specific, actionable recommendations with reasoning

Keep it professional but plain-English. No bullet points — full sentences only. Use the actual numbers from the data.`;

    try {
      const commentary = await callOllama([{ role: "user", content: prompt }]);
      return NextResponse.json({ commentary });
    } catch (err) {
      console.error("[Pulse AI] Report commentary error:", err);
      return NextResponse.json({ error: "Pulse AI unavailable — is the app running?" }, { status: 503 });
    }
  }

  // ── Chat mode ──────────────────────────────────────────────────────────────
  const messages: Message[] = body.messages ?? [];
  if (messages.length === 0) {
    return NextResponse.json({ error: "No messages provided" }, { status: 400 });
  }

  // Cap to last 20 messages
  const trimmed = messages.slice(-20);

  try {
    const reply = await callOllama(trimmed);
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[Pulse AI] Chat error:", err);
    return NextResponse.json(
      { reply: "Pulse AI is starting up — give it a moment and try again." },
      { status: 200 } // soft error so the drawer handles it gracefully
    );
  }
}

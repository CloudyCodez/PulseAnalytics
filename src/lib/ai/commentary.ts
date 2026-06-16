import Anthropic from "@anthropic-ai/sdk";
import type { ConnectorData } from "@/lib/connectors";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function generateCommentary(
  data: ConnectorData,
  user: { full_name?: string | null; company_name?: string | null; plan?: string | null }
): Promise<string> {
  const companyName = user.company_name ?? "your business";

  const metricsBlock = Object.entries(data)
    .map(([k, v]) => `${k}: ${typeof v === "number" ? v.toFixed(2) : v}`)
    .join("\n");

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    messages: [
      {
        role: "user",
        content: `You are the AI analyst inside Pulse, a business intelligence platform. Your job is to write a concise, actionable "What happened this week and what should you do about it" section for a weekly performance report.

Company: ${companyName}
Plan: ${user.plan ?? "growth"}

This week's metrics:
${metricsBlock}

Write 3-4 sentences in plain English. Be specific — use the actual numbers. Lead with the most important insight. End with 1-2 concrete action recommendations for next week. Tone: smart, direct, like a good CFO or growth advisor. No bullet points. No headers. Just clear prose that a business owner will immediately understand and act on.`,
      },
    ],
  });

  const content = message.content[0];
  return content.type === "text" ? content.text : "";
}

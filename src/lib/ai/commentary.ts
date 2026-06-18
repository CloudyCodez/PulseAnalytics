import type { ConnectorData } from "@/lib/connectors";

export async function generateCommentary(
  data: ConnectorData,
  user: { full_name?: string | null; company_name?: string | null; plan?: string | null }
): Promise<string> {
  // Commentary is generated locally via Ollama through /api/pulse-ai/chat
  // This function is a no-op on the web — only used in the Electron app context
  const companyName = user.company_name ?? user.full_name ?? "your business";
  const metricsBlock = Object.entries(data)
    .map(([k, v]) => `${k}: ${typeof v === "number" ? v.toFixed(2) : v}`)
    .join("\n");

  const res = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3.1",
      stream: false,
      messages: [
        {
          role: "user",
          content: `You are the AI analyst inside Pulse Analytics. Write a concise, actionable weekly performance commentary for ${companyName}.\n\nMetrics:\n${metricsBlock}\n\nWrite 3-4 sentences in plain English. Be specific — use the actual numbers. Lead with the most important insight. End with 1-2 concrete action recommendations. No bullet points, no headers, just clear prose.`,
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Ollama returned ${res.status}`);
  const json = await res.json();
  return json.message?.content ?? "";
}

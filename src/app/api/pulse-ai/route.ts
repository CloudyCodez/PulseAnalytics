import { NextRequest, NextResponse } from "next/server";

const OLLAMA_URL = "http://localhost:11434";

// GET — check Ollama health + list models
export async function GET() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ online: false, models: [] });
    const data = await res.json();
    const models: string[] = (data.models || []).map((m: { name: string }) => m.name);
    return NextResponse.json({ online: true, models });
  } catch {
    return NextResponse.json({ online: false, models: [] });
  }
}

// POST — proxy chat to Ollama, stream response back
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { model, messages } = body;

    if (!model) {
      return NextResponse.json({ error: "No model specified" }, { status: 400 });
    }

    // First verify Ollama is reachable
    const healthCheck = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    }).catch(() => null);

    if (!healthCheck?.ok) {
      return NextResponse.json({ error: "Ollama is not running on localhost:11434" }, { status: 503 });
    }

    const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream: true }),
      signal: AbortSignal.timeout(60000),
    });

    if (!ollamaRes.ok || !ollamaRes.body) {
      const errText = await ollamaRes.text().catch(() => "unknown");
      console.error("[pulse-ai] Ollama error:", ollamaRes.status, errText);
      return NextResponse.json(
        { error: `Ollama returned ${ollamaRes.status}: ${errText}` },
        { status: 502 }
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = ollamaRes.body!.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } catch (e) {
          console.error("[pulse-ai] Stream error:", e);
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[pulse-ai] POST error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

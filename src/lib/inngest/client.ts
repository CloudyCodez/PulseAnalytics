import { Inngest } from "inngest";

// Lazy singleton — avoids crashing at module load if env vars are missing
let _inngest: Inngest | null = null;

function getInngest(): Inngest {
  if (_inngest) return _inngest;
  const eventKey = process.env.INNGEST_EVENT_KEY;
  if (!eventKey || eventKey.startsWith("mock")) {
    // In dev/mock mode return an unconfigured client — it won't actually
    // send events but also won't crash the import chain.
    _inngest = new Inngest({ id: "pulse" });
  } else {
    _inngest = new Inngest({ id: "pulse", eventKey });
  }
  return _inngest;
}

// Named export used by all functions — access via getter so client is
// only constructed when a module that imports it is actually executed.
export const inngest = new Proxy({} as Inngest, {
  get(_target, prop) {
    return (getInngest() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

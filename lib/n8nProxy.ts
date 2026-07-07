import { NextRequest, NextResponse } from "next/server";

// Fabrik für Start-Proxy-Routen: POST-Body 1:1 an den n8n-Webhook durchreichen,
// Secret-Header serverseitig anhängen (Muster: geo-quick-check).
export function makeStartHandler(webhookPath: string) {
  return async function POST(req: NextRequest) {
    const base = process.env.N8N_BASE;
    const secret = process.env.N8N_ISO_SECRET;
    if (!base || !secret) {
      return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    try {
      const res = await fetch(`${base}/webhook/${webhookPath}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-iso-secret": secret },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(25_000),
      });
      const data = await res.json().catch(() => ({ error: "upstream_error" }));
      return NextResponse.json(data, { status: res.status });
    } catch {
      return NextResponse.json({ error: "upstream_unreachable" }, { status: 502 });
    }
  };
}

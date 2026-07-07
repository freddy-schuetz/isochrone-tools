import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 15;

export async function GET(req: NextRequest) {
  const base = process.env.N8N_BASE;
  const secret = process.env.N8N_ISO_SECRET;
  if (!base || !secret) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }
  const token = req.nextUrl.searchParams.get("token");
  if (!token || !/^[a-f0-9]{32}$/.test(token)) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }
  try {
    const res = await fetch(`${base}/webhook/iso-status?token=${encodeURIComponent(token)}`, {
      headers: { "x-iso-secret": secret },
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({ status: "error" }));
    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json({ status: "error", error_message: "upstream_unreachable" }, { status: 200 });
  }
}

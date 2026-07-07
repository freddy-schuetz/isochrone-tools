"use client";

import { useEffect, useRef, useState } from "react";
import type { CheckStatus, StatusResponse } from "./types";

const INTERVAL_MS = 2_000;
// Worst Case Backend: Isochrone (~5s) + 3 Overpass-Endpoints je 30s Timeout
const TIMEOUT_MS = 150_000;

// Pollt /api/status?token= bis done/error/Timeout. token=null → inaktiv.
export function usePolling<R>(token: string | null) {
  const [status, setStatus] = useState<CheckStatus | "idle" | "timeout">("idle");
  const [result, setResult] = useState<R | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const stop = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus("idle");
      setResult(null);
      setErrorMessage(null);
      return;
    }
    stop.current = false;
    setStatus("running");
    setResult(null);
    setErrorMessage(null);
    const started = Date.now();

    async function tick() {
      if (stop.current) return;
      if (Date.now() - started > TIMEOUT_MS) {
        setStatus("timeout");
        return;
      }
      try {
        const res = await fetch(`/api/status?token=${encodeURIComponent(token!)}`, { cache: "no-store" });
        const data = (await res.json()) as StatusResponse<R>;
        if (stop.current) return;
        if (data.status === "done" && data.result) {
          setResult(data.result);
          setStatus("done");
          return;
        }
        if (data.status === "error" || data.status === "not_found") {
          setErrorMessage(data.error_message ?? null);
          setStatus(data.status);
          return;
        }
      } catch {
        // transienter Fehler → weiter pollen bis Timeout
      }
      setTimeout(tick, INTERVAL_MS);
    }

    tick();
    return () => {
      stop.current = true;
    };
  }, [token]);

  return { status, result, errorMessage };
}

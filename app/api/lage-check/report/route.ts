import { makeStartHandler } from "@/lib/n8nProxy";

// PDF-Erzeugung via pdf.co kann >20s dauern
export const maxDuration = 60;
export const POST = makeStartHandler("iso-lage-check-report");

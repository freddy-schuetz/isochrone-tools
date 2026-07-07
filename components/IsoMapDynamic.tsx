"use client";

import dynamic from "next/dynamic";

// MapLibre braucht window → nie serverseitig rendern.
const IsoMapDynamic = dynamic(() => import("./IsoMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] w-full items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-500">
      Karte lädt …
    </div>
  ),
});

export default IsoMapDynamic;

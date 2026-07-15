"use client";

/* ============================================================
   Drill shell — was the topbar/switcher/init block in the
   prototype. Owns: drill switching, the flash overlay, the
   "Needs Chrome" gate, sign-out, and the Supabase score store.
   Drills stay plugins: they get a host element + a context.
   ============================================================ */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createScoreStore, type ScoreStore } from "@/lib/engine/scores";
import { getSpeechProvider } from "@/lib/engine/speech";
import { createSpeedrun } from "@/lib/drills/speedrun";
import { createPace } from "@/lib/drills/pace";
import type { DrillPlugin, FlashType } from "@/lib/engine/types";

type DrillKey = "speedrun" | "pace";

const FACTORIES: Record<
  DrillKey,
  (ctx: Parameters<typeof createSpeedrun>[0]) => DrillPlugin
> = {
  speedrun: createSpeedrun,
  pace: createPace,
};

const LABELS: Record<DrillKey, string> = {
  speedrun: "SPEEDRUN",
  pace: "PACE",
};

export default function DrillHost({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const hostRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const storeRef = useRef<ScoreStore | null>(null);
  const [drill, setDrill] = useState<DrillKey>("speedrun");
  const [supported, setSupported] = useState(true);
  const [ready, setReady] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // one-time init: feature-detect speech, load PBs from Supabase
  useEffect(() => {
    setSupported(getSpeechProvider().isSupported());
    const store = createScoreStore(supabase, userId, (m) => setSyncError(m));
    storeRef.current = store;
    store.load().finally(() => setReady(true));
  }, [supabase, userId]);

  // mount the active drill plugin; teardown on switch/unmount
  useEffect(() => {
    if (!ready || !supported || !hostRef.current || !storeRef.current) return;
    const flash = (type: FlashType) => {
      const el = flashRef.current;
      if (!el) return;
      el.className = "flash";
      void el.offsetWidth;
      el.className = "flash " + type;
      setTimeout(() => {
        el.className = "flash";
      }, 650);
    };
    const plugin = FACTORIES[drill]({ flash, scores: storeRef.current });
    plugin.mount(hostRef.current);
    return () => plugin.teardown();
  }, [drill, ready, supported]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="vto-shell">
      <div className="vto-app">
        <div className="topbar">
          <div className="brand">
            VTO <b>/ {LABELS[drill]}</b>
          </div>
          <div className="topbar-right">
            <div className="switch">
              <button
                className={drill === "speedrun" ? "on" : ""}
                onClick={() => setDrill("speedrun")}
              >
                Speedrun
              </button>
              <button
                className={drill === "pace" ? "on" : ""}
                onClick={() => setDrill("pace")}
              >
                Pace
              </button>
            </div>
            <button className="signout" onClick={signOut}>
              Exit
            </button>
          </div>
        </div>
        {syncError && <div className="syncbar">{syncError}</div>}
        <div id="host" ref={hostRef}>
          {!ready && <div className="host-loading">Loading bests…</div>}
        </div>
        <div className="flash" ref={flashRef} />
        <div className={"nope" + (supported ? "" : " show")}>
          <h2>Needs Chrome</h2>
          <p>
            This beta runs on live speech recognition, which only works in
            desktop Chrome or Edge. iOS Safari isn&apos;t supported yet —
            that&apos;s the v1.1 cloud-STT story.
          </p>
        </div>
      </div>
    </div>
  );
}

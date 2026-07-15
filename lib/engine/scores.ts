/* ============================================================
   Score store — replaces the prototype's in-memory PB object.

   Personal bests are computed from the Supabase `scores` table
   (speedrun: lowest ms wins; pace: highest control % wins) and
   cached in memory so drill code stays synchronous, exactly like
   the prototype's getPB/setPB. bank() persists every banked run.
   ============================================================ */

import type { SupabaseClient } from "@supabase/supabase-js";

export type DrillId = "speedrun" | "pace";

export interface ScoreStore {
  load(): Promise<void>;
  getPB(drill: DrillId, idx: number): number | null;
  setPB(drill: DrillId, idx: number, v: number): void;
  bank(drill: DrillId, idx: number, score: number): void;
}

export function createScoreStore(
  supabase: SupabaseClient,
  userId: string,
  onSyncError?: (msg: string) => void
): ScoreStore {
  const pbs: Record<string, number> = {};
  const key = (d: DrillId, i: number) => d + ":" + i;

  return {
    async load() {
      const { data, error } = await supabase
        .from("scores")
        .select("drill_id, level, score")
        .eq("user_id", userId);
      if (error) {
        onSyncError?.(
          "score sync offline — saved bests unavailable (is the scores table set up?)"
        );
        return;
      }
      for (const row of data ?? []) {
        const d = row.drill_id as DrillId;
        const i = Number(row.level) - 1;
        const s = Number(row.score);
        const k = key(d, i);
        const cur = pbs[k];
        if (cur === undefined) pbs[k] = s;
        else pbs[k] = d === "speedrun" ? Math.min(cur, s) : Math.max(cur, s);
      }
    },
    getPB: (d, i) => pbs[key(d, i)] ?? null,
    setPB: (d, i, v) => {
      pbs[key(d, i)] = v;
    },
    bank(d, i, score) {
      // level stored 1-based (tier/level number), matching what's on screen
      supabase
        .from("scores")
        .insert({ user_id: userId, drill_id: d, level: i + 1, score })
        .then(({ error }) => {
          if (error)
            onSyncError?.("run not saved — score sync failed, check setup");
        });
    },
  };
}

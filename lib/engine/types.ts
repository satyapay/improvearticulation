import type { ScoreStore } from "./scores";

export type FlashType = "win" | "death";

/** Everything a drill plugin gets from the shell — nothing else. */
export interface DrillContext {
  flash(type: FlashType): void;
  scores: ScoreStore;
}

/** Drills are plugins: the shell mounts one into a host element at a time. */
export interface DrillPlugin {
  label: string;
  mount(host: HTMLElement): void;
  teardown(): void;
}

/* Shared text utils — ported verbatim from the prototype. */

export const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, "")
    .replace(/'/g, "")
    .trim();

export const tokens = (s: string) => norm(s).split(/\s+/).filter(Boolean);

export const fmt = (ms: number) => (ms / 1000).toFixed(2);

export function lev(a: string, b: string): number {
  const m = a.length,
    n = b.length;
  if (!m) return n;
  if (!n) return m;
  const d = Array.from({ length: m + 1 }, (_, i) => [
    i,
    ...Array(n).fill(0),
  ]) as number[][];
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
  return d[m][n];
}

export function wordMatch(t: string, h: string): boolean {
  if (t === h) return true;
  return lev(t, h) <= (t.length <= 4 ? 1 : 2);
}

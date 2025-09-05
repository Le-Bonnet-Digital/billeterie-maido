import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Compute the average number of story points delivered over the last `n` sprints.
 * Defaults to reading from `SPRINT_HISTORY.md` at repo root.
 *
 * @param historyPath path to the sprint history markdown file
 * @param n number of recent sprints to average
 * @returns average story points delivered
 */
export function computeVelocity(
  historyPath = resolve('SPRINT_HISTORY.md'),
  n = 3,
): number {
  const content = readFileSync(historyPath, 'utf8');
  const matches = [...content.matchAll(/delivered\s+(\d+)\s+SP/gi)].map((m) =>
    Number(m[1]),
  );
  if (matches.length === 0) return 0;
  const recent = matches.slice(-n);
  const total = recent.reduce((acc, val) => acc + val, 0);
  return total / recent.length;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
  const avg = computeVelocity();
  // eslint-disable-next-line no-console
  console.log(avg.toFixed(2));
}

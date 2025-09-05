import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { computeVelocity } from '../../tools/velocity';

describe('computeVelocity', () => {
  it('calculates average of last three sprints', () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const path = resolve(__dirname, '../../SPRINT_HISTORY.md');
    const avg = computeVelocity(path);
    expect(avg).toBeCloseTo(8, 3);
  });
});

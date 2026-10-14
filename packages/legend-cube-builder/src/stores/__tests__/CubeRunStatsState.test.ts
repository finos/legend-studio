/**
 * Copyright (c) 2026-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { IR } from '@finos/legend-cube';
import { describe, expect, test } from '@jest/globals';
import { CubeRunStatsState, MAX_CUBE_RUN_STATS } from '../CubeRunStatsState.js';

describe('Run stats', () => {
  test('Keeps the latest runs, newest first, at most 15', () => {
    const stats = new CubeRunStatsState();
    for (let index = 1; index <= MAX_CUBE_RUN_STATS + 2; index += 1) {
      stats.record(`Run ${index}`, {
        durationMs: index,
        sql: [`select ${index}`],
        lambda: undefined,
      });
    }
    expect(MAX_CUBE_RUN_STATS).toBe(15);
    expect(stats.entries).toHaveLength(15);
    expect(stats.entries[0]).toMatchObject({
      label: 'Run 17',
      durationMs: 17,
      sql: ['select 17'],
    });
    expect(stats.entries.at(-1)?.label).toBe('Run 3');
    // each its own id
    expect(new Set(stats.entries.map((entry) => entry.id)).size).toBe(15);
    stats.clear();
    expect(stats.entries).toEqual([]);
  });

  test('Keeps the lambda a run sent, and why one failed, with no SQL', () => {
    const stats = new CubeRunStatsState();
    const lambda: IR = { k: 'lambda', params: [], body: [] };
    stats.record('Execute', { durationMs: 3, lambda, error: 'No table T' });
    expect(stats.entries[0]).toMatchObject({
      label: 'Execute',
      sql: [],
      error: 'No table T',
    });
    expect(stats.entries[0]?.lambda === lambda).toBe(true);
  });
});

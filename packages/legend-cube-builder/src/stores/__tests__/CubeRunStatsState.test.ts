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
import { beforeEach, describe, expect, test } from '@jest/globals';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import { LEGEND_CUBE_USER_DATA_KEY } from '../../__lib__/LegendCubeLabels.js';
import { CubeRunStatsState, MAX_CUBE_RUN_STATS } from '../CubeRunStatsState.js';

beforeEach(() => {
  localStorage.clear();
});

describe('Run stats', () => {
  test('Keeps the latest runs, newest first, at most 15', () => {
    const stats = new CubeRunStatsState(TEST__createCubeHost().host);
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
    const stats = new CubeRunStatsState(TEST__createCubeHost().host);
    const lambda: IR = { k: 'lambda', params: [], body: [] };
    stats.record('Execute', { durationMs: 3, lambda, error: 'No table T' });
    expect(stats.entries[0]).toMatchObject({
      label: 'Execute',
      sql: [],
      error: 'No table T',
    });
    expect(stats.entries[0]?.lambda === lambda).toBe(true);
  });

  test('Sends requests uncompressed once asked, and remembers it for the user (PLAN §11.16)', () => {
    const { host, fake } = TEST__createCubeHost();
    const stats = new CubeRunStatsState(host);
    // compressed by default: the host's client is left alone
    expect(stats.uncompressedRequests).toBe(false);
    expect(fake.setRequestCompression).not.toHaveBeenCalled();
    stats.setUncompressedRequests(true);
    expect(fake.setRequestCompression).toHaveBeenLastCalledWith(false);
    expect(
      host.applicationStore.userDataService.getBooleanValue(
        LEGEND_CUBE_USER_DATA_KEY.UNCOMPRESSED_REQUESTS,
      ),
    ).toBe(true);
    // a new page turns it off again for the user
    const next = TEST__createCubeHost(undefined, host.applicationStore);
    expect(new CubeRunStatsState(next.host).uncompressedRequests).toBe(true);
    expect(next.fake.setRequestCompression).toHaveBeenCalledWith(false);
    stats.setUncompressedRequests(false);
    expect(fake.setRequestCompression).toHaveBeenLastCalledWith(true);
  });
});

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

import { describe, expect, test } from '@jest/globals';
import {
  CUBE_SPORTS_EVENT_COUNT,
  CUBE_SPORTS_SETUP_SQLS,
} from '../fixtures/CubeSportsModel.js';
import {
  CUBE_TRADES_SETUP_SQLS,
  CUBE_TRADES_TRADE_COUNT,
} from '../fixtures/CubeTradesModel.js';
import {
  addSampleDays,
  createSampleRandom,
  sampleInsert,
} from '../fixtures/CubeSampleSql.js';

/** The rows of a table's insert, each value as the SQL writes it */
const insertedRows = (sqls: readonly string[], table: string): string[][] => {
  const insert = sqls.find((sql) => sql.startsWith(`insert into ${table} `));
  if (!insert) {
    throw new Error(`No insert into ${table}`);
  }
  // no sample text holds a parenthesis
  return [...insert.matchAll(/\(([^()]*)\)/gu)].map((match) =>
    (match[1] ?? '').split(', '),
  );
};

describe('Sample setup SQL', () => {
  test('Writes one insert of every row, quoting texts and dates and keeping NULL', () => {
    expect(
      sampleInsert('S.T', [
        [1, "it's", { date: '2025-01-02' }, { decimal: '1.50' }, null],
      ]),
    ).toBe(
      "insert into S.T values (1, 'it''s', DATE '2025-01-02', 1.50, NULL)",
    );
  });

  test('Gives the same numbers for the same seed', () => {
    const first = createSampleRandom(7);
    const second = createSampleRandom(7);
    const numbers = [first(), first(), first()];
    expect([second(), second(), second()]).toEqual(numbers);
    numbers.forEach((number) => {
      expect(number).toBeGreaterThanOrEqual(0);
      expect(number).toBeLessThan(1);
    });
  });

  test('Counts days across months and years', () => {
    expect(addSampleDays('2025-01-01', 0)).toBe('2025-01-01');
    expect(addSampleDays('2025-01-01', 59)).toBe('2025-03-01');
    expect(addSampleDays('2025-12-31', 1)).toBe('2026-01-01');
  });
});

describe('The sports sample', () => {
  const sports = insertedRows(CUBE_SPORTS_SETUP_SQLS, 'SPORTS_SAMPLE.SPORTS');
  const events = insertedRows(CUBE_SPORTS_SETUP_SQLS, 'SPORTS_SAMPLE.EVENTS');

  test('Has ten sports and its events, each of a sport, in 2025', () => {
    expect(sports).toHaveLength(10);
    expect(events).toHaveLength(CUBE_SPORTS_EVENT_COUNT);
    events.forEach(([, sportId, , , date]) => {
      expect(Number(sportId)).toBeGreaterThanOrEqual(1);
      expect(Number(sportId)).toBeLessThanOrEqual(10);
      expect(date).toMatch(/^DATE '2025-\d\d-\d\d'$/u);
    });
  });

  test('Has finals in Europe, and some events with no attendance', () => {
    expect(
      events.filter(
        ([, , , stage, , region]) =>
          stage === "'Final'" && region === "'Europe'",
      ).length,
    ).toBeGreaterThan(0);
    expect(events.some((row) => row[7] === 'NULL')).toBe(true);
  });
});

describe('The trades sample', () => {
  const trades = insertedRows(CUBE_TRADES_SETUP_SQLS, 'TRADES_SAMPLE.TRADES');

  test('Has its trades, on weekdays of the first half of 2026', () => {
    expect(trades).toHaveLength(CUBE_TRADES_TRADE_COUNT);
    trades.forEach(([, date]) => {
      const day = (date ?? '').slice("DATE '".length, -1);
      expect(day >= '2026-01-01' && day <= '2026-06-30').toBe(true);
      expect([0, 6]).not.toContain(new Date(`${day}T00:00:00Z`).getUTCDay());
    });
  });

  test('Has buys and sells, each notional the quantity times the price, to the cent', () => {
    expect(new Set(trades.map((row) => row[4]))).toEqual(
      new Set(["'BUY'", "'SELL'"]),
    );
    trades.forEach(([, , , , , quantity, price, notional]) => {
      expect(price).toMatch(/^\d+\.\d{4}$/u);
      expect(notional).toMatch(/^\d+\.\d{2}$/u);
      expect(
        Math.abs(Number(quantity) * Number(price) - Number(notional)),
      ).toBeLessThanOrEqual(0.005 + 1e-6);
    });
  });
});

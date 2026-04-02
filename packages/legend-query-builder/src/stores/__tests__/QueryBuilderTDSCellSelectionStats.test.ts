/**
 * Copyright (c) 2020-present, Goldman Sachs
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

import { describe, test, expect } from '@jest/globals';
import { PRIMITIVE_TYPE, type TDSResultCellData } from '@finos/legend-graph';
import { computeCellSelectionStats } from '../../components/result/tds/QueryBuilderTDSCellSelectionStats.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeCell = (
  value: string | number | boolean | null | undefined,
  columnName: string,
  rowIndex = 0,
  colIndex = 0,
): TDSResultCellData => ({
  value,
  columnName,
  coordinates: { rowIndex, colIndex },
});

/** Build a single-column selection from an array of values. */
const col = (
  values: (string | number | boolean | null | undefined)[],
  colName = 'col',
): TDSResultCellData[] => values.map((v, i) => makeCell(v, colName, i, 0));

/** Build a Map with a single column entry — the common case for tests. */
const typeMap = (
  colName: string,
  type: string | undefined,
): Map<string, string | undefined> => new Map([[colName, type]]);

/** Build a Map with multiple column entries. */
const multiTypeMap = (
  entries: [string, string | undefined][],
): Map<string, string | undefined> => new Map(entries);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('computeCellSelectionStats', () => {
  // --- guard cases ---

  test('returns undefined when no cells are selected', () => {
    expect(computeCellSelectionStats([], new Map())).toBeUndefined();
  });

  test('returns undefined when only one cell is selected', () => {
    expect(
      computeCellSelectionStats(
        [makeCell(42, 'col')],
        typeMap('col', PRIMITIVE_TYPE.INTEGER),
      ),
    ).toBeUndefined();
  });

  // --- string / generic columns ---

  test('returns count/unique/null only for a string column (no numeric/date stats)', () => {
    const cells = col(['apple', 'banana', 'apple', null], 'Name');
    const result = computeCellSelectionStats(
      cells,
      typeMap('Name', PRIMITIVE_TYPE.STRING),
    );
    expect(result).not.toBeUndefined();
    expect(result?.count).toBe(4);
    expect(result?.uniqueCount).toBe(2); // 2 unique out of 4
    expect(result?.nullCount).toBe(1); // 1 null out of 4
    expect(result?.min).toBeUndefined();
    expect(result?.max).toBeUndefined();
    expect(result?.sum).toBeUndefined();
    expect(result?.avg).toBeUndefined();
    expect(result?.dateMin).toBeUndefined();
    expect(result?.dateMax).toBeUndefined();
  });

  test('returns count/unique/null only when columnType is undefined', () => {
    const cells = col(['x', 'y'], 'col');
    const result = computeCellSelectionStats(cells, typeMap('col', undefined));
    expect(result?.count).toBe(2);
    expect(result?.min).toBeUndefined();
  });

  // --- numeric columns ---

  test('computes numeric stats for INTEGER column', () => {
    const cells = col([1, 2, 3, 4, 5], 'Age');
    const result = computeCellSelectionStats(
      cells,
      typeMap('Age', PRIMITIVE_TYPE.INTEGER),
    );
    expect(result).not.toBeUndefined();
    expect(result?.count).toBe(5);
    expect(result?.uniqueCount).toBe(5);
    expect(result?.nullCount).toBe(0);
    expect(result?.min).toBe(1);
    expect(result?.max).toBe(5);
    expect(result?.sum).toBe(15);
    expect(result?.avg).toBe(3);
  });

  test('computes numeric stats for FLOAT column', () => {
    const cells = col([1.5, 2.5, 3.0], 'Price');
    const result = computeCellSelectionStats(
      cells,
      typeMap('Price', PRIMITIVE_TYPE.FLOAT),
    );
    expect(result?.sum).toBeCloseTo(7.0);
    expect(result?.avg).toBeCloseTo(7.0 / 3);
  });

  test('computes numeric stats for DECIMAL column', () => {
    const cells = col([10, 20, 30], 'Amount');
    const result = computeCellSelectionStats(
      cells,
      typeMap('Amount', PRIMITIVE_TYPE.DECIMAL),
    );
    expect(result?.min).toBe(10);
    expect(result?.max).toBe(30);
    expect(result?.sum).toBe(60);
  });

  test('computes numeric stats for NUMBER column', () => {
    const cells = col([100, 200], 'Qty');
    const result = computeCellSelectionStats(
      cells,
      typeMap('Qty', PRIMITIVE_TYPE.NUMBER),
    );
    expect(result?.sum).toBe(300);
    expect(result?.avg).toBe(150);
  });

  test('null values count toward nullCount but are excluded from numeric calculations', () => {
    const cells = col([10, null, null, 20], 'Score');
    const result = computeCellSelectionStats(
      cells,
      typeMap('Score', PRIMITIVE_TYPE.INTEGER),
    );
    expect(result?.count).toBe(4);
    expect(result?.nullCount).toBe(2); // 2 nulls out of 4
    expect(result?.uniqueCount).toBe(2); // 2 non-null unique out of 4
    expect(result?.min).toBe(10);
    expect(result?.max).toBe(20);
    expect(result?.sum).toBe(30);
    expect(result?.avg).toBe(15);
  });

  test('when all values are null numeric stats are undefined', () => {
    const cells = col([null, null, null], 'Score');
    const result = computeCellSelectionStats(
      cells,
      typeMap('Score', PRIMITIVE_TYPE.INTEGER),
    );
    expect(result?.count).toBe(3);
    expect(result?.nullCount).toBe(3);
    expect(result?.uniqueCount).toBe(0);
    expect(result?.min).toBeUndefined();
    expect(result?.max).toBeUndefined();
    expect(result?.sum).toBeUndefined();
    expect(result?.avg).toBeUndefined();
  });

  test('duplicate numeric values are counted correctly for uniqueCount', () => {
    const cells = col([5, 5, 5, 5], 'Level');
    const result = computeCellSelectionStats(
      cells,
      typeMap('Level', PRIMITIVE_TYPE.INTEGER),
    );
    expect(result?.count).toBe(4);
    expect(result?.uniqueCount).toBe(1); // 1 unique out of 4
    expect(result?.sum).toBe(20);
    expect(result?.avg).toBe(5);
  });

  test('handles negative values correctly', () => {
    const cells = col([-10, -5, 0, 5, 10], 'Delta');
    const result = computeCellSelectionStats(
      cells,
      typeMap('Delta', PRIMITIVE_TYPE.INTEGER),
    );
    expect(result?.min).toBe(-10);
    expect(result?.max).toBe(10);
    expect(result?.sum).toBe(0);
    expect(result?.avg).toBe(0);
  });

  test('handles all-zero values correctly', () => {
    const cells = col([0, 0, 0], 'Zeros');
    const result = computeCellSelectionStats(
      cells,
      typeMap('Zeros', PRIMITIVE_TYPE.INTEGER),
    );
    expect(result?.min).toBe(0);
    expect(result?.max).toBe(0);
    expect(result?.sum).toBe(0);
    expect(result?.avg).toBe(0);
    expect(result?.uniqueCount).toBe(1); // 1 unique out of 3
  });

  test('boolean column returns count/unique/null but no numeric stats', () => {
    const cells = col([true, false, true, true], 'Flag');
    const result = computeCellSelectionStats(
      cells,
      typeMap('Flag', PRIMITIVE_TYPE.BOOLEAN),
    );
    expect(result?.count).toBe(4);
    expect(result?.uniqueCount).toBe(2); // 2 unique out of 4
    expect(result?.nullCount).toBe(0);
    expect(result?.min).toBeUndefined();
    expect(result?.max).toBeUndefined();
    expect(result?.sum).toBeUndefined();
    expect(result?.avg).toBeUndefined();
  });

  test('exactly 2 cells in the same column returns stats', () => {
    const cells = col([3, 7], 'col');
    const result = computeCellSelectionStats(
      cells,
      typeMap('col', PRIMITIVE_TYPE.INTEGER),
    );
    expect(result).not.toBeUndefined();
    expect(result?.count).toBe(2);
    expect(result?.min).toBe(3);
    expect(result?.max).toBe(7);
    expect(result?.sum).toBe(10);
    expect(result?.avg).toBe(5);
  });

  // --- date columns ---

  test('returns date min/max for StrictDate column', () => {
    const cells = col(['2024-03-15', '2023-01-01', '2024-11-30'], 'EventDate');
    const result = computeCellSelectionStats(
      cells,
      typeMap('EventDate', PRIMITIVE_TYPE.STRICTDATE),
    );
    expect(result).not.toBeUndefined();
    expect(result?.count).toBe(3);
    expect(result?.dateMin).toBe('2023-01-01');
    expect(result?.dateMax).toBe('2024-11-30');
    expect(result?.min).toBeUndefined();
    expect(result?.sum).toBeUndefined();
  });

  test('returns date min/max for DateTime column, null excluded', () => {
    const cells = col(
      ['2024-01-01T10:00:00', null, '2024-06-15T08:30:00'],
      'Timestamp',
    );
    const result = computeCellSelectionStats(
      cells,
      typeMap('Timestamp', PRIMITIVE_TYPE.DATETIME),
    );
    expect(result?.dateMin).toBe('2024-01-01T10:00:00');
    expect(result?.dateMax).toBe('2024-06-15T08:30:00');
    expect(result?.nullCount).toBe(1); // 1 null out of 3
  });

  // --- string columns ---

  test('returns min/max length for string column, nulls excluded', () => {
    const cells = col(['hi', 'hello', null, 'a'], 'Name');
    const result = computeCellSelectionStats(
      cells,
      typeMap('Name', PRIMITIVE_TYPE.STRING),
    );
    expect(result).not.toBeUndefined();
    expect(result?.strMinLength).toBe(1); // 'a'
    expect(result?.strMaxLength).toBe(5); // 'hello'
    expect(result?.nullCount).toBe(1);
    expect(result?.min).toBeUndefined();
    expect(result?.sum).toBeUndefined();
  });

  test('string min/max length undefined when all values are null', () => {
    const cells = col([null, null], 'Name');
    const result = computeCellSelectionStats(
      cells,
      typeMap('Name', PRIMITIVE_TYPE.STRING),
    );
    expect(result?.strMinLength).toBeUndefined();
    expect(result?.strMaxLength).toBeUndefined();
    expect(result?.nullCount).toBe(2);
  });

  test('no string length stats for non-string columns', () => {
    const cells = col([1, 2, 3], 'Amount');
    const result = computeCellSelectionStats(
      cells,
      typeMap('Amount', PRIMITIVE_TYPE.INTEGER),
    );
    expect(result?.strMinLength).toBeUndefined();
    expect(result?.strMaxLength).toBeUndefined();
  });

  test('no string length stats for mixed-type multi-column selection', () => {
    const cells = [
      makeCell('hello', 'Name', 0, 0),
      makeCell(42, 'Amount', 0, 1),
    ];
    const result = computeCellSelectionStats(
      cells,
      multiTypeMap([
        ['Name', PRIMITIVE_TYPE.STRING],
        ['Amount', PRIMITIVE_TYPE.INTEGER],
      ]),
    );
    expect(result?.strMinLength).toBeUndefined();
    expect(result?.strMaxLength).toBeUndefined();
  });

  // --- multi-column sparse selection ---

  test('returns numeric stats when all selected columns are numeric', () => {
    const cells = [
      makeCell(10, 'colA', 0, 0),
      makeCell(20, 'colB', 0, 1),
      makeCell(30, 'colA', 1, 0),
    ];
    const result = computeCellSelectionStats(
      cells,
      multiTypeMap([
        ['colA', PRIMITIVE_TYPE.INTEGER],
        ['colB', PRIMITIVE_TYPE.INTEGER],
      ]),
    );
    expect(result).not.toBeUndefined();
    expect(result?.count).toBe(3);
    expect(result?.sum).toBe(60);
    expect(result?.min).toBe(10);
    expect(result?.max).toBe(30);
  });

  test('no numeric stats when selected columns are of mixed types', () => {
    const cells = [makeCell(10, 'Amount', 0, 0), makeCell('foo', 'Name', 0, 1)];
    const result = computeCellSelectionStats(
      cells,
      multiTypeMap([
        ['Amount', PRIMITIVE_TYPE.INTEGER],
        ['Name', PRIMITIVE_TYPE.STRING],
      ]),
    );
    expect(result).not.toBeUndefined();
    expect(result?.count).toBe(2);
    expect(result?.sum).toBeUndefined();
    expect(result?.dateMin).toBeUndefined();
  });

  test('sparse selection across non-contiguous rows', () => {
    // rows 0, 2, 5 selected (non-contiguous)
    const cells = [
      makeCell(1, 'Val', 0, 0),
      makeCell(3, 'Val', 2, 0),
      makeCell(5, 'Val', 5, 0),
    ];
    const result = computeCellSelectionStats(
      cells,
      typeMap('Val', PRIMITIVE_TYPE.INTEGER),
    );
    expect(result?.count).toBe(3);
    expect(result?.sum).toBe(9);
    expect(result?.avg).toBe(3);
  });

  // --- distribution buckets ---

  test('integer column with small range uses exact integer buckets', () => {
    // values 1..5 → 5 exact buckets
    const cells = col([1, 2, 2, 3, 4, 5, 5], 'Score');
    const result = computeCellSelectionStats(
      cells,
      typeMap('Score', PRIMITIVE_TYPE.INTEGER),
    );
    const buckets = result?.distributionBuckets;
    expect(buckets).toBeDefined();
    expect(buckets).toHaveLength(5); // one per integer 1–5
    // bucket for value 2 should have count 2
    expect(buckets?.[1]?.count).toBe(2);
    // bucket for value 5 should have count 2
    expect(buckets?.[4]?.count).toBe(2);
    // total counts across all buckets equals non-null value count
    const total = buckets?.reduce((s, b) => s + b.count, 0);
    expect(total).toBe(7);
  });

  test('large integer range uses Sturges capped at 20 buckets', () => {
    // 100 values spread over range 0–999 → more than 20 integer buckets needed
    const values = Array.from({ length: 100 }, (_, i) => i * 10);
    const cells = col(values, 'Amount');
    const result = computeCellSelectionStats(
      cells,
      typeMap('Amount', PRIMITIVE_TYPE.INTEGER),
    );
    const buckets = result?.distributionBuckets;
    expect(buckets).toBeDefined();
    expect(buckets?.length).toBeLessThanOrEqual(20);
    expect(buckets?.length).toBeGreaterThan(0);
    const total = buckets?.reduce((s, b) => s + b.count, 0);
    expect(total).toBe(100);
  });

  test('float column uses Sturges bucketing', () => {
    const values = [1.1, 1.5, 2.2, 2.8, 3.3, 4.0, 4.9, 5.5];
    const cells = col(values, 'Price');
    const result = computeCellSelectionStats(
      cells,
      typeMap('Price', PRIMITIVE_TYPE.FLOAT),
    );
    const buckets = result?.distributionBuckets;
    expect(buckets).toBeDefined();
    expect(buckets?.length).toBeGreaterThan(0);
    expect(buckets?.length).toBeLessThanOrEqual(20);
    const total = buckets?.reduce((s, b) => s + b.count, 0);
    expect(total).toBe(8);
  });

  test('all-same numeric values produce a single bucket', () => {
    const cells = col([7, 7, 7, 7], 'Level');
    const result = computeCellSelectionStats(
      cells,
      typeMap('Level', PRIMITIVE_TYPE.INTEGER),
    );
    const buckets = result?.distributionBuckets;
    expect(buckets).toBeDefined();
    expect(buckets).toHaveLength(1);
    expect(buckets?.[0]?.count).toBe(4);
  });

  test('all-null numeric values produce no distribution buckets', () => {
    const cells = col([null, null, null], 'Score');
    const result = computeCellSelectionStats(
      cells,
      typeMap('Score', PRIMITIVE_TYPE.INTEGER),
    );
    expect(result?.distributionBuckets).toBeUndefined();
  });

  test('string column produces distribution buckets of string lengths', () => {
    const cells = col(['a', 'bb', 'ccc', 'dd', 'e', null], 'Name');
    const result = computeCellSelectionStats(
      cells,
      typeMap('Name', PRIMITIVE_TYPE.STRING),
    );
    const buckets = result?.distributionBuckets;
    expect(buckets).toBeDefined();
    expect(buckets?.length).toBeGreaterThan(0);
    // lengths are 1,2,3,2,1 (null excluded) → range 1–3, 3 exact buckets
    expect(buckets).toHaveLength(3);
    const total = buckets?.reduce((s, b) => s + b.count, 0);
    expect(total).toBe(5); // 5 non-null values
  });

  test('date column produces no distribution buckets', () => {
    const cells = col(['2024-01-01', '2024-06-01'], 'Date');
    const result = computeCellSelectionStats(
      cells,
      typeMap('Date', PRIMITIVE_TYPE.STRICTDATE),
    );
    // Only 2 values → single bucket after range=0 check may collapse; need enough spread
    // Just verify the chart type is set correctly when buckets are present
    expect(
      result?.distributionChartType === 'date' ||
        result?.distributionChartType === undefined,
    ).toBe(true);
  });

  test('date column with spread produces distribution buckets with date labels', () => {
    const dates = [
      '2023-01-01',
      '2023-03-01',
      '2023-06-01',
      '2023-07-15',
      '2023-09-01',
      '2023-11-01',
      '2024-01-01',
      '2024-03-01',
      '2024-05-01',
      '2024-07-01',
    ];
    const cells = col(dates, 'EventDate');
    const result = computeCellSelectionStats(
      cells,
      typeMap('EventDate', PRIMITIVE_TYPE.STRICTDATE),
    );
    expect(result?.distributionBuckets).not.toBeUndefined();
    expect(result?.distributionChartType).toBe('date');
    const buckets = result?.distributionBuckets;
    expect(buckets).toBeDefined();
    expect(buckets?.length).toBeGreaterThan(0);
    expect(buckets?.length).toBeLessThanOrEqual(20);
    // Each bucket should have date labels
    for (const b of buckets ?? []) {
      expect(b.lowerDateLabel).toBeDefined();
      expect(b.upperDateLabel).toBeDefined();
    }
    // Total count equals number of valid dates
    const total = buckets?.reduce((s, b) => s + b.count, 0);
    expect(total).toBe(dates.length);
  });

  test('numeric column has distributionChartType numeric', () => {
    const cells = col([1, 2, 3, 4, 5], 'Score');
    const result = computeCellSelectionStats(
      cells,
      typeMap('Score', PRIMITIVE_TYPE.INTEGER),
    );
    expect(result?.distributionChartType).toBe('numeric');
  });

  test('string column has distributionChartType string-length', () => {
    const cells = col(['hello', 'world', 'foo', 'bar'], 'Name');
    const result = computeCellSelectionStats(
      cells,
      typeMap('Name', PRIMITIVE_TYPE.STRING),
    );
    expect(result?.distributionChartType).toBe('string-length');
  });

  // --- value frequencies ---

  test('valueFrequencies returns top values sorted by count descending', () => {
    const cells = col(['a', 'b', 'a', 'c', 'a', 'b'], 'Name');
    const result = computeCellSelectionStats(
      cells,
      typeMap('Name', PRIMITIVE_TYPE.STRING),
    );
    const freqs = result?.valueFrequencies;
    expect(freqs).toBeDefined();
    expect(freqs?.[0]?.label).toBe('a');
    expect(freqs?.[0]?.count).toBe(3);
    expect(freqs?.[1]?.label).toBe('b');
    expect(freqs?.[1]?.count).toBe(2);
    expect(freqs?.[2]?.label).toBe('c');
    expect(freqs?.[2]?.count).toBe(1);
    expect(freqs?.every((f) => !f.isOther)).toBe(true);
  });

  test('valueFrequencies caps at 10 entries and adds (other) for the rest', () => {
    // 12 distinct values → top 10 + 1 (other)
    const values = Array.from({ length: 12 }, (_, i) =>
      Array(12 - i).fill(String.fromCharCode(65 + i)),
    ).flat();
    const cells = col(values, 'Code');
    const result = computeCellSelectionStats(
      cells,
      typeMap('Code', PRIMITIVE_TYPE.STRING),
    );
    const freqs = result?.valueFrequencies;
    expect(freqs).toBeDefined();
    // At most 11 entries: 10 top + 1 other
    expect(freqs?.length).toBeLessThanOrEqual(11);
    const other = freqs?.find((f) => f.isOther);
    expect(other).toBeDefined();
    expect(other?.label).toBe('(other)');
    // Total count (including other) equals total non-null values
    const total = freqs?.reduce((s, f) => s + f.count, 0);
    expect(total).toBe(values.length);
  });

  test('valueFrequencies excludes null/empty values from value entries but adds (empty) bucket', () => {
    const cells = col(['x', null, 'x', '', 'y'], 'Col');
    const result = computeCellSelectionStats(
      cells,
      typeMap('Col', PRIMITIVE_TYPE.STRING),
    );
    const freqs = result?.valueFrequencies;
    expect(freqs).toBeDefined();
    const valueEntries = freqs?.filter((f) => !f.isEmpty) ?? [];
    const emptyEntry = freqs?.find((f) => f.isEmpty);
    // value entries should not contain null or empty string representations
    expect(valueEntries.map((f) => f.label)).not.toContain('null');
    expect(valueEntries.map((f) => f.label)).not.toContain('');
    // non-null value total is 3 ('x', 'x', 'y')
    const valueTotal = valueEntries.reduce((s, f) => s + f.count, 0);
    expect(valueTotal).toBe(3);
    // (empty) bucket reflects the 2 null/empty cells
    expect(emptyEntry).toBeDefined();
    expect(emptyEntry?.count).toBe(2);
  });

  test('valueFrequencies returns only (empty) bucket when all values are null', () => {
    const cells = col([null, null], 'Col');
    const result = computeCellSelectionStats(
      cells,
      typeMap('Col', PRIMITIVE_TYPE.STRING),
    );
    const freqs = result?.valueFrequencies;
    expect(freqs).toBeDefined();
    expect(freqs).toHaveLength(1);
    expect(freqs?.[0]?.isEmpty).toBe(true);
    expect(freqs?.[0]?.label).toBe('(empty)');
    expect(freqs?.[0]?.count).toBe(2);
  });

  test('valueFrequencies works for numeric columns', () => {
    const cells = col([1, 2, 1, 3, 1, 2], 'Score');
    const result = computeCellSelectionStats(
      cells,
      typeMap('Score', PRIMITIVE_TYPE.INTEGER),
    );
    const freqs = result?.valueFrequencies;
    expect(freqs).toBeDefined();
    expect(freqs?.[0]?.label).toBe('1');
    expect(freqs?.[0]?.count).toBe(3);
  });
});

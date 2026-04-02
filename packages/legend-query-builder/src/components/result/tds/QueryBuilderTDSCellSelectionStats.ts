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

import { type TDSResultCellData, PRIMITIVE_TYPE } from '@finos/legend-graph';

export interface ValueFrequency {
  /** String representation of the value, or '(other)' / '(empty)' for synthetic buckets */
  label: string;
  count: number;
  /** True for the synthetic '(other)' bucket */
  isOther?: boolean;
  /** True for the synthetic '(empty)' bucket */
  isEmpty?: boolean;
}

export interface DistributionBucket {
  /** Lower bound of the bucket (inclusive) */
  lower: number;
  /** Upper bound of the bucket (exclusive, except the last which is inclusive) */
  upper: number;
  /** Number of values that fall in this bucket */
  count: number;
  /** For date columns: human-readable label for lower bound */
  lowerDateLabel?: string;
  /** For date columns: human-readable label for upper bound */
  upperDateLabel?: string;
}

/** Discriminates how the chart tooltip should describe bucket bounds */
export type DistributionChartType = 'numeric' | 'string-length' | 'date';

export interface CellSelectionStats {
  count: number;
  uniqueCount: number;
  nullCount: number;
  min: number | undefined;
  max: number | undefined;
  sum: number | undefined;
  avg: number | undefined;
  dateMin: string | undefined;
  dateMax: string | undefined;
  strMinLength: number | undefined;
  strMaxLength: number | undefined;
  /** Frequency distribution histogram buckets.
   *  Computed for numeric, string (length), and date columns.
   *  undefined for other types. */
  distributionBuckets: DistributionBucket[] | undefined;
  /** Describes what the bucket bounds represent, for tooltip formatting */
  distributionChartType: DistributionChartType | undefined;
  /** Top-10 value frequencies for the Unique Count tooltip, plus optional (other) */
  valueFrequencies: ValueFrequency[] | undefined;
}

const NUMERIC_TYPES = new Set<string>([
  PRIMITIVE_TYPE.INTEGER,
  PRIMITIVE_TYPE.FLOAT,
  PRIMITIVE_TYPE.DECIMAL,
  PRIMITIVE_TYPE.NUMBER,
]);

const DATE_TYPES = new Set<string>([
  PRIMITIVE_TYPE.DATE,
  PRIMITIVE_TYPE.STRICTDATE,
  PRIMITIVE_TYPE.DATETIME,
]);

const STRING_TYPES = new Set<string>([PRIMITIVE_TYPE.STRING]);

const MAX_BUCKETS = 20;

/**
 * Build a frequency-distribution histogram for an array of numeric values.
 * ...existing code...
 */
const computeDistribution = (values: number[]): DistributionBucket[] => {
  if (values.length === 0) {
    return [];
  }

  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const range = dataMax - dataMin;

  if (range === 0) {
    return [{ lower: dataMin, upper: dataMax, count: values.length }];
  }

  // Use exact integer buckets when range is small enough
  const allIntegers = values.every((v) => Number.isInteger(v));
  const intRange = dataMax - dataMin + 1;
  let bucketCount: number;
  if (allIntegers && intRange <= MAX_BUCKETS) {
    bucketCount = intRange;
  } else {
    // Sturges' rule, capped at MAX_BUCKETS
    bucketCount = Math.min(
      MAX_BUCKETS,
      Math.ceil(Math.log2(values.length) + 1),
    );
  }

  const bucketSize = range / bucketCount;
  const buckets: DistributionBucket[] = Array.from(
    { length: bucketCount },
    (_, i) => ({
      lower: dataMin + i * bucketSize,
      upper: dataMin + (i + 1) * bucketSize,
      count: 0,
    }),
  );

  for (const v of values) {
    const idx = Math.min(
      bucketCount - 1,
      Math.floor((v - dataMin) / bucketSize),
    );
    const bucket = buckets[idx];
    if (bucket) {
      bucket.count += 1;
    }
  }

  return buckets;
};

/**
 * Format an epoch-ms timestamp back to an ISO date/datetime string.
 * Uses date-only format (YYYY-MM-DD) when the time component is midnight UTC.
 */
const epochToDateLabel = (epochMs: number): string => {
  const d = new Date(epochMs);
  if (
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
  ) {
    return d.toISOString().slice(0, 10);
  }
  return d.toISOString().replace('T', ' ').slice(0, 19);
};

/**
 * Build a frequency-distribution histogram for an array of ISO date strings.
 * Buckets are computed over epoch-ms timestamps; each bucket carries
 * human-readable date labels for tooltip display.
 */
const computeDateDistribution = (
  dateStrings: string[],
): DistributionBucket[] => {
  if (dateStrings.length === 0) {
    return [];
  }

  const epochs = dateStrings
    .map((s) => Date.parse(s))
    .filter((e) => !Number.isNaN(e));
  if (epochs.length === 0) {
    return [];
  }

  const raw = computeDistribution(epochs);
  return raw.map((b) => ({
    ...b,
    lowerDateLabel: epochToDateLabel(b.lower),
    upperDateLabel: epochToDateLabel(b.upper),
  }));
};

const MAX_FREQ_ENTRIES = 10;

/**
 * Safely convert an unknown value to a string key.
 * Objects are serialised with JSON.stringify to avoid '[object Object]'.
 */
const valueToString = (v: unknown): string => {
  if (typeof v === 'string') {
    return v;
  }
  if (typeof v === 'number' || typeof v === 'boolean') {
    return String(v);
  }
  if (v === null || v === undefined) {
    return '';
  }
  return JSON.stringify(v);
};

/**
 * Build top-N value frequency list from non-null values.
 * Values beyond the top N are collapsed into a single '(other)' entry.
 * If nullCount > 0, an '(empty)' entry is appended at the end.
 */
const computeValueFrequencies = (
  nonNullValues: unknown[],
  nullCount: number,
): ValueFrequency[] => {
  const freq = new Map<string, number>();
  for (const v of nonNullValues) {
    const key = valueToString(v);
    freq.set(key, (freq.get(key) ?? 0) + 1);
  }

  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, MAX_FREQ_ENTRIES);
  const otherCount = sorted
    .slice(MAX_FREQ_ENTRIES)
    .reduce((s, [, c]) => s + c, 0);

  const result: ValueFrequency[] = top.map(([label, count]) => ({
    label,
    count,
  }));
  if (otherCount > 0) {
    result.push({ label: '(other)', count: otherCount, isOther: true });
  }
  if (nullCount > 0) {
    result.push({ label: '(empty)', count: nullCount, isEmpty: true });
  }
  return result;
};

// ---------------------------------------------------------------------------
// Private helpers for computeCellSelectionStats
// ---------------------------------------------------------------------------

type ColumnTypeCategory = 'numeric' | 'date' | 'string' | 'mixed';

const classifyColumns = (
  columnNames: Set<string>,
  columnTypes: Map<string, string | undefined>,
): ColumnTypeCategory => {
  const isType = (typeSet: Set<string>): boolean =>
    [...columnNames].every((col) => {
      const t = columnTypes.get(col);
      return t !== undefined && typeSet.has(t);
    });
  if (isType(NUMERIC_TYPES)) {
    return 'numeric';
  }
  if (isType(DATE_TYPES)) {
    return 'date';
  }
  if (isType(STRING_TYPES)) {
    return 'string';
  }
  return 'mixed';
};

const buildBaseStats = (
  count: number,
  uniqueCount: number,
  nullCount: number,
  valueFrequencies: ValueFrequency[] | undefined,
): CellSelectionStats => ({
  count,
  uniqueCount,
  nullCount,
  min: undefined,
  max: undefined,
  sum: undefined,
  avg: undefined,
  dateMin: undefined,
  dateMax: undefined,
  strMinLength: undefined,
  strMaxLength: undefined,
  distributionBuckets: undefined,
  distributionChartType: undefined,
  valueFrequencies,
});

const computeNumericStats = (
  base: CellSelectionStats,
  selectedCells: TDSResultCellData[],
  valueFrequencies: ValueFrequency[] | undefined,
): CellSelectionStats => {
  const numericValues = selectedCells
    .map((c) => {
      if (c.value === null || c.value === undefined || c.value === '') {
        return null;
      }
      const n = Number(c.value);
      return Number.isNaN(n) ? null : n;
    })
    .filter((v): v is number => v !== null);

  if (numericValues.length === 0) {
    return { ...base, valueFrequencies };
  }

  const sum = numericValues.reduce((acc, n) => acc + n, 0);
  return {
    ...base,
    min: Math.min(...numericValues),
    max: Math.max(...numericValues),
    sum,
    avg: sum / numericValues.length,
    distributionBuckets: computeDistribution(numericValues),
    distributionChartType: 'numeric',
    valueFrequencies,
  };
};

const computeDateStats = (
  base: CellSelectionStats,
  nonNullValues: unknown[],
  valueFrequencies: ValueFrequency[] | undefined,
): CellSelectionStats => {
  const dateValues = nonNullValues.map(String).filter((s) => s.length > 0);
  const sorted = [...dateValues].sort((a, b) => a.localeCompare(b));
  const dateBuckets = computeDateDistribution(dateValues);
  return {
    ...base,
    dateMin: sorted[0],
    dateMax: sorted[sorted.length - 1],
    distributionBuckets: dateBuckets.length >= 2 ? dateBuckets : undefined,
    distributionChartType: dateBuckets.length >= 2 ? 'date' : undefined,
    valueFrequencies,
  };
};

const computeStringStats = (
  base: CellSelectionStats,
  nonNullValues: unknown[],
  valueFrequencies: ValueFrequency[] | undefined,
): CellSelectionStats => {
  const lengths = nonNullValues
    .map((v) => valueToString(v).length)
    .filter((l) => l > 0);
  return {
    ...base,
    strMinLength: lengths.length > 0 ? Math.min(...lengths) : undefined,
    strMaxLength: lengths.length > 0 ? Math.max(...lengths) : undefined,
    distributionBuckets:
      lengths.length > 0 ? computeDistribution(lengths) : undefined,
    distributionChartType: lengths.length > 0 ? 'string-length' : undefined,
    valueFrequencies,
  };
};

/**
 * Compute summary statistics for a cell selection.
 * ...existing code...
 */
export const computeCellSelectionStats = (
  selectedCells: TDSResultCellData[],
  columnTypes: Map<string, string | undefined>,
): CellSelectionStats | undefined => {
  if (selectedCells.length < 2) {
    return undefined;
  }

  const count = selectedCells.length;

  const nullCount = selectedCells.filter(
    (c) => c.value === null || c.value === undefined || c.value === '',
  ).length;

  const nonNullValues = selectedCells
    .map((c) => c.value)
    .filter((v) => v !== null && v !== undefined && v !== '');
  const uniqueCount = new Set(nonNullValues).size;

  const selectedColumnNames = new Set(selectedCells.map((c) => c.columnName));
  const columnTypeCategory = classifyColumns(selectedColumnNames, columnTypes);

  const valueFrequencies =
    nonNullValues.length > 0 || nullCount > 0
      ? computeValueFrequencies(nonNullValues, nullCount)
      : undefined;

  const base = buildBaseStats(count, uniqueCount, nullCount, valueFrequencies);

  if (columnTypeCategory === 'numeric') {
    return computeNumericStats(base, selectedCells, valueFrequencies);
  }
  if (columnTypeCategory === 'date') {
    return computeDateStats(base, nonNullValues, valueFrequencies);
  }
  if (columnTypeCategory === 'string') {
    return computeStringStats(base, nonNullValues, valueFrequencies);
  }
  return base;
};

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

import { test, describe, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  computeKeyMetrics,
  inferChartType,
  computeChartData,
  computeTopItems,
  findNumericColumnName,
  analyzeGridData,
} from '../LegendAIAnalysisUtils.js';
import { LegendAIChartType } from '../../LegendAI_LegendApplicationPlugin_Extension.js';
import type { LegendAIGridData } from '../../LegendAITypes.js';
import type { TDSRowDataType } from '@finos/legend-graph';

const makeGridData = (
  columns: string[],
  rows: TDSRowDataType[],
): LegendAIGridData => ({
  columnDefs: columns.map((c) => ({
    colId: c,
    headerName: c,
    field: c,
  })),
  rowData: rows,
});

describe(unitTest('computeKeyMetrics'), () => {
  test('returns total rows for empty data', () => {
    const grid = makeGridData(['a'], []);
    const metrics = computeKeyMetrics(grid);
    expect(metrics).toHaveLength(1);
    const metric0 = guaranteeNonNullable(metrics[0]);
    expect(metric0.label).toBe('Total Rows');
    expect(metric0.value).toBe('0');
  });

  test('returns row count, avg, total, and unique for mixed data', () => {
    const grid = makeGridData(
      ['region', 'amount'],
      [
        { region: 'US', amount: 100 },
        { region: 'EU', amount: 200 },
        { region: 'APAC', amount: 300 },
      ],
    );
    const metrics = computeKeyMetrics(grid);
    expect(metrics.length).toBeGreaterThanOrEqual(3);
    const firstMetric = guaranteeNonNullable(metrics[0]);
    expect(firstMetric.label).toBe('Total Rows');
    expect(firstMetric.value).toBe('3');

    const avgMetric = guaranteeNonNullable(
      metrics.find((m) => m.label.startsWith('Avg')),
    );
    expect(avgMetric.detail).toBeDefined();

    const totalMetric = metrics.find((m) => m.label.startsWith('Total amount'));
    expect(totalMetric).toBeDefined();

    const uniqueMetric = guaranteeNonNullable(
      metrics.find((m) => m.label.startsWith('Unique')),
    );
    expect(uniqueMetric.value).toBe('3');
  });

  test('caps at 4 metrics', () => {
    const grid = makeGridData(
      ['name', 'val1', 'val2'],
      [
        { name: 'a', val1: 10, val2: 20 },
        { name: 'b', val1: 30, val2: 40 },
        { name: 'c', val1: 50, val2: 60 },
      ],
    );
    const metrics = computeKeyMetrics(grid);
    expect(metrics.length).toBeLessThanOrEqual(4);
  });

  test('omits range detail when all values are equal', () => {
    const grid = makeGridData(['x'], [{ x: 5 }, { x: 5 }]);
    const metrics = computeKeyMetrics(grid);
    const avgMetric = metrics.find((m) => m.label.startsWith('Avg'));
    expect(avgMetric).toBeUndefined();
  });

  test('handles null and undefined values gracefully', () => {
    const grid = makeGridData(
      ['val'],
      [{ val: null }, { val: undefined }, { val: 10 }],
    );
    const metrics = computeKeyMetrics(grid);
    expect(guaranteeNonNullable(metrics[0]).value).toBe('3');
  });

  test('formats large numbers with M suffix', () => {
    const grid = makeGridData(
      ['revenue'],
      [{ revenue: 5_000_000 }, { revenue: 10_000_000 }],
    );
    const metrics = computeKeyMetrics(grid);
    const avgMetric = guaranteeNonNullable(
      metrics.find((m) => m.label.startsWith('Avg')),
    );
    expect(avgMetric.value).toContain('M');
  });

  test('formats thousands with locale string', () => {
    const grid = makeGridData(['price'], [{ price: 2000 }, { price: 4000 }]);
    const metrics = computeKeyMetrics(grid);
    const avgMetric2 = guaranteeNonNullable(
      metrics.find((m) => m.label.startsWith('Avg')),
    );
    expect(avgMetric2.value).toBe('3,000');
  });
});

describe(unitTest('inferChartType'), () => {
  test('returns NONE for empty data', () => {
    const grid = makeGridData(['a'], []);
    expect(inferChartType(grid)).toBe(LegendAIChartType.NONE);
  });

  test('returns PIE for small dataset with string + numeric columns', () => {
    const grid = makeGridData(
      ['name', 'value'],
      [
        { name: 'A', value: 10 },
        { name: 'B', value: 20 },
        { name: 'C', value: 30 },
      ],
    );
    expect(inferChartType(grid)).toBe(LegendAIChartType.PIE);
  });

  test('returns BAR for 7-20 rows with string + numeric columns', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      name: `item${i}`,
      value: i * 10,
    }));
    const grid = makeGridData(['name', 'value'], rows);
    expect(inferChartType(grid)).toBe(LegendAIChartType.BAR);
  });

  test('returns BAR for large dataset with numeric columns', () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({
      name: `item${i}`,
      value: i,
    }));
    const grid = makeGridData(['name', 'value'], rows);
    expect(inferChartType(grid)).toBe(LegendAIChartType.BAR);
  });

  test('returns NONE for single-row numeric data', () => {
    const grid = makeGridData(['value'], [{ value: 42 }]);
    expect(inferChartType(grid)).toBe(LegendAIChartType.NONE);
  });

  test('returns NONE for string-only data', () => {
    const grid = makeGridData(
      ['name', 'category'],
      [
        { name: 'A', category: 'X' },
        { name: 'B', category: 'Y' },
      ],
    );
    expect(inferChartType(grid)).toBe(LegendAIChartType.NONE);
  });

  test('returns BAR for numeric-only with multiple rows', () => {
    const grid = makeGridData(
      ['amount'],
      [{ amount: 100 }, { amount: 200 }, { amount: 300 }],
    );
    expect(inferChartType(grid)).toBe(LegendAIChartType.BAR);
  });
});

describe(unitTest('computeChartData'), () => {
  test('returns empty array for string-only data', () => {
    const grid = makeGridData(['name'], [{ name: 'A' }, { name: 'B' }]);
    expect(computeChartData(grid)).toEqual([]);
  });

  test('returns sorted entries with colorIndex for numeric + string data', () => {
    const grid = makeGridData(
      ['category', 'sales'],
      [
        { category: 'Widgets', sales: 50 },
        { category: 'Gadgets', sales: 100 },
        { category: 'Gizmos', sales: 75 },
      ],
    );
    const data = computeChartData(grid);
    expect(data).toHaveLength(3);
    const d0 = guaranteeNonNullable(data[0]);
    const d1 = guaranteeNonNullable(data[1]);
    const d2 = guaranteeNonNullable(data[2]);
    expect(d0.label).toBe('Gadgets');
    expect(d0.value).toBe(100);
    expect(d0.colorIndex).toBe(0);
    expect(d1.label).toBe('Gizmos');
    expect(d1.colorIndex).toBe(1);
    expect(d2.label).toBe('Widgets');
    expect(d2.colorIndex).toBe(2);
  });

  test('caps at 10 items', () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      name: `item${i}`,
      amount: i,
    }));
    const grid = makeGridData(['name', 'amount'], rows);
    expect(computeChartData(grid).length).toBeLessThanOrEqual(10);
  });

  test('uses first column as label when no string column exists', () => {
    const grid = makeGridData(
      ['id', 'value'],
      [
        { id: 1, value: 10 },
        { id: 2, value: 20 },
      ],
    );
    const data = computeChartData(grid);
    expect(data).toHaveLength(2);
    expect(guaranteeNonNullable(data[0]).label).toBe('2');
  });

  test('filters entries with empty labels', () => {
    const grid = makeGridData(
      ['name', 'val'],
      [
        { name: '', val: 10 },
        { name: 'A', val: 20 },
      ],
    );
    const data = computeChartData(grid);
    expect(data).toHaveLength(1);
    expect(guaranteeNonNullable(data[0]).label).toBe('A');
  });
});

describe(unitTest('computeTopItems'), () => {
  test('returns at most 5 items', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      name: `item${i}`,
      val: i * 10,
    }));
    const grid = makeGridData(['name', 'val'], rows);
    expect(computeTopItems(grid).length).toBeLessThanOrEqual(5);
  });

  test('returns all items if fewer than 5', () => {
    const grid = makeGridData(
      ['name', 'val'],
      [
        { name: 'A', val: 10 },
        { name: 'B', val: 20 },
      ],
    );
    expect(computeTopItems(grid)).toHaveLength(2);
  });
});

describe(unitTest('findNumericColumnName'), () => {
  test('returns undefined for no numeric columns', () => {
    const grid = makeGridData(['name'], [{ name: 'A' }]);
    expect(findNumericColumnName(grid)).toBeUndefined();
  });

  test('returns headerName of first numeric column', () => {
    const grid: LegendAIGridData = {
      columnDefs: [
        { colId: 'region', headerName: 'Region', field: 'region' },
        { colId: 'revenue', headerName: 'Total Revenue', field: 'revenue' },
      ],
      rowData: [
        { region: 'US', revenue: 100 },
        { region: 'EU', revenue: 200 },
      ],
    };
    expect(findNumericColumnName(grid)).toBe('Total Revenue');
  });

  test('falls back to field name when headerName is missing', () => {
    const grid: LegendAIGridData = {
      columnDefs: [{ colId: 'amount', field: 'amount' }],
      rowData: [{ amount: 42 }],
    };
    expect(findNumericColumnName(grid)).toBe('amount');
  });

  test('returns undefined for empty dataset', () => {
    const grid = makeGridData(['value'], []);
    expect(findNumericColumnName(grid)).toBeUndefined();
  });
});

describe(unitTest('large dataset sampling'), () => {
  test('computeKeyMetrics handles large datasets without error', () => {
    const rows = Array.from({ length: 5000 }, (_, i) => ({
      name: `item${i % 100}`,
      value: i * 1.5,
    }));
    const grid = makeGridData(['name', 'value'], rows);
    const metrics = computeKeyMetrics(grid);
    const m0 = guaranteeNonNullable(metrics[0]);
    expect(m0.label).toBe('Total Rows');
    expect(m0.value).toBe('5,000');
    expect(metrics.length).toBeGreaterThan(1);
  });

  test('computeChartData handles large datasets without error', () => {
    const rows = Array.from({ length: 5000 }, (_, i) => ({
      category: `cat${i % 50}`,
      amount: i,
    }));
    const grid = makeGridData(['category', 'amount'], rows);
    const data = computeChartData(grid);
    expect(data.length).toBeGreaterThan(0);
    expect(data.length).toBeLessThanOrEqual(10);
  });

  test('inferChartType works for large datasets', () => {
    const rows = Array.from({ length: 5000 }, (_, i) => ({
      name: `item${i}`,
      value: i,
    }));
    const grid = makeGridData(['name', 'value'], rows);
    expect(inferChartType(grid)).toBe(LegendAIChartType.BAR);
  });
});

describe(unitTest('formatNumber edge cases via computeKeyMetrics'), () => {
  test('formats K-range numbers (1000-999999)', () => {
    const grid = makeGridData(
      ['amount'],
      [{ amount: 1500.5 }, { amount: 2500.5 }],
    );
    const metrics = computeKeyMetrics(grid);
    const avg = metrics.find((m) => m.label.startsWith('Avg'));
    expect(avg?.value).toContain('K');
  });

  test('formats small decimals with toFixed(2)', () => {
    const grid = makeGridData(['value'], [{ value: 0.123 }, { value: 0.456 }]);
    const metrics = computeKeyMetrics(grid);
    const avg = metrics.find((m) => m.label.startsWith('Avg'));
    expect(avg?.value).toMatch(/^\d+\.\d{2}$/);
  });

  test('single unique numeric skips avg metric', () => {
    const grid = makeGridData(['x'], [{ x: 42 }]);
    const metrics = computeKeyMetrics(grid);
    expect(metrics.find((m) => m.label.startsWith('Avg'))).toBeUndefined();
  });
});

describe(unitTest('profileColumns edge cases'), () => {
  test('handles colId fallback when field is missing', () => {
    const grid: LegendAIGridData = {
      columnDefs: [{ colId: 'name', field: 'name' }, { colId: 'amount' }],
      rowData: [
        { name: 'A', amount: 10 },
        { name: 'B', amount: 20 },
      ],
    };
    const data = computeChartData(grid);
    expect(data).toHaveLength(2);
  });

  test('handles column with no field or colId', () => {
    const grid: LegendAIGridData = {
      columnDefs: [{ headerName: 'Val' }],
      rowData: [{ '': 10 }],
    };
    const metrics = computeKeyMetrics(grid);
    expect(metrics).toHaveLength(1);
  });

  test('string column with all unique equal to row count is excluded from unique metric', () => {
    const grid = makeGridData(
      ['id', 'amount'],
      [
        { id: 'a', amount: 10 },
        { id: 'b', amount: 20 },
      ],
    );
    const metrics = computeKeyMetrics(grid);
    const uniqueMetric = metrics.find((m) => m.label.startsWith('Unique'));
    expect(uniqueMetric?.value).toBe('2');
  });
});

describe(unitTest('frequency chart fallback'), () => {
  test('inferChartType returns PIE for categorical data with few unique values and no numeric columns', () => {
    const grid = makeGridData(
      ['region', 'status'],
      [
        { region: 'US', status: 'active' },
        { region: 'EU', status: 'active' },
        { region: 'US', status: 'inactive' },
      ],
    );
    expect(inferChartType(grid)).toBe(LegendAIChartType.PIE);
  });

  test('inferChartType returns BAR for categorical data with many unique values', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      name: `item${i % 8}`,
      note: 'x',
    }));
    const grid = makeGridData(['name', 'note'], rows);
    expect(inferChartType(grid)).toBe(LegendAIChartType.BAR);
  });

  test('inferChartType returns NONE when all string values are unique', () => {
    const grid = makeGridData(['id'], [{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    expect(inferChartType(grid)).toBe(LegendAIChartType.NONE);
  });

  test('computeChartData returns frequency distribution for categorical data', () => {
    const grid = makeGridData(
      ['region', 'headline'],
      [
        { region: 'US', headline: 'h1' },
        { region: 'EU', headline: 'h2' },
        { region: 'US', headline: 'h3' },
        { region: 'US', headline: 'h4' },
        { region: 'EU', headline: 'h5' },
      ],
    );
    const data = computeChartData(grid);
    expect(data).toHaveLength(2);
    const d0 = guaranteeNonNullable(data[0]);
    expect(d0.label).toBe('US');
    expect(d0.value).toBe(3);
    const d1 = guaranteeNonNullable(data[1]);
    expect(d1.label).toBe('EU');
    expect(d1.value).toBe(2);
  });

  test('computeChartData returns empty array when no frequency column exists', () => {
    const grid = makeGridData(['id'], [{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    expect(computeChartData(grid)).toEqual([]);
  });

  test('frequency fallback prefers lowest-cardinality column', () => {
    const grid = makeGridData(
      ['guid', 'region'],
      [
        { guid: 'g1', region: 'US' },
        { guid: 'g2', region: 'EU' },
        { guid: 'g3', region: 'US' },
        { guid: 'g4', region: 'EU' },
        { guid: 'g5', region: 'US' },
      ],
    );
    const data = computeChartData(grid);
    expect(data).toHaveLength(2);
    expect(guaranteeNonNullable(data[0]).label).toBe('US');
  });

  test('frequency fallback works with all-NULL numeric columns', () => {
    const grid = makeGridData(
      ['guid', 'headline', 'sentiment'],
      [
        { guid: 'g1', headline: 'h1', sentiment: null },
        { guid: 'g2', headline: 'h2', sentiment: null },
        { guid: 'g1', headline: 'h3', sentiment: null },
      ],
    );
    expect(inferChartType(grid)).toBe(LegendAIChartType.PIE);
    const data = computeChartData(grid);
    expect(data).toHaveLength(2);
    expect(guaranteeNonNullable(data[0]).label).toBe('g1');
    expect(guaranteeNonNullable(data[0]).value).toBe(2);
  });
});

describe(unitTest('analyzeGridData'), () => {
  test('returns full analysis for numeric data', () => {
    const grid = makeGridData(
      ['region', 'amount'],
      [
        { region: 'US', amount: 100 },
        { region: 'EU', amount: 200 },
        { region: 'APAC', amount: 300 },
      ],
    );
    const analysis = analyzeGridData(grid);
    expect(analysis.metrics.length).toBeGreaterThan(0);
    expect(analysis.chartType).not.toBe(LegendAIChartType.NONE);
    expect(analysis.chartData.length).toBeGreaterThan(0);
    expect(analysis.numericColumnName).toBe('amount');
  });

  test('returns NONE chart type for single row', () => {
    const grid = makeGridData(['name'], [{ name: 'only' }]);
    const analysis = analyzeGridData(grid);
    expect(analysis.chartType).toBe(LegendAIChartType.NONE);
    expect(analysis.chartData).toHaveLength(0);
  });

  test('returns metrics for empty rows', () => {
    const grid = makeGridData(['a'], []);
    const analysis = analyzeGridData(grid);
    expect(analysis.metrics.length).toBeGreaterThan(0);
    expect(analysis.chartType).toBe(LegendAIChartType.NONE);
  });
});

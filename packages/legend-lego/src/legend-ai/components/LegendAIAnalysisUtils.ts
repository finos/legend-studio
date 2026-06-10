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

import {
  type LegendAIKeyMetric,
  type LegendAIChartDataPoint,
  LegendAIChartType,
} from '../LegendAI_LegendApplicationPlugin_Extension.js';
import type { LegendAIGridData } from '../LegendAITypes.js';
import { isNumber, isString } from '@finos/legend-shared';

const CHART_PALETTE_COUNT = 10;
const MAX_CHART_ITEMS = 10;
const TOP_N_ITEMS = 5;
const MAX_PROFILE_SAMPLE = 1000;
const MAX_KEY_METRICS = 4;
const MAX_METRIC_COLUMNS = 5;
const MAX_BAR_CHART_ROWS = 20;
const MAX_PIE_CHART_ROWS = 6;

interface ColumnProfile {
  name: string;
  isNumeric: boolean;
  isString: boolean;
  uniqueCount: number;
  nonNullCount: number;
  numericValues: number[];
}

export interface LegendAIGridAnalysis {
  metrics: LegendAIKeyMetric[];
  chartType: LegendAIChartType;
  chartData: LegendAIChartDataPoint[];
  numericColumnName: string | undefined;
}

function profileColumns(gridData: LegendAIGridData): ColumnProfile[] {
  const rows =
    gridData.rowData.length > MAX_PROFILE_SAMPLE
      ? gridData.rowData.slice(0, MAX_PROFILE_SAMPLE)
      : gridData.rowData;

  return gridData.columnDefs.map((col) => {
    const field = col.field ?? col.colId ?? '';
    let nonNullCount = 0;
    let stringCount = 0;
    const numericValues: number[] = [];
    const unique = new Set<string>();

    for (const r of rows) {
      const v = r[field];
      if (v !== null && v !== undefined) {
        nonNullCount++;
        unique.add(String(v));
        if (isNumber(v)) {
          numericValues.push(v);
        }
        if (isString(v)) {
          stringCount++;
        }
      }
    }

    return {
      name: field,
      isNumeric: numericValues.length === nonNullCount && nonNullCount > 0,
      isString: nonNullCount > 0 && stringCount === nonNullCount,
      uniqueCount: unique.size,
      nonNullCount,
      numericValues,
    };
  });
}

function findBestCategoricalColumn(
  profiles: ColumnProfile[],
  rowCount: number,
): ColumnProfile | undefined {
  return profiles
    .filter((c) => c.isString && c.uniqueCount > 1 && c.uniqueCount < rowCount)
    .sort((a, b) => a.uniqueCount - b.uniqueCount)[0];
}

function formatNumber(n: number): string {
  if (Number.isInteger(n) && Math.abs(n) < 1_000_000) {
    return n.toLocaleString();
  }
  if (Math.abs(n) >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(n) >= 1_000) {
    return `${(n / 1_000).toFixed(1)}K`;
  }
  return n.toFixed(2);
}

function computeNumericMetrics(
  col: ColumnProfile,
  metrics: LegendAIKeyMetric[],
): void {
  let sum = 0;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const n of col.numericValues) {
    sum += n;
    if (n < min) {
      min = n;
    }
    if (n > max) {
      max = n;
    }
  }
  const avg = sum / col.numericValues.length;

  if (col.uniqueCount > 1) {
    metrics.push({
      label: `Avg ${col.name}`,
      value: formatNumber(avg),
      ...(min === max
        ? {}
        : { detail: `${formatNumber(min)} – ${formatNumber(max)}` }),
    });
  }

  if (col.uniqueCount > 2 && metrics.length < MAX_METRIC_COLUMNS) {
    metrics.push({
      label: `Total ${col.name}`,
      value: formatNumber(sum),
    });
  }
}

function computeKeyMetricsFromProfiles(
  profiles: ColumnProfile[],
  rowCount: number,
): LegendAIKeyMetric[] {
  const metrics: LegendAIKeyMetric[] = [];

  metrics.push({
    label: 'Total Rows',
    value: rowCount.toLocaleString(),
  });

  const numericCol = profiles.find(
    (c) => c.isNumeric && c.numericValues.length > 0,
  );
  if (numericCol) {
    computeNumericMetrics(numericCol, metrics);
  }

  const stringCol = profiles.find(
    (c) => c.isString && c.uniqueCount > 1 && c.uniqueCount <= rowCount,
  );
  if (stringCol) {
    metrics.push({
      label: `Unique ${stringCol.name}`,
      value: stringCol.uniqueCount.toLocaleString(),
    });
  }

  return metrics.slice(0, MAX_KEY_METRICS);
}

export function computeKeyMetrics(
  gridData: LegendAIGridData,
): LegendAIKeyMetric[] {
  return computeKeyMetricsFromProfiles(
    profileColumns(gridData),
    gridData.rowData.length,
  );
}

function inferChartTypeFromProfiles(
  profiles: ColumnProfile[],
  rowCount: number,
): LegendAIChartType {
  const numericCols = profiles.filter((c) => c.isNumeric);
  const stringCols = profiles.filter((c) => c.isString && c.uniqueCount > 1);

  if (
    stringCols.length >= 1 &&
    numericCols.length >= 1 &&
    rowCount <= MAX_BAR_CHART_ROWS
  ) {
    if (rowCount <= MAX_PIE_CHART_ROWS) {
      return LegendAIChartType.PIE;
    }
    return LegendAIChartType.BAR;
  }

  if (numericCols.length >= 1 && rowCount > 1) {
    return LegendAIChartType.BAR;
  }

  if (rowCount > 1) {
    const categoricalCol = findBestCategoricalColumn(profiles, rowCount);
    if (categoricalCol) {
      return categoricalCol.uniqueCount <= MAX_PIE_CHART_ROWS
        ? LegendAIChartType.PIE
        : LegendAIChartType.BAR;
    }
  }

  return LegendAIChartType.NONE;
}

export function inferChartType(gridData: LegendAIGridData): LegendAIChartType {
  return inferChartTypeFromProfiles(
    profileColumns(gridData),
    gridData.rowData.length,
  );
}

function computeChartDataFromProfiles(
  profiles: ColumnProfile[],
  gridData: LegendAIGridData,
): LegendAIChartDataPoint[] {
  const numericCol = profiles.find((c) => c.isNumeric);
  const labelCol = profiles.find((c) => c.isString && c.uniqueCount > 1);

  if (numericCol) {
    const field = numericCol.name;
    const labelField = labelCol?.name;
    const rows =
      gridData.rowData.length > MAX_PROFILE_SAMPLE
        ? gridData.rowData.slice(0, MAX_PROFILE_SAMPLE)
        : gridData.rowData;

    const entries = rows
      .map((row) => {
        const rawValue = row[field];
        return {
          label: labelField
            ? String(row[labelField] ?? '')
            : String(row[gridData.columnDefs[0]?.field ?? ''] ?? ''),
          value: typeof rawValue === 'number' ? rawValue : 0,
        };
      })
      .filter((e) => e.label.length > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, MAX_CHART_ITEMS);

    return entries.map((e, i) => ({
      label: e.label,
      value: e.value,
      colorIndex: i % CHART_PALETTE_COUNT,
    }));
  }

  const categoricalCol = findBestCategoricalColumn(
    profiles,
    gridData.rowData.length,
  );
  if (!categoricalCol) {
    return [];
  }

  const freqMap = new Map<string, number>();
  for (const row of gridData.rowData) {
    const val = String(row[categoricalCol.name] ?? '');
    if (val.length > 0) {
      freqMap.set(val, (freqMap.get(val) ?? 0) + 1);
    }
  }

  return [...freqMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_CHART_ITEMS)
    .map(([label, value], i) => ({
      label,
      value,
      colorIndex: i % CHART_PALETTE_COUNT,
    }));
}

export function computeChartData(
  gridData: LegendAIGridData,
): LegendAIChartDataPoint[] {
  return computeChartDataFromProfiles(profileColumns(gridData), gridData);
}

export function computeTopItems(
  gridData: LegendAIGridData,
): LegendAIChartDataPoint[] {
  return computeChartData(gridData).slice(0, TOP_N_ITEMS);
}

function findNumericColumnNameFromProfiles(
  profiles: ColumnProfile[],
  gridData: LegendAIGridData,
): string | undefined {
  const numericCol = profiles.find((c) => c.isNumeric);
  if (!numericCol) {
    return undefined;
  }
  const colDef = gridData.columnDefs.find(
    (c) => (c.field ?? c.colId ?? '') === numericCol.name,
  );
  return colDef?.headerName ?? colDef?.field;
}

export function findNumericColumnName(
  gridData: LegendAIGridData,
): string | undefined {
  return findNumericColumnNameFromProfiles(profileColumns(gridData), gridData);
}

export function analyzeGridData(
  gridData: LegendAIGridData,
): LegendAIGridAnalysis {
  const profiles = profileColumns(gridData);
  const rowCount = gridData.rowData.length;
  const chartType = inferChartTypeFromProfiles(profiles, rowCount);
  return {
    metrics: computeKeyMetricsFromProfiles(profiles, rowCount),
    chartType,
    chartData:
      chartType === LegendAIChartType.NONE
        ? []
        : computeChartDataFromProfiles(profiles, gridData),
    numericColumnName: findNumericColumnNameFromProfiles(profiles, gridData),
  };
}

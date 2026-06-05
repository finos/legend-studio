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
import { isNonNullable, isNumber, isString } from '@finos/legend-shared';

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
  values: unknown[];
  numericValues: number[];
}

function profileColumns(gridData: LegendAIGridData): ColumnProfile[] {
  const rows =
    gridData.rowData.length > MAX_PROFILE_SAMPLE
      ? gridData.rowData.slice(0, MAX_PROFILE_SAMPLE)
      : gridData.rowData;

  return gridData.columnDefs.map((col) => {
    const field = col.field ?? col.colId ?? '';
    const values = rows.map((r) => r[field]).filter(isNonNullable);
    const numericValues = values.filter(isNumber);
    const unique = new Set(values.map(String));
    return {
      name: field,
      isNumeric: numericValues.length === values.length && values.length > 0,
      isString: values.length > 0 && values.every(isString),
      uniqueCount: unique.size,
      values,
      numericValues,
    };
  });
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

export function computeKeyMetrics(
  gridData: LegendAIGridData,
): LegendAIKeyMetric[] {
  const profiles = profileColumns(gridData);
  const metrics: LegendAIKeyMetric[] = [];
  const rowCount = gridData.rowData.length;

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

export function inferChartType(gridData: LegendAIGridData): LegendAIChartType {
  const profiles = profileColumns(gridData);
  const numericCols = profiles.filter((c) => c.isNumeric);
  const stringCols = profiles.filter((c) => c.isString && c.uniqueCount > 1);

  if (
    stringCols.length >= 1 &&
    numericCols.length >= 1 &&
    gridData.rowData.length <= MAX_BAR_CHART_ROWS
  ) {
    if (gridData.rowData.length <= MAX_PIE_CHART_ROWS) {
      return LegendAIChartType.PIE;
    }
    return LegendAIChartType.BAR;
  }

  if (numericCols.length >= 1 && gridData.rowData.length > 1) {
    return LegendAIChartType.BAR;
  }

  return LegendAIChartType.NONE;
}

export function computeChartData(
  gridData: LegendAIGridData,
): LegendAIChartDataPoint[] {
  const profiles = profileColumns(gridData);
  const numericCol = profiles.find((c) => c.isNumeric);
  const labelCol = profiles.find((c) => c.isString && c.uniqueCount > 1);

  if (!numericCol) {
    return [];
  }

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

export function computeTopItems(
  gridData: LegendAIGridData,
): LegendAIChartDataPoint[] {
  return computeChartData(gridData).slice(0, TOP_N_ITEMS);
}

export function findNumericColumnName(
  gridData: LegendAIGridData,
): string | undefined {
  const profiles = profileColumns(gridData);
  const numericCol = profiles.find((c) => c.isNumeric);
  if (!numericCol) {
    return undefined;
  }
  const colDef = gridData.columnDefs.find(
    (c) => (c.field ?? c.colId ?? '') === numericCol.name,
  );
  return colDef?.headerName ?? colDef?.field;
}

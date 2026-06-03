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

import { describe, test, expect, afterEach } from '@jest/globals';
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { unitTest } from '@finos/legend-shared/test';
import { LegendAIAnalysisPanel } from '../LegendAIAnalysisPanel.js';
import type { LegendAIGridData } from '../../LegendAITypes.js';
import type { TDSRowDataType } from '@finos/legend-graph';

const MockSummaryRenderer = ({
  value,
}: {
  value: string;
}): React.ReactElement => <div data-testid="summary">{value}</div>;

const makeGridData = (
  columns: string[],
  rows: TDSRowDataType[],
): LegendAIGridData => ({
  columnDefs: columns.map((c) => ({ colId: c, headerName: c, field: c })),
  rowData: rows,
});

afterEach(cleanup);

describe(unitTest('LegendAIAnalysisPanel'), () => {
  test('renders summary', () => {
    const gridData = makeGridData(['name'], [{ name: 'Alice' }]);
    const { container } = render(
      <LegendAIAnalysisPanel
        gridData={gridData}
        summary="Test summary"
        SummaryRenderer={MockSummaryRenderer}
      />,
    );
    const summary = container.querySelector('[data-testid="summary"]');
    expect(summary?.textContent).toBe('Test summary');
  });

  test('renders metrics for numeric data', () => {
    const gridData = makeGridData(
      ['category', 'amount'],
      [
        { category: 'A', amount: 100 },
        { category: 'B', amount: 200 },
        { category: 'C', amount: 300 },
      ],
    );
    const { container } = render(
      <LegendAIAnalysisPanel
        gridData={gridData}
        summary="Analysis"
        SummaryRenderer={MockSummaryRenderer}
      />,
    );
    const metrics = container.querySelectorAll(
      '.legend-ai-analysis__metric-card',
    );
    expect(metrics.length).toBeGreaterThan(0);
  });

  test('renders chart section for chartable data', () => {
    const gridData = makeGridData(
      ['name', 'value'],
      [
        { name: 'A', value: 10 },
        { name: 'B', value: 20 },
        { name: 'C', value: 30 },
      ],
    );
    const { container } = render(
      <LegendAIAnalysisPanel
        gridData={gridData}
        summary="Chart test"
        SummaryRenderer={MockSummaryRenderer}
      />,
    );
    const chartSection = container.querySelector(
      '.legend-ai-analysis__chart-section',
    );
    expect(chartSection).not.toBeNull();
  });

  test('omits chart section when not chartable', () => {
    const gridData = makeGridData(['name'], [{ name: 'Alice' }]);
    const { container } = render(
      <LegendAIAnalysisPanel
        gridData={gridData}
        summary="No chart"
        SummaryRenderer={MockSummaryRenderer}
      />,
    );
    const chartSection = container.querySelector(
      '.legend-ai-analysis__chart-section',
    );
    expect(chartSection).toBeNull();
  });

  test('renders narrative section', () => {
    const gridData = makeGridData(['x'], [{ x: 1 }]);
    const { container } = render(
      <LegendAIAnalysisPanel
        gridData={gridData}
        summary="Narrative text"
        SummaryRenderer={MockSummaryRenderer}
      />,
    );
    const narrative = container.querySelector('.legend-ai-analysis__narrative');
    expect(narrative).not.toBeNull();
  });
});

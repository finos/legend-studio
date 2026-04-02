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
import { render, screen, cleanup } from '@testing-library/react';
import { QueryBuilderTDSCellSelectionStatsBar } from '../result/tds/QueryBuilderTDSCellSelectionStatsBar.js';
import type { CellSelectionStats } from '../result/tds/QueryBuilderTDSCellSelectionStats.js';

afterEach(cleanup);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_STATS: CellSelectionStats = {
  count: 10,
  uniqueCount: 7,
  nullCount: 2,
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
  valueFrequencies: undefined,
};

const NUMERIC_STATS: CellSelectionStats = {
  ...BASE_STATS,
  min: 1,
  max: 100,
  sum: 350,
  avg: 35,
  distributionBuckets: [
    { lower: 1, upper: 50, count: 6 },
    { lower: 50, upper: 100, count: 4 },
  ],
  distributionChartType: 'numeric',
};

const DATE_STATS: CellSelectionStats = {
  ...BASE_STATS,
  dateMin: '2024-01-01',
  dateMax: '2024-12-31',
};

const STRING_STATS: CellSelectionStats = {
  ...BASE_STATS,
  strMinLength: 3,
  strMaxLength: 25,
  distributionBuckets: [
    { lower: 3, upper: 14, count: 5 },
    { lower: 14, upper: 25, count: 5 },
  ],
  distributionChartType: 'string-length',
};

const STATS_WITH_FREQ: CellSelectionStats = {
  ...BASE_STATS,
  valueFrequencies: [
    { label: 'alpha', count: 4 },
    { label: 'beta', count: 3 },
    { label: '(empty)', count: 2, isEmpty: true },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('QueryBuilderTDSCellSelectionStatsBar', () => {
  // --- Loading / spinner states ---

  test('shows spinners when stats is undefined (loading)', () => {
    render(
      <QueryBuilderTDSCellSelectionStatsBar
        stats={undefined}
        cellCount={0}
        countReady={false}
        darkMode={false}
      />,
    );
    // Count, Unique Count, Empty Count → 3 spinners, each titled "Computing…"
    const spinners = screen.getAllByTitle('Computing…');
    expect(spinners.length).toBe(3);
  });

  test('shows count spinner when countReady is false', () => {
    render(
      <QueryBuilderTDSCellSelectionStatsBar
        stats={undefined}
        cellCount={0}
        countReady={false}
        darkMode={false}
      />,
    );
    // All slots (Count, Unique Count, Empty Count) show spinners
    expect(screen.queryAllByTitle('Computing…').length).toBe(3);
  });

  test('shows count value when countReady is true', () => {
    render(
      <QueryBuilderTDSCellSelectionStatsBar
        stats={undefined}
        cellCount={42}
        countReady={true}
        darkMode={false}
      />,
    );
    // Count should now show "42" (not a spinner)
    expect(screen.getByText('42')).not.toBeNull();
    // Unique Count and Empty Count should still be spinners (stats still undefined)
    expect(screen.queryAllByTitle('Computing…').length).toBe(2);
  });

  // --- Fully loaded, base stats (no type-specific details) ---

  test('renders count, unique count, and empty count', () => {
    render(
      <QueryBuilderTDSCellSelectionStatsBar
        stats={BASE_STATS}
        cellCount={10}
        countReady={true}
        darkMode={false}
      />,
    );
    expect(screen.getByText('Count:')).not.toBeNull();
    expect(screen.getByText('Unique Count:')).not.toBeNull();
    expect(screen.getByText('Empty Count:')).not.toBeNull();
    expect(screen.getByText('10')).not.toBeNull();
    expect(screen.getByText('7')).not.toBeNull();
    expect(screen.getByText('2')).not.toBeNull();
  });

  test('does not render numeric, date, or string stats for base stats', () => {
    render(
      <QueryBuilderTDSCellSelectionStatsBar
        stats={BASE_STATS}
        cellCount={10}
        countReady={true}
        darkMode={false}
      />,
    );
    expect(screen.getByText('Count:')).not.toBeNull();
    expect(screen.getByText('Unique Count:')).not.toBeNull();
    expect(screen.getByText('Empty Count:')).not.toBeNull();
    expect(screen.queryByText('Min:')).toBeNull();
    expect(screen.queryByText('Max:')).toBeNull();
  });

  // --- Numeric stats ---

  test('renders numeric stats (Min, Max, Sum, Avg)', () => {
    const { container } = render(
      <QueryBuilderTDSCellSelectionStatsBar
        stats={NUMERIC_STATS}
        cellCount={10}
        countReady={true}
        darkMode={false}
      />,
    );
    const labels = Array.from(
      container.querySelectorAll(
        '.query-builder__result__tds-grid__stats-bar__item__label',
      ),
    ).map((el) => el.textContent);
    expect(labels).toContain('Min:');
    expect(labels).toContain('Max:');
    expect(labels).toContain('Sum:');
    expect(labels).toContain('Avg:');
  });

  test('renders histogram SVG for numeric distribution', () => {
    const { container } = render(
      <QueryBuilderTDSCellSelectionStatsBar
        stats={NUMERIC_STATS}
        cellCount={10}
        countReady={true}
        darkMode={false}
      />,
    );
    const svg = container.querySelector(
      '.query-builder__result__tds-grid__stats-bar__chart svg',
    );
    expect(svg).not.toBeNull();
  });

  // --- Date stats ---

  test('renders date stats (Min, Max dates)', () => {
    const { container } = render(
      <QueryBuilderTDSCellSelectionStatsBar
        stats={DATE_STATS}
        cellCount={10}
        countReady={true}
        darkMode={false}
      />,
    );
    const labels = Array.from(
      container.querySelectorAll(
        '.query-builder__result__tds-grid__stats-bar__item__label',
      ),
    ).map((el) => el.textContent);
    expect(labels).toContain('Min:');
    expect(labels).toContain('Max:');
    // Should NOT have Sum/Avg
    expect(labels).not.toContain('Sum:');
    expect(labels).not.toContain('Avg:');

    // Check actual date values are rendered
    const values = Array.from(
      container.querySelectorAll(
        '.query-builder__result__tds-grid__stats-bar__item__value',
      ),
    ).map((el) => el.textContent);
    expect(values).toContain('2024-01-01');
    expect(values).toContain('2024-12-31');
  });

  // --- String stats ---

  test('renders string stats (Min Length, Max Length)', () => {
    const { container } = render(
      <QueryBuilderTDSCellSelectionStatsBar
        stats={STRING_STATS}
        cellCount={10}
        countReady={true}
        darkMode={false}
      />,
    );
    const labels = Array.from(
      container.querySelectorAll(
        '.query-builder__result__tds-grid__stats-bar__item__label',
      ),
    ).map((el) => el.textContent);
    expect(labels).toContain('Min Length:');
    expect(labels).toContain('Max Length:');
    // Should NOT have Sum/Avg
    expect(labels).not.toContain('Sum:');
    expect(labels).not.toContain('Avg:');
  });

  // --- Value frequency tooltip ---

  test('renders value frequency tooltip when frequencies are provided', () => {
    const { container } = render(
      <QueryBuilderTDSCellSelectionStatsBar
        stats={STATS_WITH_FREQ}
        cellCount={10}
        countReady={true}
        darkMode={false}
      />,
    );
    const tooltips = container.querySelectorAll(
      '.query-builder__result__tds-grid__stats-bar__freq-tooltip',
    );
    // Should have tooltips on Count, Unique Count, and Empty Count items
    expect(tooltips.length).toBe(3);
  });

  test('does not render frequency tooltip when no frequencies', () => {
    render(
      <QueryBuilderTDSCellSelectionStatsBar
        stats={BASE_STATS}
        cellCount={10}
        countReady={true}
        darkMode={false}
      />,
    );
    // "alpha"/"beta" frequency labels should not be present
    expect(screen.queryByText('alpha')).toBeNull();
    expect(screen.queryByText('beta')).toBeNull();
  });

  // --- Dark mode ---

  test('applies dark mode class', () => {
    const { container } = render(
      <QueryBuilderTDSCellSelectionStatsBar
        stats={BASE_STATS}
        cellCount={10}
        countReady={true}
        darkMode={true}
      />,
    );
    expect((container.firstChild as HTMLElement).className).toContain(
      'stats-bar--dark',
    );
  });

  test('does not apply dark mode class when darkMode is false', () => {
    const { container } = render(
      <QueryBuilderTDSCellSelectionStatsBar
        stats={BASE_STATS}
        cellCount={10}
        countReady={true}
        darkMode={false}
      />,
    );
    expect((container.firstChild as HTMLElement).className).not.toContain(
      'stats-bar--dark',
    );
  });

  // --- No histogram for single bucket ---

  test('does not render histogram when distribution has fewer than 2 buckets', () => {
    const singleBucketStats: CellSelectionStats = {
      ...BASE_STATS,
      distributionBuckets: [{ lower: 0, upper: 10, count: 5 }],
      distributionChartType: 'numeric',
    };
    const { container } = render(
      <QueryBuilderTDSCellSelectionStatsBar
        stats={singleBucketStats}
        cellCount={10}
        countReady={true}
        darkMode={false}
      />,
    );
    expect(container.querySelector('svg')).toBeNull();
  });

  // --- Separator rendering ---

  test('renders separators before type-specific sections', () => {
    const { container } = render(
      <QueryBuilderTDSCellSelectionStatsBar
        stats={NUMERIC_STATS}
        cellCount={10}
        countReady={true}
        darkMode={false}
      />,
    );
    const separators = container.querySelectorAll(
      '.query-builder__result__tds-grid__stats-bar__separator',
    );
    // At least 1 separator before numeric stats, and 1 before chart
    expect(separators.length).toBeGreaterThanOrEqual(1);
  });

  // --- Histogram tooltip edge cases (date chart type with lo === hi) ---

  test('renders histogram with date chart type', () => {
    const dateBucketStats: CellSelectionStats = {
      ...BASE_STATS,
      dateMin: '2024-01-01',
      dateMax: '2024-06-01',
      distributionBuckets: [
        {
          lower: 1704067200000,
          upper: 1704067200000,
          count: 3,
          lowerDateLabel: '2024-01-01',
          upperDateLabel: '2024-01-01',
        },
        {
          lower: 1704067200000,
          upper: 1717200000000,
          count: 7,
          lowerDateLabel: '2024-01-01',
          upperDateLabel: '2024-06-01',
        },
      ],
      distributionChartType: 'date',
    };
    const { container } = render(
      <QueryBuilderTDSCellSelectionStatsBar
        stats={dateBucketStats}
        cellCount={10}
        countReady={true}
        darkMode={false}
      />,
    );
    const chart = container.querySelector(
      '.query-builder__result__tds-grid__stats-bar__chart svg',
    );
    expect(chart).not.toBeNull();
    // Check tooltip titles exist on rects
    const rects = chart?.querySelectorAll('rect') ?? [];
    expect(rects.length).toBe(2);
    // First bucket has lo === hi so tooltip should say "on"
    const title0 = rects[0]?.querySelector('title');
    expect(title0?.textContent).toContain('on');
    // Second bucket has lo !== hi so tooltip should say "within the range"
    const title1 = rects[1]?.querySelector('title');
    expect(title1?.textContent).toContain('within the range');
  });

  // --- Histogram with string-length chart type (lo === hi edge case) ---

  test('renders histogram with string-length chart type including equal bounds', () => {
    const strBucketStats: CellSelectionStats = {
      ...BASE_STATS,
      strMinLength: 5,
      strMaxLength: 5,
      distributionBuckets: [
        { lower: 5, upper: 5, count: 10 },
        { lower: 5, upper: 10, count: 5 },
      ],
      distributionChartType: 'string-length',
    };
    const { container } = render(
      <QueryBuilderTDSCellSelectionStatsBar
        stats={strBucketStats}
        cellCount={15}
        countReady={true}
        darkMode={false}
      />,
    );
    const chart = container.querySelector(
      '.query-builder__result__tds-grid__stats-bar__chart svg',
    );
    expect(chart).not.toBeNull();
    const rects = chart?.querySelectorAll('rect') ?? [];
    // First bucket lower === upper → "with length 5"
    const title0 = rects[0]?.querySelector('title');
    expect(title0?.textContent).toContain('with length 5');
    // Second bucket lower !== upper → "with length 5 – 10"
    const title1 = rects[1]?.querySelector('title');
    expect(title1?.textContent).toContain('with length');
  });

  // --- Histogram with numeric chart type (equal bounds edge case) ---

  test('renders histogram with numeric chart type including equal bounds', () => {
    const numBucketStats: CellSelectionStats = {
      ...BASE_STATS,
      min: 42,
      max: 42,
      sum: 84,
      avg: 42,
      distributionBuckets: [
        { lower: 42, upper: 42, count: 2 },
        { lower: 42, upper: 100, count: 3 },
      ],
      distributionChartType: 'numeric',
    };
    const { container } = render(
      <QueryBuilderTDSCellSelectionStatsBar
        stats={numBucketStats}
        cellCount={5}
        countReady={true}
        darkMode={false}
      />,
    );
    const rects = container.querySelectorAll(
      '.query-builder__result__tds-grid__stats-bar__chart svg rect',
    );
    // First bucket lower === upper → "equal to"
    const title0 = rects[0]?.querySelector('title');
    expect(title0?.textContent).toContain('equal to');
  });

  // --- Histogram edge case: empty buckets array ---

  test('does not render histogram when buckets array is empty', () => {
    const emptyBucketStats: CellSelectionStats = {
      ...BASE_STATS,
      distributionBuckets: [],
      distributionChartType: 'numeric',
    };
    const { container } = render(
      <QueryBuilderTDSCellSelectionStatsBar
        stats={emptyBucketStats}
        cellCount={10}
        countReady={true}
        darkMode={false}
      />,
    );
    const chart = container.querySelector(
      '.query-builder__result__tds-grid__stats-bar__chart',
    );
    expect(chart).toBeNull();
  });

  // --- Histogram edge case: all zero counts ---

  test('does not render histogram when all bucket counts are zero', () => {
    const zeroBucketStats: CellSelectionStats = {
      ...BASE_STATS,
      distributionBuckets: [
        { lower: 0, upper: 10, count: 0 },
        { lower: 10, upper: 20, count: 0 },
      ],
      distributionChartType: 'numeric',
    };
    const { container } = render(
      <QueryBuilderTDSCellSelectionStatsBar
        stats={zeroBucketStats}
        cellCount={10}
        countReady={true}
        darkMode={false}
      />,
    );
    // hasChart checks length >= 2 so it passes, but MiniHistogram returns null when maxCount === 0
    const chart = container.querySelector(
      '.query-builder__result__tds-grid__stats-bar__chart svg',
    );
    expect(chart).toBeNull();
  });

  // --- Histogram dark mode ---

  test('applies dark mode to histogram', () => {
    const { container } = render(
      <QueryBuilderTDSCellSelectionStatsBar
        stats={NUMERIC_STATS}
        cellCount={10}
        countReady={true}
        darkMode={true}
      />,
    );
    const svgWrapper = container.querySelector('svg')?.parentElement;
    expect(svgWrapper?.className).toContain('chart--dark');
  });
});

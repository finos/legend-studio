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
import { render, cleanup } from '@testing-library/react';
import { unitTest } from '@finos/legend-shared/test';
import { LegendAIBarChart, LegendAIDonutChart } from '../LegendAICharts.js';
import type { LegendAIChartDataPoint } from '../../LegendAI_LegendApplicationPlugin_Extension.js';

afterEach(cleanup);

// ─── LegendAIBarChart ────────────────────────────────────────────────────────

describe(unitTest('LegendAIBarChart'), () => {
  test('returns null for empty data', () => {
    const { container } = render(<LegendAIBarChart data={[]} />);
    expect(container.innerHTML).toBe('');
  });

  test('renders bars for each data point', () => {
    const data: LegendAIChartDataPoint[] = [
      { label: 'Alpha', value: 100 },
      { label: 'Beta', value: 50 },
    ];
    const { container } = render(<LegendAIBarChart data={data} />);
    const rows = container.querySelectorAll('.legend-ai-chart__bar-row');
    expect(rows).toHaveLength(2);
  });

  test('renders title when provided', () => {
    const data: LegendAIChartDataPoint[] = [{ label: 'A', value: 10 }];
    const { container } = render(
      <LegendAIBarChart data={data} title="My Chart" />,
    );
    const title = container.querySelector('.legend-ai-chart__title');
    expect(title?.textContent).toBe('My Chart');
  });

  test('omits title when not provided', () => {
    const data: LegendAIChartDataPoint[] = [{ label: 'A', value: 10 }];
    const { container } = render(<LegendAIBarChart data={data} />);
    const title = container.querySelector('.legend-ai-chart__title');
    expect(title).toBeNull();
  });

  test('omits title when empty string', () => {
    const data: LegendAIChartDataPoint[] = [{ label: 'A', value: 10 }];
    const { container } = render(<LegendAIBarChart data={data} title="" />);
    const title = container.querySelector('.legend-ai-chart__title');
    expect(title).toBeNull();
  });

  test('renders bar fill element with style', () => {
    const data: LegendAIChartDataPoint[] = [{ label: 'A', value: 10 }];
    const { container } = render(<LegendAIBarChart data={data} />);
    const fill = container.querySelector('.legend-ai-chart__bar-fill');
    expect(fill).not.toBeNull();
    const style = fill?.getAttribute('style') ?? '';
    expect(style).toContain('width:');
  });

  test('renders custom color in bar fill', () => {
    const data: LegendAIChartDataPoint[] = [
      { label: 'A', value: 10, color: '#ff0000' },
    ];
    const { container } = render(<LegendAIBarChart data={data} />);
    const fill = container.querySelector('.legend-ai-chart__bar-fill');
    expect(fill).not.toBeNull();
  });

  test('renders bar fill for colorIndex items', () => {
    const data: LegendAIChartDataPoint[] = [
      { label: 'A', value: 10, colorIndex: 4 },
    ];
    const { container } = render(<LegendAIBarChart data={data} />);
    const fill = container.querySelector('.legend-ai-chart__bar-fill');
    expect(fill).not.toBeNull();
  });

  test('displays label and value', () => {
    const data: LegendAIChartDataPoint[] = [{ label: 'Sales', value: 42 }];
    const { container } = render(<LegendAIBarChart data={data} />);
    const label = container.querySelector('.legend-ai-chart__bar-label');
    const value = container.querySelector('.legend-ai-chart__bar-value');
    expect(label?.textContent).toBe('Sales');
    expect(value?.textContent).toBe('42');
  });

  test('formats decimal values', () => {
    const data: LegendAIChartDataPoint[] = [{ label: 'A', value: 3.14 }];
    const { container } = render(<LegendAIBarChart data={data} />);
    const value = container.querySelector('.legend-ai-chart__bar-value');
    expect(value?.textContent).toBe('3.14');
  });

  test('calculates bar width percentage relative to max', () => {
    const data: LegendAIChartDataPoint[] = [
      { label: 'A', value: 100 },
      { label: 'B', value: 50 },
    ];
    const { container } = render(<LegendAIBarChart data={data} />);
    const fills = container.querySelectorAll('.legend-ai-chart__bar-fill');
    const style1 = fills[0]?.getAttribute('style') ?? '';
    const style2 = fills[1]?.getAttribute('style') ?? '';
    expect(style1).toContain('width: 100%');
    expect(style2).toContain('width: 50%');
  });
});

// ─── LegendAIDonutChart ──────────────────────────────────────────────────────

describe(unitTest('LegendAIDonutChart'), () => {
  test('returns null for empty data', () => {
    const { container } = render(<LegendAIDonutChart data={[]} />);
    expect(container.innerHTML).toBe('');
  });

  test('renders SVG with circle segments', () => {
    const data: LegendAIChartDataPoint[] = [
      { label: 'A', value: 60 },
      { label: 'B', value: 40 },
    ];
    const { container } = render(<LegendAIDonutChart data={data} />);
    const circles = container.querySelectorAll(
      '.legend-ai-chart__donut-segment',
    );
    expect(circles).toHaveLength(2);
  });

  test('renders title when provided', () => {
    const data: LegendAIChartDataPoint[] = [{ label: 'A', value: 10 }];
    const { container } = render(
      <LegendAIDonutChart data={data} title="Distribution" />,
    );
    const title = container.querySelector('.legend-ai-chart__title');
    expect(title?.textContent).toBe('Distribution');
  });

  test('shows total in center', () => {
    const data: LegendAIChartDataPoint[] = [
      { label: 'A', value: 30 },
      { label: 'B', value: 70 },
    ];
    const { container } = render(<LegendAIDonutChart data={data} />);
    const total = container.querySelector('.legend-ai-chart__donut-total');
    expect(total?.textContent).toBe('100');
  });

  test('renders legend items', () => {
    const data: LegendAIChartDataPoint[] = [
      { label: 'Alpha', value: 10 },
      { label: 'Beta', value: 20 },
    ];
    const { container } = render(<LegendAIDonutChart data={data} />);
    const items = container.querySelectorAll('.legend-ai-chart__legend-item');
    expect(items).toHaveLength(2);
    const labels = container.querySelectorAll('.legend-ai-chart__legend-label');
    expect(labels[0]?.textContent).toBe('Alpha');
    expect(labels[1]?.textContent).toBe('Beta');
  });

  test('uses CSS variable colors for segments', () => {
    const data: LegendAIChartDataPoint[] = [{ label: 'A', value: 10 }];
    const { container } = render(<LegendAIDonutChart data={data} />);
    const circle = container.querySelector('.legend-ai-chart__donut-segment');
    const stroke = circle?.getAttribute('stroke') ?? '';
    expect(stroke).toContain('var(--ai-chart-color-1)');
  });

  test('uses custom color when provided', () => {
    const data: LegendAIChartDataPoint[] = [
      { label: 'A', value: 10, color: '#00ff00' },
    ];
    const { container } = render(<LegendAIDonutChart data={data} />);
    const circle = container.querySelector('.legend-ai-chart__donut-segment');
    expect(circle?.getAttribute('stroke')).toBe('#00ff00');
  });
});

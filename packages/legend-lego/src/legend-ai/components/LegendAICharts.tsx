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

import { useMemo } from 'react';
import type { LegendAIChartDataPoint } from '../LegendAI_LegendApplicationPlugin_Extension.js';

const CHART_PALETTE_SIZE = 10;
const DONUT_SIZE = 160;
const DONUT_STROKE = 24;
const DONUT_RADIUS = (DONUT_SIZE - DONUT_STROKE) / 2;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

function getChartColor(index: number): string {
  return `var(--ai-chart-color-${(index % CHART_PALETTE_SIZE) + 1})`;
}

function resolveColor(item: LegendAIChartDataPoint, index: number): string {
  return item.color ?? getChartColor(item.colorIndex ?? index);
}

export const LegendAIBarChart = (props: {
  data: LegendAIChartDataPoint[];
  title?: string;
}): React.ReactNode => {
  const { data, title } = props;

  const maxValue = useMemo(
    () => data.reduce((m, d) => Math.max(m, d.value), 0) || 1,
    [data],
  );

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="legend-ai-chart legend-ai-chart--bar">
      {title !== undefined && title.length > 0 && (
        <div className="legend-ai-chart__title">{title}</div>
      )}
      <div className="legend-ai-chart__bars">
        {data.map((item, idx) => {
          const pct = (item.value / maxValue) * 100;
          return (
            <div key={item.label} className="legend-ai-chart__bar-row">
              <span className="legend-ai-chart__bar-label" title={item.label}>
                {item.label}
              </span>
              <div className="legend-ai-chart__bar-track">
                <div
                  className="legend-ai-chart__bar-fill"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: resolveColor(item, idx),
                    animationDelay: `${idx * 60}ms`,
                  }}
                />
              </div>
              <span className="legend-ai-chart__bar-value">
                {Number.isInteger(item.value)
                  ? item.value.toLocaleString()
                  : item.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const LegendAIDonutChart = (props: {
  data: LegendAIChartDataPoint[];
  title?: string;
}): React.ReactNode => {
  const { data, title } = props;

  const total = useMemo(
    () => data.reduce((s, d) => s + d.value, 0) || 1,
    [data],
  );

  const segments = useMemo(() => {
    let offset = 0;
    return data.map((item) => {
      const pct = item.value / total;
      const dashLen = pct * DONUT_CIRCUMFERENCE;
      const seg = {
        ...item,
        dashLen,
        dashOffset: -offset,
        pct,
      };
      offset += dashLen;
      return seg;
    });
  }, [data, total]);

  if (data.length === 0) {
    return null;
  }

  const center = DONUT_SIZE / 2;

  return (
    <div className="legend-ai-chart legend-ai-chart--donut">
      {title !== undefined && title.length > 0 && (
        <div className="legend-ai-chart__title">{title}</div>
      )}
      <div className="legend-ai-chart__donut-wrapper">
        <svg
          viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
          className="legend-ai-chart__donut-svg"
        >
          {segments.map((seg, idx) => (
            <circle
              key={seg.label}
              cx={center}
              cy={center}
              r={DONUT_RADIUS}
              fill="none"
              stroke={resolveColor(seg, idx)}
              strokeWidth={DONUT_STROKE}
              strokeDasharray={`${seg.dashLen} ${DONUT_CIRCUMFERENCE - seg.dashLen}`}
              strokeDashoffset={seg.dashOffset}
              className="legend-ai-chart__donut-segment"
            />
          ))}
        </svg>
        <div className="legend-ai-chart__donut-center">
          <span className="legend-ai-chart__donut-total">
            {total.toLocaleString()}
          </span>
          <span className="legend-ai-chart__donut-total-label">total</span>
        </div>
      </div>
      <div className="legend-ai-chart__legend">
        {data.map((item, idx) => (
          <div key={item.label} className="legend-ai-chart__legend-item">
            <span
              className="legend-ai-chart__legend-dot"
              style={{ backgroundColor: resolveColor(item, idx) }}
            />
            <span className="legend-ai-chart__legend-label">{item.label}</span>
            <span className="legend-ai-chart__legend-value">
              {item.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

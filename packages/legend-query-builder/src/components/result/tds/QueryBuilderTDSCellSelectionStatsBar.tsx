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

import { observer } from 'mobx-react-lite';
import { useRef, useLayoutEffect } from 'react';
import { clsx } from '@finos/legend-art';
import { MAXIMUM_FRACTION_DIGITS } from './QueryBuilderTDSSimpleGridResult.js';
import { DEFAULT_LOCALE } from '../../../graph-manager/QueryBuilderConst.js';
import type {
  CellSelectionStats,
  DistributionBucket,
  DistributionChartType,
  ValueFrequency,
} from './QueryBuilderTDSCellSelectionStats.js';

const formatNum = (value: number): string =>
  Intl.NumberFormat(DEFAULT_LOCALE, {
    maximumFractionDigits: MAXIMUM_FRACTION_DIGITS,
  }).format(value);

// ---------------------------------------------------------------------------
// Inline loading spinner — shown while stats are being computed
// ---------------------------------------------------------------------------

const StatsSpinner = () => (
  <span
    className="query-builder__result__tds-grid__stats-bar__item__spinner"
    title="Computing…"
  />
);

// ---------------------------------------------------------------------------
// Value-frequency tooltip (shown on Unique Count hover)
// ---------------------------------------------------------------------------

const FREQ_CHART_HEIGHT = 10; // px per row
const FREQ_CHART_BAR_AREA = 80; // px available for bars
const FREQ_LABEL_WIDTH = 90; // px for label column
const FREQ_COUNT_WIDTH = 30; // px for count column
const FREQ_TOTAL_WIDTH =
  FREQ_LABEL_WIDTH + FREQ_CHART_BAR_AREA + FREQ_COUNT_WIDTH + 8;

const ValueFrequencyTooltip = ({
  frequencies,
  darkMode,
}: {
  frequencies: ValueFrequency[];
  darkMode: boolean;
}) => {
  const maxCount = Math.max(...frequencies.map((f) => f.count));
  const tooltipRef = useRef<HTMLDivElement>(null);

  // After the tooltip becomes visible, clamp it within the viewport so that
  // it never overflows off the left or right edge of the window.
  useLayoutEffect(() => {
    const el = tooltipRef.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    if (rect.left < 0) {
      el.style.left = `${-rect.left + 4}px`;
    } else if (rect.right > globalThis.innerWidth) {
      el.style.left = `${globalThis.innerWidth - rect.right - 4}px`;
    }
  });

  return (
    <div
      ref={tooltipRef}
      className={clsx(
        'query-builder__result__tds-grid__stats-bar__freq-tooltip',
        {
          'query-builder__result__tds-grid__stats-bar__freq-tooltip--dark':
            darkMode,
        },
      )}
    >
      <svg
        width={FREQ_TOTAL_WIDTH}
        height={frequencies.length * (FREQ_CHART_HEIGHT + 3) + 2}
      >
        {frequencies.map((freq, i) => {
          const y = i * (FREQ_CHART_HEIGHT + 3) + 1;
          const barW = Math.max(
            1,
            (freq.count / maxCount) * FREQ_CHART_BAR_AREA,
          );
          const labelText =
            freq.label.length > 12 ? `${freq.label.slice(0, 11)}…` : freq.label;
          return (
            <g
              // eslint-disable-next-line react/no-array-index-key
              key={i}
            >
              {/* label */}
              <text
                x={FREQ_LABEL_WIDTH - 4}
                y={y + FREQ_CHART_HEIGHT - 2}
                textAnchor="end"
                className={clsx(
                  'query-builder__result__tds-grid__stats-bar__freq-tooltip__label',
                  {
                    'query-builder__result__tds-grid__stats-bar__freq-tooltip__label--other':
                      freq.isOther,
                    'query-builder__result__tds-grid__stats-bar__freq-tooltip__label--empty':
                      freq.isEmpty,
                  },
                )}
              >
                {labelText}
              </text>
              {/* bar */}
              <rect
                x={FREQ_LABEL_WIDTH}
                y={y}
                width={barW}
                height={FREQ_CHART_HEIGHT}
                className={clsx(
                  'query-builder__result__tds-grid__stats-bar__freq-tooltip__bar',
                  {
                    'query-builder__result__tds-grid__stats-bar__freq-tooltip__bar--other':
                      freq.isOther,
                    'query-builder__result__tds-grid__stats-bar__freq-tooltip__bar--empty':
                      freq.isEmpty,
                  },
                )}
              />
              {/* count */}
              <text
                x={FREQ_LABEL_WIDTH + FREQ_CHART_BAR_AREA + 4}
                y={y + FREQ_CHART_HEIGHT - 2}
                className="query-builder__result__tds-grid__stats-bar__freq-tooltip__count"
              >
                {freq.count}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const formatBucketLabel = (
  bucket: DistributionBucket,
  chartType: DistributionChartType,
): string => {
  const n = bucket.count;
  const countLabel = `${n} ${n === 1 ? 'value' : 'values'}`;

  if (chartType === 'date') {
    const lo = bucket.lowerDateLabel ?? bucket.lower;
    const hi = bucket.upperDateLabel ?? bucket.upper;
    if (lo === hi) {
      return `${countLabel} on ${lo}`;
    }
    return `${countLabel} within the range ${lo} – ${hi}`;
  }

  if (chartType === 'string-length') {
    const lo = Math.round(bucket.lower);
    const hi = Math.round(bucket.upper);
    if (lo === hi) {
      return `${countLabel} with length ${lo}`;
    }
    return `${countLabel} with length ${lo} – ${hi}`;
  }

  // numeric
  if (bucket.lower === bucket.upper) {
    return `${countLabel} equal to ${formatNum(bucket.lower)}`;
  }
  return `${countLabel} within the range ${formatNum(bucket.lower)} – ${formatNum(bucket.upper)}`;
};

// Compact SVG frequency-distribution histogram
const CHART_HEIGHT = 18;
const CHART_WIDTH = 120;
const BAR_GAP = 1;

const MiniHistogram = ({
  buckets,
  chartType,
  darkMode,
}: {
  buckets: DistributionBucket[];
  chartType: DistributionChartType;
  darkMode: boolean;
}) => {
  if (buckets.length === 0) {
    return null;
  }

  const maxCount = Math.max(...buckets.map((b) => b.count));
  if (maxCount === 0) {
    return null;
  }

  const n = buckets.length;
  const barW = Math.max(1, (CHART_WIDTH - BAR_GAP * (n - 1)) / n);

  return (
    <div
      className={clsx('query-builder__result__tds-grid__stats-bar__chart', {
        'query-builder__result__tds-grid__stats-bar__chart--dark': darkMode,
      })}
    >
      <svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        {buckets.map((bucket, i) => {
          const barH = Math.max(1, (bucket.count / maxCount) * CHART_HEIGHT);
          const x = i * (barW + BAR_GAP);
          return (
            <rect
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              x={x}
              y={CHART_HEIGHT - barH}
              width={barW}
              height={barH}
              opacity={bucket.count === 0 ? 0.15 : 1}
            >
              <title>{formatBucketLabel(bucket, chartType)}</title>
            </rect>
          );
        })}
      </svg>
    </div>
  );
};

export const QueryBuilderTDSCellSelectionStatsBar = observer(
  (props: {
    /** Fully-computed stats, or undefined while computation is in progress */
    stats: CellSelectionStats | undefined;
    /** Total number of selected cells — 0 while Phase 1 debounce is pending */
    cellCount: number;
    /** True once the 50 ms debounce has resolved and cellCount is accurate */
    countReady: boolean;
    darkMode: boolean;
  }) => {
    const { stats, cellCount, countReady, darkMode } = props;
    const loading = stats === undefined;
    const hasNumericStats = !loading && stats.sum !== undefined;
    const hasDateStats = !loading && stats.dateMin !== undefined;
    const hasStringStats = !loading && stats.strMinLength !== undefined;
    const hasChart =
      !loading &&
      stats.distributionBuckets !== undefined &&
      stats.distributionBuckets.length >= 2;

    return (
      <div
        className={clsx('query-builder__result__tds-grid__stats-bar', {
          'query-builder__result__tds-grid__stats-bar--dark': darkMode,
        })}
      >
        {/* Count — spinner until Phase 1 resolves, then the number */}
        <span
          className={clsx('query-builder__result__tds-grid__stats-bar__item', {
            'query-builder__result__tds-grid__stats-bar__item--has-tooltip':
              !loading &&
              stats.valueFrequencies !== undefined &&
              stats.valueFrequencies.length > 0,
          })}
        >
          <span className="query-builder__result__tds-grid__stats-bar__item__label">
            Count:
          </span>
          <span className="query-builder__result__tds-grid__stats-bar__item__value">
            {countReady ? cellCount : <StatsSpinner />}
          </span>
          {!loading &&
            stats.valueFrequencies !== undefined &&
            stats.valueFrequencies.length > 0 && (
              <ValueFrequencyTooltip
                frequencies={stats.valueFrequencies}
                darkMode={darkMode}
              />
            )}
        </span>

        {/* Unique Count — spinner while loading */}
        <span
          className={clsx('query-builder__result__tds-grid__stats-bar__item', {
            'query-builder__result__tds-grid__stats-bar__item--has-tooltip':
              !loading &&
              stats.valueFrequencies !== undefined &&
              stats.valueFrequencies.length > 0,
          })}
        >
          <span className="query-builder__result__tds-grid__stats-bar__item__label">
            Unique Count:
          </span>
          <span className="query-builder__result__tds-grid__stats-bar__item__value">
            {loading ? <StatsSpinner /> : stats.uniqueCount}
          </span>
          {!loading &&
            stats.valueFrequencies !== undefined &&
            stats.valueFrequencies.length > 0 && (
              <ValueFrequencyTooltip
                frequencies={stats.valueFrequencies}
                darkMode={darkMode}
              />
            )}
        </span>

        {/* Empty Count — spinner while loading */}
        <span
          className={clsx('query-builder__result__tds-grid__stats-bar__item', {
            'query-builder__result__tds-grid__stats-bar__item--has-tooltip':
              !loading &&
              stats.valueFrequencies !== undefined &&
              stats.valueFrequencies.length > 0,
          })}
        >
          <span className="query-builder__result__tds-grid__stats-bar__item__label">
            Empty Count:
          </span>
          <span className="query-builder__result__tds-grid__stats-bar__item__value">
            {loading ? <StatsSpinner /> : stats.nullCount}
          </span>
          {!loading &&
            stats.valueFrequencies !== undefined &&
            stats.valueFrequencies.length > 0 && (
              <ValueFrequencyTooltip
                frequencies={stats.valueFrequencies}
                darkMode={darkMode}
              />
            )}
        </span>

        {/* Numeric stats — only shown once loaded and applicable */}
        {hasNumericStats && (
          <>
            <span className="query-builder__result__tds-grid__stats-bar__separator" />
            <span className="query-builder__result__tds-grid__stats-bar__item">
              <span className="query-builder__result__tds-grid__stats-bar__item__label">
                Min:
              </span>
              <span className="query-builder__result__tds-grid__stats-bar__item__value">
                {formatNum(stats.min ?? 0)}
              </span>
            </span>
            <span className="query-builder__result__tds-grid__stats-bar__item">
              <span className="query-builder__result__tds-grid__stats-bar__item__label">
                Max:
              </span>
              <span className="query-builder__result__tds-grid__stats-bar__item__value">
                {formatNum(stats.max ?? 0)}
              </span>
            </span>
            <span className="query-builder__result__tds-grid__stats-bar__item">
              <span className="query-builder__result__tds-grid__stats-bar__item__label">
                Sum:
              </span>
              <span className="query-builder__result__tds-grid__stats-bar__item__value">
                {formatNum(stats.sum ?? 0)}
              </span>
            </span>
            <span className="query-builder__result__tds-grid__stats-bar__item">
              <span className="query-builder__result__tds-grid__stats-bar__item__label">
                Avg:
              </span>
              <span className="query-builder__result__tds-grid__stats-bar__item__value">
                {formatNum(stats.avg ?? 0)}
              </span>
            </span>
          </>
        )}
        {hasDateStats && (
          <>
            <span className="query-builder__result__tds-grid__stats-bar__separator" />
            <span className="query-builder__result__tds-grid__stats-bar__item">
              <span className="query-builder__result__tds-grid__stats-bar__item__label">
                Min:
              </span>
              <span className="query-builder__result__tds-grid__stats-bar__item__value">
                {stats.dateMin}
              </span>
            </span>
            <span className="query-builder__result__tds-grid__stats-bar__item">
              <span className="query-builder__result__tds-grid__stats-bar__item__label">
                Max:
              </span>
              <span className="query-builder__result__tds-grid__stats-bar__item__value">
                {stats.dateMax}
              </span>
            </span>
          </>
        )}
        {hasStringStats && (
          <>
            <span className="query-builder__result__tds-grid__stats-bar__separator" />
            <span className="query-builder__result__tds-grid__stats-bar__item">
              <span className="query-builder__result__tds-grid__stats-bar__item__label">
                Min Length:
              </span>
              <span className="query-builder__result__tds-grid__stats-bar__item__value">
                {stats.strMinLength}
              </span>
            </span>
            <span className="query-builder__result__tds-grid__stats-bar__item">
              <span className="query-builder__result__tds-grid__stats-bar__item__label">
                Max Length:
              </span>
              <span className="query-builder__result__tds-grid__stats-bar__item__value">
                {stats.strMaxLength}
              </span>
            </span>
          </>
        )}
        {hasChart && (
          <>
            <span className="query-builder__result__tds-grid__stats-bar__separator" />
            <MiniHistogram
              buckets={stats.distributionBuckets ?? []}
              chartType={stats.distributionChartType ?? 'numeric'}
              darkMode={darkMode}
            />
          </>
        )}
      </div>
    );
  },
);

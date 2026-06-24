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
import { LegendAIChartType } from '../LegendAI_LegendApplicationPlugin_Extension.js';
import type { LegendAIGridData } from '../LegendAITypes.js';
import { analyzeGridData } from './LegendAIAnalysisUtils.js';
import { LegendAIBarChart, LegendAIDonutChart } from './LegendAICharts.js';

export const LegendAIAnalysisPanel = (props: {
  gridData: LegendAIGridData;
  summary: string;
  SummaryRenderer: React.ComponentType<{ value: string }>;
}): React.ReactNode => {
  const { gridData, summary, SummaryRenderer } = props;

  const { metrics, chartType, chartData, numericColumnName } = useMemo(
    () => analyzeGridData(gridData),
    [gridData],
  );

  let chartTitle: string | undefined;
  if (numericColumnName !== undefined) {
    chartTitle =
      chartType === LegendAIChartType.PIE
        ? `${numericColumnName} Distribution`
        : `Top ${chartData.length} by ${numericColumnName}`;
  }

  const chartTitleProp = chartTitle === undefined ? {} : { title: chartTitle };

  return (
    <div className="legend-ai-analysis">
      {metrics.length > 0 && (
        <div className="legend-ai-analysis__metrics">
          {metrics.map((m) => (
            <div key={m.label} className="legend-ai-analysis__metric-card">
              <span className="legend-ai-analysis__metric-value">
                {m.value}
              </span>
              <span className="legend-ai-analysis__metric-label">
                {m.label}
              </span>
              {m.detail !== undefined && (
                <span className="legend-ai-analysis__metric-detail">
                  {m.detail}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {chartData.length > 0 && (
        <div className="legend-ai-analysis__chart-section">
          {chartType === LegendAIChartType.PIE ? (
            <LegendAIDonutChart data={chartData} {...chartTitleProp} />
          ) : (
            <LegendAIBarChart data={chartData} {...chartTitleProp} />
          )}
        </div>
      )}

      <div className="legend-ai-analysis__narrative">
        <SummaryRenderer value={summary} />
      </div>
    </div>
  );
};

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
import {
  LegendAIChartType,
  LegendAIChartRecommendation,
  LegendAIKeyMetric,
  LegendAIChartDataPoint,
  LegendAIResultAnalysis,
  type LegendAIEntityCandidate,
} from '../LegendAI_LegendApplicationPlugin_Extension.js';

describe(unitTest('LegendAI chart and analysis types'), () => {
  test('LegendAIChartType enum has all expected values', () => {
    expect(LegendAIChartType.BAR).toBe('bar');
    expect(LegendAIChartType.LINE).toBe('line');
    expect(LegendAIChartType.PIE).toBe('pie');
    expect(LegendAIChartType.TABLE).toBe('table');
    expect(LegendAIChartType.NONE).toBe('none');
    expect(Object.values(LegendAIChartType)).toHaveLength(5);
  });

  test('LegendAIChartRecommendation', () => {
    const rec = new LegendAIChartRecommendation();
    rec.chartType = LegendAIChartType.BAR;
    rec.xAxis = 'category';
    rec.yAxis = 'revenue';
    rec.label = 'Revenue by Category';
    rec.reasoning = 'Categorical data with numeric values';
    expect(rec.chartType).toBe('bar');
    expect(rec.xAxis).toBe('category');
    expect(rec.yAxis).toBe('revenue');
    expect(rec.label).toBe('Revenue by Category');
    expect(rec.reasoning).toBe('Categorical data with numeric values');
  });

  test('LegendAIChartRecommendation with optional fields omitted', () => {
    const rec = new LegendAIChartRecommendation();
    rec.chartType = LegendAIChartType.PIE;
    rec.reasoning = 'Small dataset';
    expect(rec.xAxis).toBeUndefined();
    expect(rec.yAxis).toBeUndefined();
    expect(rec.label).toBeUndefined();
  });

  test('LegendAIKeyMetric', () => {
    const metric = new LegendAIKeyMetric();
    metric.label = 'Total Rows';
    metric.value = '1,234';
    metric.detail = 'Range: 10 - 500';
    expect(metric.label).toBe('Total Rows');
    expect(metric.value).toBe('1,234');
    expect(metric.detail).toBe('Range: 10 - 500');
  });

  test('LegendAIKeyMetric without detail', () => {
    const metric = new LegendAIKeyMetric();
    metric.label = 'Count';
    metric.value = '42';
    expect(metric.detail).toBeUndefined();
  });

  test('LegendAIChartDataPoint', () => {
    const point = new LegendAIChartDataPoint();
    point.label = 'US';
    point.value = 100;
    point.color = '#5b8dbe';
    point.colorIndex = 0;
    expect(point.label).toBe('US');
    expect(point.value).toBe(100);
    expect(point.color).toBe('#5b8dbe');
    expect(point.colorIndex).toBe(0);
  });

  test('LegendAIChartDataPoint with optional fields omitted', () => {
    const point = new LegendAIChartDataPoint();
    point.label = 'UK';
    point.value = 50;
    expect(point.color).toBeUndefined();
    expect(point.colorIndex).toBeUndefined();
  });

  test('LegendAIResultAnalysis', () => {
    const analysis = new LegendAIResultAnalysis();
    analysis.summary = 'The data shows revenue distribution across regions.';
    analysis.chartRecommendation = new LegendAIChartRecommendation();
    analysis.chartRecommendation.chartType = LegendAIChartType.BAR;
    analysis.chartRecommendation.reasoning = 'Categorical';
    analysis.keyMetrics = [{ label: 'Rows', value: '10' }];
    analysis.chartData = [{ label: 'US', value: 100 }];
    analysis.suggestedQueries = ['Show top 5 regions'];
    expect(analysis.summary).toContain('revenue');
    expect(analysis.chartRecommendation.chartType).toBe('bar');
    expect(analysis.keyMetrics).toHaveLength(1);
    expect(analysis.chartData).toHaveLength(1);
    expect(analysis.suggestedQueries).toHaveLength(1);
  });

  test('LegendAIResultAnalysis without chart recommendation', () => {
    const analysis = new LegendAIResultAnalysis();
    analysis.summary = 'No chart available';
    analysis.keyMetrics = [];
    analysis.chartData = [];
    analysis.suggestedQueries = [];
    expect(analysis.chartRecommendation).toBeUndefined();
  });

  test('LegendAIEntityCandidate class', () => {
    const candidate: LegendAIEntityCandidate = {
      datasetName: 'BondPricing',
      description: 'Bond pricing data',
      modelPath: 'my::model::Bond',
      similarityScore: 0.95,
    };
    expect(candidate.datasetName).toBe('BondPricing');
    expect(candidate.description).toBe('Bond pricing data');
    expect(candidate.modelPath).toBe('my::model::Bond');
    expect(candidate.similarityScore).toBe(0.95);
  });

  test('LegendAIEntityCandidate without description', () => {
    const candidate: LegendAIEntityCandidate = {
      datasetName: 'TradeData',
      modelPath: 'my::model::Trade',
      similarityScore: 0.8,
    };
    expect(candidate.description).toBeUndefined();
  });
});

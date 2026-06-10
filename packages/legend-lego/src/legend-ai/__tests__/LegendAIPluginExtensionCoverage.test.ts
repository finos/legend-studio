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
  LegendAISqlExtractionResult,
  LegendAIJudgeResult,
  LegendAIJudgeVerdict,
  LegendAISqlExecutionResultData,
  LegendAIOrchestratorDataProductCoordinates,
  LegendAIOrchestratorRequest,
  LegendAIOrchestratorResponse,
  LegendAIResolvedEntities,
  LegendAIEntityCandidate,
  LegendAIChartType,
  LegendAIChartRecommendation,
  LegendAIKeyMetric,
  LegendAIChartDataPoint,
  LegendAIResultAnalysis,
  type LegendAISemanticSearchResolutionDetails,
} from '../LegendAI_LegendApplicationPlugin_Extension.js';
import { QueryExplicitExecutionContextInfo } from '@finos/legend-graph';
import {
  TEST__createMockLegendAIPlugin,
  TEST_DATA__legendAIConfig,
  TEST_DATA__legendAIServices,
} from '../__test-utils__/LegendAITestUtils.js';

describe(unitTest('LegendAI plugin extension DTOs'), () => {
  test('LegendAISqlExtractionResult', () => {
    const result = new LegendAISqlExtractionResult();
    result.sql = 'SELECT 1';
    result.failure = null;
    result.suggestion = 'Try this';
    expect(result.sql).toBe('SELECT 1');
    expect(result.failure).toBeNull();
    expect(result.suggestion).toBe('Try this');
  });

  test('LegendAIJudgeResult PASS', () => {
    const result = new LegendAIJudgeResult();
    result.verdict = LegendAIJudgeVerdict.PASS;
    expect(result.verdict).toBe('PASS');
    expect(result.issues).toBeUndefined();
    expect(result.correctedSql).toBeUndefined();
  });

  test('LegendAIJudgeResult FAIL with correction', () => {
    const result = new LegendAIJudgeResult();
    result.verdict = LegendAIJudgeVerdict.FAIL;
    result.issues = 'wrong join';
    result.correctedSql = 'SELECT * FROM t INNER JOIN u ON t.id = u.id';
    expect(result.verdict).toBe('FAIL');
    expect(result.issues).toBe('wrong join');
    expect(result.correctedSql).toContain('INNER JOIN');
  });

  test('LegendAISqlExecutionResultData', () => {
    const data = new LegendAISqlExecutionResultData();
    data.columns = ['a', 'b'];
    data.rows = [{ a: 1, b: 2 }];
    expect(data.columns).toEqual(['a', 'b']);
    expect(data.rows).toHaveLength(1);
  });

  test('LegendAIOrchestratorDataProductCoordinates', () => {
    const coords = new LegendAIOrchestratorDataProductCoordinates();
    coords.data_product = 'my::Product';
    coords.group_id = 'com.example';
    coords.artifact_id = 'artifact';
    coords.version = '1.0.0';
    expect(coords.data_product).toBe('my::Product');
    expect(coords.group_id).toBe('com.example');
    expect(coords.artifact_id).toBe('artifact');
    expect(coords.version).toBe('1.0.0');
  });

  test('LegendAIOrchestratorRequest', () => {
    const request = new LegendAIOrchestratorRequest();
    request.user_question = 'show trades';
    request.semantic_search_resolution_details = {
      data_product_coordinates:
        new LegendAIOrchestratorDataProductCoordinates(),
      root_entity: 'my::Entity',
      related_entities: ['my::Related'],
    };
    expect(request.user_question).toBe('show trades');
    expect(request.semantic_search_resolution_details.root_entity).toBe(
      'my::Entity',
    );
    expect(
      request.semantic_search_resolution_details.related_entities,
    ).toHaveLength(1);
  });

  test('LegendAIOrchestratorResponse', () => {
    const response = new LegendAIOrchestratorResponse();
    response.legend_query = 'model::Entity.all()->project(…)';
    expect(response.legend_query).toContain('Entity.all');
  });

  test('LegendAIResolvedEntities', () => {
    const entities = new LegendAIResolvedEntities();
    entities.rootEntity = 'my::Root';
    entities.relatedEntities = ['my::A', 'my::B'];
    expect(entities.rootEntity).toBe('my::Root');
    expect(entities.relatedEntities).toHaveLength(2);
  });

  test('LegendAISemanticSearchResolutionDetails is structurally sound', () => {
    const coords = new LegendAIOrchestratorDataProductCoordinates();
    coords.data_product = 'my::Product';
    coords.group_id = 'com.example';
    coords.artifact_id = 'art';
    coords.version = '1.0.0';
    const details: LegendAISemanticSearchResolutionDetails = {
      data_product_coordinates: coords,
      root_entity: 'my::Root',
      related_entities: ['my::A'],
    };
    expect(details.root_entity).toBe('my::Root');
    expect(details.related_entities).toHaveLength(1);
  });

  test('QueryExplicitExecutionContextInfo (replaces LegendAIPureExecutionContext)', () => {
    const ctx = new QueryExplicitExecutionContextInfo();
    ctx.mapping = 'my::Mapping';
    ctx.runtime = 'my::Runtime';
    expect(ctx.mapping).toBe('my::Mapping');
    expect(ctx.runtime).toBe('my::Runtime');
  });

  test('LegendAIJudgeVerdict enum values', () => {
    expect(LegendAIJudgeVerdict.PASS).toBe('PASS');
    expect(LegendAIJudgeVerdict.FAIL).toBe('FAIL');
    const values = Object.values(LegendAIJudgeVerdict);
    expect(values).toHaveLength(2);
  });

  test('LegendAIEntityCandidate has expected defaults', () => {
    const candidate = new LegendAIEntityCandidate();
    candidate.datasetName = 'Trades';
    candidate.modelPath = 'my::Trade';
    candidate.similarityScore = 0.95;
    candidate.description = 'Trade entity';
    expect(candidate.datasetName).toBe('Trades');
    expect(candidate.modelPath).toBe('my::Trade');
    expect(candidate.similarityScore).toBe(0.95);
    expect(candidate.description).toBe('Trade entity');
  });

  test('LegendAIChartType enum values', () => {
    expect(LegendAIChartType.BAR).toBe('bar');
    expect(LegendAIChartType.LINE).toBe('line');
    expect(LegendAIChartType.PIE).toBe('pie');
    expect(LegendAIChartType.TABLE).toBe('table');
    expect(LegendAIChartType.NONE).toBe('none');
    expect(Object.values(LegendAIChartType)).toHaveLength(5);
  });

  test('LegendAIChartRecommendation has expected defaults', () => {
    const rec = new LegendAIChartRecommendation();
    rec.chartType = LegendAIChartType.BAR;
    rec.xAxis = 'date';
    rec.yAxis = 'amount';
    rec.label = 'Trades';
    rec.reasoning = 'Bar chart suits categorical data';
    expect(rec.chartType).toBe('bar');
    expect(rec.xAxis).toBe('date');
    expect(rec.yAxis).toBe('amount');
    expect(rec.label).toBe('Trades');
    expect(rec.reasoning).toBe('Bar chart suits categorical data');
  });

  test('LegendAIKeyMetric has expected defaults', () => {
    const metric = new LegendAIKeyMetric();
    metric.label = 'Total';
    metric.value = '1000';
    metric.detail = 'Sum of all trades';
    expect(metric.label).toBe('Total');
    expect(metric.value).toBe('1000');
    expect(metric.detail).toBe('Sum of all trades');
  });

  test('LegendAIChartDataPoint has expected defaults', () => {
    const point = new LegendAIChartDataPoint();
    point.label = 'Jan';
    point.value = 42;
    point.color = '#ff0000';
    point.colorIndex = 0;
    expect(point.label).toBe('Jan');
    expect(point.value).toBe(42);
    expect(point.color).toBe('#ff0000');
    expect(point.colorIndex).toBe(0);
  });

  test('LegendAIResultAnalysis has expected defaults', () => {
    const analysis = new LegendAIResultAnalysis();
    analysis.summary = 'Top trades summary';
    analysis.keyMetrics = [];
    analysis.chartData = [];
    analysis.suggestedQueries = ['show more'];
    expect(analysis.summary).toBe('Top trades summary');
    expect(analysis.chartRecommendation).toBeUndefined();
    expect(analysis.keyMetrics).toEqual([]);
    expect(analysis.chartData).toEqual([]);
    expect(analysis.suggestedQueries).toEqual(['show more']);
  });

  test('selectRelevantServices returns services unchanged by default', async () => {
    const plugin = TEST__createMockLegendAIPlugin();
    const result = await plugin.selectRelevantServices(
      'show trades',
      TEST_DATA__legendAIServices,
      TEST_DATA__legendAIConfig,
    );
    expect(result).toBe(TEST_DATA__legendAIServices);
  });
});

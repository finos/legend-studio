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
import { unitTest, createMock } from '@finos/legend-shared/test';
import {
  processQuestionViaOrchestrator,
  processQuestionWithIntent,
  executePureQueryAndReport,
} from '../LegendAIChatProcessors.js';
import {
  type LegendAIAssistantMessage,
  LegendAIQuestionIntent,
} from '../../LegendAITypes.js';
import type { LegendAIOrchestratorDataProductCoordinates } from '../../LegendAI_LegendApplicationPlugin_Extension.js';
import type { QueryExplicitExecutionContextInfo } from '@finos/legend-graph';
import {
  TEST__createMockSetter,
  TEST__seedAssistant,
  TEST__createMockLegendAIPlugin,
  TEST_DATA__legendAIConfig,
  TEST_DATA__legendAIMetadata,
  TEST_DATA__legendAIServices,
} from '../../__test-utils__/LegendAITestUtils.js';

const TEST_DATA__coordinates: LegendAIOrchestratorDataProductCoordinates = {
  data_product: 'my::TestProduct',
  group_id: 'com.test',
  artifact_id: 'prod',
  version: '1.0.0',
};

const TEST_DATA__executionContext: QueryExplicitExecutionContextInfo = {
  mapping: 'my::Mapping',
  runtime: 'my::Runtime',
};
describe(unitTest('processQuestionViaOrchestrator'), () => {
  test('resolves entities and generates query via orchestrator', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      resolveEntitiesForQuery: createMock().mockResolvedValue({
        rootEntity: 'my::pkg::TradeEntity',
        relatedEntities: ['my::pkg::AccountEntity'],
      }),
      generateQueryViaOrchestrator: createMock().mockResolvedValue({
        legend_query: '#>{my::Store.trades}#->filter(x|x.amount > 100)',
      }),
      executePureQuery: createMock().mockResolvedValue({
        columns: ['tradeId', 'amount'],
        rows: [{ tradeId: 'T1', amount: 200 }],
      }),
    });

    await processQuestionViaOrchestrator(
      'show trades over 100',
      TEST_DATA__coordinates,
      TEST_DATA__legendAIMetadata,
      {
        config: {
          ...TEST_DATA__legendAIConfig,
          orchestratorUrl: 'http://localhost/orchestrator',
        },
        plugin,
        history: [],
        setMessages: setter,
      },
      TEST_DATA__executionContext,
    );

    const msg = getMessages()[1] as LegendAIAssistantMessage;
    expect(msg.sql).toBe('#>{my::Store.trades}#->filter(x|x.amount > 100)');
    expect(msg.gridData).toBeDefined();
    expect(msg.gridData?.rowData).toHaveLength(1);
    expect(msg.isProcessing).toBe(false);
    expect(msg.isExecuting).toBe(false);
  });

  test('shows entity resolution in thinking steps', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      resolveEntitiesForQuery: createMock().mockResolvedValue({
        rootEntity: 'my::pkg::TradeEntity',
        relatedEntities: ['my::pkg::AccountEntity', 'my::pkg::BookEntity'],
      }),
      generateQueryViaOrchestrator: createMock().mockResolvedValue({
        legend_query: 'query',
      }),
      executePureQuery: createMock().mockResolvedValue({
        columns: ['x'],
        rows: [],
      }),
    });

    await processQuestionViaOrchestrator(
      'test',
      TEST_DATA__coordinates,
      TEST_DATA__legendAIMetadata,
      {
        config: {
          ...TEST_DATA__legendAIConfig,
          orchestratorUrl: 'http://localhost/orchestrator',
        },
        plugin,
        history: [],
        setMessages: setter,
      },
      TEST_DATA__executionContext,
    );

    const msg = getMessages()[1] as LegendAIAssistantMessage;
    const entityStep = msg.thinkingSteps.find((s) =>
      s.label.includes('TradeEntity'),
    );
    expect(entityStep).toBeDefined();
    const relatedStep = msg.thinkingSteps.find((s) =>
      s.label.includes('2 related entities'),
    );
    expect(relatedStep).toBeDefined();
  });

  test('shows error when no execution context available', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      resolveEntitiesForQuery: createMock().mockResolvedValue({
        rootEntity: 'my::Entity',
        relatedEntities: [],
      }),
      generateQueryViaOrchestrator: createMock().mockResolvedValue({
        legend_query: 'some query',
      }),
    });

    await processQuestionViaOrchestrator(
      'test',
      TEST_DATA__coordinates,
      TEST_DATA__legendAIMetadata,
      {
        config: {
          ...TEST_DATA__legendAIConfig,
          orchestratorUrl: 'http://localhost/orchestrator',
        },
        plugin,
        history: [],
        setMessages: setter,
      },
      undefined, // no execution context
    );

    const msg = getMessages()[1] as LegendAIAssistantMessage;
    expect(msg.error).toContain('No execution context available');
    expect(msg.isProcessing).toBe(false);
    expect(msg.isExecuting).toBe(false);
  });

  test('handles entity resolution error gracefully', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      resolveEntitiesForQuery: createMock().mockRejectedValue(
        new Error('Search API unavailable'),
      ),
    });

    await processQuestionViaOrchestrator(
      'test',
      TEST_DATA__coordinates,
      TEST_DATA__legendAIMetadata,
      {
        config: {
          ...TEST_DATA__legendAIConfig,
          orchestratorUrl: 'http://localhost/orchestrator',
        },
        plugin,
        history: [],
        setMessages: setter,
      },
      TEST_DATA__executionContext,
    );

    const msg = getMessages()[1] as LegendAIAssistantMessage;
    expect(msg.error).toContain('Search API unavailable');
    expect(msg.isProcessing).toBe(false);
  });
});
describe(unitTest('processQuestionWithIntent'), () => {
  test('metadata intent routes to metadata handler', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      callLLM: createMock().mockResolvedValue('Product description here'),
    });

    await processQuestionWithIntent(
      'describe this product',
      LegendAIQuestionIntent.METADATA,
      TEST_DATA__legendAIServices,
      'com.test:prod:1.0.0',
      TEST_DATA__legendAIMetadata,
      {
        config: TEST_DATA__legendAIConfig,
        plugin,
        history: [],
        setMessages: setter,
      },
    );

    const msg = getMessages()[1] as LegendAIAssistantMessage;
    expect(msg.textAnswer).toBe('Product description here');
    expect(msg.isProcessing).toBe(false);
  });

  test('data_query intent routes to SQL generation', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      callLLM: createMock().mockResolvedValue('sql response'),
      executeSql: createMock().mockResolvedValue({
        columns: ['id'],
        rows: [{ id: 1 }],
      }),
    });

    await processQuestionWithIntent(
      'show top 10 trades',
      LegendAIQuestionIntent.DATA_QUERY,
      TEST_DATA__legendAIServices,
      'com.test:prod:1.0.0',
      TEST_DATA__legendAIMetadata,
      {
        config: TEST_DATA__legendAIConfig,
        plugin,
        history: [],
        setMessages: setter,
      },
    );

    const msg = getMessages()[1] as LegendAIAssistantMessage;
    expect(msg.sql).toBe('SELECT * FROM t');
    expect(msg.gridData?.rowData).toHaveLength(1);
    expect(msg.isProcessing).toBe(false);
  });

  test('orchestrator intent with services goes SQL-first when configured', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      callLLM: createMock().mockResolvedValue('sql response'),
      executeSql: createMock().mockResolvedValue({
        columns: ['x'],
        rows: [{ x: 1 }],
      }),
    });

    await processQuestionWithIntent(
      'complex query',
      LegendAIQuestionIntent.ORCHESTRATOR,
      TEST_DATA__legendAIServices,
      'com.test:prod:1.0.0',
      TEST_DATA__legendAIMetadata,
      {
        config: {
          ...TEST_DATA__legendAIConfig,
          orchestratorUrl: 'http://localhost/orchestrator',
        },
        plugin,
        history: [],
        setMessages: setter,
      },
      {
        dataProductCoordinates: TEST_DATA__coordinates,
        pureExecutionContext: TEST_DATA__executionContext,
      },
    );

    const msg = getMessages()[1] as LegendAIAssistantMessage;
    expect(msg.sql).toBe('SELECT * FROM t');
    expect(msg.gridData?.rowData).toHaveLength(1);
  });

  test('data_query with no services errors', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin();

    await processQuestionWithIntent(
      'show data',
      LegendAIQuestionIntent.DATA_QUERY,
      [],
      'com.test:prod:1.0.0',
      TEST_DATA__legendAIMetadata,
      {
        config: TEST_DATA__legendAIConfig,
        plugin,
        history: [],
        setMessages: setter,
      },
    );

    const msg = getMessages()[1] as LegendAIAssistantMessage;
    expect(msg.error).toContain('No TDS services available');
  });

  test('no services with orchestrator offers fallback', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin();

    await processQuestionWithIntent(
      'show data',
      LegendAIQuestionIntent.DATA_QUERY,
      [],
      'com.test:prod:1.0.0',
      TEST_DATA__legendAIMetadata,
      {
        config: {
          ...TEST_DATA__legendAIConfig,
          orchestratorUrl: 'http://localhost/orchestrator',
        },
        plugin,
        history: [],
        setMessages: setter,
      },
      {
        dataProductCoordinates: TEST_DATA__coordinates,
        pureExecutionContext: TEST_DATA__executionContext,
      },
    );

    const msg = getMessages()[1] as LegendAIAssistantMessage;
    expect(msg.textAnswer).toContain('No TDS services available');
    expect(msg.fallbackAction).toBeDefined();
  });
});
describe(unitTest('executePureQueryAndReport'), () => {
  test('executes Pure query and sets grid data', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      executePureQuery: createMock().mockResolvedValue({
        columns: ['name', 'value'],
        rows: [
          { name: 'A', value: 10 },
          { name: 'B', value: 20 },
        ],
      }),
    });

    const result = await executePureQueryAndReport(
      'Pure expression',
      TEST_DATA__executionContext,
      TEST_DATA__coordinates,
      TEST_DATA__legendAIConfig,
      plugin,
      setter,
      Date.now(),
    );

    expect(result.columns).toEqual(['name', 'value']);
    expect(result.rows).toHaveLength(2);

    const msg = getMessages()[1] as LegendAIAssistantMessage;
    expect(msg.gridData).toBeDefined();
    expect(msg.gridData?.columnDefs).toHaveLength(2);
    expect(msg.gridData?.rowData).toHaveLength(2);
    expect(msg.isProcessing).toBe(false);
    expect(msg.isExecuting).toBe(false);
    expect(msg.execTime).toBeDefined();
  });

  test('returns empty results on execution failure', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      executePureQuery: createMock().mockRejectedValue(
        new Error('Engine unavailable'),
      ),
    });

    const result = await executePureQueryAndReport(
      'bad expression',
      TEST_DATA__executionContext,
      TEST_DATA__coordinates,
      TEST_DATA__legendAIConfig,
      plugin,
      setter,
      Date.now(),
    );

    expect(result.columns).toEqual([]);
    expect(result.rows).toEqual([]);

    const msg = getMessages()[1] as LegendAIAssistantMessage;
    expect(msg.error).toContain('Engine unavailable');
    expect(msg.isProcessing).toBe(false);
    expect(msg.isExecuting).toBe(false);
    expect(msg.execTime).toBeDefined();
  });
});

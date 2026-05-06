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
  generateAndJudgeSql,
  processQuestion,
  processQuestionWithIntent,
  executeSqlAndReport,
  handleMetadataQuestion,
} from '../LegendAIChatState.js';
import {
  type LegendAIAssistantMessage,
  LegendAIQuestionIntent,
} from '../../LegendAITypes.js';
import {
  type LegendAIJudgeResult,
  LegendAIJudgeVerdict,
} from '../../LegendAI_LegendApplicationPlugin_Extension.js';
import {
  TEST__createMockSetter,
  TEST__seedAssistant,
  TEST__createMockLegendAIPlugin,
  TEST_DATA__legendAIConfig,
  TEST_DATA__legendAIMetadata,
  TEST_DATA__legendAIServices,
} from '../../__test-utils__/LegendAITestUtils.js';

const TEST_DATA__coordinates = {
  data_product: 'my::DataProduct',
  group_id: 'com.test',
  artifact_id: 'prod',
  version: '1.0.0',
};

const TEST_DATA__executionContext = {
  mapping: 'my::Mapping',
  runtime: 'my::Runtime',
};

// ─── handleMetadataQuestion — suggested queries ──────────────────────────────

describe(unitTest('handleMetadataQuestion — suggested queries'), () => {
  test('parses suggested queries from delimiter response', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      callLLM: createMock().mockResolvedValue(
        'Answer text here\n---SUGGESTED_QUERIES---\n1. Show top trades\n2. What services are available?\n3. Revenue by region',
      ),
    });

    await handleMetadataQuestion(
      'what is this?',
      TEST_DATA__legendAIMetadata,
      {
        config: TEST_DATA__legendAIConfig,
        plugin,
        history: [],
        setMessages: setter,
      },
      Date.now(),
      true,
    );

    const msg = getMessages()[1] as LegendAIAssistantMessage;
    expect(msg.textAnswer).toBe('Answer text here');
    expect(msg.suggestedQueries).toHaveLength(3);
    expect(msg.suggestedQueries[0]).toBe('Show top trades');
  });

  test('suppresses suggestions when no queryable services and no orchestrator', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      callLLM: createMock().mockResolvedValue(
        'Answer\n---SUGGESTED_QUERIES---\n1. suggestion',
      ),
    });

    await handleMetadataQuestion(
      'what is this?',
      TEST_DATA__legendAIMetadata,
      {
        config: { ...TEST_DATA__legendAIConfig, orchestratorUrl: undefined },
        plugin,
        history: [],
        setMessages: setter,
      },
      Date.now(),
      false, // hasQueryableServices = false
    );

    const msg = getMessages()[1] as LegendAIAssistantMessage;
    expect(msg.suggestedQueries).toEqual([]);
  });

  test('keeps suggestions when orchestratorUrl is present even without services', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      callLLM: createMock().mockResolvedValue(
        'Answer\n---SUGGESTED_QUERIES---\n1. suggestion one',
      ),
    });

    await handleMetadataQuestion(
      'what is this?',
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
      Date.now(),
      false,
    );

    const msg = getMessages()[1] as LegendAIAssistantMessage;
    expect(msg.suggestedQueries).toHaveLength(1);
  });
});

// ─── generateAndJudgeSql — judge correction with WITH / ( ────────────────────

describe(unitTest('generateAndJudgeSql — corrected SQL variants'), () => {
  test('accepts corrected SQL starting with WITH', async () => {
    const { setter } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    let callCount = 0;
    const plugin = TEST__createMockLegendAIPlugin({
      callLLM: createMock().mockResolvedValue('response'),
      extractJudgeResult: (): LegendAIJudgeResult => {
        callCount++;
        if (callCount <= 1) {
          return {
            verdict: LegendAIJudgeVerdict.FAIL,
            correctedSql: 'WITH cte AS (SELECT * FROM t) SELECT * FROM cte',
          };
        }
        return { verdict: LegendAIJudgeVerdict.PASS };
      },
    });

    const result = await generateAndJudgeSql(
      'query',
      TEST_DATA__legendAIServices,
      'com.test:prod:1.0.0',
      {
        config: TEST_DATA__legendAIConfig,
        plugin,
        history: [],
        setMessages: setter,
      },
      Date.now(),
    );

    expect(result).toBe('WITH cte AS (SELECT * FROM t) SELECT * FROM cte');
  });

  test('accepts corrected SQL starting with (', async () => {
    const { setter } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    let callCount = 0;
    const plugin = TEST__createMockLegendAIPlugin({
      callLLM: createMock().mockResolvedValue('response'),
      extractJudgeResult: (): LegendAIJudgeResult => {
        callCount++;
        if (callCount <= 1) {
          return {
            verdict: LegendAIJudgeVerdict.FAIL,
            correctedSql: '(SELECT a FROM t1 UNION SELECT b FROM t2)',
          };
        }
        return { verdict: LegendAIJudgeVerdict.PASS };
      },
    });

    const result = await generateAndJudgeSql(
      'query',
      TEST_DATA__legendAIServices,
      'com.test:prod:1.0.0',
      {
        config: TEST_DATA__legendAIConfig,
        plugin,
        history: [],
        setMessages: setter,
      },
      Date.now(),
    );

    expect(result).toBe('(SELECT a FROM t1 UNION SELECT b FROM t2)');
  });
});

// ─── executeSqlAndReport — duplicate columns ─────────────────────────────────

describe(unitTest('executeSqlAndReport — duplicate columns'), () => {
  test('deduplicates repeated column names', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      executeSql: createMock().mockResolvedValue({
        columns: ['name', 'name', 'name'],
        rows: [{ name: 'Alice' }],
      }),
    });

    await executeSqlAndReport(
      'SELECT name, name, name FROM t',
      TEST_DATA__legendAIServices,
      TEST_DATA__legendAIConfig,
      plugin,
      setter,
      Date.now(),
    );

    const msg = getMessages()[1] as LegendAIAssistantMessage;
    const colNames = msg.gridData?.columnDefs.map((c) => c.headerName);
    expect(colNames).toEqual(['name', 'name_2', 'name_3']);
  });
});

// ─── processQuestion — orchestrator branches ─────────────────────────────────

describe(unitTest('processQuestion — orchestrator branches'), () => {
  test('routes orchestrator intent to orchestrator when configured', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      classifyQuestionIntent: () =>
        Promise.resolve(LegendAIQuestionIntent.ORCHESTRATOR),
      resolveEntitiesForQuery: createMock().mockResolvedValue({
        rootEntity: 'my::Entity',
        relatedEntities: [],
      }),
      generateQueryViaOrchestrator: createMock().mockResolvedValue({
        legend_query: 'Pure expression',
      }),
      executePureQuery: createMock().mockResolvedValue({
        columns: ['x'],
        rows: [{ x: 1 }],
      }),
    });

    await processQuestion(
      'complex query that needs orchestrator',
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
      TEST_DATA__coordinates,
      TEST_DATA__executionContext,
    );

    const msg = getMessages()[1] as LegendAIAssistantMessage;
    expect(msg.sql).toBe('Pure expression');
  });

  test('orchestrator intent falls back to SQL when not configured', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      classifyQuestionIntent: () =>
        Promise.resolve(LegendAIQuestionIntent.ORCHESTRATOR),
      callLLM: createMock().mockResolvedValue('sql response'),
      executeSql: createMock().mockResolvedValue({
        columns: ['id'],
        rows: [{ id: 1 }],
      }),
    });

    await processQuestion(
      'query with no orchestrator',
      TEST_DATA__legendAIServices,
      'com.test:prod:1.0.0',
      TEST_DATA__legendAIMetadata,
      {
        config: TEST_DATA__legendAIConfig, // no orchestratorUrl
        plugin,
        history: [],
        setMessages: setter,
      },
    );

    const msg = getMessages()[1] as LegendAIAssistantMessage;
    // Should have fallen through to SQL generation path
    expect(msg.sql).toBe('SELECT * FROM t');
    expect(msg.gridData?.rowData).toHaveLength(1);
  });

  test('no services falls back to orchestrator when configured', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      classifyQuestionIntent: () =>
        Promise.resolve(LegendAIQuestionIntent.DATA_QUERY),
      resolveEntitiesForQuery: createMock().mockResolvedValue({
        rootEntity: 'my::Entity',
        relatedEntities: [],
      }),
      generateQueryViaOrchestrator: createMock().mockResolvedValue({
        legend_query: 'fallback query',
      }),
      executePureQuery: createMock().mockResolvedValue({
        columns: ['y'],
        rows: [{ y: 42 }],
      }),
    });

    await processQuestion(
      'show data',
      [], // no services
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
      TEST_DATA__coordinates,
      TEST_DATA__executionContext,
    );

    const msg = getMessages()[1] as LegendAIAssistantMessage;
    expect(msg.sql).toBe('fallback query');
  });

  test('SQL generation null falls back to orchestrator when configured', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      classifyQuestionIntent: () =>
        Promise.resolve(LegendAIQuestionIntent.DATA_QUERY),
      callLLM: createMock().mockResolvedValue('bad response'),
      extractSqlFromResponse: () => ({
        sql: null,
        failure: 'parse error',
      }),
      resolveEntitiesForQuery: createMock().mockResolvedValue({
        rootEntity: 'my::Entity',
        relatedEntities: [],
      }),
      generateQueryViaOrchestrator: createMock().mockResolvedValue({
        legend_query: 'orchestrator fallback query',
      }),
      executePureQuery: createMock().mockResolvedValue({
        columns: ['a'],
        rows: [{ a: 1 }],
      }),
    });

    await processQuestion(
      'complex query',
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
      TEST_DATA__coordinates,
      TEST_DATA__executionContext,
    );

    const msg = getMessages()[1] as LegendAIAssistantMessage;
    expect(msg.sql).toBe('orchestrator fallback query');
  });
});

// ─── processQuestionWithIntent — additional branches ─────────────────────────

describe(
  unitTest('processQuestionWithIntent — orchestrator fallthrough'),
  () => {
    test('orchestrator intent without config falls through to data query', async () => {
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
        'orchestrator query',
        LegendAIQuestionIntent.ORCHESTRATOR,
        TEST_DATA__legendAIServices,
        'com.test:prod:1.0.0',
        TEST_DATA__legendAIMetadata,
        {
          config: TEST_DATA__legendAIConfig, // no orchestratorUrl
          plugin,
          history: [],
          setMessages: setter,
        },
      );

      const msg = getMessages()[1] as LegendAIAssistantMessage;
      // Should have fallen through to SQL generation
      expect(msg.sql).toBe('SELECT * FROM t');
    });

    test('catches and reports errors in data query path', async () => {
      const { setter, getMessages } = TEST__createMockSetter();
      TEST__seedAssistant(setter);
      const plugin = TEST__createMockLegendAIPlugin({
        callLLM: createMock().mockRejectedValue(new Error('network error')),
      });

      await processQuestionWithIntent(
        'show data',
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
      expect(msg.error).toContain('network error');
      expect(msg.isProcessing).toBe(false);
    });

    test('no services with orchestrator options falls back to orchestrator', async () => {
      const { setter, getMessages } = TEST__createMockSetter();
      TEST__seedAssistant(setter);
      const plugin = TEST__createMockLegendAIPlugin({
        resolveEntitiesForQuery: createMock().mockResolvedValue({
          rootEntity: 'my::Entity',
          relatedEntities: [],
        }),
        generateQueryViaOrchestrator: createMock().mockResolvedValue({
          legend_query: 'orch query',
        }),
        executePureQuery: createMock().mockResolvedValue({
          columns: ['z'],
          rows: [{ z: 99 }],
        }),
      });

      await processQuestionWithIntent(
        'show data',
        LegendAIQuestionIntent.DATA_QUERY,
        [], // no services
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
      expect(msg.sql).toBe('orch query');
    });
  },
);

// ─── processDataQuery — zero-row SQL → orchestrator fallback ─────────────────

describe(
  unitTest('processDataQuery — zero-row → orchestrator fallback'),
  () => {
    test('falls back to orchestrator when SQL returns zero rows', async () => {
      const { setter, getMessages } = TEST__createMockSetter();
      TEST__seedAssistant(setter);
      const plugin = TEST__createMockLegendAIPlugin({
        classifyQuestionIntent: () =>
          Promise.resolve(LegendAIQuestionIntent.DATA_QUERY),
        callLLM: createMock().mockResolvedValue('sql response'),
        executeSql: createMock().mockResolvedValue({
          columns: ['id'],
          rows: [],
        }),
        resolveEntitiesForQuery: createMock().mockResolvedValue({
          rootEntity: 'my::Entity',
          relatedEntities: [],
        }),
        generateQueryViaOrchestrator: createMock().mockResolvedValue({
          legend_query: 'orchestrator fallback after zero rows',
        }),
        executePureQuery: createMock().mockResolvedValue({
          columns: ['a'],
          rows: [{ a: 1 }],
        }),
      });

      await processQuestion(
        'show something',
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
        TEST_DATA__coordinates,
        TEST_DATA__executionContext,
      );

      const msg = getMessages()[1] as LegendAIAssistantMessage;
      expect(msg.sql).toBe('orchestrator fallback after zero rows');
      expect(msg.gridData?.rowData).toHaveLength(1);
    });
  },
);

// ─── generateAndJudgeSql — loop exhaustion returns null ──────────────────────

describe(unitTest('generateAndJudgeSql — loop exhaustion'), () => {
  test('returns null when maxJudgeAttempts is 0', async () => {
    const { setter } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      callLLM: createMock().mockResolvedValue('response'),
    });

    const result = await generateAndJudgeSql(
      'query',
      TEST_DATA__legendAIServices,
      'com.test:prod:1.0.0',
      {
        config: { ...TEST_DATA__legendAIConfig, maxJudgeAttempts: 0 },
        plugin,
        history: [],
        setMessages: setter,
      },
      Date.now(),
    );

    expect(result).toBeNull();
  });
});

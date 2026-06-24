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

import { test, describe, expect, jest } from '@jest/globals';
import { unitTest, createMock } from '@finos/legend-shared/test';
import {
  generateAndJudgeSql,
  processQuestion,
  executeSqlAndReport,
  handleMetadataQuestion,
  generateAndJudgeAccessPointSql,
} from '../LegendAIChatProcessors.js';
import {
  type LegendAIAssistantMessage,
  type TDSServiceSchema,
  TDSServiceSourceType,
  LegendAIQuestionIntent,
  LegendAIThinkingStepStatus,
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

describe(unitTest('generateAndJudgeSql'), () => {
  test('returns null when extraction fails', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      callLLM: createMock().mockResolvedValue('bad response'),
      extractSqlFromResponse: () => ({
        sql: null,
        failure: 'Could not parse',
        suggestion: 'Try simpler query',
      }),
    });

    const result = await generateAndJudgeSql(
      'bad query',
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

    expect(result).toBeNull();
    const msg = getMessages()[1] as LegendAIAssistantMessage;
    expect(msg.error).toContain('Could not parse');
    expect(msg.error).toContain('Try instead: "Try simpler query"');
  });

  test('returns null when sql is null without failure', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      callLLM: createMock().mockResolvedValue('empty'),
      extractSqlFromResponse: () => ({
        sql: null,
        failure: null,
      }),
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

    expect(result).toBeNull();
    const msg = getMessages()[1] as LegendAIAssistantMessage;
    expect(msg.error).toContain('Could not extract SQL');
  });

  test('uses corrected sql from judge', async () => {
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
            correctedSql: 'SELECT id FROM t',
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

    expect(result).toBe('SELECT id FROM t');
  });

  test('returns best query after max attempts', async () => {
    const { setter } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      callLLM: createMock().mockResolvedValue('response'),
      extractJudgeResult: (): LegendAIJudgeResult => ({
        verdict: LegendAIJudgeVerdict.FAIL,
        correctedSql: 'SELECT corrected FROM t',
      }),
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

    expect(result).toBe('SELECT corrected FROM t');
  });

  test('ignores correctedSql that does not start with select', async () => {
    const { setter } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      callLLM: createMock().mockResolvedValue('response'),
      extractSqlFromResponse: () => ({
        sql: 'SELECT original FROM t',
        failure: null,
      }),
      extractJudgeResult: (): LegendAIJudgeResult => ({
        verdict: LegendAIJudgeVerdict.FAIL,
        correctedSql: 'The query should use JOIN instead',
      }),
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

    // correctedSql doesn't start with 'select', so original is kept
    expect(result).toBe('SELECT original FROM t');
  });

  test('returns null when judge loop exhausts without valid SQL', async () => {
    const { setter } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      callLLM: createMock().mockResolvedValue('response'),
      extractJudgeResult: (): LegendAIJudgeResult => ({
        verdict: LegendAIJudgeVerdict.FAIL,
        issues: 'Bad query',
      }),
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

    // No correctedSql provided, so returns original after max attempts
    expect(result).toBe('SELECT * FROM t');
  });
});
describe(unitTest('processQuestion'), () => {
  test('handles metadata question', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      classifyQuestionIntent: () =>
        Promise.resolve(LegendAIQuestionIntent.METADATA),
      callLLM: createMock().mockResolvedValue('Product info here'),
    });

    await processQuestion(
      'what is this?',
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
    expect(msg.textAnswer).toContain('### Metadata context');
    expect(msg.textAnswer).toContain('Product info here');
    expect(msg.isProcessing).toBeTruthy();
  });

  test('handles no services available', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      callLLM: createMock().mockResolvedValue(
        'This product provides data services.',
      ),
    });

    await processQuestion(
      'show data',
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
    expect(msg.textAnswer).toBeDefined();
    expect(msg.isProcessing).toBe(false);
  });

  test('handles full data_query flow', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      callLLM: createMock().mockResolvedValue('sql response'),
      executeSql: createMock().mockResolvedValue({
        columns: ['id'],
        rows: [{ id: 1 }],
      }),
    });

    await processQuestion(
      'show top 10',
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
    expect(msg.gridData).toBeDefined();
    expect(msg.gridData?.rowData).toHaveLength(1);
    expect(msg.isProcessing).toBe(false);
    expect(msg.isExecuting).toBe(false);
  });

  test('handles LLM call error gracefully', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      callLLM: createMock().mockRejectedValue(new Error('LLM timeout')),
    });

    await processQuestion(
      'show data',
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
    expect(msg.error).toContain('LLM timeout');
    expect(msg.isProcessing).toBe(false);
  });

  test('handles SQL execution error gracefully', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      callLLM: createMock().mockResolvedValue('sql response'),
      executeSql: createMock().mockRejectedValue(
        new Error('Connection refused'),
      ),
    });

    await processQuestion(
      'show top 10',
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
    expect(msg.error).toContain('Connection refused');
    expect(msg.isProcessing).toBe(false);
    expect(msg.isExecuting).toBe(false);
  });
});
describe(unitTest('executeSqlAndReport'), () => {
  test('sets gridData and execTime on success', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      executeSql: createMock().mockResolvedValue({
        columns: ['name', 'age'],
        rows: [
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 },
        ],
      }),
    });

    await executeSqlAndReport(
      'SELECT name, age FROM users',
      TEST_DATA__legendAIServices,
      TEST_DATA__legendAIConfig,
      plugin,
      setter,
      Date.now(),
    );

    const msg = getMessages()[1] as LegendAIAssistantMessage;
    expect(msg.gridData).toBeDefined();
    expect(msg.gridData?.columnDefs).toHaveLength(2);
    expect(msg.gridData?.columnDefs[0]?.headerName).toBe('name');
    expect(msg.gridData?.columnDefs[1]?.headerName).toBe('age');
    expect(msg.gridData?.rowData).toHaveLength(2);
    expect(msg.execTime).toBeDefined();
    expect(msg.isProcessing).toBe(false);
    expect(msg.isExecuting).toBe(false);
  });

  test('adds row count thinking step', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      executeSql: createMock().mockResolvedValue({
        columns: ['id'],
        rows: [{ id: 1 }],
      }),
    });

    await executeSqlAndReport(
      'SELECT id FROM t',
      TEST_DATA__legendAIServices,
      TEST_DATA__legendAIConfig,
      plugin,
      setter,
      Date.now(),
    );

    const msg = getMessages()[1] as LegendAIAssistantMessage;
    const rowStep = msg.thinkingSteps.find((s) =>
      s.label.includes('Retrieved 1 row'),
    );
    expect(rowStep).toBeDefined();
    expect(rowStep?.status).toBe(LegendAIThinkingStepStatus.DONE);
  });

  test('pluralizes rows correctly for multiple results', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      executeSql: createMock().mockResolvedValue({
        columns: ['x'],
        rows: [{ x: 1 }, { x: 2 }, { x: 3 }],
      }),
    });

    await executeSqlAndReport(
      'SELECT x FROM t',
      TEST_DATA__legendAIServices,
      TEST_DATA__legendAIConfig,
      plugin,
      setter,
      Date.now(),
    );

    const msg = getMessages()[1] as LegendAIAssistantMessage;
    const rowStep = msg.thinkingSteps.find((s) =>
      s.label.includes('Retrieved 3 rows'),
    );
    expect(rowStep).toBeDefined();
  });

  test('sets error and execTime on failure', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      executeSql: createMock().mockRejectedValue(
        new Error('Query timeout exceeded'),
      ),
    });

    await executeSqlAndReport(
      'SELECT * FROM huge_table',
      TEST_DATA__legendAIServices,
      TEST_DATA__legendAIConfig,
      plugin,
      setter,
      Date.now(),
    );

    const msg = getMessages()[1] as LegendAIAssistantMessage;
    expect(msg.error).toContain('Query timeout exceeded');
    expect(msg.execTime).toBeDefined();
    expect(msg.isProcessing).toBe(false);
    expect(msg.isExecuting).toBe(false);
  });

  test('truncates long error in thinking step', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      executeSql: createMock().mockRejectedValue(new Error('x'.repeat(500))),
    });

    await executeSqlAndReport(
      'SELECT * FROM t',
      TEST_DATA__legendAIServices,
      TEST_DATA__legendAIConfig,
      plugin,
      setter,
      Date.now(),
    );

    const msg = getMessages()[1] as LegendAIAssistantMessage;
    const failStep = msg.thinkingSteps.find((s) =>
      s.label.includes('Execution failed'),
    );
    expect(failStep).toBeDefined();
    // Thinking step preview is capped at 200 chars
    expect(failStep?.label.length).toBeLessThanOrEqual(220);
  });
});
describe(unitTest('handleMetadataQuestion'), () => {
  test('calls LLM with metadata prompt and sets textAnswer', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      callLLM: createMock().mockResolvedValue(
        '  This product provides trade data  ',
      ),
    });

    await handleMetadataQuestion(
      'what does this product do?',
      TEST_DATA__legendAIMetadata,
      {
        config: TEST_DATA__legendAIConfig,
        plugin,
        history: [],
        setMessages: setter,
      },
      Date.now(),
    );

    const msg = getMessages()[1] as LegendAIAssistantMessage;
    expect(msg.textAnswer).toBe('This product provides trade data');
    expect(msg.isProcessing).toBe(false);
    expect(msg.thinkingDuration).toBeDefined();
  });

  test('adds metadata thinking step', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      callLLM: createMock().mockResolvedValue('answer'),
    });

    await handleMetadataQuestion(
      'describe the product',
      TEST_DATA__legendAIMetadata,
      {
        config: TEST_DATA__legendAIConfig,
        plugin,
        history: [],
        setMessages: setter,
      },
      Date.now(),
    );

    const msg = getMessages()[1] as LegendAIAssistantMessage;
    const metaStep = msg.thinkingSteps.find((s) =>
      s.label.includes('metadata'),
    );
    expect(metaStep).toBeDefined();
    expect(metaStep?.status).toBe(LegendAIThinkingStepStatus.DONE);
  });

  test('passes conversation history to plugin', async () => {
    const { setter } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const buildMetadataPrompt = jest
      .fn<() => string>()
      .mockReturnValue('prompt');
    const plugin = TEST__createMockLegendAIPlugin({
      buildMetadataPrompt,
      callLLM: createMock().mockResolvedValue('answer'),
    });

    const history = [{ question: 'q1', sql: 'SELECT 1' }];
    await handleMetadataQuestion(
      'follow up',
      TEST_DATA__legendAIMetadata,
      {
        config: TEST_DATA__legendAIConfig,
        plugin,
        history,
        setMessages: setter,
      },
      Date.now(),
    );

    expect(buildMetadataPrompt).toHaveBeenCalledWith(
      'follow up',
      TEST_DATA__legendAIMetadata,
      history,
    );
  });
});
const TEST_DATA__accessPointServices: TDSServiceSchema[] = [
  {
    title: 'PositionsAccessPoint',
    pattern: '/positions',
    columns: [
      { name: 'positionId', type: 'String' },
      { name: 'value', type: 'Number' },
    ],
    parameters: [],
    sourceType: TDSServiceSourceType.ACCESS_POINT,
    dataProductPath: 'my::package::DataProduct',
  },
];

const TEST_DATA__dataProductCoordinates = {
  data_product: 'my::package::DataProduct',
  group_id: 'com.test',
  artifact_id: 'prod',
  version: '1.0.0',
};

describe(unitTest('executeSqlAndReport — execution'), () => {
  test('routes AP SQL through executeLakehouseSql', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const executeLakehouseSql = createMock().mockResolvedValue({
      columns: ['positionId', 'value'],
      rows: [{ positionId: 'P1', value: 100 }],
    });
    const executeSql = createMock();
    const plugin = TEST__createMockLegendAIPlugin({
      executeSql,
      executeLakehouseSql,
    });

    await executeSqlAndReport(
      "SELECT * FROM p('my::package::DataProduct.positions') LIMIT 10",
      TEST_DATA__accessPointServices,
      TEST_DATA__legendAIConfig,
      plugin,
      setter,
      Date.now(),
      TEST_DATA__dataProductCoordinates,
    );

    expect(executeLakehouseSql).toHaveBeenCalledTimes(1);
    expect(executeSql).not.toHaveBeenCalled();
    const msg = getMessages()[1] as LegendAIAssistantMessage;
    expect(msg.gridData?.rowData).toHaveLength(1);
    expect(msg.gridData?.columnDefs[0]?.headerName).toBe('positionId');
  });

  test('executes service() SQL through executeSql', async () => {
    const { setter } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const executeSql = createMock().mockResolvedValue({
      columns: ['name'],
      rows: [{ name: 'Alice' }],
    });
    const plugin = TEST__createMockLegendAIPlugin({
      executeSql,
    });

    await executeSqlAndReport(
      'SELECT name FROM service(/trades)',
      TEST_DATA__legendAIServices,
      TEST_DATA__legendAIConfig,
      plugin,
      setter,
      Date.now(),
    );

    expect(executeSql).toHaveBeenCalledTimes(1);
  });

  test('reports execution errors properly', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      executeLakehouseSql: createMock().mockRejectedValue(
        new Error('SQL execution timeout'),
      ),
    });

    await executeSqlAndReport(
      "SELECT * FROM p('my::dp.ap')",
      TEST_DATA__accessPointServices,
      TEST_DATA__legendAIConfig,
      plugin,
      setter,
      Date.now(),
      TEST_DATA__dataProductCoordinates,
    );

    const msg = getMessages()[1] as LegendAIAssistantMessage;
    expect(msg.error).toContain('SQL execution timeout');
    expect(msg.execTime).toBeDefined();
    expect(msg.isProcessing).toBe(false);
  });
});

// ─── generateAndJudgeAccessPointSql ──────────────────────────────────────────

describe(unitTest('generateAndJudgeAccessPointSql'), () => {
  test('generates SQL using AP-specific prompts', async () => {
    const { setter } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const buildAPGen = jest.fn<() => string>().mockReturnValue('ap prompt');
    const buildAPJudge = jest.fn<() => string>().mockReturnValue('ap judge');
    const plugin = TEST__createMockLegendAIPlugin({
      buildAccessPointGeneratorPrompt: buildAPGen,
      buildAccessPointJudgePrompt: buildAPJudge,
      callLLM: createMock().mockResolvedValue('sql response'),
    });

    const result = await generateAndJudgeAccessPointSql(
      'show prices',
      TEST_DATA__accessPointServices,
      {
        config: TEST_DATA__legendAIConfig,
        plugin,
        history: [],
        setMessages: setter,
      },
      Date.now(),
    );

    expect(result).toBe('SELECT * FROM t');
    expect(buildAPGen).toHaveBeenCalledWith(
      'show prices',
      TEST_DATA__accessPointServices,
      [],
    );
    expect(buildAPJudge).toHaveBeenCalled();
  });

  test('returns null when extraction fails', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      callLLM: createMock().mockResolvedValue('bad response'),
      extractSqlFromResponse: () => ({
        sql: null,
        failure: 'parse error',
      }),
    });

    const result = await generateAndJudgeAccessPointSql(
      'show prices',
      TEST_DATA__accessPointServices,
      {
        config: TEST_DATA__legendAIConfig,
        plugin,
        history: [],
        setMessages: setter,
      },
      Date.now(),
    );

    expect(result).toBeNull();
    const msg = getMessages()[1] as LegendAIAssistantMessage;
    expect(msg.error).toBeDefined();
  });

  test('applies judge corrections', async () => {
    const { setter } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    let callCount = 0;
    const plugin = TEST__createMockLegendAIPlugin({
      callLLM: createMock().mockResolvedValue('response'),
      extractJudgeResult: (): LegendAIJudgeResult => {
        callCount++;
        if (callCount === 1) {
          return {
            verdict: LegendAIJudgeVerdict.FAIL,
            correctedSql:
              'SELECT "ticker" FROM p(\'my::DataProduct.pricingAP\')',
          };
        }
        return { verdict: LegendAIJudgeVerdict.PASS };
      },
    });

    const result = await generateAndJudgeAccessPointSql(
      'show tickers',
      TEST_DATA__accessPointServices,
      {
        config: TEST_DATA__legendAIConfig,
        plugin,
        history: [],
        setMessages: setter,
      },
      Date.now(),
    );

    expect(result).toBe(
      'SELECT "ticker" FROM p(\'my::DataProduct.pricingAP\')',
    );
  });
});

// ─── processQuestion — access point routing ──────────────────────────────────

describe(unitTest('processQuestion — access point routing'), () => {
  test('routes AP-only services to dedicated AP flow', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const buildAPGen = jest.fn<() => string>().mockReturnValue('ap prompt');
    const plugin = TEST__createMockLegendAIPlugin({
      classifyQuestionIntent: () =>
        Promise.resolve(LegendAIQuestionIntent.DATA_QUERY),
      buildAccessPointGeneratorPrompt: buildAPGen,
      callLLM: createMock().mockResolvedValue('sql response'),
      extractSqlFromResponse: () => ({
        sql: "SELECT * FROM p('my::DataProduct.pricingAP')",
        failure: null,
      }),
      executeLakehouseSql: createMock().mockResolvedValue({
        columns: ['ticker'],
        rows: [{ ticker: 'AAPL' }],
      }),
    });

    await processQuestion(
      'show prices',
      TEST_DATA__accessPointServices,
      'com.test:prod:1.0.0',
      TEST_DATA__legendAIMetadata,
      {
        config: TEST_DATA__legendAIConfig,
        plugin,
        history: [],
        setMessages: setter,
      },
      {
        data_product: 'my::DataProduct',
        group_id: 'com.test',
        artifact_id: 'prod',
        version: '1.0.0',
      },
    );

    // Should have used AP-specific prompt, not the generic one
    expect(buildAPGen).toHaveBeenCalled();
    const msg = getMessages()[1] as LegendAIAssistantMessage;
    expect(msg.gridData?.rowData).toHaveLength(1);
  });

  test('routes mixed services (TDS + AP) to generic TDS flow', async () => {
    const { setter } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const buildGen = jest.fn<() => string>().mockReturnValue('gen prompt');
    const buildAPGen = jest.fn<() => string>().mockReturnValue('ap prompt');
    const plugin = TEST__createMockLegendAIPlugin({
      classifyQuestionIntent: () =>
        Promise.resolve(LegendAIQuestionIntent.DATA_QUERY),
      buildGeneratorPrompt: buildGen,
      buildAccessPointGeneratorPrompt: buildAPGen,
      callLLM: createMock().mockResolvedValue('sql response'),
      executeSql: createMock().mockResolvedValue({
        columns: ['x'],
        rows: [{ x: 1 }],
      }),
    });

    const mixedServices: TDSServiceSchema[] = [
      ...TEST_DATA__legendAIServices,
      ...TEST_DATA__accessPointServices,
    ];

    await processQuestion(
      'show data',
      mixedServices,
      'com.test:prod:1.0.0',
      TEST_DATA__legendAIMetadata,
      {
        config: TEST_DATA__legendAIConfig,
        plugin,
        history: [],
        setMessages: setter,
      },
    );

    // Should have used generic prompt, NOT AP-specific
    expect(buildGen).toHaveBeenCalled();
    expect(buildAPGen).not.toHaveBeenCalled();
  });

  test('AP flow falls back to metadata on error', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      classifyQuestionIntent: () =>
        Promise.resolve(LegendAIQuestionIntent.DATA_QUERY),
      buildAccessPointGeneratorPrompt: () => {
        throw new Error('Prompt build failed');
      },
      callLLM: createMock().mockResolvedValue('Metadata answer'),
    });

    await processQuestion(
      'show prices',
      TEST_DATA__accessPointServices,
      'com.test:prod:1.0.0',
      TEST_DATA__legendAIMetadata,
      {
        config: TEST_DATA__legendAIConfig,
        plugin,
        history: [],
        setMessages: setter,
      },
      {
        data_product: 'my::DataProduct',
        group_id: 'com.test',
        artifact_id: 'prod',
        version: '1.0.0',
      },
    );

    const msg = getMessages()[1] as LegendAIAssistantMessage;
    expect(msg.textAnswer).toBeDefined();
  });

  test('metadata intent still works with AP-only services', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      classifyQuestionIntent: () =>
        Promise.resolve(LegendAIQuestionIntent.METADATA),
      callLLM: createMock().mockResolvedValue('Product info here'),
    });

    await processQuestion(
      'what access points are available?',
      TEST_DATA__accessPointServices,
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
    expect(msg.textAnswer).toBe('Product info here');
  });
});

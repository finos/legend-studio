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
  elapsedSeconds,
  createMessagePair,
  analyzeOrchestratorResults,
  executePureQueryAndReport,
  processQuestion,
  processQuestionWithIntent,
  buildExecutionErrorMessage,
  buildGenerationFailureMessage,
  executeSqlAndReport,
  handleMetadataQuestion,
  generateAndJudgeSql,
  buildConversationHistory,
  updateLastAssistant,
  addThinkingStep,
  completeThinkingSteps,
  finishWithThinkingError,
} from '../LegendAIChatProcessors.js';
import {
  type LegendAIMessage,
  LegendAIMessageRole,
  LegendAIQuestionIntent,
  LegendAIErrorType,
  TDSServiceSourceType,
} from '../../LegendAITypes.js';
import {
  type LegendAIOrchestratorDataProductCoordinates,
  LegendAIJudgeVerdict,
} from '../../LegendAI_LegendApplicationPlugin_Extension.js';
import type { QueryExplicitExecutionContextInfo } from '@finos/legend-graph';
import {
  TEST__createMockSetter,
  TEST__seedAssistant,
  TEST__createMockLegendAIPlugin,
  TEST_DATA__legendAIConfig,
  TEST_DATA__legendAIMetadata,
  TEST_DATA__legendAIServices,
  TEST__getAssistantMessage,
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

// ─── elapsedSeconds ──────────────────────────────────────────────────────────

describe(unitTest('elapsedSeconds'), () => {
  test('returns seconds with 1 decimal by default', () => {
    const start = Date.now() - 2500;
    const result = elapsedSeconds(start);
    expect(result).toMatch(/^\d+\.\d$/);
    expect(parseFloat(result)).toBeGreaterThanOrEqual(2.0);
  });

  test('returns seconds with 2 decimals when specified', () => {
    const start = Date.now() - 1234;
    const result = elapsedSeconds(start, 2);
    expect(result).toMatch(/^\d+\.\d{2}$/);
  });
});

// ─── createMessagePair ───────────────────────────────────────────────────────

describe(unitTest('createMessagePair'), () => {
  test('creates user + assistant message pair', () => {
    const [user, assistant] = createMessagePair('What is this?');
    expect(user.role).toBe(LegendAIMessageRole.USER);
    expect(user.text).toBe('What is this?');
    expect(user.id).toBeDefined();
    expect(assistant.role).toBe(LegendAIMessageRole.ASSISTANT);
    expect(assistant.isProcessing).toBe(true);
    expect(assistant.sql).toBeNull();
    expect(assistant.textAnswer).toBeNull();
    expect(assistant.error).toBeNull();
    expect(assistant.errorType).toBeNull();
    expect(assistant.gridData).toBeNull();
    expect(assistant.thinkingSteps).toEqual([]);
    expect(assistant.suggestedQueries).toEqual([]);
    expect(assistant.isExecuting).toBe(false);
    expect(assistant.fallbackAction).toBeNull();
  });

  test('generates unique IDs', () => {
    const [u1] = createMessagePair('a');
    const [u2] = createMessagePair('b');
    expect(u1.id).not.toBe(u2.id);
  });
});

// ─── buildExecutionErrorMessage — parameter errors ───────────────────────────

describe(unitTest('buildExecutionErrorMessage — parameter handling'), () => {
  test('extracts missing parameter names and suggests values', () => {
    const msg = buildExecutionErrorMessage(
      'Missing required parameter values [businessDate, entityName]',
      TEST_DATA__legendAIServices,
    );
    expect(msg).toContain('businessDate');
    expect(msg).toContain('entityName');
    expect(msg).toContain('rephrasing');
  });

  test('appends column info for column not found errors', () => {
    const msg = buildExecutionErrorMessage(
      'Column "foo" not found in table',
      TEST_DATA__legendAIServices,
    );
    expect(msg).toContain('Available columns');
    expect(msg).toContain('tradeId');
    expect(msg).toContain('amount');
  });

  test('appends parameter info for parameter errors', () => {
    const msg = buildExecutionErrorMessage('Invalid argument provided', [
      {
        title: 'Svc',
        pattern: '/s',
        columns: [],
        parameters: ['dateParam'],
      },
    ]);
    expect(msg).toContain('Required parameters');
    expect(msg).toContain('dateParam');
  });

  test('truncates long error messages', () => {
    const longError = 'x'.repeat(1000);
    const msg = buildExecutionErrorMessage(longError, []);
    expect(msg.length).toBeLessThanOrEqual(600);
  });
});

// ─── buildGenerationFailureMessage ───────────────────────────────────────────

describe(unitTest('buildGenerationFailureMessage — variants'), () => {
  test('includes suggestion and service names', () => {
    const msg = buildGenerationFailureMessage(
      'Could not generate SQL',
      'Try asking about trades',
      TEST_DATA__legendAIServices,
    );
    expect(msg).toContain('Could not generate SQL');
    expect(msg).toContain('Try instead');
    expect(msg).toContain('TradeService');
  });

  test('includes service parameters when present', () => {
    const msg = buildGenerationFailureMessage('fail', undefined, [
      {
        title: 'Svc',
        pattern: '/s',
        columns: [],
        parameters: ['dateParam'],
      },
    ]);
    expect(msg).toContain('Service parameters');
    expect(msg).toContain('dateParam');
  });

  test('omits suggestion when undefined', () => {
    const msg = buildGenerationFailureMessage('fail', undefined, []);
    expect(msg).not.toContain('Try instead');
  });

  test('omits service names when empty', () => {
    const msg = buildGenerationFailureMessage('fail', undefined, []);
    expect(msg).not.toContain('Available services');
  });
});

// ─── analyzeOrchestratorResults ──────────────────────────────────────────────

describe(unitTest('analyzeOrchestratorResults'), () => {
  test('sets textAnswer and suggestedQueries from analysis', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      analyzeQueryResults: createMock().mockResolvedValue({
        summary: 'Analysis summary',
        suggestedQueries: ['Follow up 1', 'Follow up 2'],
        keyMetrics: [],
        chartData: [],
      }),
    });

    await analyzeOrchestratorResults(
      'show trades',
      'SELECT * FROM trades',
      { columns: ['id'], rows: [{ id: 1 }] },
      TEST_DATA__legendAIMetadata,
      {
        config: TEST_DATA__legendAIConfig,
        plugin,
        history: [],
        setMessages: setter,
      },
      Date.now(),
    );

    const msg = TEST__getAssistantMessage(getMessages(), 1);
    expect(msg.textAnswer).toContain('Analysis summary');
    expect(msg.suggestedQueries).toEqual(['Follow up 1', 'Follow up 2']);
    expect(msg.isProcessing).toBe(false);
  });

  test('builds deterministic summary when analysis is unavailable', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      analyzeQueryResults: createMock().mockResolvedValue(undefined),
    });

    await analyzeOrchestratorResults(
      'Show me net sentiment by language',
      'SELECT "Net Sentiment Score", "Language Tag" FROM service(...)',
      {
        columns: ['Net Sentiment Score', 'Language Tag'],
        rows: [
          { 'Net Sentiment Score': 0.6, 'Language Tag': 'en' },
          { 'Net Sentiment Score': 0.4, 'Language Tag': 'fr' },
        ],
      },
      TEST_DATA__legendAIMetadata,
      {
        config: TEST_DATA__legendAIConfig,
        plugin,
        history: [],
        setMessages: setter,
      },
      Date.now(),
    );

    const msg = TEST__getAssistantMessage(getMessages(), 1);
    expect(msg.textAnswer).toContain('I retrieved 2 rows');
    expect(msg.textAnswer).toContain('Net Sentiment Score');
    expect(msg.suggestedQueries).toEqual([]);
    expect(msg.isProcessing).toBe(false);
  });
});

// ─── executePureQueryAndReport — error path ──────────────────────────────────

describe(unitTest('executePureQueryAndReport — error handling'), () => {
  test('catches execution errors and returns undefined', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      executePureQuery: createMock().mockRejectedValue(
        new Error('Connection timeout'),
      ),
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

    expect(result).toBeUndefined();
    const msg = TEST__getAssistantMessage(getMessages(), 1);
    expect(msg.error).toContain('Connection timeout');
    expect(msg.isProcessing).toBe(false);
  });
});

// ─── executeSqlAndReport — access point execution ────────────────────────────

describe(unitTest('executeSqlAndReport — access point execution'), () => {
  test('routes AP SQL through executeLakehouseSql', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const executeLakehouseSql = createMock().mockResolvedValue({
      columns: ['id'],
      rows: [{ id: 1 }],
    });
    const executeSql = createMock();
    const plugin = TEST__createMockLegendAIPlugin({
      executeSql,
      executeLakehouseSql,
    });

    await executeSqlAndReport(
      "SELECT * FROM p('DataProduct.AP')",
      [
        {
          title: 'AP',
          pattern: '/ap',
          columns: [],
          parameters: [],
          sourceType: TDSServiceSourceType.ACCESS_POINT,
        },
      ],
      TEST_DATA__legendAIConfig,
      plugin,
      setter,
      Date.now(),
      TEST_DATA__coordinates,
    );

    expect(executeLakehouseSql).toHaveBeenCalledTimes(1);
    expect(executeSql).not.toHaveBeenCalled();
    const msg = TEST__getAssistantMessage(getMessages(), 1);
    expect(msg.gridData?.rowData).toHaveLength(1);
  });

  test('handles execution error gracefully', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      executeSql: createMock().mockRejectedValue(
        new Error('Column "foo" does not exist in table'),
      ),
    });

    const result = await executeSqlAndReport(
      'SELECT foo FROM t',
      TEST_DATA__legendAIServices,
      TEST_DATA__legendAIConfig,
      plugin,
      setter,
      Date.now(),
    );

    expect(result).toBeUndefined();
    const msg = TEST__getAssistantMessage(getMessages(), 1);
    expect(msg.error).toContain('Column');
    expect(msg.error).toContain('Available columns');
  });
});

// ─── processQuestion — error handling ────────────────────────────────────────

describe(unitTest('processQuestion — error handling'), () => {
  test('catches unexpected errors and finishes with thinking error', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      classifyQuestionIntent: () => {
        throw new Error('Unexpected classification error');
      },
    });

    await processQuestion(
      'some query',
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

    const msg = TEST__getAssistantMessage(getMessages(), 1);
    expect(msg.error).toContain('Unexpected classification error');
    expect(msg.isProcessing).toBe(false);
  });

  test('routes metadata intent to handleMetadataQuestion', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      classifyQuestionIntent: () =>
        Promise.resolve(LegendAIQuestionIntent.METADATA),
      callLLM: createMock().mockResolvedValue('Product description here'),
    });

    await processQuestion(
      'what does this product do?',
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

    const msg = TEST__getAssistantMessage(getMessages(), 1);
    expect(msg.textAnswer).toBe('Product description here');
  });

  test('always classifies via LLM and respects METADATA result', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const classifyQuestionIntent = createMock().mockResolvedValue(
      LegendAIQuestionIntent.METADATA,
    );
    const plugin = TEST__createMockLegendAIPlugin({
      classifyQuestionIntent,
      callLLM: createMock().mockResolvedValue('Metadata answer from LLM'),
    });

    await processQuestion(
      'What data does LSEG Programmatic News offer and how can I use it?',
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

    const msg = TEST__getAssistantMessage(getMessages(), 1);
    expect(msg.textAnswer).toBe('Metadata answer from LLM');
    // LLM-first: classifyQuestionIntent is always called
    expect(classifyQuestionIntent).toHaveBeenCalled();
  });

  test('routes to SQL-only when LLM classifier returns DATA_QUERY for ambiguous intent', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const classifyQuestionIntent = createMock().mockResolvedValue(
      LegendAIQuestionIntent.DATA_QUERY,
    );
    const callLLM = createMock().mockResolvedValue('SQL generation answer');
    const plugin = TEST__createMockLegendAIPlugin({
      classifyQuestionIntent,
      callLLM,
      executeSql: createMock().mockResolvedValue({
        columns: ['revenue'],
        rows: [{ revenue: 100 }],
      }),
      analyzeQueryResults: createMock().mockResolvedValue({
        summary: 'Query analysis summary',
        suggestedQueries: [],
        keyMetrics: [],
        chartData: [],
      }),
    });

    await processQuestion(
      'tell me about what can I do with revenue',
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

    expect(classifyQuestionIntent).toHaveBeenCalled();
    const msg = TEST__getAssistantMessage(getMessages(), 1);
    // LLM returns DATA_QUERY → SQL only, no metadata context prepended
    expect(msg.textAnswer).toBe('Query analysis summary');
    expect(msg.textAnswer).not.toContain('### Metadata context');
    expect(msg.gridData).toBeDefined();
  });
});

// ─── processQuestionWithIntent ───────────────────────────────────────────────

describe(unitTest('processQuestionWithIntent — metadata intent'), () => {
  test('handles metadata intent directly', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      callLLM: createMock().mockResolvedValue('Metadata answer'),
    });

    await processQuestionWithIntent(
      'what is this?',
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

    const msg = TEST__getAssistantMessage(getMessages(), 1);
    expect(msg.textAnswer).toBe('Metadata answer');
  });

  test('handles orchestrator intent with no services — metadata + fallback', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      callLLM: createMock().mockResolvedValue('Metadata answer here'),
    });

    await processQuestionWithIntent(
      'run complex query',
      LegendAIQuestionIntent.ORCHESTRATOR,
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

    const msg = TEST__getAssistantMessage(getMessages(), 1);
    expect(msg.textAnswer).toBeDefined();
    expect(msg.fallbackAction).toBeDefined();
    expect(msg.fallbackAction?.label).toBe('Try Legend AI Orchestrator');
  });

  test('data query intent falls through to SQL generation', async () => {
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
      'show top trades',
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

    const msg = TEST__getAssistantMessage(getMessages(), 1);
    expect(msg.sql).toBe('SELECT * FROM t');
    expect(msg.gridData?.rowData).toHaveLength(1);
  });
});

// ─── buildConversationHistory ────────────────────────────────────────────────

describe(unitTest('buildConversationHistory'), () => {
  test('returns empty array for no messages', () => {
    expect(buildConversationHistory([])).toEqual([]);
  });

  test('pairs user+assistant with SQL as DATA_QUERY', () => {
    const messages: LegendAIMessage[] = [
      { id: '1', role: LegendAIMessageRole.USER, text: 'show trades' },
      {
        id: '2',
        role: LegendAIMessageRole.ASSISTANT,
        thinkingSteps: [],
        sql: 'SELECT * FROM t',
        textAnswer: null,
        dataContext: null,
        gridData: null,
        error: null,
        sqlGenTime: null,
        execTime: null,
        thinkingDuration: null,
        isProcessing: false,
        isExecuting: false,
        suggestedQueries: [],
        fallbackAction: null,
        errorType: null,
        queriedAccessPointGroups: [],
      },
    ];
    const history = buildConversationHistory(messages);
    expect(history).toHaveLength(1);
    expect(history[0]?.intent).toBe(LegendAIQuestionIntent.DATA_QUERY);
    expect(history[0]?.sql).toBe('SELECT * FROM t');
  });

  test('pairs user+assistant with textAnswer as METADATA', () => {
    const messages: LegendAIMessage[] = [
      { id: '1', role: LegendAIMessageRole.USER, text: 'what is this?' },
      {
        id: '2',
        role: LegendAIMessageRole.ASSISTANT,
        thinkingSteps: [],
        sql: null,
        textAnswer: 'This is a product',
        dataContext: null,
        gridData: null,
        error: null,
        sqlGenTime: null,
        execTime: null,
        thinkingDuration: null,
        isProcessing: false,
        isExecuting: false,
        suggestedQueries: [],
        fallbackAction: null,
        errorType: null,
        queriedAccessPointGroups: [],
      },
    ];
    const history = buildConversationHistory(messages);
    expect(history).toHaveLength(1);
    expect(history[0]?.intent).toBe(LegendAIQuestionIntent.METADATA);
  });

  test('includes generation failures in history', () => {
    const messages: LegendAIMessage[] = [
      { id: '1', role: LegendAIMessageRole.USER, text: 'test' },
      {
        id: '2',
        role: LegendAIMessageRole.ASSISTANT,
        thinkingSteps: [],
        sql: null,
        textAnswer: null,
        dataContext: null,
        gridData: null,
        error: 'error',
        sqlGenTime: null,
        execTime: null,
        thinkingDuration: null,
        isProcessing: false,
        isExecuting: false,
        suggestedQueries: [],
        fallbackAction: null,
        errorType: null,
        queriedAccessPointGroups: [],
      },
    ];
    const history = buildConversationHistory(messages);
    expect(history).toHaveLength(1);
    expect(history[0]?.sql).toBe('(generation failed)');
    expect(history[0]?.resultSummary).toBe('ERROR: error');
  });
});

// ─── updateLastAssistant ──────────────────────────────────────────────────────

describe(unitTest('updateLastAssistant'), () => {
  test('updates the last assistant message', () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);

    updateLastAssistant(setter, () => ({
      textAnswer: 'Updated answer',
      isProcessing: false,
    }));

    const msg = TEST__getAssistantMessage(getMessages(), 1);
    expect(msg.textAnswer).toBe('Updated answer');
    expect(msg.isProcessing).toBe(false);
  });

  test('does nothing if last message is not assistant', () => {
    const { setter, getMessages } = TEST__createMockSetter();
    setter([{ id: '1', role: LegendAIMessageRole.USER, text: 'test' }]);

    updateLastAssistant(setter, () => ({
      textAnswer: 'Should not apply',
    }));

    expect(getMessages()).toHaveLength(1);
    expect(getMessages()[0]?.role).toBe(LegendAIMessageRole.USER);
  });
});

// ─── addThinkingStep / completeThinkingSteps / finishWithThinkingError ──────

describe(unitTest('thinking step utilities'), () => {
  test('addThinkingStep appends a new step and completes active ones', () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);

    addThinkingStep(setter, 'Step 1');
    addThinkingStep(setter, 'Step 2');

    const msg = TEST__getAssistantMessage(getMessages(), 1);
    expect(msg.thinkingSteps).toHaveLength(2);
    expect(msg.thinkingSteps[0]?.label).toBe('Step 1');
    expect(msg.thinkingSteps[0]?.status).toBe('done');
    expect(msg.thinkingSteps[1]?.label).toBe('Step 2');
    expect(msg.thinkingSteps[1]?.status).toBe('active');
  });

  test('completeThinkingSteps marks all active steps as done', () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);

    addThinkingStep(setter, 'Active step');
    completeThinkingSteps(setter);

    const msg = TEST__getAssistantMessage(getMessages(), 1);
    expect(msg.thinkingSteps[0]?.status).toBe('done');
  });

  test('finishWithThinkingError sets error and stops processing', () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    addThinkingStep(setter, 'Working...');

    finishWithThinkingError(setter, 'Something went wrong', Date.now());

    const msg = TEST__getAssistantMessage(getMessages(), 1);
    expect(msg.error).toBe('Something went wrong');
    expect(msg.errorType).toBeNull();
    expect(msg.isProcessing).toBe(false);
    expect(msg.thinkingSteps[0]?.status).toBe('error');
  });

  test('finishWithThinkingError propagates errorType when provided', () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    addThinkingStep(setter, 'Working...');

    finishWithThinkingError(
      setter,
      'Permission denied',
      Date.now(),
      LegendAIErrorType.PERMISSION,
    );

    const msg = TEST__getAssistantMessage(getMessages(), 1);
    expect(msg.error).toBe('Permission denied');
    expect(msg.errorType).toBe(LegendAIErrorType.PERMISSION);
  });
});

// ─── handleMetadataQuestion ──────────────────────────────────────────────────

describe(unitTest('handleMetadataQuestion'), () => {
  test('calls callLLM with metadata prompt and sets textAnswer', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      callLLM: createMock().mockResolvedValue('Product info here'),
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
    );

    const msg = TEST__getAssistantMessage(getMessages(), 1);
    expect(msg.textAnswer).toBe('Product info here');
    expect(msg.isProcessing).toBe(false);
  });

  test('parses suggested queries from delimiter', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      callLLM: createMock().mockResolvedValue(
        'Answer text\n---SUGGESTED_QUERIES---\n1. Query one?\n2. Query two?',
      ),
    });

    await handleMetadataQuestion(
      'describe this',
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

    const msg = TEST__getAssistantMessage(getMessages(), 1);
    expect(msg.textAnswer).toBe('Answer text');
    expect(msg.suggestedQueries).toEqual(['Query one?', 'Query two?']);
  });

  test('strips suggested queries when no queryable services and no orchestrator', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      callLLM: createMock().mockResolvedValue(
        'Answer\n---SUGGESTED_QUERIES---\n1. Follow-up',
      ),
    });

    await handleMetadataQuestion(
      'describe this',
      TEST_DATA__legendAIMetadata,
      {
        config: TEST_DATA__legendAIConfig,
        plugin,
        history: [],
        setMessages: setter,
      },
      Date.now(),
      false,
    );

    const msg = TEST__getAssistantMessage(getMessages(), 1);
    expect(msg.suggestedQueries).toEqual([]);
  });
});

// ─── generateAndJudgeSql ────────────────────────────────────────────────────

describe(unitTest('generateAndJudgeSql'), () => {
  test('returns SQL when judge passes on first attempt', async () => {
    const { setter } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      callLLM: createMock().mockResolvedValue('sql answer'),
    });

    const sql = await generateAndJudgeSql(
      'show trades',
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

    expect(sql).toBe('SELECT * FROM t');
  });

  test('returns null when SQL extraction fails', async () => {
    const { setter } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      callLLM: createMock().mockResolvedValue('no sql here'),
      extractSqlFromResponse: () => ({
        sql: null,
        failure: 'Could not find SQL',
        suggestion: 'Try asking differently',
      }),
    });

    const sql = await generateAndJudgeSql(
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

    expect(sql).toBeNull();
  });

  test('returns null when no SQL is extracted and no failure', async () => {
    const { setter } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      callLLM: createMock().mockResolvedValue('nothing'),
      extractSqlFromResponse: () => ({
        sql: null,
        failure: null,
      }),
    });

    const sql = await generateAndJudgeSql(
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

    expect(sql).toBeNull();
  });

  test('applies judge correction and returns corrected SQL', async () => {
    const { setter } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    let callCount = 0;
    const plugin = TEST__createMockLegendAIPlugin({
      callLLM: createMock().mockResolvedValue('answer'),
      extractJudgeResult: () => {
        callCount++;
        if (callCount === 1) {
          return {
            verdict: LegendAIJudgeVerdict.FAIL,
            correctedSql: 'SELECT id FROM trades',
          };
        }
        return { verdict: LegendAIJudgeVerdict.PASS };
      },
    });

    const sql = await generateAndJudgeSql(
      'show id',
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

    expect(sql).toBe('SELECT id FROM trades');
  });
});

// ─── executeSqlAndReport — successful execution ──────────────────────────────

describe(unitTest('executeSqlAndReport — success'), () => {
  test('returns execution result with deduplicated columns', async () => {
    const { setter, getMessages } = TEST__createMockSetter();
    TEST__seedAssistant(setter);
    const plugin = TEST__createMockLegendAIPlugin({
      executeSql: createMock().mockResolvedValue({
        columns: ['id', 'name', 'id'],
        rows: [{ id: 1, name: 'A', id_2: 1 }],
      }),
    });

    const result = await executeSqlAndReport(
      'SELECT * FROM t',
      TEST_DATA__legendAIServices,
      TEST_DATA__legendAIConfig,
      plugin,
      setter,
      Date.now(),
    );

    expect(result).toBeDefined();
    expect(result?.columns).toEqual(['id', 'name', 'id_2']);
    const msg = TEST__getAssistantMessage(getMessages(), 1);
    expect(msg.gridData?.rowData).toHaveLength(1);
    expect(msg.isProcessing).toBe(false);
  });
});

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
  buildConversationHistory,
  classifyResponseOutcome,
  buildGenerationFailureMessage,
  buildExecutionErrorMessage,
  updateLastAssistant,
  addThinkingStep,
  completeThinkingSteps,
  finishWithThinkingError,
  classifyError,
  sanitizeJoinOrderBy,
  sanitizeJoinSameKeyColumns,
  sanitizeLiteralColumns,
  stripGuessedNonDateServiceParams,
  ensureDateParameters,
  detectMissingServiceParams,
  buildMissingParamsWarning,
  ensureSafeLimit,
  ensurePureSafetyLimit,
  hasNestedPCalls,
  detectUnsupportedEnginePattern,
  supplementMissingCoverage,
  applyMultiTurnBias,
  categorizeExecutionError,
  ExecutionErrorCategory,
} from '../LegendAIChatProcessors.js';
import { splitIdentifierTokens } from '../../LegendAIDocEnrichment.js';
import {
  preFilterServicesByRelevance,
  isFuzzyMatch,
  levenshteinDistance,
} from '../../LegendAIServiceRetrieval.js';
import {
  type LegendAIMessage,
  type TDSServiceSchema,
  LegendAIMessageRole,
  LegendAIQuestionIntent,
  LegendAIThinkingStepStatus,
  LegendAIErrorType,
  LegendAIServiceError,
  LegendAIUnsupportedEngineShapeError,
  LegendAIResponseOutcome,
} from '../../LegendAITypes.js';
import {
  TEST__createMockSetter,
  TEST__makeAssistantMessage,
  TEST__getAssistantMessage,
} from '../../__test-utils__/LegendAITestUtils.js';

describe(unitTest('buildConversationHistory'), () => {
  test('returns empty array for empty messages', () => {
    expect(buildConversationHistory([])).toEqual([]);
  });

  test('returns empty array for single user message', () => {
    const messages: LegendAIMessage[] = [
      { id: 'u1', role: LegendAIMessageRole.USER, text: 'hello' },
    ];
    expect(buildConversationHistory(messages)).toEqual([]);
  });

  test('extracts history from user+assistant pair with sql', () => {
    const messages: LegendAIMessage[] = [
      { id: 'u1', role: LegendAIMessageRole.USER, text: 'show me top 10' },
      {
        id: 'a1',
        role: LegendAIMessageRole.ASSISTANT,
        thinkingSteps: [],
        sql: 'SELECT * FROM t LIMIT 10',
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
    expect(buildConversationHistory(messages)).toEqual([
      {
        question: 'show me top 10',
        sql: 'SELECT * FROM t LIMIT 10',
        intent: LegendAIQuestionIntent.DATA_QUERY,
      },
    ]);
  });

  test('extracts history from user+assistant pair with textAnswer', () => {
    const messages: LegendAIMessage[] = [
      { id: 'u1', role: LegendAIMessageRole.USER, text: 'what is this?' },
      {
        id: 'a1',
        role: LegendAIMessageRole.ASSISTANT,
        thinkingSteps: [],
        sql: null,
        textAnswer: 'This is a data product about trades.',
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
    expect(buildConversationHistory(messages)).toEqual([
      {
        question: 'what is this?',
        sql: 'This is a data product about trades.',
        intent: LegendAIQuestionIntent.METADATA,
      },
    ]);
  });

  test('includes generation failures in history', () => {
    const messages: LegendAIMessage[] = [
      { id: 'u1', role: LegendAIMessageRole.USER, text: 'bad query' },
      {
        id: 'a1',
        role: LegendAIMessageRole.ASSISTANT,
        thinkingSteps: [],
        sql: null,
        textAnswer: null,
        dataContext: null,
        gridData: null,
        error: 'Something failed',
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
    expect(history[0]?.resultSummary).toBe('ERROR: Something failed');
  });

  test('handles multiple conversation turns', () => {
    const messages: LegendAIMessage[] = [
      { id: 'u1', role: LegendAIMessageRole.USER, text: 'q1' },
      {
        id: 'a1',
        role: LegendAIMessageRole.ASSISTANT,
        thinkingSteps: [],
        sql: 'SELECT 1',
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
      { id: 'u2', role: LegendAIMessageRole.USER, text: 'q2' },
      {
        id: 'a2',
        role: LegendAIMessageRole.ASSISTANT,
        thinkingSteps: [],
        sql: null,
        textAnswer: 'answer2',
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
    expect(buildConversationHistory(messages)).toEqual([
      {
        question: 'q1',
        sql: 'SELECT 1',
        intent: LegendAIQuestionIntent.DATA_QUERY,
      },
      {
        question: 'q2',
        sql: 'answer2',
        intent: LegendAIQuestionIntent.METADATA,
      },
    ]);
  });

  test('prefers sql over textAnswer when both present', () => {
    const messages: LegendAIMessage[] = [
      { id: 'u1', role: LegendAIMessageRole.USER, text: 'q' },
      {
        id: 'a1',
        role: LegendAIMessageRole.ASSISTANT,
        thinkingSteps: [],
        sql: 'SELECT col',
        textAnswer: 'some text',
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
    expect(buildConversationHistory(messages)).toEqual([
      {
        question: 'q',
        sql: 'SELECT col',
        intent: LegendAIQuestionIntent.DATA_QUERY,
      },
    ]);
  });

  test('handles orphan messages gracefully', () => {
    const messages: LegendAIMessage[] = [
      {
        id: 'a1',
        role: LegendAIMessageRole.ASSISTANT,
        thinkingSteps: [],
        sql: 'SELECT 1',
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
      { id: 'u1', role: LegendAIMessageRole.USER, text: 'q' },
    ];
    expect(buildConversationHistory(messages)).toEqual([]);
  });
});
describe(unitTest('buildGenerationFailureMessage'), () => {
  const svc: TDSServiceSchema = {
    title: 'TradeService',
    description: 'Trade data',
    pattern: '/trades',
    columns: [{ name: 'id' }, { name: 'amount', type: 'Number' }],
    parameters: ['orderId', 'startDate'],
  };

  test('returns just failure when no suggestion and no services', () => {
    expect(buildGenerationFailureMessage('bad query', undefined, [])).toBe(
      'bad query',
    );
  });

  test('includes suggestion when provided', () => {
    const result = buildGenerationFailureMessage(
      'Could not parse',
      'Show top 10 trades',
      [],
    );
    expect(result).toContain('Could not parse');
    expect(result).toContain('Try instead: "Show top 10 trades"');
  });

  test('includes available services', () => {
    const result = buildGenerationFailureMessage('fail', undefined, [svc]);
    expect(result).toContain('Available services: TradeService');
  });

  test('includes service parameters', () => {
    const result = buildGenerationFailureMessage('fail', undefined, [svc]);
    expect(result).toContain(
      'Service parameters: TradeService: orderId, startDate',
    );
  });

  test('omits parameters section when services have no params', () => {
    const noParamSvc: TDSServiceSchema = {
      title: 'Svc',
      pattern: '/svc',
      columns: [],
      parameters: [],
    };
    const result = buildGenerationFailureMessage('fail', undefined, [
      noParamSvc,
    ]);
    expect(result).not.toContain('Service parameters');
  });

  test('combines all parts', () => {
    const result = buildGenerationFailureMessage('err', 'try X', [svc]);
    expect(result).toContain('err');
    expect(result).toContain('Try instead: "try X"');
    expect(result).toContain('Available services: TradeService');
    expect(result).toContain('Service parameters:');
  });
});
describe(unitTest('buildExecutionErrorMessage'), () => {
  const services: TDSServiceSchema[] = [
    {
      title: 'TradeService',
      pattern: '/trades',
      columns: [
        { name: 'tradeId', type: 'String' },
        { name: 'amount', type: 'Number' },
      ],
      parameters: ['orderId', 'startDate'],
    },
  ];

  test('handles missing parameter error with camelCase splitting', () => {
    const err = 'Error: missing required parameter values [orderId, startDate]';
    const result = buildExecutionErrorMessage(err, services);
    expect(result).toContain(
      'This service requires a value for: orderId, startDate',
    );
    expect(result).toContain('a specific order id');
    expect(result).toContain('a specific start date');
    expect(result).toContain('Try rephrasing your question');
  });

  test('handles single missing parameter', () => {
    const err = 'missing required parameter value [accountId]';
    const result = buildExecutionErrorMessage(err, []);
    expect(result).toContain('This service requires a value for: accountId');
    expect(result).toContain('a specific account id');
  });

  test('adds service params for missing parameter errors', () => {
    const err = 'missing required parameter values [orderId]';
    const result = buildExecutionErrorMessage(err, services);
    expect(result).toContain('Service parameters:');
    expect(result).toContain('TradeService: orderId, startDate');
  });

  test('handles column not found error', () => {
    const err = 'column "foo" not found';
    const result = buildExecutionErrorMessage(err, services);
    expect(result).toContain('foo');
    expect(result).toContain('Available columns:');
    expect(result).toContain('TradeService: tradeId, amount');
  });

  test('handles column does not exist error', () => {
    const err = 'Column "bar" does not exist';
    const result = buildExecutionErrorMessage(err, services);
    expect(result).toContain('Available columns:');
  });

  test('handles unknown column error', () => {
    const err = 'Unknown column "baz"';
    const result = buildExecutionErrorMessage(err, services);
    expect(result).toContain('Available columns:');
  });

  test('handles parameter hint for generic parameter errors', () => {
    const err = 'Invalid parameter type for startDate';
    const result = buildExecutionErrorMessage(err, services);
    expect(result).toContain('Required parameters:');
    expect(result).toContain('TradeService: orderId, startDate');
  });

  test('handles argument hint for argument errors', () => {
    const err = 'Missing argument for function call';
    const result = buildExecutionErrorMessage(err, services);
    expect(result).toContain('Required parameters:');
  });

  test('truncates long error messages', () => {
    const longErr = 'x'.repeat(1000);
    const result = buildExecutionErrorMessage(longErr, []);
    expect(result.length).toBeLessThanOrEqual(500);
  });

  test('returns plain error for unrecognized errors', () => {
    const err = 'Something unexpected happened';
    const result = buildExecutionErrorMessage(err, services);
    expect(result).toBe('Something unexpected happened');
  });

  test('omits parameter section when services have no params', () => {
    const noParamSvcs: TDSServiceSchema[] = [
      {
        title: 'Svc',
        pattern: '/svc',
        columns: [{ name: 'col1' }],
        parameters: [],
      },
    ];
    const err = 'Invalid parameter type';
    const result = buildExecutionErrorMessage(err, noParamSvcs);
    expect(result).not.toContain('Required parameters:');
  });

  test('shows clear message for rename column collision error', () => {
    const err =
      "no viable alternative at input '->meta::pure::functions::relation::rename(~property_id,~property_id_oh)->meta::pure::functions::relation::rename(~owner'";
    const result = buildExecutionErrorMessage(err, []);
    expect(result).toContain('Cross-access-point JOINs');
    expect(result).toContain('not yet supported');
    expect(result).toContain('querying each access point separately');
    expect(result).not.toContain('rename(~');
  });

  test('shows clear message for Timestamp vs String type mismatch', () => {
    const err =
      "Can't find a match for function 'greaterThanEqual(Timestamp[0..1],String[1])'.";
    const result = buildExecutionErrorMessage(err, []);
    expect(result).toContain('Date comparison type mismatch');
    expect(result).toContain('Timestamp');
    expect(result).not.toContain('greaterThanEqual');
  });
});
describe(unitTest('updateLastAssistant'), () => {
  test('updates the last assistant message', () => {
    const { setter, getMessages } = TEST__createMockSetter();
    setter([
      { id: 'u1', role: LegendAIMessageRole.USER, text: 'hello' },
      TEST__makeAssistantMessage(),
    ]);
    updateLastAssistant(setter, () => ({ sql: 'SELECT 1' }));
    const msgs = getMessages();
    expect(msgs).toHaveLength(2);
    expect(TEST__getAssistantMessage(msgs, 1).sql).toBe('SELECT 1');
  });

  test('does nothing if last message is not assistant', () => {
    const { setter, getMessages } = TEST__createMockSetter();
    setter([{ id: 'u1', role: LegendAIMessageRole.USER, text: 'hello' }]);
    updateLastAssistant(setter, () => ({ sql: 'SELECT 1' }));
    const msgs = getMessages();
    expect(msgs).toHaveLength(1);
    expect(msgs[0]?.role).toBe(LegendAIMessageRole.USER);
  });

  test('does nothing for empty messages', () => {
    const { setter, getMessages } = TEST__createMockSetter();
    updateLastAssistant(setter, () => ({ sql: 'SELECT 1' }));
    expect(getMessages()).toHaveLength(0);
  });

  test('merges partial updates correctly', () => {
    const { setter, getMessages } = TEST__createMockSetter();
    setter([
      TEST__makeAssistantMessage({ sql: 'SELECT 1', isProcessing: true }),
    ]);
    updateLastAssistant(setter, () => ({
      isProcessing: false,
      error: 'fail',
    }));
    const msg = TEST__getAssistantMessage(getMessages(), 0);
    expect(msg.sql).toBe('SELECT 1');
    expect(msg.isProcessing).toBe(false);
    expect(msg.error).toBe('fail');
  });
});

describe(unitTest('addThinkingStep'), () => {
  test('adds a new active thinking step', () => {
    const { setter, getMessages } = TEST__createMockSetter();
    setter([TEST__makeAssistantMessage()]);
    addThinkingStep(setter, 'Analyzing...');
    const msg = TEST__getAssistantMessage(getMessages(), 0);
    expect(msg.thinkingSteps).toHaveLength(1);
    expect(msg.thinkingSteps[0]).toMatchObject({
      label: 'Analyzing...',
      status: LegendAIThinkingStepStatus.ACTIVE,
    });
    expect(msg.thinkingSteps[0]?.id).toBeDefined();
  });

  test('completes previous active step when adding new one', () => {
    const { setter, getMessages } = TEST__createMockSetter();
    setter([
      TEST__makeAssistantMessage({
        thinkingSteps: [
          {
            id: 's1',
            label: 'Step 1',
            status: LegendAIThinkingStepStatus.ACTIVE,
          },
        ],
      }),
    ]);
    addThinkingStep(setter, 'Step 2');
    const msg = TEST__getAssistantMessage(getMessages(), 0);
    expect(msg.thinkingSteps).toHaveLength(2);
    expect(msg.thinkingSteps[0]?.status).toBe(LegendAIThinkingStepStatus.DONE);
    expect(msg.thinkingSteps[1]?.status).toBe(
      LegendAIThinkingStepStatus.ACTIVE,
    );
  });

  test('preserves already-done steps', () => {
    const { setter, getMessages } = TEST__createMockSetter();
    setter([
      TEST__makeAssistantMessage({
        thinkingSteps: [
          {
            id: 's1',
            label: 'Done step',
            status: LegendAIThinkingStepStatus.DONE,
          },
          {
            id: 's2',
            label: 'Active step',
            status: LegendAIThinkingStepStatus.ACTIVE,
          },
        ],
      }),
    ]);
    addThinkingStep(setter, 'New step');
    const msg = TEST__getAssistantMessage(getMessages(), 0);
    expect(msg.thinkingSteps).toHaveLength(3);
    expect(msg.thinkingSteps[0]?.status).toBe(LegendAIThinkingStepStatus.DONE);
    expect(msg.thinkingSteps[1]?.status).toBe(LegendAIThinkingStepStatus.DONE);
    expect(msg.thinkingSteps[2]?.status).toBe(
      LegendAIThinkingStepStatus.ACTIVE,
    );
  });
});

describe(unitTest('completeThinkingSteps'), () => {
  test('marks active steps as done', () => {
    const { setter, getMessages } = TEST__createMockSetter();
    setter([
      TEST__makeAssistantMessage({
        thinkingSteps: [
          {
            id: 's1',
            label: 'Active',
            status: LegendAIThinkingStepStatus.ACTIVE,
          },
        ],
      }),
    ]);
    completeThinkingSteps(setter);
    const msg = TEST__getAssistantMessage(getMessages(), 0);
    expect(msg.thinkingSteps[0]?.status).toBe(LegendAIThinkingStepStatus.DONE);
  });

  test('leaves done and error steps untouched', () => {
    const { setter, getMessages } = TEST__createMockSetter();
    setter([
      TEST__makeAssistantMessage({
        thinkingSteps: [
          { id: 's1', label: 'Done', status: LegendAIThinkingStepStatus.DONE },
          {
            id: 's2',
            label: 'Error',
            status: LegendAIThinkingStepStatus.ERROR,
          },
          {
            id: 's3',
            label: 'Active',
            status: LegendAIThinkingStepStatus.ACTIVE,
          },
        ],
      }),
    ]);
    completeThinkingSteps(setter);
    const msg = TEST__getAssistantMessage(getMessages(), 0);
    expect(msg.thinkingSteps[0]?.status).toBe(LegendAIThinkingStepStatus.DONE);
    expect(msg.thinkingSteps[1]?.status).toBe(LegendAIThinkingStepStatus.ERROR);
    expect(msg.thinkingSteps[2]?.status).toBe(LegendAIThinkingStepStatus.DONE);
  });
});

describe(unitTest('finishWithThinkingError'), () => {
  test('marks active steps as error and sets error message', () => {
    const { setter, getMessages } = TEST__createMockSetter();
    setter([
      TEST__makeAssistantMessage({
        thinkingSteps: [
          {
            id: 's1',
            label: 'Working',
            status: LegendAIThinkingStepStatus.ACTIVE,
          },
        ],
      }),
    ]);
    const fakeStartTime = Date.now() - 2000;
    finishWithThinkingError(setter, 'Something failed', fakeStartTime);
    const msg = TEST__getAssistantMessage(getMessages(), 0);
    expect(msg.thinkingSteps[0]?.status).toBe(LegendAIThinkingStepStatus.ERROR);
    expect(msg.error).toBe('Something failed');
    expect(msg.errorType).toBeNull();
    expect(msg.isProcessing).toBe(false);
    expect(msg.thinkingDuration).toBeDefined();
  });

  test('truncates long error messages', () => {
    const { setter, getMessages } = TEST__createMockSetter();
    setter([TEST__makeAssistantMessage()]);
    finishWithThinkingError(setter, 'x'.repeat(1000), Date.now());
    const msg = TEST__getAssistantMessage(getMessages(), 0);
    expect(msg.error?.length).toBeLessThanOrEqual(500);
  });

  test('sets thinkingDuration based on startTime', () => {
    const { setter, getMessages } = TEST__createMockSetter();
    setter([TEST__makeAssistantMessage()]);
    const fakeStartTime = Date.now() - 5000;
    finishWithThinkingError(setter, 'err', fakeStartTime);
    const msg = TEST__getAssistantMessage(getMessages(), 0);
    const duration = parseFloat(msg.thinkingDuration ?? '0');
    expect(duration).toBeGreaterThanOrEqual(4);
    expect(duration).toBeLessThan(10);
  });

  test('propagates errorType when provided', () => {
    const { setter, getMessages } = TEST__createMockSetter();
    setter([TEST__makeAssistantMessage()]);
    finishWithThinkingError(
      setter,
      'Permission denied',
      Date.now(),
      LegendAIErrorType.PERMISSION,
    );
    const msg = TEST__getAssistantMessage(getMessages(), 0);
    expect(msg.errorType).toBe(LegendAIErrorType.PERMISSION);
  });

  test('sets errorType to null when not provided', () => {
    const { setter, getMessages } = TEST__createMockSetter();
    setter([TEST__makeAssistantMessage()]);
    finishWithThinkingError(setter, 'generic error', Date.now());
    const msg = TEST__getAssistantMessage(getMessages(), 0);
    expect(msg.errorType).toBeNull();
  });
});

// ─── classifyError ───────────────────────────────────────────────────────────

describe(unitTest('classifyError'), () => {
  test('returns errorType from LegendAIServiceError', () => {
    const permErr = new LegendAIServiceError(
      'forbidden',
      LegendAIErrorType.PERMISSION,
    );
    expect(classifyError(permErr)).toBe(LegendAIErrorType.PERMISSION);

    const netErr = new LegendAIServiceError(
      'unreachable',
      LegendAIErrorType.NETWORK,
    );
    expect(classifyError(netErr)).toBe(LegendAIErrorType.NETWORK);
  });

  test('returns GENERAL for plain Error', () => {
    expect(classifyError(new Error('something'))).toBe(
      LegendAIErrorType.GENERAL,
    );
  });

  test('returns GENERAL for TypeError', () => {
    expect(classifyError(new TypeError('type issue'))).toBe(
      LegendAIErrorType.GENERAL,
    );
  });
});

describe(unitTest('sanitizeJoinOrderBy'), () => {
  test('returns unchanged SQL when no JOIN present', () => {
    const sql = `SELECT "date" FROM service('/svc') ORDER BY "date" DESC`;
    expect(sanitizeJoinOrderBy(sql)).toBe(sql);
  });

  test('returns unchanged SQL when no ORDER BY present', () => {
    const sql = [
      'SELECT a."date" AS query_date, b."price" AS svc_price',
      "FROM service('/a') AS a",
      'JOIN service(\'/b\') AS b ON a."id" = b."id"',
    ].join('\n');
    expect(sanitizeJoinOrderBy(sql)).toBe(sql);
  });

  test('rewrites alias-prefixed ORDER BY in a JOIN query', () => {
    const sql = [
      'SELECT',
      '  a."date" AS query_date,',
      '  b."price" AS wdi_price',
      "FROM service('/usecon') AS a",
      'JOIN service(\'/wdi\') AS b ON a."date" = b."date"',
      'ORDER BY a."date" DESC',
      'LIMIT 10',
    ].join('\n');
    const result = sanitizeJoinOrderBy(sql);
    expect(result).toContain('ORDER BY "query_date" DESC');
    expect(result).not.toContain('a."date" DESC');
  });

  test('rewrites multiple alias-prefixed columns in ORDER BY', () => {
    const sql = [
      'SELECT',
      '  a."date" AS query_date,',
      '  a."name" AS usecon_name,',
      '  b."price" AS wdi_price',
      "FROM service('/a') AS a",
      'JOIN service(\'/b\') AS b ON a."id" = b."id"',
      'ORDER BY a."date" DESC, a."name" ASC',
    ].join('\n');
    const result = sanitizeJoinOrderBy(sql);
    expect(result).toContain('"query_date" DESC');
    expect(result).toContain('"usecon_name" ASC');
  });

  test('leaves ORDER BY alone when using existing aliases', () => {
    const sql = [
      'SELECT a."date" AS query_date, b."price" AS wdi_price',
      "FROM service('/a') AS a",
      'JOIN service(\'/b\') AS b ON a."id" = b."id"',
      'ORDER BY query_date DESC',
    ].join('\n');
    expect(sanitizeJoinOrderBy(sql)).toBe(sql);
  });

  test('handles quoted AS aliases', () => {
    const sql = [
      'SELECT a."date" AS "query date"',
      "FROM service('/a') AS a",
      'JOIN service(\'/b\') AS b ON a."id" = b."id"',
      'ORDER BY a."date" DESC',
    ].join('\n');
    const result = sanitizeJoinOrderBy(sql);
    expect(result).toContain('"query date" DESC');
  });
});

describe(unitTest('sanitizeLiteralColumns'), () => {
  test('returns unchanged SQL when no UNION ALL present', () => {
    const sql = `SELECT "date", 'USECON' AS service_name FROM service('/svc')`;
    expect(sanitizeLiteralColumns(sql)).toBe(sql);
  });

  test('strips literal columns from UNION ALL query', () => {
    const sql = [
      'SELECT',
      '  "date",',
      '  "haverId",',
      "  'USECON' AS service_name",
      "FROM service('/Usecon')",
      'UNION ALL',
      'SELECT',
      '  "date",',
      '  "haverId",',
      "  'WDI' AS service_name",
      "FROM service('/Wdi')",
      'ORDER BY "date"',
    ].join('\n');
    const result = sanitizeLiteralColumns(sql);
    expect(result).not.toContain("'USECON' AS service_name");
    expect(result).not.toContain("'WDI' AS service_name");
    expect(result).toContain('"date"');
    expect(result).toContain('"haverId"');
  });

  test('strips literal columns with quoted aliases', () => {
    const sql = [
      'SELECT "col1", \'Period1\' AS "time period"',
      "FROM service('/a')",
      'UNION ALL',
      'SELECT "col1", \'Period2\' AS "time period"',
      "FROM service('/b')",
    ].join('\n');
    const result = sanitizeLiteralColumns(sql);
    expect(result).not.toContain("'Period1'");
    expect(result).not.toContain("'Period2'");
    expect(result).toContain('"col1"');
  });

  test('leaves non-literal columns untouched', () => {
    const sql = [
      'SELECT "date", "source"',
      "FROM service('/a')",
      'UNION ALL',
      'SELECT "date", "source"',
      "FROM service('/b')",
    ].join('\n');
    expect(sanitizeLiteralColumns(sql)).toBe(sql);
  });
});

describe(unitTest('stripGuessedNonDateServiceParams'), () => {
  test('passes through SQL without non-date params', () => {
    const sql = [
      'SELECT *',
      "FROM service('/path', coordinates => 'com:group:1.0', startDate => '2025-01-01', endDate => '2026-01-01')",
      'LIMIT 10',
    ].join('\n');
    expect(stripGuessedNonDateServiceParams(sql, 'show me data')).toBe(sql);
  });

  test('strips guessed non-date params not in question', () => {
    const sql = [
      'SELECT *',
      "FROM service('/path', coordinates => 'com:group:1.0', haverId => 'A001NGDP', startDate => '2020-01-01', endDate => '2023-12-31')",
      'LIMIT 10',
    ].join('\n');
    const result = stripGuessedNonDateServiceParams(sql, 'show me GDP data');
    expect(result).not.toContain('haverId');
    expect(result).toContain("startDate => '2020-01-01'");
    expect(result).toContain("endDate => '2023-12-31'");
    expect(result).toContain("coordinates => 'com:group:1.0'");
  });

  test('preserves non-date params when value appears in question', () => {
    const sql =
      "SELECT * FROM service('/path', coordinates => 'c:g:1', ticker => 'AAPL', startDate => '2024-01-01')";
    const result = stripGuessedNonDateServiceParams(
      sql,
      'show me AAPL stock data',
    );
    expect(result).toContain("ticker => 'AAPL'");
    expect(result).toContain("startDate => '2024-01-01'");
  });

  test('strips guessed params but keeps user-mentioned ones', () => {
    const sql =
      "SELECT * FROM service('/path', coordinates => 'c:g:1', ticker => 'AAPL', region => 'US', startDate => '2024-01-01')";
    const result = stripGuessedNonDateServiceParams(sql, 'show me AAPL bonds');
    expect(result).toContain("ticker => 'AAPL'");
    expect(result).not.toContain('region');
    expect(result).toContain("startDate => '2024-01-01'");
  });

  test('preserves all date-like params', () => {
    const sql =
      "SELECT * FROM service('/path', coordinates => 'c:g:1', businessDate => '2024-01-01', processingDate => '2024-06-01', asOfDate => '2024-12-31')";
    expect(stripGuessedNonDateServiceParams(sql, 'show data')).toBe(sql);
  });

  test('handles multi-line formatted service call', () => {
    const sql = [
      'SELECT',
      '  *',
      'FROM service(',
      "    '/VendorData/Haver/Afdb',",
      "    coordinates => 'com.gs:vendor-data-haver:5.11.0',",
      "    haverId => 'A001NGDP',",
      "    startDate => '2020-01-01',",
      "    endDate => '2023-12-31'",
      ')',
      'LIMIT 10',
    ].join('\n');
    const result = stripGuessedNonDateServiceParams(sql, 'show me Haver data');
    expect(result).not.toContain('haverId');
    expect(result).toContain("startDate => '2020-01-01'");
    expect(result).toContain("endDate => '2023-12-31'");
  });
});

describe(unitTest('ensureDateParameters'), () => {
  const today = new Date().toISOString().slice(0, 10);

  function makeService(
    params: string[],
    sourceType?: string,
  ): TDSServiceSchema {
    return {
      title: 'Test Service',
      pattern: '/test/pattern',
      columns: [{ name: 'col1' }],
      parameters: params,
      ...(sourceType !== undefined ? { sourceType: sourceType as never } : {}),
    };
  }

  test('injects missing processingDate into service() call', () => {
    const sql = [
      'SELECT *',
      "FROM service('/test/pattern', coordinates => 'com:group:1.0')",
      'LIMIT 10',
    ].join('\n');
    const result = ensureDateParameters(sql, [makeService(['processingDate'])]);
    expect(result).toContain(`processingDate => '${today}'`);
    expect(result).toContain("coordinates => 'com:group:1.0'");
  });

  test('does not duplicate existing date parameter', () => {
    const sql = [
      'SELECT *',
      `FROM service('/test/pattern', coordinates => 'com:group:1.0', processingDate => '2025-06-01')`,
      'LIMIT 10',
    ].join('\n');
    const result = ensureDateParameters(sql, [makeService(['processingDate'])]);
    expect(result).toBe(sql);
  });

  test('injects multiple missing date parameters', () => {
    const sql = "SELECT * FROM service('/path', coordinates => 'c:g:1')";
    const result = ensureDateParameters(sql, [
      makeService(['businessDate', 'processingDate']),
    ]);
    expect(result).toContain(`businessDate => '${today}'`);
    expect(result).toContain(`processingDate => '${today}'`);
  });

  test('returns unchanged SQL when service has no date params', () => {
    const sql =
      "SELECT * FROM service('/path', coordinates => 'c:g:1') LIMIT 10";
    const result = ensureDateParameters(sql, [
      makeService(['ticker', 'region']),
    ]);
    expect(result).toBe(sql);
  });

  test('returns unchanged SQL when service has no params', () => {
    const sql =
      "SELECT * FROM service('/path', coordinates => 'c:g:1') LIMIT 10";
    const result = ensureDateParameters(sql, [makeService([])]);
    expect(result).toBe(sql);
  });

  test('skips access point services', () => {
    const sql = "SELECT * FROM p('product.ap')";
    const result = ensureDateParameters(sql, [
      makeService(['processingDate'], 'accessPoint'),
    ]);
    expect(result).toBe(sql);
  });

  test('handles multi-line service() call', () => {
    const sql = [
      'SELECT',
      '  "col1"',
      'FROM service(',
      "    '/Bloomberg/test',",
      "    coordinates => 'com.gs:bbg:1.0'",
      ')',
      'LIMIT 10',
    ].join('\n');
    const result = ensureDateParameters(sql, [makeService(['processingDate'])]);
    expect(result).toContain(`processingDate => '${today}'`);
    expect(result).toContain("coordinates => 'com.gs:bbg:1.0'");
  });

  test('injects date params into ALL service() calls in a JOIN', () => {
    const sql = [
      'SELECT a."col1", b."col2"',
      "FROM service('/svcA', coordinates => 'c:g:1') AS a",
      "JOIN service('/svcB', coordinates => 'c:g:1') AS b",
      '  ON a."id" = b."id"',
    ].join('\n');
    const result = ensureDateParameters(sql, [makeService(['processingDate'])]);
    const matches = result.match(/processingDate =>/g);
    expect(matches).toHaveLength(2);
  });
});

describe(unitTest('detectMissingServiceParams'), () => {
  const today = new Date().toISOString().slice(0, 10);

  function makeService(
    params: string[],
    columns?: { name: string; sampleValues?: string; documentation?: string }[],
    sourceType?: string,
  ): TDSServiceSchema {
    return {
      title: 'Test Service',
      pattern: '/test/pattern',
      columns: columns ?? [{ name: 'col1' }],
      parameters: params,
      ...(sourceType !== undefined ? { sourceType: sourceType as never } : {}),
    };
  }

  test('detects missing non-date param', () => {
    const sql =
      "SELECT * FROM service('/path', coordinates => 'c:g:1') LIMIT 10";
    const result = detectMissingServiceParams(sql, [makeService(['haverId'])]);
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('haverId');
    expect(result[0]?.isDateLike).toBe(false);
  });

  test('detects missing date param', () => {
    const sql =
      "SELECT * FROM service('/path', coordinates => 'c:g:1') LIMIT 10";
    const result = detectMissingServiceParams(sql, [
      makeService(['processingDate']),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('processingDate');
    expect(result[0]?.isDateLike).toBe(true);
    expect(result[0]?.hint).toContain(today);
  });

  test('detects mixed missing params', () => {
    const sql =
      "SELECT * FROM service('/path', coordinates => 'c:g:1') LIMIT 10";
    const result = detectMissingServiceParams(sql, [
      makeService(['processingDate', 'haverId', 'ticker']),
    ]);
    expect(result).toHaveLength(3);
    const names = result.map((p) => p.name);
    expect(names).toContain('processingDate');
    expect(names).toContain('haverId');
    expect(names).toContain('ticker');
  });

  test('returns empty when all params present in SQL', () => {
    const sql =
      "SELECT * FROM service('/path', coordinates => 'c:g:1', processingDate => '2026-01-01', haverId => 'A001') LIMIT 10";
    const result = detectMissingServiceParams(sql, [
      makeService(['processingDate', 'haverId']),
    ]);
    expect(result).toHaveLength(0);
  });

  test('returns empty when service has no params', () => {
    const sql =
      "SELECT * FROM service('/path', coordinates => 'c:g:1') LIMIT 10";
    const result = detectMissingServiceParams(sql, [makeService([])]);
    expect(result).toHaveLength(0);
  });

  test('skips access point services', () => {
    const sql = "SELECT * FROM p('product.ap')";
    const result = detectMissingServiceParams(sql, [
      makeService(['processingDate', 'haverId'], undefined, 'accessPoint'),
    ]);
    expect(result).toHaveLength(0);
  });

  test('includes sample values as hint for non-date params', () => {
    const sql =
      "SELECT * FROM service('/path', coordinates => 'c:g:1') LIMIT 10";
    const result = detectMissingServiceParams(sql, [
      makeService(
        ['ticker'],
        [{ name: 'ticker', sampleValues: 'AAPL, MSFT, GOOG' }],
      ),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.hint).toBe('AAPL, MSFT, GOOG');
  });

  test('includes documentation as hint when no sample values', () => {
    const sql =
      "SELECT * FROM service('/path', coordinates => 'c:g:1') LIMIT 10";
    const result = detectMissingServiceParams(sql, [
      makeService(
        ['region'],
        [{ name: 'region', documentation: 'Geographic region code' }],
      ),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.hint).toBe('Geographic region code');
  });

  test('deduplicates params across services', () => {
    const sql =
      "SELECT * FROM service('/path', coordinates => 'c:g:1') LIMIT 10";
    const result = detectMissingServiceParams(sql, [
      makeService(['haverId']),
      makeService(['haverId']),
    ]);
    expect(result).toHaveLength(1);
  });
});

describe(unitTest('buildMissingParamsWarning'), () => {
  test('builds warning for single non-date param', () => {
    const result = buildMissingParamsWarning([
      { name: 'haverId', isDateLike: false },
    ]);
    expect(result).toContain('**haverId**');
    expect(result).toContain('haverId=[your value]');
    expect(result).toContain('requires the following parameter to execute');
  });

  test('builds warning for multiple params with hints', () => {
    const result = buildMissingParamsWarning([
      {
        name: 'processingDate',
        hint: "today's date: 2026-06-03",
        isDateLike: true,
      },
      { name: 'haverId', hint: 'A001NGDP, B002XYZ', isDateLike: false },
    ]);
    expect(result).toContain('**processingDate**');
    expect(result).toContain('**haverId**');
    expect(result).toMatch(/processingDate=\d{4}-\d{2}-\d{2}/);
    expect(result).toContain('haverId=[your value]');
    expect(result).toContain('parameters');
  });

  test('builds warning without hints on param line', () => {
    const result = buildMissingParamsWarning([
      { name: 'ticker', isDateLike: false },
    ]);
    expect(result).toContain('- **ticker**');
    // The param description line should not have a hint parenthetical
    expect(result).not.toContain('- **ticker** (e.g.');
  });
});

describe(unitTest('preFilterServicesByRelevance'), () => {
  function makeSvc(
    title: string,
    columns: string[],
    description?: string,
  ): TDSServiceSchema {
    return {
      title,
      pattern: `/${title.toLowerCase()}`,
      columns: columns.map((name) => ({ name })),
      parameters: [],
      ...(description !== undefined ? { description } : {}),
    };
  }

  test('returns all services when under limit', () => {
    const svcs = [makeSvc('Alpha', ['a']), makeSvc('Beta', ['b'])];
    const result = preFilterServicesByRelevance('show alpha data', svcs, 10);
    expect(result).toHaveLength(2);
  });

  test('ranks services by keyword match', () => {
    const svcs = [
      makeSvc('Pricing', ['price', 'ticker']),
      makeSvc('Ratings', ['rating', 'issuer']),
      makeSvc('BondPricing', ['price', 'coupon', 'maturity']),
    ];
    const result = preFilterServicesByRelevance(
      'show me bond pricing data',
      svcs,
      2,
    );
    expect(result[0]?.title).toBe('BondPricing');
    expect(result).toHaveLength(2);
  });

  test('matches against column names', () => {
    const svcs = [
      makeSvc('ServiceA', ['ticker', 'price', 'volume']),
      makeSvc('ServiceB', ['name', 'address', 'phone']),
    ];
    const result = preFilterServicesByRelevance(
      'what is the ticker price',
      svcs,
      1,
    );
    expect(result[0]?.title).toBe('ServiceA');
  });

  test('handles empty question gracefully', () => {
    const svcs = [makeSvc('A', ['x']), makeSvc('B', ['y'])];
    const result = preFilterServicesByRelevance('', svcs, 5);
    expect(result).toHaveLength(2);
  });
});

describe(unitTest('ensureSafeLimit'), () => {
  test('appends LIMIT to simple SELECT without one', () => {
    const sql = "SELECT * FROM service('/path', coordinates => 'c:g:1')";
    const result = ensureSafeLimit(sql);
    expect(result).toContain('LIMIT 1000');
  });

  test('does not append when LIMIT already present', () => {
    const sql =
      "SELECT * FROM service('/path', coordinates => 'c:g:1') LIMIT 10";
    const result = ensureSafeLimit(sql);
    expect(result).toBe(sql);
  });

  test('does not append to aggregation queries', () => {
    const sql =
      'SELECT "region", COUNT(*) AS cnt FROM service(\'/path\', coordinates => \'c:g:1\') GROUP BY "region"';
    const result = ensureSafeLimit(sql);
    expect(result).toBe(sql);
  });

  test('does not append when SUM is present', () => {
    const sql =
      "SELECT SUM(\"amount\") AS total FROM service('/path', coordinates => 'c:g:1')";
    const result = ensureSafeLimit(sql);
    expect(result).toBe(sql);
  });

  test('uses custom limit value', () => {
    const sql = "SELECT * FROM service('/path', coordinates => 'c:g:1')";
    const result = ensureSafeLimit(sql, 500);
    expect(result).toContain('LIMIT 500');
  });
});

describe(unitTest('sanitizeJoinOrderBy — edge cases'), () => {
  test('returns unchanged when JOIN + ORDER BY but no AS aliases', () => {
    const sql = [
      'SELECT a."date", b."price"',
      "FROM service('/a') AS a",
      'JOIN service(\'/b\') AS b ON a."id" = b."id"',
      'ORDER BY a."date" DESC',
    ].join('\n');
    expect(sanitizeJoinOrderBy(sql)).toBe(sql);
  });

  test('leaves ORDER BY unchanged when col not in alias map', () => {
    const sql = [
      'SELECT a."date" AS query_date',
      "FROM service('/a') AS a",
      'JOIN service(\'/b\') AS b ON a."id" = b."id"',
      'ORDER BY b."other" DESC',
    ].join('\n');
    const result = sanitizeJoinOrderBy(sql);
    expect(result).toContain('b."other"');
  });
});

describe(unitTest('preFilterServicesByRelevance — edge cases'), () => {
  function makeSvc(
    title: string,
    columns: string[],
    params?: string[],
  ): TDSServiceSchema {
    return {
      title,
      pattern: `/${title.toLowerCase()}`,
      columns: columns.map((name) => ({ name })),
      parameters: params ?? [],
    };
  }

  test('matches against parameters', () => {
    const svcs = [
      makeSvc('ServiceA', ['col1'], ['businessDate']),
      makeSvc('ServiceB', ['col2'], ['region']),
    ];
    const result = preFilterServicesByRelevance(
      'show region breakdown',
      svcs,
      1,
    );
    expect(result[0]?.title).toBe('ServiceB');
  });

  test('matches against description', () => {
    const svcs = [
      {
        title: 'Svc1',
        pattern: '/svc1',
        columns: [{ name: 'x' }],
        parameters: [],
        description: 'Credit risk exposure data',
      },
      {
        title: 'Svc2',
        pattern: '/svc2',
        columns: [{ name: 'y' }],
        parameters: [],
        description: 'Equity pricing data',
      },
    ];
    const result = preFilterServicesByRelevance(
      'show credit risk data',
      svcs,
      1,
    );
    expect(result[0]?.title).toBe('Svc1');
  });

  test('question with only short tokens returns first N services', () => {
    const svcs = [makeSvc('A', ['x']), makeSvc('B', ['y'])];
    const result = preFilterServicesByRelevance('is it ok', svcs, 5);
    expect(result).toHaveLength(2);
  });
});

describe(unitTest('buildConversationHistory — gridData colId fallback'), () => {
  test('uses colId when headerName is missing', () => {
    const messages: LegendAIMessage[] = [
      { id: '1', role: LegendAIMessageRole.USER, text: 'query' },
      {
        ...TEST__makeAssistantMessage(),
        sql: 'SELECT 1',
        gridData: {
          columnDefs: [{ colId: 'revenue', field: 'revenue' }],
          rowData: [{ revenue: 100 }],
        },
      },
    ];
    const history = buildConversationHistory(messages);
    expect(history).toHaveLength(1);
    expect(history[0]?.resultSummary).toContain('revenue');
  });

  test('skips columns with no headerName or colId', () => {
    const messages: LegendAIMessage[] = [
      { id: '1', role: LegendAIMessageRole.USER, text: 'query' },
      {
        ...TEST__makeAssistantMessage(),
        sql: 'SELECT 1',
        gridData: {
          columnDefs: [{ field: 'f' }],
          rowData: [{ f: 1 }],
        },
      },
    ];
    const history = buildConversationHistory(messages);
    expect(history).toHaveLength(1);
    expect(history[0]?.resultSummary).toBeUndefined();
  });
});

describe(unitTest('buildGenerationFailureMessage — parameterSchemas'), () => {
  test('includes parameterSchema types', () => {
    const services: TDSServiceSchema[] = [
      {
        title: 'MyService',
        pattern: '/svc',
        columns: [],
        parameters: ['businessDate'],
        parameterSchemas: [
          { name: 'businessDate', type: 'StrictDate' },
          { name: 'region', type: 'String' },
        ],
      },
    ];
    const result = buildGenerationFailureMessage(
      'Could not generate',
      undefined,
      services,
    );
    expect(result).toContain('businessDate (StrictDate)');
    expect(result).toContain('region (String)');
  });
});

describe(unitTest('sanitizeJoinSameKeyColumns'), () => {
  test('returns unchanged SQL when no JOIN present', () => {
    const sql = `SELECT "id", "name" FROM p('dp::AP.VALUES')`;
    expect(sanitizeJoinSameKeyColumns(sql)).toBe(sql);
  });

  test('returns unchanged when join keys have different names', () => {
    const sql = [
      'SELECT a."detailId", b."id"',
      "FROM p('dp::AP.LEFT') AS a",
      'JOIN p(\'dp::AP.RIGHT\') AS b ON a."detailId" = b."id"',
    ].join('\n');
    expect(sanitizeJoinSameKeyColumns(sql)).toBe(sql);
  });

  test('uses fallback column list when no schemas provided', () => {
    const sql = [
      'SELECT pv."property_id", oh."owner"',
      "FROM p('dp::SHARE.PROPERTY_VALUES') AS pv",
      'JOIN p(\'dp::SHARE.OWNERSHIP_HISTORY\') AS oh ON pv."property_id" = oh."property_id"',
    ].join('\n');
    const result = sanitizeJoinSameKeyColumns(sql);
    expect(result).toContain(
      '(SELECT "property_id" AS "oh_property_id", * FROM p(\'dp::SHARE.OWNERSHIP_HISTORY\')) AS oh',
    );
    expect(result).toContain('oh."oh_property_id"');
    expect(result).not.toContain('= oh."property_id"');
  });

  test('uses explicit column list when schemas match', () => {
    const sql = [
      'SELECT pv."property_id", oh."owner"',
      "FROM p('dp::SHARE.PROPERTY_VALUES') AS pv",
      'JOIN p(\'dp::SHARE.OWNERSHIP_HISTORY\') AS oh ON pv."property_id" = oh."property_id"',
    ].join('\n');
    const services: TDSServiceSchema[] = [
      {
        title: 'Property Values',
        pattern: '/PROPERTY_VALUES',
        columns: [{ name: 'property_id' }, { name: 'address' }],
        parameters: [],
        dataProductPath: 'dp::SHARE',
      },
      {
        title: 'Ownership History',
        pattern: '/OWNERSHIP_HISTORY',
        columns: [
          { name: 'property_id' },
          { name: 'owner' },
          { name: 'from_date' },
        ],
        parameters: [],
        dataProductPath: 'dp::SHARE',
      },
    ];
    const result = sanitizeJoinSameKeyColumns(sql, services);
    expect(result).toContain(
      '(SELECT "property_id" AS "oh_property_id", "owner", "from_date" FROM p(\'dp::SHARE.OWNERSHIP_HISTORY\')) AS oh',
    );
    expect(result).toContain('oh."oh_property_id"');
    expect(result).not.toContain('SELECT *');
  });

  test('handles LEFT JOIN with same key', () => {
    const sql = [
      'SELECT a."id", b."value"',
      "FROM p('dp::AP.A') AS a",
      'LEFT JOIN p(\'dp::AP.B\') AS b ON a."id" = b."id"',
    ].join('\n');
    const result = sanitizeJoinSameKeyColumns(sql);
    expect(result).toContain('"id" AS "b_id"');
    expect(result).toContain('b."b_id"');
  });

  test('handles case-insensitive JOIN keyword', () => {
    const sql = [
      'SELECT a."id", b."name"',
      "FROM p('dp::AP.A') AS a",
      'join p(\'dp::AP.B\') AS b ON a."id" = b."id"',
    ].join('\n');
    const result = sanitizeJoinSameKeyColumns(sql);
    expect(result).toContain('"id" AS "b_id"');
  });

  test('leaves already-subqueried right side unchanged', () => {
    const sql = [
      'SELECT a."id", b."b_id"',
      "FROM p('dp::AP.A') AS a",
      'JOIN (SELECT "id" AS "b_id", "val" FROM p(\'dp::AP.B\')) AS b ON a."id" = b."b_id"',
    ].join('\n');
    expect(sanitizeJoinSameKeyColumns(sql)).toBe(sql);
  });

  test('handles real-world property valuation with schemas', () => {
    const sql = [
      'SELECT',
      '  pv."property_id",',
      '  pv."address",',
      '  oh."owner",',
      '  oh."from_date"',
      "FROM p('ai_training::PROPERTY_VALUATION_SHARE.PROPERTY_VALUES') AS pv",
      "JOIN p('ai_training::PROPERTY_VALUATION_SHARE.OWNERSHIP_HISTORY') AS oh",
      '  ON pv."property_id" = oh."property_id"',
      'LIMIT 10',
    ].join('\n');
    const services: TDSServiceSchema[] = [
      {
        title: 'Property Values',
        pattern: '/PROPERTY_VALUES',
        columns: [
          { name: 'property_id' },
          { name: 'address' },
          { name: 'current_value' },
        ],
        parameters: [],
        dataProductPath: 'ai_training::PROPERTY_VALUATION_SHARE',
      },
      {
        title: 'Ownership History',
        pattern: '/OWNERSHIP_HISTORY',
        columns: [
          { name: 'property_id' },
          { name: 'owner' },
          { name: 'from_date' },
          { name: 'to_date' },
        ],
        parameters: [],
        dataProductPath: 'ai_training::PROPERTY_VALUATION_SHARE',
      },
    ];
    const result = sanitizeJoinSameKeyColumns(sql, services);
    expect(result).toContain(
      '"property_id" AS "oh_property_id", "owner", "from_date", "to_date"',
    );
    expect(result).not.toContain('SELECT *');
    expect(result).toContain('oh."oh_property_id"');
    expect(result).toContain('pv."property_id"');
  });
});

describe(unitTest('ensurePureSafetyLimit'), () => {
  test('appends ->take(1000) to simple .all()->project() query', () => {
    const query = 'model::Holdings.all()->project(~[Name: {x | $x.name}])';
    const result = ensurePureSafetyLimit(query);
    expect(result).toBe(
      'model::Holdings.all()->project(~[Name: {x | $x.name}])->take(1000)',
    );
  });

  test('does not append when ->take() already present', () => {
    const query =
      'model::Holdings.all()->project(~[Name: {x | $x.name}])->take(10)';
    const result = ensurePureSafetyLimit(query);
    expect(result).toBe(query);
  });

  test('does not append to groupBy aggregation queries', () => {
    const query =
      'model::Order.all()->groupBy(~[Category: {x | $x.category}], ~[Count: agg(x | $x.id, y | $y->count())])';
    const result = ensurePureSafetyLimit(query);
    expect(result).toBe(query);
  });

  test('does not append to distinct() queries', () => {
    const query =
      'model::Product.all()->distinct()->project(~[Name: {x | $x.name}])';
    const result = ensurePureSafetyLimit(query);
    expect(result).toBe(query);
  });

  test('does not append to olapGroupBy queries', () => {
    const query =
      'model::Order.all()->olapGroupBy(~[Category: {x | $x.category}])';
    const result = ensurePureSafetyLimit(query);
    expect(result).toBe(query);
  });

  test('uses custom limit value', () => {
    const query = 'model::Holdings.all()->project(~[Name: {x | $x.name}])';
    const result = ensurePureSafetyLimit(query, 500);
    expect(result).toContain('->take(500)');
  });

  test('handles filter + project without limit', () => {
    const query =
      "model::Holdings.all()->filter({x | $x.country == 'US'})->project(~[Name: {x | $x.name}])";
    const result = ensurePureSafetyLimit(query);
    expect(result).toContain('->take(1000)');
  });

  test('handles sort + no limit', () => {
    const query =
      'model::Holdings.all()->project(~[Value: {x | $x.value}])->sort([descending(~Value)])';
    const result = ensurePureSafetyLimit(query);
    expect(result).toContain('->take(1000)');
  });

  test('normalizes ->limit(N) to ->take(N)', () => {
    const query =
      'model::Holdings.all()->project(~[Name: {x | $x.name}])->limit(10)';
    const result = ensurePureSafetyLimit(query);
    expect(result).toBe(
      'model::Holdings.all()->project(~[Name: {x | $x.name}])->take(10)',
    );
  });

  test('normalizes ->limit(N) and does not append extra ->take()', () => {
    const query =
      "model::Holdings.all()->filter({x | $x.ticker == 'VFINX'})->project(~[Name: {x | $x.name}])->limit(10)";
    const result = ensurePureSafetyLimit(query);
    expect(result).toBe(
      "model::Holdings.all()->filter({x | $x.ticker == 'VFINX'})->project(~[Name: {x | $x.name}])->take(10)",
    );
    expect(result).not.toContain('->limit(');
    expect(result).not.toContain('->take(1000)');
  });

  test('normalizes ->limit() with spaces', () => {
    const query =
      'model::Holdings.all()->project(~[Name: {x | $x.name}])->limit( 25 )';
    const result = ensurePureSafetyLimit(query);
    expect(result).toBe(
      'model::Holdings.all()->project(~[Name: {x | $x.name}])->take(25)',
    );
  });
});

// ─── hasNestedPCalls ──────────────────────────────────────────────────────────

describe(unitTest('hasNestedPCalls'), () => {
  test('returns false for simple p() in FROM', () => {
    const sql = `SELECT "col" FROM p('my::DataProduct.ap')`;
    expect(hasNestedPCalls(sql)).toBe(false);
  });

  test('returns false for p() in JOIN', () => {
    const sql = `SELECT a."x" FROM p('my::dp.a') AS a JOIN p('my::dp.b') AS b ON a."id" = b."id"`;
    expect(hasNestedPCalls(sql)).toBe(false);
  });

  test('detects p() in IN clause', () => {
    const sql = `SELECT * FROM p('my::dp.a') WHERE "L" IN (SELECT "L" FROM p('my::dp.a') GROUP BY "L" HAVING COUNT(*) > 5)`;
    expect(hasNestedPCalls(sql)).toBe(true);
  });

  test('detects p() in CROSS JOIN subquery', () => {
    const sql = `SELECT "col", cnt * 100.0 / total FROM p('my::dp.a') CROSS JOIN (SELECT COUNT(*) AS total FROM p('my::dp.a')) AS t`;
    expect(hasNestedPCalls(sql)).toBe(true);
  });

  test('detects p() in scalar subquery', () => {
    const sql = `SELECT "col", COUNT(*) * 100.0 / (SELECT COUNT(*) FROM p('my::dp.a')) AS pct FROM p('my::dp.a') GROUP BY "col"`;
    expect(hasNestedPCalls(sql)).toBe(true);
  });

  test('returns false for p() in JOIN subquery (allowed pattern)', () => {
    const sql = `SELECT a."x" FROM p('my::dp.a') AS a JOIN (SELECT "id" AS "b_id" FROM p('my::dp.b')) AS b ON a."id" = b."b_id"`;
    expect(hasNestedPCalls(sql)).toBe(false);
  });
});

// ─── detectUnsupportedEnginePattern ──────────────────────────────────────────

describe(unitTest('detectUnsupportedEnginePattern'), () => {
  test('returns undefined for a simple GROUP BY query', () => {
    const sql = `SELECT "col", COUNT(*) FROM p('my::dp.a') GROUP BY "col"`;
    expect(detectUnsupportedEnginePattern(sql)).toBeUndefined();
  });

  test('returns undefined for a window over a plain column (no nested aggregate)', () => {
    const sql = `SELECT "col", ROW_NUMBER() OVER (PARTITION BY "region" ORDER BY "cnt" DESC) AS rn FROM p('my::dp.a')`;
    expect(detectUnsupportedEnginePattern(sql)).toBeUndefined();
  });

  test('returns undefined for a window over a CTE-aggregated column (the recommended shape)', () => {
    const sql = `WITH grouped AS (SELECT "col", COUNT(*) AS cnt FROM p('my::dp.a') GROUP BY "col") SELECT "col", cnt, SUM(cnt) OVER () AS total FROM grouped`;
    expect(detectUnsupportedEnginePattern(sql)).toBeUndefined();
  });

  test('detects SUM(COUNT(*)) OVER () in the same SELECT', () => {
    const sql = `SELECT "col", COUNT(*) AS cnt, SUM(COUNT(*)) OVER () AS total FROM p('my::dp.a') GROUP BY "col"`;
    const result = detectUnsupportedEnginePattern(sql);
    expect(result?.kind).toBe('NESTED_AGGREGATE_IN_WINDOW');
    expect(result?.hint).toMatch(/CTE/);
  });

  test('detects AVG(SUM(x)) OVER (PARTITION BY y)', () => {
    const sql = `SELECT y, AVG(SUM("x")) OVER (PARTITION BY y) FROM p('my::dp.a') GROUP BY y`;
    const result = detectUnsupportedEnginePattern(sql);
    expect(result?.kind).toBe('NESTED_AGGREGATE_IN_WINDOW');
  });

  test('does not flag aggregate-of-aggregate without an OVER clause', () => {
    // Engine error for this is different; this detector targets the window combo.
    const sql = `SELECT SUM(COUNT(*)) FROM p('my::dp.a') GROUP BY "col"`;
    expect(detectUnsupportedEnginePattern(sql)).toBeUndefined();
  });

  test('detects CROSS JOIN LATERAL', () => {
    const sql = `SELECT r."region", top.x FROM (SELECT DISTINCT "region" FROM p('my::dp.a')) r CROSS JOIN LATERAL (SELECT "x" FROM p('my::dp.a') WHERE "region" = r."region" LIMIT 3) top`;
    const result = detectUnsupportedEnginePattern(sql);
    expect(result?.kind).toBe('LATERAL_SUBQUERY');
    expect(result?.hint).toMatch(/LATERAL/);
  });

  test('detects bare LATERAL (', () => {
    const sql = `SELECT * FROM p('my::dp.a'), LATERAL (SELECT 1)`;
    expect(detectUnsupportedEnginePattern(sql)?.kind).toBe('LATERAL_SUBQUERY');
  });

  test('detects INNER JOIN LATERAL', () => {
    const sql = `SELECT * FROM p('my::dp.a') a INNER JOIN LATERAL (SELECT 1) t ON true`;
    expect(detectUnsupportedEnginePattern(sql)?.kind).toBe('LATERAL_SUBQUERY');
  });

  test('flags nested-aggregate-in-window before LATERAL when both are present', () => {
    // Stable rule ordering — nested-aggregate is the more common shape, and
    // its hint is the more actionable rewrite, so it wins the priority.
    const sql = `SELECT SUM(COUNT(*)) OVER () FROM p('my::dp.a') CROSS JOIN LATERAL (SELECT 1) t`;
    expect(detectUnsupportedEnginePattern(sql)?.kind).toBe(
      'NESTED_AGGREGATE_IN_WINDOW',
    );
  });

  test('detects ROUND wrapping a window expression', () => {
    const sql = `SELECT col, ROUND(cnt * 100.0 / SUM(cnt) OVER (), 2) AS pct FROM grouped`;
    const result = detectUnsupportedEnginePattern(sql);
    expect(result?.kind).toBe('WINDOW_INSIDE_FUNCTION_CALL');
    expect(result?.hint).toMatch(/Materialize/);
  });

  test('detects CAST wrapping a window expression', () => {
    const sql = `SELECT CAST(SUM("x") OVER (PARTITION BY y) AS INTEGER) FROM p('my::dp.a')`;
    expect(detectUnsupportedEnginePattern(sql)?.kind).toBe(
      'WINDOW_INSIDE_FUNCTION_CALL',
    );
  });

  test('detects COALESCE wrapping a window expression', () => {
    const sql = `SELECT COALESCE(LAG("x") OVER (ORDER BY "y"), 0) FROM p('my::dp.a')`;
    expect(detectUnsupportedEnginePattern(sql)?.kind).toBe(
      'WINDOW_INSIDE_FUNCTION_CALL',
    );
  });

  test('does not flag ROUND on a plain column from a windowed subquery', () => {
    // This is the recommended 3-level shape: window materialised as `total`
    // in a middle SELECT, ROUND applied to plain columns in the outer SELECT.
    const sql = `SELECT col, ROUND(cnt * 100.0 / total, 2) AS pct FROM (SELECT col, cnt, SUM(cnt) OVER () AS total FROM (SELECT col, COUNT(*) AS cnt FROM p('my::dp.a') GROUP BY col) agg) windowed`;
    expect(detectUnsupportedEnginePattern(sql)).toBeUndefined();
  });

  test('does not flag a window function used standalone in arithmetic', () => {
    // Window in arithmetic (without a wrapping function call) is a separate
    // shape; the engine error message is different and out of scope for this
    // detector. We deliberately do not flag it.
    const sql = `SELECT col, cnt + SUM(cnt) OVER () FROM grouped`;
    expect(detectUnsupportedEnginePattern(sql)).toBeUndefined();
  });

  test('detects aggregate inside a window ORDER BY at the same level as GROUP BY', () => {
    const sql = `SELECT "GSREGION", "GSDIVISIONNAME", COUNT(*) AS cnt, ROW_NUMBER() OVER (PARTITION BY "GSREGION" ORDER BY COUNT(*) DESC) AS rn FROM p('my::dp.a') GROUP BY "GSREGION", "GSDIVISIONNAME"`;
    const result = detectUnsupportedEnginePattern(sql);
    expect(result?.kind).toBe('AGGREGATE_IN_WINDOW_ARGS');
    expect(result?.hint).toMatch(/Materialize/);
  });

  test('detects aggregate inside a window PARTITION BY', () => {
    const sql = `SELECT col, ROW_NUMBER() OVER (PARTITION BY SUM(x) ORDER BY col) FROM p('my::dp.a') GROUP BY col`;
    expect(detectUnsupportedEnginePattern(sql)?.kind).toBe(
      'AGGREGATE_IN_WINDOW_ARGS',
    );
  });

  test('does not flag a plain column reference inside OVER', () => {
    // Recommended shape: aggregate is materialised as `cnt` in a CTE, the
    // window references the plain column — this is the rewrite we coach to.
    const sql = `SELECT col, cnt, ROW_NUMBER() OVER (ORDER BY cnt DESC) AS rn FROM (SELECT col, COUNT(*) AS cnt FROM p('my::dp.a') GROUP BY col) agg`;
    expect(detectUnsupportedEnginePattern(sql)).toBeUndefined();
  });

  test('does not flag an aggregate that is the window function itself', () => {
    // `SUM(x) OVER (PARTITION BY y)` — the agg is BEFORE the OVER parens,
    // not inside them. Engine supports this.
    const sql = `SELECT SUM(x) OVER (PARTITION BY y) FROM p('my::dp.a')`;
    expect(detectUnsupportedEnginePattern(sql)).toBeUndefined();
  });
});

// ─── levenshteinDistance ─────────────────────────────────────────────────────

describe(unitTest('levenshteinDistance'), () => {
  test('identical strings have distance 0', () => {
    expect(levenshteinDistance('government', 'government')).toBe(0);
  });

  test('single insertion', () => {
    expect(levenshteinDistance('goverment', 'government')).toBe(1);
  });

  test('single substitution', () => {
    expect(levenshteinDistance('governmant', 'government')).toBe(1);
  });

  test('double error — transposition-like', () => {
    expect(levenshteinDistance('governement', 'government')).toBe(1);
  });

  test('completely different strings', () => {
    expect(levenshteinDistance('abc', 'xyz')).toBe(3);
  });

  test('empty strings', () => {
    expect(levenshteinDistance('', '')).toBe(0);
    expect(levenshteinDistance('abc', '')).toBe(3);
    expect(levenshteinDistance('', 'abc')).toBe(3);
  });
});

// ─── isFuzzyMatch ────────────────────────────────────────────────────────────

describe(unitTest('isFuzzyMatch'), () => {
  test('exact match returns true', () => {
    expect(isFuzzyMatch('government', 'government')).toBe(true);
  });

  test('typo within edit distance 2 returns true', () => {
    expect(isFuzzyMatch('governement', 'government')).toBe(true);
  });

  test('missing letter within distance 1 returns true', () => {
    expect(isFuzzyMatch('goverment', 'government')).toBe(true);
  });

  test('too many edits returns false', () => {
    expect(isFuzzyMatch('govnmnt', 'government')).toBe(false);
  });

  test('length difference > 2 returns false immediately', () => {
    expect(isFuzzyMatch('gov', 'government')).toBe(false);
  });

  test('short tokens (≤ 4 chars) use stricter distance 1', () => {
    // "taxe" vs "taxi" = distance 1 → true (within max 1 for short tokens)
    expect(isFuzzyMatch('taxe', 'taxi')).toBe(true);
    // "tazz" vs "taxi" = distance 2, but short tokens only allow 1 → false
    expect(isFuzzyMatch('tazz', 'taxi')).toBe(false);
  });
});

// ─── splitIdentifierTokens ───────────────────────────────────────────────────

describe(unitTest('splitIdentifierTokens'), () => {
  test('splits camelCase', () => {
    expect(splitIdentifierTokens('taxIDTypeCD')).toEqual([
      'tax',
      'id',
      'type',
      'cd',
    ]);
  });

  test('splits PascalCase', () => {
    expect(splitIdentifierTokens('GovernmentIDInfo')).toEqual([
      'government',
      'id',
      'info',
    ]);
  });

  test('splits snake_case', () => {
    expect(splitIdentifierTokens('FISCAL_YEAR_START')).toEqual([
      'fiscal',
      'year',
      'start',
    ]);
  });

  test('filters out single-char tokens', () => {
    // "aB" splits to ["a", "b"] which are both 1-char → filtered out
    expect(splitIdentifierTokens('aB')).toEqual([]);
  });

  test('handles mixed delimiters', () => {
    expect(splitIdentifierTokens('entity-name.value')).toEqual([
      'entity',
      'name',
      'value',
    ]);
  });
});

// ─── preFilterServicesByRelevance — affinity & penalty ───────────────────────

describe(
  unitTest('preFilterServicesByRelevance — affinity and penalty'),
  () => {
    function makeSvc(
      title: string,
      columns: string[],
      description?: string,
    ): TDSServiceSchema {
      return {
        title,
        pattern: `/${title.toLowerCase()}`,
        columns: columns.map((name) => ({ name })),
        parameters: [],
        ...(description !== undefined ? { description } : {}),
      };
    }

    test('domain-specific AP ranks higher than combined table', () => {
      const svcs = [
        makeSvc('ENT_EntityCombined', [
          'entityID',
          'natnlIdTypeCD',
          'taxCntryCD',
        ]),
        makeSvc('GovernmentIDInfo', ['entityID', 'natnlIdTypeCD', 'govtIDTXT']),
      ];
      const result = preFilterServicesByRelevance(
        'count entities with invalid government identifier',
        svcs,
        2,
      );
      expect(result[0]?.title).toBe('GovernmentIDInfo');
    });

    test('fuzzy matching handles typos in question', () => {
      const svcs = [
        makeSvc('StateTaxID', ['entityID', 'taxID']),
        makeSvc('GovernmentIDInfo', ['entityID', 'govtIDTypeCD']),
      ];
      // "governement" is a typo for "government"
      const result = preFilterServicesByRelevance(
        'show governement identifier data',
        svcs,
        2,
      );
      expect(result[0]?.title).toBe('GovernmentIDInfo');
    });

    test('specificity penalty demotes combined tables', () => {
      const svcs = [
        makeSvc('ENT_EntityCombined', ['col1', 'col2']),
        makeSvc('ENT_Entity', ['col1', 'col2']),
      ];
      const result = preFilterServicesByRelevance('show entity data', svcs, 2);
      expect(result[0]?.title).toBe('ENT_Entity');
    });
  },
);

// ─── preFilterServicesByRelevance — BM25 properties ──────────────────────────

describe(unitTest('preFilterServicesByRelevance — BM25 properties'), () => {
  function makeSvc(
    title: string,
    columns: string[],
    description?: string,
  ): TDSServiceSchema {
    return {
      title,
      pattern: `/${title.toLowerCase()}`,
      columns: columns.map((name) => ({ name })),
      parameters: [],
      ...(description !== undefined ? { description } : {}),
    };
  }

  // BM25's IDF makes a term that appears in only one document worth
  // dramatically more than a term that appears everywhere. The AP
  // uniquely containing the rare term should win even though it's
  // outranked on shared-vocabulary count.
  test('rare-term IDF outweighs broad-term frequency', () => {
    const svcs = [
      makeSvc(
        'BroadCommonOne',
        ['common', 'common', 'common'],
        'common data data data data',
      ),
      makeSvc(
        'BroadCommonTwo',
        ['common', 'common', 'common'],
        'common data data data data',
      ),
      makeSvc('NicheTransactionRecord', ['transaction'], 'transaction data'),
    ];
    const result = preFilterServicesByRelevance(
      'show me data with transaction',
      svcs,
      1,
    );
    expect(result[0]?.title).toBe('NicheTransactionRecord');
  });

  // Tied IDF + tied term frequency → BM25 length normalization breaks
  // the tie by favouring the shorter (more focused) document.
  test('length normalization favours the focused document', () => {
    const svcs = [
      makeSvc('OrderFocused', ['order']),
      makeSvc('OrderVerbose', [
        'order',
        'extra',
        'detail',
        'audit',
        'noise',
        'context',
      ]),
    ];
    const result = preFilterServicesByRelevance('order data', svcs, 2);
    expect(result[0]?.title).toBe('OrderFocused');
  });

  // BM25 has no native typo tolerance — we layer Levenshtein recall on
  // top so misspellings still hit the right document.
  test('typo in query is rewritten to the closest indexed term', () => {
    const svcs = [
      makeSvc('Pricing', ['unrelated']),
      makeSvc('GovernmentRegistry', ['agency', 'jurisdiction']),
    ];
    const result = preFilterServicesByRelevance(
      'show governement records',
      svcs,
      2,
    );
    expect(result[0]?.title).toBe('GovernmentRegistry');
  });
});

// ─── supplementMissingCoverage ───────────────────────────────────────────────

describe(unitTest('supplementMissingCoverage'), () => {
  function makeSvc(title: string, columns: string[]): TDSServiceSchema {
    return {
      title,
      pattern: `/${title.toLowerCase()}`,
      columns: columns.map((name) => ({ name })),
      parameters: [],
    };
  }

  test('returns selected as-is when all concepts are covered', () => {
    const selected = [makeSvc('GovernmentIDInfo', ['govtIDTXT', 'entityID'])];
    const all = [...selected, makeSvc('Other', ['otherCol'])];
    const result = supplementMissingCoverage(
      'show government identifier',
      selected,
      all,
    );
    expect(result).toHaveLength(1);
  });

  test('supplements when question concept is missing from selection', () => {
    const selected = [makeSvc('GovernmentIDInfo', ['govtIDTXT'])];
    const all = [
      ...selected,
      makeSvc('TaxIdToCountryMapping', ['cntryIsoCD', 'natnlIdTypeCD']),
    ];
    const result = supplementMissingCoverage(
      'invalid country mapping for government ID',
      selected,
      all,
    );
    expect(result).toHaveLength(2);
    expect(result[1]?.title).toBe('TaxIdToCountryMapping');
  });

  test('prefers focused AP over combined when supplementing', () => {
    const selected = [makeSvc('GovernmentIDInfo', ['govtIDTXT'])];
    const all = [
      ...selected,
      makeSvc('ENT_Entity', ['entityName', 'entityID']),
      makeSvc('ENT_EntityCombined', ['entityName', 'entityID', 'extra']),
    ];
    // Question has "entity" + "name" which are uncovered by GovernmentIDInfo.
    // Both ENT_Entity and ENT_EntityCombined cover those tokens, but
    // ENT_Entity should be preferred due to the specificity tie-breaker.
    const result = supplementMissingCoverage(
      'show entity name for government identifier',
      selected,
      all,
      3, // allow up to 3 so we can see ordering
    );
    expect(result.length).toBeGreaterThanOrEqual(2);
    // The first supplement should be ENT_Entity (non-generic) over ENT_EntityCombined
    expect(result[1]?.title).toBe('ENT_Entity');
  });

  test('does not exceed maxTotal', () => {
    const selected = [makeSvc('A', ['x'])];
    const all = [
      ...selected,
      makeSvc('B', ['country']),
      makeSvc('C', ['mapping']),
      makeSvc('D', ['identifier']),
      makeSvc('E', ['entity']),
    ];
    const result = supplementMissingCoverage(
      'show country mapping identifier entity data',
      selected,
      all,
      2, // maxTotal
    );
    expect(result).toHaveLength(2);
  });

  test('fuzzy matching treats typos as covered', () => {
    const selected = [makeSvc('GovernmentIDInfo', ['govtIDTXT', 'entityID'])];
    const all = [...selected, makeSvc('Other', ['otherCol'])];
    // "governement" (typo) should fuzzy-match "government" from title
    const result = supplementMissingCoverage(
      'show governement data',
      selected,
      all,
    );
    expect(result).toHaveLength(1);
  });
});

// ─── applyMultiTurnBias ──────────────────────────────────────────────────────

describe(unitTest('applyMultiTurnBias'), () => {
  function makeSvc(title: string, pattern: string): TDSServiceSchema {
    return {
      title,
      pattern,
      columns: [{ name: 'col1' }],
      parameters: [],
    };
  }

  test('returns services unchanged when no history', () => {
    const services = [makeSvc('A', '/a'), makeSvc('B', '/b')];
    const result = applyMultiTurnBias(services, []);
    expect(result.map((s) => s.title)).toEqual(['A', 'B']);
  });

  test('biases previously-used APs to the front', () => {
    const services = [
      makeSvc('Alpha', '/alpha'),
      makeSvc('Beta', '/beta'),
      makeSvc('Gamma', '/gamma'),
    ];
    const history = [
      {
        question: 'previous query',
        sql: "SELECT * FROM p('com::dp.Beta') LIMIT 10",
        intent: LegendAIQuestionIntent.DATA_QUERY,
      },
    ];
    const result = applyMultiTurnBias(services, history);
    // Beta should come first because it was used in previous turn
    expect(result[0]?.title).toBe('Beta');
  });

  test('handles multiple APs from previous turns', () => {
    const services = [
      makeSvc('A', '/a'),
      makeSvc('B', '/b'),
      makeSvc('C', '/c'),
    ];
    const history = [
      {
        question: 'q1',
        sql: "SELECT a.x FROM p('dp.A') AS a JOIN p('dp.C') AS c ON a.id = c.id",
        intent: LegendAIQuestionIntent.DATA_QUERY,
      },
    ];
    const result = applyMultiTurnBias(services, history);
    // A and C were used, should be first (in some order), B last
    expect(result[2]?.title).toBe('B');
  });
});

// ─── categorizeExecutionError ─────────────────────────────────────────────────

describe(unitTest('categorizeExecutionError'), () => {
  test('classifies SQL compilation error as SQL_FIXABLE', () => {
    expect(
      categorizeExecutionError(
        'SnowflakeSQLException: SQL compilation error: invalid identifier "col"',
      ),
    ).toBe(ExecutionErrorCategory.SQL_FIXABLE);
  });

  test('classifies __LAKE_ACTION as INFRASTRUCTURE', () => {
    expect(
      categorizeExecutionError(
        'invalid identifier "governmentidinfo_6".__LAKE_ACTION',
      ),
    ).toBe(ExecutionErrorCategory.INFRASTRUCTURE);
  });

  test('classifies access denied as ACCESS', () => {
    expect(categorizeExecutionError('Insufficient privileges')).toBe(
      ExecutionErrorCategory.ACCESS,
    );
  });

  test('classifies ambiguous column as SQL_FIXABLE', () => {
    expect(categorizeExecutionError('ambiguous column name "entityID"')).toBe(
      ExecutionErrorCategory.SQL_FIXABLE,
    );
  });

  test('classifies unknown errors as NONE', () => {
    expect(categorizeExecutionError('Network timeout')).toBe(
      ExecutionErrorCategory.NONE,
    );
  });

  test('prefers structured LegendAIServiceError PERMISSION over message text', () => {
    const err = new LegendAIServiceError(
      'Something the engine wrote that does not match any pattern',
      LegendAIErrorType.PERMISSION,
    );
    expect(categorizeExecutionError(err.message, err)).toBe(
      ExecutionErrorCategory.ACCESS,
    );
  });

  test('falls back to pattern table when structured error is non-permission', () => {
    const err = new LegendAIServiceError(
      'SnowflakeSQLException: SQL compilation error',
      LegendAIErrorType.EXECUTION,
    );
    expect(categorizeExecutionError(err.message, err)).toBe(
      ExecutionErrorCategory.SQL_FIXABLE,
    );
  });

  test('routes LegendAIUnsupportedEngineShapeError to SQL_FIXABLE so the retry loop fires', () => {
    // Regression guard: the pre-execution guard's hint text is prose and
    // intentionally does not match any pattern in EXECUTION_ERROR_RULES.
    // The subclass check is what makes the retry path engage — without it
    // the user would see the hint surfaced verbatim instead of an LLM
    // rewrite of the failing query.
    const err = new LegendAIUnsupportedEngineShapeError(
      "The engine's SQL→Pure translator cannot combine an aggregate function with a window function in the same SELECT.",
    );
    expect(categorizeExecutionError(err.message, err)).toBe(
      ExecutionErrorCategory.SQL_FIXABLE,
    );
  });
});

describe(unitTest('classifyResponseOutcome'), () => {
  test('undefined message is a no-answer', () => {
    expect(classifyResponseOutcome(undefined)).toBe(
      LegendAIResponseOutcome.NO_ANSWER,
    );
  });

  test('an error message is an error, even with content', () => {
    expect(
      classifyResponseOutcome(
        TEST__makeAssistantMessage({ error: 'boom', sql: 'select 1' }),
      ),
    ).toBe(LegendAIResponseOutcome.ERROR);
  });

  test('a fallback action is a no-answer even when a sorry text is set', () => {
    expect(
      classifyResponseOutcome(
        TEST__makeAssistantMessage({
          textAnswer: "Sorry — I couldn't find an answer.",
          fallbackAction: {
            label: 'Try the orchestrator',
            actionId: 'retry',
          },
        }),
      ),
    ).toBe(LegendAIResponseOutcome.NO_ANSWER);
  });

  test('a SQL / text / grid answer is answered', () => {
    expect(
      classifyResponseOutcome(
        TEST__makeAssistantMessage({ sql: 'select * from t' }),
      ),
    ).toBe(LegendAIResponseOutcome.ANSWERED);
    expect(
      classifyResponseOutcome(TEST__makeAssistantMessage({ textAnswer: 'Hi' })),
    ).toBe(LegendAIResponseOutcome.ANSWERED);
    expect(
      classifyResponseOutcome(
        TEST__makeAssistantMessage({
          gridData: { columnDefs: [], rowData: [] },
        }),
      ),
    ).toBe(LegendAIResponseOutcome.ANSWERED);
  });

  test('an empty (still-processing) message is a no-answer', () => {
    expect(classifyResponseOutcome(TEST__makeAssistantMessage())).toBe(
      LegendAIResponseOutcome.NO_ANSWER,
    );
  });
});

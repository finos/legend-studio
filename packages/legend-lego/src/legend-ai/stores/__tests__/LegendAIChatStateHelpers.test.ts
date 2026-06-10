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
  buildGenerationFailureMessage,
  buildExecutionErrorMessage,
  updateLastAssistant,
  addThinkingStep,
  completeThinkingSteps,
  finishWithThinkingError,
  classifyError,
  sanitizeJoinOrderBy,
  sanitizeLiteralColumns,
  stripGuessedNonDateServiceParams,
  ensureDateParameters,
  detectMissingServiceParams,
  buildMissingParamsWarning,
  preFilterServicesByRelevance,
  ensureSafeLimit,
} from '../LegendAIChatProcessors.js';
import {
  type LegendAIMessage,
  type LegendAIAssistantMessage,
  type TDSServiceSchema,
  LegendAIMessageRole,
  LegendAIQuestionIntent,
  LegendAIThinkingStepStatus,
  LegendAIErrorType,
  LegendAIServiceError,
} from '../../LegendAITypes.js';
import {
  TEST__createMockSetter,
  TEST__makeAssistantMessage,
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

  test('skips pairs without sql or textAnswer', () => {
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
      },
    ];
    expect(buildConversationHistory(messages)).toEqual([]);
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
    expect((msgs[1] as LegendAIAssistantMessage).sql).toBe('SELECT 1');
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
    const msg = getMessages()[0] as LegendAIAssistantMessage;
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
    const msg = getMessages()[0] as LegendAIAssistantMessage;
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
    const msg = getMessages()[0] as LegendAIAssistantMessage;
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
    const msg = getMessages()[0] as LegendAIAssistantMessage;
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
    const msg = getMessages()[0] as LegendAIAssistantMessage;
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
    const msg = getMessages()[0] as LegendAIAssistantMessage;
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
    const msg = getMessages()[0] as LegendAIAssistantMessage;
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
    const msg = getMessages()[0] as LegendAIAssistantMessage;
    expect(msg.error?.length).toBeLessThanOrEqual(500);
  });

  test('sets thinkingDuration based on startTime', () => {
    const { setter, getMessages } = TEST__createMockSetter();
    setter([TEST__makeAssistantMessage()]);
    const fakeStartTime = Date.now() - 5000;
    finishWithThinkingError(setter, 'err', fakeStartTime);
    const msg = getMessages()[0] as LegendAIAssistantMessage;
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
    const msg = getMessages()[0] as LegendAIAssistantMessage;
    expect(msg.errorType).toBe(LegendAIErrorType.PERMISSION);
  });

  test('sets errorType to null when not provided', () => {
    const { setter, getMessages } = TEST__createMockSetter();
    setter([TEST__makeAssistantMessage()]);
    finishWithThinkingError(setter, 'generic error', Date.now());
    const msg = getMessages()[0] as LegendAIAssistantMessage;
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

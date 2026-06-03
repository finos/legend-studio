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
} from '../LegendAIChatState.js';
import {
  type LegendAIMessage,
  type LegendAIAssistantMessage,
  type TDSServiceSchema,
  LegendAIMessageRole,
  LegendAIQuestionIntent,
  LegendAIThinkingStepStatus,
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
        gridData: null,
        error: null,
        sqlGenTime: null,
        execTime: null,
        thinkingDuration: null,
        isProcessing: false,
        isExecuting: false,
        suggestedQueries: [],
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
        gridData: null,
        error: null,
        sqlGenTime: null,
        execTime: null,
        thinkingDuration: null,
        isProcessing: false,
        isExecuting: false,
        suggestedQueries: [],
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
        gridData: null,
        error: 'Something failed',
        sqlGenTime: null,
        execTime: null,
        thinkingDuration: null,
        isProcessing: false,
        isExecuting: false,
        suggestedQueries: [],
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
        gridData: null,
        error: null,
        sqlGenTime: null,
        execTime: null,
        thinkingDuration: null,
        isProcessing: false,
        isExecuting: false,
        suggestedQueries: [],
      },
      { id: 'u2', role: LegendAIMessageRole.USER, text: 'q2' },
      {
        id: 'a2',
        role: LegendAIMessageRole.ASSISTANT,
        thinkingSteps: [],
        sql: null,
        textAnswer: 'answer2',
        gridData: null,
        error: null,
        sqlGenTime: null,
        execTime: null,
        thinkingDuration: null,
        isProcessing: false,
        isExecuting: false,
        suggestedQueries: [],
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
        gridData: null,
        error: null,
        sqlGenTime: null,
        execTime: null,
        thinkingDuration: null,
        isProcessing: false,
        isExecuting: false,
        suggestedQueries: [],
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
        gridData: null,
        error: null,
        sqlGenTime: null,
        execTime: null,
        thinkingDuration: null,
        isProcessing: false,
        isExecuting: false,
        suggestedQueries: [],
      },
      { id: 'u1', role: LegendAIMessageRole.USER, text: 'q' },
    ];
    // First msg is assistant (not user), so it skips i=0, then user at i=1
    // has no pair after it, so nothing extracted
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
    expect(msg.thinkingSteps[0]).toEqual({
      label: 'Analyzing...',
      status: LegendAIThinkingStepStatus.ACTIVE,
    });
  });

  test('completes previous active step when adding new one', () => {
    const { setter, getMessages } = TEST__createMockSetter();
    setter([
      TEST__makeAssistantMessage({
        thinkingSteps: [
          { label: 'Step 1', status: LegendAIThinkingStepStatus.ACTIVE },
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
          { label: 'Done step', status: LegendAIThinkingStepStatus.DONE },
          { label: 'Active step', status: LegendAIThinkingStepStatus.ACTIVE },
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
          { label: 'Active', status: LegendAIThinkingStepStatus.ACTIVE },
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
          { label: 'Done', status: LegendAIThinkingStepStatus.DONE },
          { label: 'Error', status: LegendAIThinkingStepStatus.ERROR },
          { label: 'Active', status: LegendAIThinkingStepStatus.ACTIVE },
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
          { label: 'Working', status: LegendAIThinkingStepStatus.ACTIVE },
        ],
      }),
    ]);
    const fakeStartTime = Date.now() - 2000;
    finishWithThinkingError(setter, 'Something failed', fakeStartTime);
    const msg = getMessages()[0] as LegendAIAssistantMessage;
    expect(msg.thinkingSteps[0]?.status).toBe(LegendAIThinkingStepStatus.ERROR);
    expect(msg.error).toBe('Something failed');
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
});

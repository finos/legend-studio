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

import { describe, expect, test } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { LegendAIThinkingStepStatus } from '../../LegendAITypes.js';
import { A2AStreamTurn, parseA2AStreamEvent } from '../A2AStreamTurn.js';

const thoughtPart = (
  text: string,
  completed: boolean,
  marker = 'stream_thinking_data',
): string =>
  JSON.stringify({
    [marker]: { text, stage: text, completed },
    streaming: true,
  });

/** One SSE event's data: a status update whose message holds `texts`. */
const statusEvent = (texts: string[], role = 'agent'): string =>
  JSON.stringify({
    jsonrpc: '2.0',
    id: 'req-1',
    result: {
      kind: 'status-update',
      status: {
        state: 'working',
        message: { role, parts: texts.map((text) => ({ kind: 'text', text })) },
      },
    },
  });

describe(unitTest('parseA2AStreamEvent'), () => {
  test('a thinking step is a step, not answer text', () => {
    const update = parseA2AStreamEvent(
      statusEvent([thoughtPart('Reviewing the model', false)]),
      '',
    );

    expect(update.text).toBe('');
    expect(update.steps).toEqual([
      {
        id: 'Reviewing the model',
        label: 'Reviewing the model',
        status: LegendAIThinkingStepStatus.ACTIVE,
      },
    ]);
  });

  test('a step that failed is an error step', () => {
    const failed = JSON.stringify({
      stream_thinking_data: {
        stage: 'compile',
        text: 'Compiling',
        is_error: true,
      },
    });

    expect(parseA2AStreamEvent(statusEvent([failed]), '').steps[0]).toEqual({
      id: 'compile',
      label: 'Compiling',
      status: LegendAIThinkingStepStatus.ERROR,
    });
  });

  test('answer text is collected, wherever the event carries it', () => {
    const artifact = JSON.stringify({
      result: {
        kind: 'artifact-update',
        artifact: { parts: [{ kind: 'text', text: 'From an artifact.' }] },
      },
    });

    expect(parseA2AStreamEvent(statusEvent(['Run opened.']), '').text).toBe(
      'Run opened.',
    );
    expect(parseA2AStreamEvent(artifact, '').text).toBe('From an artifact.');
  });

  test("the user's echoed message is not part of the answer", () => {
    expect(
      parseA2AStreamEvent(statusEvent(['review this'], 'user'), '').text,
    ).toBe('');
  });

  test('an ignored envelope is dropped, not shown as JSON', () => {
    const widget = JSON.stringify({ a2ui_response: { parts: [] } });

    expect(parseA2AStreamEvent(statusEvent([widget]), '').text).toBe('');
  });

  test("an agent's own markers are honoured", () => {
    const update = parseA2AStreamEvent(
      statusEvent([thoughtPart('Thinking', false, 'thought'), '{"card":{}}']),
      '',
      { thought: 'thought', ignored: ['card'] },
    );

    expect(update.steps.map((step) => step.label)).toEqual(['Thinking']);
    expect(update.text).toBe('');
  });

  test('a final event restating the answer adds nothing', () => {
    expect(
      parseA2AStreamEvent(statusEvent(['All done.']), 'All done.').text,
    ).toBe('');
  });

  test('a JSON-RPC error is reported', () => {
    expect(
      parseA2AStreamEvent(
        JSON.stringify({ error: { message: 'Unauthorized' } }),
        '',
      ).error,
    ).toBe('Unauthorized');
  });

  test('an unreadable event changes nothing', () => {
    expect(parseA2AStreamEvent('not json', '')).toEqual({
      steps: [],
      text: '',
      error: undefined,
    });
  });
});

describe(unitTest('A2AStreamTurn'), () => {
  test('the answer accumulates across events', () => {
    const turn = new A2AStreamTurn();

    turn.add(statusEvent(['First.']));
    turn.add(statusEvent(['Second.']));
    turn.add(statusEvent(['Second.']));

    expect(turn.answer).toBe('First.\nSecond.');
  });

  test('a step is timed from its first event to the one that ends it', () => {
    let now = 1000;
    const turn = new A2AStreamTurn(undefined, () => now);

    turn.add(statusEvent([thoughtPart('Reviewing', false)]));
    now = 4000;
    turn.add(statusEvent([thoughtPart('Reviewing', false)]));
    now = 9000;
    turn.add(statusEvent([thoughtPart('Reviewing', true)]));
    now = 12000;
    turn.add(statusEvent([thoughtPart('Reviewing', true)]));

    expect(turn.steps).toEqual([
      expect.objectContaining({
        status: LegendAIThinkingStepStatus.DONE,
        startedAt: 1000,
        endedAt: 9000,
      }),
    ]);
  });

  test('a step that arrives already ended takes no time', () => {
    let now = 1000;
    const turn = new A2AStreamTurn(undefined, () => now++);

    turn.add(statusEvent([thoughtPart('Compiling', true)]));

    expect(turn.steps[0]?.startedAt).toBe(turn.steps[0]?.endedAt);
  });

  test('a step still under way has no end yet', () => {
    const turn = new A2AStreamTurn(undefined, () => 5000);

    turn.add(statusEvent([thoughtPart('Profiling', false)]));

    expect(turn.steps[0]?.endedAt).toBeUndefined();
  });

  test("the agent's error is thrown", () => {
    expect(() =>
      new A2AStreamTurn().add(JSON.stringify({ error: { message: 'Boom' } })),
    ).toThrow('Boom');
  });
});

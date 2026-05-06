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

import { describe, test, expect, afterEach } from '@jest/globals';
import { renderHook, act, cleanup } from '@testing-library/react';
import { unitTest } from '@finos/legend-shared/test';
import { useLegendAIChatState } from '../LegendAIChatState.js';
import {
  type LegendAIChatState,
  LegendAIMessageRole,
} from '../../LegendAITypes.js';
import {
  TEST__createMockLegendAIPlugin,
  TEST_DATA__legendAIConfig,
  TEST_DATA__legendAIMetadata,
  TEST_DATA__legendAIServices,
} from '../../__test-utils__/LegendAITestUtils.js';

afterEach(cleanup);

const defaultPlugin = TEST__createMockLegendAIPlugin();

function renderChatHook(): {
  result: { current: LegendAIChatState };
} {
  return renderHook(() =>
    useLegendAIChatState(
      TEST_DATA__legendAIServices,
      'com.test:prod:1.0.0',
      TEST_DATA__legendAIConfig,
      TEST_DATA__legendAIMetadata,
      defaultPlugin,
    ),
  );
}

describe(unitTest('useLegendAIChatState'), () => {
  test('initializes with default values', () => {
    const { result } = renderChatHook();
    expect(result.current.questionText).toBe('');
    expect(result.current.isSending).toBe(false);
    expect(result.current.messages).toEqual([]);
    expect(result.current.expandedThinking.size).toBe(0);
    expect(result.current.conversationRef.current).toBeNull();
  });

  test('setQuestionText updates questionText', () => {
    const { result } = renderChatHook();
    act(() => {
      result.current.setQuestionText('show me trades');
    });
    expect(result.current.questionText).toBe('show me trades');
  });

  test('toggleThinking adds and removes indices', () => {
    const { result } = renderChatHook();
    act(() => {
      result.current.toggleThinking(2);
    });
    expect(result.current.expandedThinking.has(2)).toBe(true);

    act(() => {
      result.current.toggleThinking(2);
    });
    expect(result.current.expandedThinking.has(2)).toBe(false);
  });

  test('clearChat resets all state', () => {
    const { result } = renderChatHook();
    // Set some state first
    act(() => {
      result.current.setQuestionText('hello');
      result.current.toggleThinking(1);
    });
    expect(result.current.questionText).toBe('hello');

    act(() => {
      result.current.clearChat();
    });
    expect(result.current.questionText).toBe('');
    expect(result.current.messages).toEqual([]);
    expect(result.current.expandedThinking.size).toBe(0);
    expect(result.current.isSending).toBe(false);
  });

  test('askQuestion does nothing when question is empty', () => {
    const { result } = renderChatHook();
    act(() => {
      result.current.askQuestion();
    });
    expect(result.current.messages).toEqual([]);
    expect(result.current.isSending).toBe(false);
  });

  test('askQuestion does nothing when only whitespace', () => {
    const { result } = renderChatHook();
    act(() => {
      result.current.setQuestionText('   ');
    });
    act(() => {
      result.current.askQuestion();
    });
    expect(result.current.messages).toEqual([]);
    expect(result.current.isSending).toBe(false);
  });

  test('askQuestion appends user and assistant messages', () => {
    const { result } = renderChatHook();
    act(() => {
      result.current.setQuestionText('show top 10 trades');
    });
    act(() => {
      result.current.askQuestion();
    });
    // After askQuestion: isSending should be true, messages should have user + assistant
    expect(result.current.isSending).toBe(true);
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]?.role).toBe(LegendAIMessageRole.USER);
    expect(result.current.messages[1]?.role).toBe(
      LegendAIMessageRole.ASSISTANT,
    );
    // Question text should be cleared
    expect(result.current.questionText).toBe('');
  });

  test('askQuestion does not send when already sending', () => {
    const { result } = renderChatHook();
    act(() => {
      result.current.setQuestionText('query 1');
    });
    act(() => {
      result.current.askQuestion();
    });
    expect(result.current.messages).toHaveLength(2);

    // Try to send again while still sending
    act(() => {
      result.current.setQuestionText('query 2');
    });
    act(() => {
      result.current.askQuestion();
    });
    // Should still only have the first 2 messages
    expect(result.current.messages).toHaveLength(2);
  });
});

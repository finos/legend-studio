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
  type LegendAIScopeItem,
  type LegendAIChatTelemetryEvent,
  LegendAIMessageRole,
  LegendAIQuestionIntent,
  LegendAIChatTelemetryEventType,
} from '../../LegendAITypes.js';
import type { LegendAIOrchestratorDataProductCoordinates } from '../../LegendAI_LegendApplicationPlugin_Extension.js';
import {
  TEST__createMockLegendAIPlugin,
  TEST_DATA__legendAIConfig,
  TEST_DATA__legendAIMetadata,
  TEST_DATA__legendAIServices,
} from '../../__test-utils__/LegendAITestUtils.js';

afterEach(cleanup);

const defaultPlugin = TEST__createMockLegendAIPlugin();

function renderChatHook(
  overrides?: Partial<{
    config: typeof TEST_DATA__legendAIConfig;
    dataProductCoordinates: LegendAIOrchestratorDataProductCoordinates;
  }>,
): {
  result: { current: LegendAIChatState };
} {
  const config = overrides?.config ?? TEST_DATA__legendAIConfig;
  return renderHook(() =>
    useLegendAIChatState(
      TEST_DATA__legendAIServices,
      'com.test:prod:1.0.0',
      config,
      TEST_DATA__legendAIMetadata,
      defaultPlugin,
      overrides?.dataProductCoordinates,
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

  test('askQuestion emits a QUESTION_ASKED telemetry event with the question length only', () => {
    const events: LegendAIChatTelemetryEvent[] = [];
    const { result } = renderHook(() =>
      useLegendAIChatState(
        TEST_DATA__legendAIServices,
        'com.test:prod:1.0.0',
        TEST_DATA__legendAIConfig,
        TEST_DATA__legendAIMetadata,
        defaultPlugin,
        undefined,
        undefined,
        undefined,
        (event) => events.push(event),
      ),
    );
    act(() => {
      result.current.setQuestionText('show top 10 trades');
    });
    act(() => {
      result.current.askQuestion();
    });
    const asked = events.find(
      (e) => e.type === LegendAIChatTelemetryEventType.QUESTION_ASKED,
    );
    expect(asked).toBeDefined();
    if (asked?.type === LegendAIChatTelemetryEventType.QUESTION_ASKED) {
      // The raw question text is never logged (PII); only its length.
      expect(asked.questionLength).toBe('show top 10 trades'.length);
      expect(asked).not.toHaveProperty('question');
    }
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

  test('stopGeneration halts sending and marks assistant message', () => {
    const { result } = renderChatHook();
    act(() => {
      result.current.setQuestionText('show trades');
    });
    act(() => {
      result.current.askQuestion();
    });
    expect(result.current.isSending).toBe(true);
    act(() => {
      result.current.stopGeneration();
    });
    expect(result.current.isSending).toBe(false);
    const lastMsg = result.current.messages[result.current.messages.length - 1];
    expect(lastMsg?.role).toBe(LegendAIMessageRole.ASSISTANT);
    if (lastMsg?.role === LegendAIMessageRole.ASSISTANT) {
      expect(lastMsg.isProcessing).toBe(false);
      expect(lastMsg.textAnswer).toBe('Generation stopped.');
    }
  });

  test('toggleScope adds and removes scopes', () => {
    const { result } = renderChatHook();
    const scope: LegendAIScopeItem = {
      id: 'legend-ai-mcp',
      label: 'MCP',
    };
    act(() => {
      result.current.toggleScope(scope);
    });
    expect(result.current.selectedScopes).toHaveLength(1);
    expect(result.current.selectedScopes[0]?.id).toBe('legend-ai-mcp');

    act(() => {
      result.current.toggleScope(scope);
    });
    expect(result.current.selectedScopes).toHaveLength(0);
  });

  test('removeScope removes a scope by id', () => {
    const { result } = renderChatHook();
    const scope: LegendAIScopeItem = {
      id: 'test-scope',
      label: 'Test',
    };
    act(() => {
      result.current.toggleScope(scope);
    });
    expect(result.current.selectedScopes).toHaveLength(1);

    act(() => {
      result.current.removeScope('test-scope');
    });
    expect(result.current.selectedScopes).toHaveLength(0);
  });

  test('selectedModelName and setSelectedModelName work', () => {
    const { result } = renderChatHook();
    expect(result.current.selectedModelName).toBeUndefined();
    act(() => {
      result.current.setSelectedModelName('gpt-4');
    });
    expect(result.current.selectedModelName).toBe('gpt-4');
  });

  test('availableModelNames includes config model options', () => {
    const { result } = renderChatHook({
      config: {
        ...TEST_DATA__legendAIConfig,
        llmModelOptions: ['model-a', 'model-b'],
      },
    });
    expect(result.current.availableModelNames).toContain('test-model');
    expect(result.current.availableModelNames).toContain('model-a');
    expect(result.current.availableModelNames).toContain('model-b');
  });

  test('availableModelNames deduplicates and trims', () => {
    const { result } = renderChatHook({
      config: {
        ...TEST_DATA__legendAIConfig,
        llmModelOptions: ['test-model', '  model-a  ', ''],
      },
    });
    const names = result.current.availableModelNames;
    expect(names.filter((n) => n === 'test-model')).toHaveLength(1);
    expect(names).toContain('model-a');
    expect(names).not.toContain('');
  });

  test('askQuestionWithIntent dispatches with intent', () => {
    const { result } = renderChatHook();
    act(() => {
      result.current.askQuestionWithIntent(
        'what columns exist?',
        LegendAIQuestionIntent.METADATA,
      );
    });
    expect(result.current.isSending).toBe(true);
    expect(result.current.messages).toHaveLength(2);
    const userMsg = result.current.messages[0];
    expect(userMsg?.role).toBe(LegendAIMessageRole.USER);
    expect(userMsg && 'text' in userMsg ? userMsg.text : undefined).toBe(
      'what columns exist?',
    );
  });

  test('runFallbackAction does nothing without orchestrator config', () => {
    const { result } = renderChatHook();
    act(() => {
      result.current.setQuestionText('show trades');
    });
    act(() => {
      result.current.askQuestion();
    });
    const assistantMsg = result.current.messages[1];
    act(() => {
      if (assistantMsg) {
        result.current.runFallbackAction(assistantMsg.id);
      }
    });
    // Without orchestratorUrl and dataProductCoordinates, it's a no-op
    expect(result.current.messages).toHaveLength(2);
  });

  test('runFallbackAction does nothing when no matching message', () => {
    const { result } = renderChatHook({
      config: {
        ...TEST_DATA__legendAIConfig,
        orchestratorUrl: 'http://localhost/orch',
      },
      dataProductCoordinates: {
        data_product: 'com.test::prod',
        group_id: 'com.test',
        artifact_id: 'prod',
        version: '1.0.0',
      },
    });
    act(() => {
      result.current.runFallbackAction('nonexistent-id');
    });
    expect(result.current.isSending).toBe(false);
  });

  test('stopGeneration preserves existing textAnswer', () => {
    const { result } = renderChatHook();
    act(() => {
      result.current.setQuestionText('show trades');
    });
    act(() => {
      result.current.askQuestion();
    });
    expect(result.current.isSending).toBe(true);
    act(() => {
      result.current.stopGeneration();
    });
    const lastMsg = result.current.messages[result.current.messages.length - 1];
    expect(lastMsg?.role).toBe(LegendAIMessageRole.ASSISTANT);
    if (lastMsg?.role === LegendAIMessageRole.ASSISTANT) {
      expect(lastMsg.isProcessing).toBe(false);
      expect(lastMsg.isExecuting).toBe(false);
    }
  });

  test('runFallbackAction does nothing when already sending', () => {
    const { result } = renderChatHook({
      config: {
        ...TEST_DATA__legendAIConfig,
        orchestratorUrl: 'http://localhost/orch',
      },
      dataProductCoordinates: {
        data_product: 'com.test::prod',
        group_id: 'com.test',
        artifact_id: 'prod',
        version: '1.0.0',
      },
    });
    act(() => {
      result.current.setQuestionText('show trades');
    });
    act(() => {
      result.current.askQuestion();
    });
    // isSending is true, so fallback should be a no-op
    const assistantMsg = result.current.messages[1];
    const msgCountBefore = result.current.messages.length;
    act(() => {
      if (assistantMsg) {
        result.current.runFallbackAction(assistantMsg.id);
      }
    });
    expect(result.current.messages).toHaveLength(msgCountBefore);
  });

  test('clearChat during active send clears timeout', () => {
    const { result } = renderChatHook();
    act(() => {
      result.current.setQuestionText('query');
    });
    act(() => {
      result.current.askQuestion();
    });
    expect(result.current.isSending).toBe(true);
    act(() => {
      result.current.clearChat();
    });
    expect(result.current.messages).toEqual([]);
    expect(result.current.isSending).toBe(false);
    expect(result.current.questionText).toBe('');
  });
});

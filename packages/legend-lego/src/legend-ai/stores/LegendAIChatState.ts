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

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { noop } from '@finos/legend-shared';
import {
  type TDSServiceSchema,
  type LegendAIConfig,
  type LegendAIChatState,
  type LegendAIMessage,
  type LegendAIConversationTurn,
  type LegendAIProductMetadata,
  type LegendAIScopeItem,
  type LegendAIQuestionIntent,
  type LegendAIModelContext,
  LegendAIMessageRole,
} from '../LegendAITypes.js';
import {
  type LegendAI_LegendApplicationPlugin_Extension,
  type LegendAIOrchestratorDataProductCoordinates,
} from '../LegendAI_LegendApplicationPlugin_Extension.js';
import type { QueryExplicitExecutionContextInfo } from '@finos/legend-graph';
import {
  buildConversationHistory,
  createMessagePair,
  processQuestion,
  processQuestionWithIntent,
  processQuestionViaOrchestrator,
} from './LegendAIChatProcessors.js';

export const useLegendAIChatState = (
  services: TDSServiceSchema[],
  coordinates: string,
  config: LegendAIConfig,
  metadata: LegendAIProductMetadata,
  plugin: LegendAI_LegendApplicationPlugin_Extension,
  dataProductCoordinates?: LegendAIOrchestratorDataProductCoordinates,
  pureExecutionContext?: QueryExplicitExecutionContextInfo,
  modelContext?: LegendAIModelContext,
): LegendAIChatState => {
  const LEGEND_AI_MCP_SCOPE_ID = 'legend-ai-mcp';
  const [questionText, setQuestionText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<LegendAIMessage[]>([]);
  const [expandedThinking, setExpandedThinking] = useState<Set<number>>(
    new Set(),
  );
  const [selectedScopes, setSelectedScopes] = useState<LegendAIScopeItem[]>([]);
  const [selectedModelName, setSelectedModelName] = useState<
    string | undefined
  >(undefined);

  const availableModelNames = useMemo(() => {
    const names = new Set<string>();
    if (config.llmModelName) {
      names.add(config.llmModelName);
    }
    for (const modelName of config.llmModelOptions ?? []) {
      if (modelName.trim()) {
        names.add(modelName.trim());
      }
    }
    return Array.from(names);
  }, [config.llmModelName, config.llmModelOptions]);

  const conversationRef = useRef<HTMLDivElement>(null);
  const sendTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const cancelledRef = useRef(false);

  useEffect(() => {
    const el = conversationRef.current;
    if (el && messages.length > 0) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      if (sendTimeoutRef.current !== undefined) {
        clearTimeout(sendTimeoutRef.current);
      }
    };
  }, []);

  const toggleThinking = useCallback((index: number) => {
    setExpandedThinking((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const toggleScope = useCallback((scope: LegendAIScopeItem) => {
    setSelectedScopes((prev) =>
      prev.some((s) => s.id === scope.id)
        ? prev.filter((s) => s.id !== scope.id)
        : [...prev, scope],
    );
  }, []);

  const removeScope = useCallback((scopeId: string) => {
    setSelectedScopes((prev) => prev.filter((s) => s.id !== scopeId));
  }, []);

  const configForRequest = useMemo(
    () => ({
      ...config,
      llmModelName: selectedModelName ?? config.llmModelName,
    }),
    [config, selectedModelName],
  );

  const stopGeneration = useCallback(() => {
    cancelledRef.current = true;
    if (sendTimeoutRef.current !== undefined) {
      clearTimeout(sendTimeoutRef.current);
      sendTimeoutRef.current = undefined;
    }
    setIsSending(false);
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last?.role === LegendAIMessageRole.ASSISTANT) {
        const stopped = { ...last, isProcessing: false, isExecuting: false };
        if (!stopped.textAnswer && !stopped.sql && !stopped.error) {
          stopped.textAnswer = 'Generation stopped.';
        }
        updated[updated.length - 1] = stopped;
      }
      return updated;
    });
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setExpandedThinking(new Set());
    setQuestionText('');
    setIsSending(false);
    if (sendTimeoutRef.current !== undefined) {
      clearTimeout(sendTimeoutRef.current);
      sendTimeoutRef.current = undefined;
    }
  }, []);

  const dispatchQuestion = useCallback(
    (
      text: string,
      process: (
        trimmed: string,
        history: LegendAIConversationTurn[],
      ) => Promise<void>,
    ): void => {
      const trimmed = text.trim();
      if (!trimmed || isSending) {
        return;
      }
      const history = buildConversationHistory(messages);
      setIsSending(true);
      cancelledRef.current = false;
      setQuestionText('');
      setMessages((prev) => [...prev, ...createMessagePair(trimmed)]);
      if (sendTimeoutRef.current !== undefined) {
        clearTimeout(sendTimeoutRef.current);
        sendTimeoutRef.current = undefined;
      }
      sendTimeoutRef.current = setTimeout(() => {
        process(trimmed, history)
          .catch(noop)
          .finally(() => {
            if (!cancelledRef.current) {
              setIsSending(false);
            }
            sendTimeoutRef.current = undefined;
          });
      }, 0);
    },
    [isSending, messages],
  );

  const askQuestion = useCallback(
    (): void =>
      dispatchQuestion(questionText, (trimmed, history) => {
        const operationContext = {
          config: configForRequest,
          plugin,
          history,
          setMessages,
        };
        if (
          selectedScopes.some((scope) => scope.id === LEGEND_AI_MCP_SCOPE_ID) &&
          configForRequest.orchestratorUrl &&
          dataProductCoordinates
        ) {
          return processQuestionViaOrchestrator(
            trimmed,
            dataProductCoordinates,
            metadata,
            operationContext,
            pureExecutionContext,
            undefined,
            modelContext,
          );
        }
        return processQuestion(
          trimmed,
          services,
          coordinates,
          metadata,
          operationContext,
          dataProductCoordinates,
          pureExecutionContext,
          modelContext,
        );
      }),
    [
      questionText,
      dispatchQuestion,
      services,
      coordinates,
      configForRequest,
      metadata,
      plugin,
      dataProductCoordinates,
      pureExecutionContext,
      selectedScopes,
      modelContext,
    ],
  );

  const askQuestionWithIntent = useCallback(
    (text: string, intent: LegendAIQuestionIntent): void =>
      dispatchQuestion(text, (trimmed, history) => {
        const operationContext = {
          config: configForRequest,
          plugin,
          history,
          setMessages,
        };
        if (
          selectedScopes.some((scope) => scope.id === LEGEND_AI_MCP_SCOPE_ID) &&
          configForRequest.orchestratorUrl &&
          dataProductCoordinates
        ) {
          return processQuestionViaOrchestrator(
            trimmed,
            dataProductCoordinates,
            metadata,
            operationContext,
            pureExecutionContext,
            undefined,
            modelContext,
          );
        }
        return processQuestionWithIntent(
          trimmed,
          intent,
          services,
          coordinates,
          metadata,
          operationContext,
          dataProductCoordinates
            ? {
                dataProductCoordinates,
                ...(pureExecutionContext === undefined
                  ? {}
                  : { pureExecutionContext }),
              }
            : undefined,
          modelContext,
        );
      }),
    [
      dispatchQuestion,
      services,
      coordinates,
      configForRequest,
      metadata,
      plugin,
      dataProductCoordinates,
      pureExecutionContext,
      selectedScopes,
      modelContext,
    ],
  );

  const runFallbackAction = useCallback(
    (messageId: string): void => {
      if (isSending || !config.orchestratorUrl || !dataProductCoordinates) {
        return;
      }
      let question: string | undefined;
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (
          msg?.role === LegendAIMessageRole.ASSISTANT &&
          msg.id === messageId &&
          i > 0
        ) {
          const userMsg = messages[i - 1];
          if (userMsg?.role === LegendAIMessageRole.USER) {
            question = userMsg.text;
          }
        }
      }
      if (!question) {
        return;
      }

      setIsSending(true);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && m.role === LegendAIMessageRole.ASSISTANT
            ? { ...m, fallbackAction: null, error: null, isProcessing: true }
            : m,
        ),
      );

      const history = buildConversationHistory(messages);
      processQuestionViaOrchestrator(
        question,
        dataProductCoordinates,
        metadata,
        {
          config: configForRequest,
          plugin,
          history,
          setMessages,
        },
        pureExecutionContext,
        undefined,
        modelContext,
      )
        .catch(noop)
        .finally(() => {
          setIsSending(false);
        });
    },
    [
      isSending,
      messages,
      config,
      configForRequest,
      metadata,
      plugin,
      dataProductCoordinates,
      pureExecutionContext,
      modelContext,
    ],
  );

  return {
    questionText,
    setQuestionText,
    isSending,
    messages,
    selectedModelName,
    availableModelNames,
    setSelectedModelName,
    askQuestion,
    askQuestionWithIntent,
    runFallbackAction,
    clearChat,
    expandedThinking,
    toggleThinking,
    conversationRef,
    selectedScopes,
    toggleScope,
    removeScope,
    stopGeneration,
  };
};

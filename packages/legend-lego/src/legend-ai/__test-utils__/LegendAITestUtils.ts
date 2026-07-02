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

import { guaranteeNonNullable } from '@finos/legend-shared';
import { createMock } from '@finos/legend-shared/test';
import type {
  MessageSetter,
  LegendAIOperationContext,
} from '../stores/LegendAIChatProcessors.js';
import {
  type LegendAIMessage,
  type LegendAIAssistantMessage,
  type LegendAIConfig,
  type LegendAIProductMetadata,
  type TDSServiceSchema,
  type LegendAIConversationTurn,
  LegendAIMessageRole,
  LegendAIQuestionIntent,
} from '../LegendAITypes.js';
import {
  type LegendAI_LegendApplicationPlugin_Extension,
  type LegendAISqlExtractionResult,
  type LegendAIJudgeResult,
  LegendAIJudgeVerdict,
  LegendAIOrchestratorResponse,
  LegendAIResolvedEntities,
  LegendAISqlExecutionResultData,
} from '../LegendAI_LegendApplicationPlugin_Extension.js';

export const TEST__createMockSetter = (): {
  setter: MessageSetter;
  getMessages: () => LegendAIMessage[];
} => {
  let messages: LegendAIMessage[] = [];
  const setter: MessageSetter = (action) => {
    if (typeof action === 'function') {
      messages = action(messages);
    } else {
      messages = action;
    }
  };
  return { setter, getMessages: () => messages };
};
export const TEST__makeAssistantMessage = (
  overrides?: Partial<LegendAIAssistantMessage>,
): LegendAIAssistantMessage => ({
  id: 'test-assistant-msg',
  role: LegendAIMessageRole.ASSISTANT,
  thinkingSteps: [],
  sql: null,
  textAnswer: null,
  dataContext: null,
  gridData: null,
  error: null,
  errorType: null,
  sqlGenTime: null,
  execTime: null,
  thinkingDuration: null,
  isProcessing: true,
  isExecuting: false,
  suggestedQueries: [],
  fallbackAction: null,
  queriedAccessPointGroups: [],
  ...overrides,
});
export const TEST__seedAssistant = (setter: MessageSetter): void => {
  setter([
    { id: 'test-user-msg', role: LegendAIMessageRole.USER, text: 'test' },
    TEST__makeAssistantMessage(),
  ]);
};

/**
 * Retrieve a message by index and assert it is an assistant message,
 * narrowing the type via the discriminated `role` field without a cast.
 */
export const TEST__getAssistantMessage = (
  messages: LegendAIMessage[],
  index: number,
): LegendAIAssistantMessage => {
  const msg = guaranteeNonNullable(
    messages[index],
    `Expected message at index ${index}`,
  );
  if (msg.role !== LegendAIMessageRole.ASSISTANT) {
    throw new Error(
      `Expected assistant message at index ${index}, got role '${msg.role}'`,
    );
  }
  return msg;
};

export const TEST_DATA__legendAIConfig: LegendAIConfig = {
  enabled: true,
  llmServiceUrl: 'http://localhost/llm',
  llmModelName: 'test-model',
  sqlExecutionUrl: 'http://localhost/sql',
  orchestratorUrl: undefined,
  marketplaceSearchUrl: undefined,
  engineUrl: undefined,
  maxJudgeAttempts: 2,
};

export const TEST_DATA__legendAIMetadata: LegendAIProductMetadata = {
  name: 'TestProduct',
  coordinates: 'com.test:prod:1.0.0',
  serviceSummaries: [{ title: 'Svc', description: 'desc' }],
};

export const TEST_DATA__legendAIServices: TDSServiceSchema[] = [
  {
    title: 'TradeService',
    pattern: '/trades',
    columns: [
      { name: 'tradeId', type: 'String' },
      { name: 'amount', type: 'Number' },
    ],
    parameters: [],
  },
];
export const TEST__createMockLegendAIPlugin = (
  overrides?: Partial<LegendAI_LegendApplicationPlugin_Extension>,
): LegendAI_LegendApplicationPlugin_Extension =>
  ({
    getName: () => 'test-plugin',
    getVersion: () => '1.0.0',
    install: () => {},
    classifyQuestionIntent: (_q: string, _h: boolean): LegendAIQuestionIntent =>
      LegendAIQuestionIntent.DATA_QUERY,
    buildMetadataPrompt: (
      _q: string,
      _m: LegendAIProductMetadata,
      _h?: LegendAIConversationTurn[],
    ) => 'metadata prompt',
    buildGeneratorPrompt: (
      _q: string,
      _s: TDSServiceSchema[],
      _c: string,
      _h?: LegendAIConversationTurn[],
      _m?: LegendAIProductMetadata,
    ) => 'generator prompt',
    buildJudgePrompt: (
      _sql: string,
      _q: string,
      _s: TDSServiceSchema[],
      _c: string,
      _h?: LegendAIConversationTurn[],
    ) => 'judge prompt',
    buildAccessPointGeneratorPrompt: (
      _q: string,
      _s: TDSServiceSchema[],
      _h?: LegendAIConversationTurn[],
      _m?: string,
    ) => 'ap generator prompt',
    buildAccessPointJudgePrompt: (
      _sql: string,
      _q: string,
      _s: TDSServiceSchema[],
      _h?: LegendAIConversationTurn[],
      _m?: string,
    ) => 'ap judge prompt',
    preWarmSchemaAnalysis: () => {
      /* no-op in test */
    },
    callLLM: createMock(),
    executeSql: createMock(),
    extractSqlFromResponse: (_a: string): LegendAISqlExtractionResult => ({
      sql: 'SELECT * FROM t',
      failure: null,
    }),
    extractJudgeResult: (_a: string): LegendAIJudgeResult => ({
      verdict: LegendAIJudgeVerdict.PASS,
    }),
    selectRelevantServices: (
      _q: string,
      services: TDSServiceSchema[],
    ): Promise<TDSServiceSchema[]> => Promise.resolve(services),
    resolveEntitiesForQuery: (): Promise<LegendAIResolvedEntities> => {
      const entities = new LegendAIResolvedEntities();
      entities.rootEntity = 'my::Root';
      entities.relatedEntities = [];
      return Promise.resolve(entities);
    },
    generateQueryViaOrchestrator: (): Promise<LegendAIOrchestratorResponse> => {
      const response = new LegendAIOrchestratorResponse();
      response.legend_query = "model::Entity.all()->project([x|x.id], ['Id'])";
      return Promise.resolve(response);
    },
    executePureQuery: (): Promise<LegendAISqlExecutionResultData> => {
      const data = new LegendAISqlExecutionResultData();
      data.columns = ['Id'];
      data.rows = [{ Id: '1' }];
      return Promise.resolve(data);
    },
    disambiguateEntity: (): Promise<LegendAIResolvedEntities> => {
      const entities = new LegendAIResolvedEntities();
      entities.rootEntity = 'my::Root';
      entities.relatedEntities = [];
      return Promise.resolve(entities);
    },
    buildErrorCorrectionPrompt: (): string => '',
    buildZeroRowCorrectionPrompt: (): string => '',
    ...overrides,
  }) as LegendAI_LegendApplicationPlugin_Extension;

export const TEST__createOperationContext = (
  overrides?: Partial<LegendAIOperationContext>,
): LegendAIOperationContext => {
  const { setter } = TEST__createMockSetter();
  return {
    config: TEST_DATA__legendAIConfig,
    plugin: TEST__createMockLegendAIPlugin(),
    history: [],
    setMessages: setter,
    ...overrides,
  };
};

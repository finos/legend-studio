/**
 * Copyright (c) 2020-present, Goldman Sachs
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

import type { LegendREPLGridClientApplicationStore } from './LegendREPLGridClientBaseStore.js';
import { REPLServerClient } from '../server/REPLServerClient.js';
import {
  NetworkClient,
  type GeneratorFn,
  type PlainObject,
  assertErrorThrown,
  LogEvent,
  guaranteeNonNullable,
  guaranteeType,
  ActionState,
  HttpStatus,
  NetworkClientError,
} from '@finos/legend-shared';
import type { TDSRequest } from '../components/grid/TDSRequest.js';
import { flow, flowResult, makeObservable, observable } from 'mobx';
import { REPLGridServerResult } from '../components/grid/REPLGridServerResult.js';
import {
  LEGEND_APPLICATION_REPL_SETTING_KEY,
  LEGEND_REPL_EVENT,
} from '../Const.js';
import { REPLGridState } from './REPLGridState.js';
import { buildLambdaExpressions } from '../components/grid/TDSLambdaBuilder.js';
import {
  type V1_TDSExecutionResult,
  TDSExecutionResult,
  V1_Lambda,
  V1_buildExecutionResult,
  V1_deserializeValueSpecification,
  V1_serializeExecutionResult,
  V1_serializeValueSpecification,
  V1_ParserError,
  ParserError,
  SourceInformation,
} from '@finos/legend-graph';
import { CompletionItem } from './CompletionResult.js';
import {
  languages as monacoLanguagesAPI,
  type IPosition,
  type editor as monacoEditorAPI,
} from 'monaco-editor';

export class REPLGridClientStore {
  readonly applicationStore: LegendREPLGridClientApplicationStore;
  readonly client: REPLServerClient;
  replGridState!: REPLGridState;
  executeAction = ActionState.create();

  constructor(applicationStore: LegendREPLGridClientApplicationStore) {
    makeObservable(this, {
      replGridState: observable,
      executeAction: observable,
      getREPLGridServerResult: flow,
      getInitialQueryLambda: flow,
      getInitialREPLGridServerResult: flow,
      getLicenseKey: flow,
      executeLambda: flow,
      parseQuery: flow,
    });
    this.applicationStore = applicationStore;
    this.client = new REPLServerClient(
      new NetworkClient({
        baseUrl: this.applicationStore.config.useDynamicREPLServer
          ? window.location.origin +
            this.applicationStore.config.baseAddress.replace('/repl/', '')
          : this.applicationStore.config.replUrl,
      }),
    );
    const isPaginationEnabled =
      applicationStore.settingService.getBooleanValue(
        LEGEND_APPLICATION_REPL_SETTING_KEY.PAGINATION,
      ) ?? true;
    this.replGridState = new REPLGridState(isPaginationEnabled);
  }

  *getREPLGridServerResult(tdsRequest: TDSRequest): GeneratorFn<void> {
    try {
      const isSubQuery = tdsRequest.groupBy.groupKeys.length !== 0;
      const lambda = buildLambdaExpressions(
        guaranteeNonNullable(this.replGridState.initialQueryLambda?.body[0]),
        tdsRequest,
        this.replGridState.isPaginationEnabled,
      );
      const resultObj = (yield flowResult(
        this.client.getREPLGridServerResult(
          V1_serializeValueSpecification(lambda, []),
        ),
      )) as PlainObject<REPLGridServerResult>;
      const replGridResult =
        REPLGridServerResult.serialization.fromJson(resultObj);
      const tdsResult = JSON.parse(
        replGridResult.result,
      ) as PlainObject<V1_TDSExecutionResult>;
      this.replGridState.setCurrentResult(
        guaranteeType(
          V1_buildExecutionResult(V1_serializeExecutionResult(tdsResult)),
          TDSExecutionResult,
        ),
      );
      if (isSubQuery) {
        this.replGridState.setCurrentSubQuery(replGridResult.currentQuery);
      } else {
        this.replGridState.queryEditorState.setQuery(
          replGridResult.currentQuery.substring(1),
        );
        this.replGridState.setCurrentSubQuery(undefined);
      }
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_REPL_EVENT.FETCH_TDS_FAILURE),
        error,
      );
    }
  }

  async getTypeaheadResults(
    position: IPosition,
    model: monacoEditorAPI.ITextModel,
  ): Promise<monacoLanguagesAPI.CompletionItem[]> {
    try {
      const textUntilPosition = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });
      const resultObj =
        await this.client.getTypeaheadResults(textUntilPosition);
      const result = resultObj.map((res) =>
        CompletionItem.serialization.fromJson(res),
      );
      const currentWord = model.getWordUntilPosition(position);
      return result.map((res) => ({
        label: res.display,
        kind: monacoLanguagesAPI.CompletionItemKind.Text,
        range: {
          startLineNumber: position.lineNumber,
          startColumn: currentWord.startColumn + 1,
          endLineNumber: position.lineNumber,
          endColumn: currentWord.endColumn + 1,
        },
        insertText: res.completion,
      })) as monacoLanguagesAPI.CompletionItem[];
    } catch (e) {
      return [];
    }
  }

  *executeLambda(): GeneratorFn<void> {
    try {
      this.executeAction.inProgress();
      const resultObj = (yield this.client.executeLambda(
        this.replGridState.queryEditorState.query,
        this.replGridState.isPaginationEnabled,
      )) as PlainObject<REPLGridServerResult>;
      const replGridResult =
        REPLGridServerResult.serialization.fromJson(resultObj);
      const tdsResultObj = JSON.parse(
        replGridResult.result,
      ) as PlainObject<V1_TDSExecutionResult>;
      const tdsResult = guaranteeType(
        V1_buildExecutionResult(V1_serializeExecutionResult(tdsResultObj)),
        TDSExecutionResult,
      );
      this.replGridState.setInitialResult(tdsResult);
      this.replGridState.queryEditorState.setQuery(
        replGridResult.currentQuery.substring(1),
      );
      this.replGridState.setCurrentSubQuery(undefined);
      this.replGridState.setColumns(tdsResult.result.columns);

      yield flowResult(this.getInitialQueryLambda());
      this.executeAction.complete();
    } catch (error) {
      this.executeAction.fail();
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_REPL_EVENT.FETCH_TDS_FAILURE),
        error,
      );
    }
  }

  *parseQuery(): GeneratorFn<void> {
    try {
      this.replGridState.queryEditorState.setParserError(undefined);
      yield flowResult(
        this.client.parseQuery(`|${this.replGridState.queryEditorState.query}`),
      );
    } catch (error) {
      assertErrorThrown(error);
      if (
        error instanceof NetworkClientError &&
        error.response.status === HttpStatus.BAD_REQUEST
      ) {
        const protocol = V1_ParserError.serialization.fromJson(
          error.payload as PlainObject<V1_ParserError>,
        );
        const parserError = new ParserError(protocol.message);
        if (protocol.sourceInformation) {
          parserError.sourceInformation = new SourceInformation(
            protocol.sourceInformation.sourceId,
            protocol.sourceInformation.startLine,
            protocol.sourceInformation.startColumn,
            protocol.sourceInformation.endLine,
            protocol.sourceInformation.endColumn,
          );
        }
        this.replGridState.queryEditorState.setParserError(parserError);
      }
    }
  }

  *getInitialQueryLambda(): GeneratorFn<void> {
    const lambdaObj =
      (yield this.client.getIntialQueryLambda()) as PlainObject<V1_Lambda>;
    const lambda = V1_deserializeValueSpecification(lambdaObj, []);
    if (lambda instanceof V1_Lambda) {
      this.replGridState.setInitialQueryLambda(lambda);
    }
  }

  *getInitialREPLGridServerResult(): GeneratorFn<void> {
    try {
      this.executeAction.inProgress();
      if (!this.replGridState.licenseKey) {
        yield flowResult(this.getLicenseKey());
      }

      yield flowResult(this.getInitialQueryLambda());

      const resultObj = (yield this.client.getInitialREPLGridServerResult(
        this.replGridState.isPaginationEnabled,
      )) as PlainObject<REPLGridServerResult>;
      const replGridResult =
        REPLGridServerResult.serialization.fromJson(resultObj);
      const tdsResultObj = JSON.parse(
        replGridResult.result,
      ) as PlainObject<V1_TDSExecutionResult>;
      const tdsResult = guaranteeType(
        V1_buildExecutionResult(V1_serializeExecutionResult(tdsResultObj)),
        TDSExecutionResult,
      );
      this.replGridState.setInitialResult(tdsResult);
      this.replGridState.queryEditorState.setQuery(
        replGridResult.currentQuery.substring(1),
      );
      this.replGridState.setCurrentSubQuery(undefined);
      this.replGridState.setColumns(tdsResult.result.columns);
      this.executeAction.complete();
    } catch (error) {
      this.executeAction.fail();
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(error);
      this.applicationStore.logService.error(
        LogEvent.create(LEGEND_REPL_EVENT.FETCH_TDS_FAILURE),
        error,
      );
    }
  }

  *getLicenseKey(): GeneratorFn<void> {
    const licenseKey = (yield this.client.getLicenseKey()) as string;
    this.replGridState.setLicenseKey(licenseKey);
  }
}

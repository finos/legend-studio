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

import { flow, flowResult, makeObservable, observable } from 'mobx';
import type { REPLGridClientStore } from '../REPLGridClientStore.js';
import { DataCubeGridState } from './DataCubeGridState.js';
import { DataCubeQueryTextEditorState } from './DataCubeQueryTextEditorState.js';
import { DataCubeConfigState } from './DataCubeConfigState.js';
import { DataCubePropertiesPanelState } from './DataCubePropertiesPanelState.js';
import {
  ActionState,
  HttpStatus,
  LogEvent,
  NetworkClientError,
  assertErrorThrown,
  guaranteeNonNullable,
  guaranteeType,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import { generatePath } from '@finos/legend-application/browser';
import {
  V1_serializeValueSpecification,
  type V1_TDSExecutionResult,
  V1_buildExecutionResult,
  V1_serializeExecutionResult,
  TDSExecutionResult,
  V1_ParserError,
  ParserError,
  SourceInformation,
  V1_Lambda,
  V1_deserializeValueSpecification,
} from '@finos/legend-graph';
import {
  languages as monacoLanguagesAPI,
  type IPosition,
  type editor as monacoEditorAPI,
} from 'monaco-editor';
import { LEGEND_REPL_EVENT } from '../../Const.js';
import {
  LEGEND_REPL_GRID_CLIENT_ROUTE_PATTERN,
  LEGEND_REPL_GRID_CLIENT_PATTERN_TOKEN,
} from '../../components/LegendREPLGridClientApplication.js';
import { REPLGridServerResult } from '../../components/grid/REPLGridServerResult.js';
import { buildLambdaExpressions } from '../../components/grid/TDSLambdaBuilder.js';
import { TDSQuery } from '../../components/grid/TDSQuery.js';
import { TDSRequest, TDSGroupby } from '../../components/grid/TDSRequest.js';
import { CompletionItem } from '../CompletionResult.js';

export class DataCubeState {
  readonly editorStore!: REPLGridClientStore;

  gridState!: DataCubeGridState;
  queryTextEditorState!: DataCubeQueryTextEditorState;
  configState!: DataCubeConfigState;
  propertiesPanelState!: DataCubePropertiesPanelState;

  executeAction = ActionState.create();

  constructor(editorStore: REPLGridClientStore) {
    makeObservable(this, {
      gridState: observable,
      queryTextEditorState: observable,
      configState: observable,
      propertiesPanelState: observable,
      executeAction: observable,
      getREPLGridServerResult: flow,
      getInitialQueryLambda: flow,
      getInitialREPLGridServerResult: flow,
      getLicenseKey: flow,
      executeLambda: flow,
      parseQuery: flow,
      saveQuery: flow,
    });

    this.editorStore = editorStore;

    this.gridState = new DataCubeGridState(this);
    this.queryTextEditorState = new DataCubeQueryTextEditorState(this);
    this.configState = new DataCubeConfigState(this);
    this.propertiesPanelState = new DataCubePropertiesPanelState(this);
  }

  *getREPLGridServerResult(tdsRequest: TDSRequest): GeneratorFn<void> {
    try {
      const isSubQuery = tdsRequest.groupBy.groupKeys.length !== 0;
      const lambda = buildLambdaExpressions(
        guaranteeNonNullable(this.gridState.initialQueryLambda?.body[0]),
        tdsRequest,
        this.configState.isPaginationEnabled,
      );
      const resultObj = (yield flowResult(
        this.editorStore.client.getREPLGridServerResult(
          V1_serializeValueSpecification(lambda, []),
        ),
      )) as PlainObject<REPLGridServerResult>;
      const replGridResult =
        REPLGridServerResult.serialization.fromJson(resultObj);
      const tdsResult = JSON.parse(
        replGridResult.result,
      ) as PlainObject<V1_TDSExecutionResult>;
      this.gridState.setCurrentResult(
        guaranteeType(
          V1_buildExecutionResult(V1_serializeExecutionResult(tdsResult)),
          TDSExecutionResult,
        ),
      );
      if (isSubQuery) {
        this.queryTextEditorState.setCurrentSubQuery(
          replGridResult.currentQuery,
        );
      } else {
        this.queryTextEditorState.queryEditorState.setQuery(
          replGridResult.currentQuery.substring(1),
        );
        this.queryTextEditorState.setCurrentSubQuery(undefined);
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.editorStore.applicationStore.logService.error(
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
        await this.editorStore.client.getTypeaheadResults(textUntilPosition);
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
      const resultObj = (yield this.editorStore.client.executeLambda(
        this.queryTextEditorState.queryEditorState.query,
        this.configState.isPaginationEnabled,
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
      this.gridState.setInitialResult(tdsResult);
      this.queryTextEditorState.queryEditorState.setQuery(
        replGridResult.currentQuery.substring(1),
      );
      this.queryTextEditorState.setCurrentSubQuery(undefined);
      this.gridState.setColumns(tdsResult.result.columns);

      yield flowResult(this.getInitialQueryLambda());
      this.executeAction.complete();
    } catch (error) {
      this.executeAction.fail();
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_REPL_EVENT.FETCH_TDS_FAILURE),
        error,
      );
    }
  }

  *parseQuery(): GeneratorFn<void> {
    try {
      this.queryTextEditorState.queryEditorState.setParserError(undefined);
      yield flowResult(
        this.editorStore.client.parseQuery(
          `|${this.queryTextEditorState.queryEditorState.query}`,
        ),
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
        this.queryTextEditorState.queryEditorState.setParserError(parserError);
      }
    }
  }

  *saveQuery(): GeneratorFn<void> {
    try {
      const query = TDSQuery.serialization.toJson(
        new TDSQuery(
          guaranteeNonNullable(this.gridState.initialQueryLambda),
          this.gridState.lastQueryTDSRequest ??
            new TDSRequest([], [], [], new TDSGroupby([], [], []), 0, 100),
        ),
      );
      const queryId = (yield flowResult(
        this.editorStore.client.saveQuery(query),
      )) as string;
      this.editorStore.applicationStore.navigationService.navigator.goToLocation(
        generatePath(LEGEND_REPL_GRID_CLIENT_ROUTE_PATTERN.SAVED_QUERY, {
          [LEGEND_REPL_GRID_CLIENT_PATTERN_TOKEN.QUERY_ID]: queryId,
        }),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_REPL_EVENT.FETCH_TDS_FAILURE),
        error,
      );
    }
  }

  *getInitialQueryLambda(queryId?: string): GeneratorFn<void> {
    if (!queryId) {
      const lambdaObj =
        (yield this.editorStore.client.getIntialQueryLambda()) as PlainObject<V1_Lambda>;
      const lambda = V1_deserializeValueSpecification(lambdaObj, []);
      if (lambda instanceof V1_Lambda) {
        this.gridState.setInitialQueryLambda(lambda);
      }
      // this.replGridState.setCurrentQueryTDSRequest(undefined);
    } else {
      const queryObj = (yield this.editorStore.client.getREPLQuery(
        queryId,
      )) as PlainObject<TDSQuery>;
      const query = TDSQuery.serialization.fromJson(queryObj);
      this.gridState.setCurrentQueryTDSRequest(query.currentQueryInfo);
      this.gridState.setInitialQueryLambda(query.initialQuery);
    }
  }

  *getInitialREPLGridServerResult(queryId?: string): GeneratorFn<void> {
    try {
      this.executeAction.inProgress();
      if (!this.configState.licenseKey) {
        yield flowResult(this.getLicenseKey());
      }

      yield flowResult(this.getInitialQueryLambda(queryId));

      const resultObj =
        (yield this.editorStore.client.getInitialREPLGridServerResult(
          this.configState.isPaginationEnabled,
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
      this.gridState.setInitialResult(tdsResult);
      this.queryTextEditorState.queryEditorState.setQuery(
        replGridResult.currentQuery.substring(1),
      );
      this.queryTextEditorState.setCurrentSubQuery(undefined);
      this.gridState.setColumns(tdsResult.result.columns);
      this.executeAction.complete();
    } catch (error) {
      this.executeAction.fail();
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_REPL_EVENT.FETCH_TDS_FAILURE),
        error,
      );
    }
  }

  *getLicenseKey(): GeneratorFn<void> {
    const licenseKey =
      (yield this.editorStore.client.getLicenseKey()) as string;
    this.configState.setLicenseKey(licenseKey);
  }
}

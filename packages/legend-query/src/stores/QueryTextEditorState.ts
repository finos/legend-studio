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

import {
  GRAPH_MANAGER_EVENT,
  buildSourceInformationSourceId,
  ParserError,
  RawLambda,
  stub_RawLambda,
  pruneSourceInformation,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  assertErrorThrown,
  LogEvent,
} from '@finos/legend-shared';
import { observable, action, flow, makeObservable, flowResult } from 'mobx';
import type { QueryBuilderState } from './QueryBuilderState';
import { LambdaEditorState, TAB_SIZE } from '@finos/legend-application';

export class QueryRawLambdaState {
  lambda: RawLambda;

  constructor(lambda: RawLambda) {
    this.lambda = lambda;

    makeObservable(this, {
      lambda: observable,
      setLambda: action,
    });
  }

  setLambda(lambda: RawLambda): void {
    this.lambda = lambda;
  }
}

export enum QueryTextEditorMode {
  TEXT = 'TEXT',
  JSON = 'JSON',
}

export class QueryTextEditorState extends LambdaEditorState {
  queryBuilderState: QueryBuilderState;
  rawLambdaState: QueryRawLambdaState;
  isConvertingLambdaToString = false;
  mode: QueryTextEditorMode | undefined;
  /**
   * This is used to store the JSON string when viewing the query in JSON mode
   * TODO: consider moving this to another state if we need to simplify the logic of text-mode
   */
  readOnlylambdaJson = '';

  constructor(queryBuilderState: QueryBuilderState) {
    super('', '');

    makeObservable(this, {
      rawLambdaState: observable,
      isConvertingLambdaToString: observable,
      mode: observable,
      setQueryRawLambdaState: action,
      setMode: action,
      openModal: action,
      closeModal: flow,
    });

    this.queryBuilderState = queryBuilderState;
    this.rawLambdaState = new QueryRawLambdaState(stub_RawLambda());
  }

  get lambdaId(): string {
    return buildSourceInformationSourceId(['query-builder']);
  }

  setQueryRawLambdaState(rawLambdaState: QueryRawLambdaState): void {
    this.rawLambdaState = rawLambdaState;
  }

  setMode(openModal: QueryTextEditorMode | undefined): void {
    this.mode = openModal;
  }

  setLambdaJson(lambdaJson: string): void {
    this.readOnlylambdaJson = lambdaJson;
  }

  *convertLambdaGrammarStringToObject(): GeneratorFn<void> {
    const emptyLambda = stub_RawLambda();
    if (this.lambdaString) {
      try {
        const lambda =
          (yield this.queryBuilderState.graphManagerState.graphManager.pureCodeToLambda(
            this.fullLambdaString,
            this.lambdaId,
          )) as RawLambda;
        this.setParserError(undefined);
        this.rawLambdaState.setLambda(lambda);
      } catch (error) {
        assertErrorThrown(error);
        if (error instanceof ParserError) {
          this.setParserError(error);
        }
        this.queryBuilderState.applicationStore.log.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
      }
    } else {
      this.clearErrors();
      this.rawLambdaState.setLambda(emptyLambda);
    }
  }

  *convertLambdaObjectToGrammarString(pretty: boolean): GeneratorFn<void> {
    if (this.rawLambdaState.lambda.body) {
      this.isConvertingLambdaToString = true;
      try {
        const lambdas = new Map<string, RawLambda>();
        lambdas.set(
          this.lambdaId,
          new RawLambda(
            this.rawLambdaState.lambda.parameters,
            this.rawLambdaState.lambda.body,
          ),
        );
        const isolatedLambdas =
          (yield this.queryBuilderState.graphManagerState.graphManager.lambdasToPureCode(
            lambdas,
            pretty,
          )) as Map<string, string>;
        const grammarText = isolatedLambdas.get(this.lambdaId);
        this.setLambdaString(
          grammarText !== undefined
            ? this.extractLambdaString(grammarText)
            : '',
        );
        this.clearErrors();
        this.isConvertingLambdaToString = false;
      } catch (error) {
        assertErrorThrown(error);
        this.queryBuilderState.applicationStore.log.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
        this.isConvertingLambdaToString = false;
      }
    } else {
      this.clearErrors();
      this.setLambdaString('');
    }
  }

  openModal(mode: QueryTextEditorMode): void {
    const rawLambda = this.queryBuilderState.getQuery();
    if (mode === QueryTextEditorMode.TEXT) {
      this.setQueryRawLambdaState(new QueryRawLambdaState(rawLambda));
    }
    if (mode === QueryTextEditorMode.JSON) {
      this.setLambdaJson(
        JSON.stringify(
          pruneSourceInformation(
            this.queryBuilderState.graphManagerState.graphManager.serializeRawValueSpecification(
              rawLambda,
            ),
          ),
          null,
          TAB_SIZE,
        ),
      );
    }
    this.setMode(mode);
  }

  *closeModal(): GeneratorFn<void> {
    if (this.mode === QueryTextEditorMode.TEXT) {
      yield flowResult(this.convertLambdaGrammarStringToObject());
      if (this.parserError) {
        this.queryBuilderState.applicationStore.notifyError(
          `Can't parse query. Please fix error before closing: ${this.parserError.message}`,
        );
      } else {
        this.queryBuilderState.initialize(this.rawLambdaState.lambda);
        this.setMode(undefined);
      }
      return;
    }
    this.setMode(undefined);
  }
}

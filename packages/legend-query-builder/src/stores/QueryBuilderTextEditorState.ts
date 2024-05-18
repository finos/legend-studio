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
  ActionState,
} from '@finos/legend-shared';
import { observable, action, flow, makeObservable, flowResult } from 'mobx';
import type { QueryBuilderState } from './QueryBuilderState.js';
import { DEFAULT_TAB_SIZE } from '@finos/legend-application';
import { LambdaEditorState } from './shared/LambdaEditorState.js';

export class QueryBuilderRawLambdaState {
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

export enum QueryBuilderTextEditorMode {
  TEXT = 'TEXT',
  JSON = 'JSON',
}

export class QueryBuilderTextEditorState extends LambdaEditorState {
  queryBuilderState: QueryBuilderState;
  rawLambdaState: QueryBuilderRawLambdaState;
  isConvertingLambdaToString = false;
  mode: QueryBuilderTextEditorMode | undefined;
  closingQueryState = ActionState.create();

  /**
   * This is used to store the JSON string when viewing the query in JSON mode
   * TODO: consider moving this to another state if we need to simplify the logic of text-mode
   */
  readOnlylambdaJson = '';
  isReadOnly: boolean | undefined;

  constructor(queryBuilderState: QueryBuilderState) {
    super('', '');

    makeObservable(this, {
      rawLambdaState: observable,
      isConvertingLambdaToString: observable,
      mode: observable,
      isReadOnly: observable,
      setQueryRawLambdaState: action,
      setIsReadOnly: action,
      setMode: action,
      openModal: action,
      closeModal: flow,
    });

    this.queryBuilderState = queryBuilderState;
    this.rawLambdaState = new QueryBuilderRawLambdaState(stub_RawLambda());
  }

  get lambdaId(): string {
    return buildSourceInformationSourceId(['query-builder']);
  }

  get text(): string | undefined {
    if (this.mode === QueryBuilderTextEditorMode.TEXT) {
      return this.fullLambdaString;
    } else if (this.mode === QueryBuilderTextEditorMode.JSON) {
      return this.readOnlylambdaJson;
    }
    return undefined;
  }

  setQueryRawLambdaState(rawLambdaState: QueryBuilderRawLambdaState): void {
    this.rawLambdaState = rawLambdaState;
  }

  setIsReadOnly(val: boolean | undefined): void {
    this.isReadOnly = val;
  }

  setMode(openModal: QueryBuilderTextEditorMode | undefined): void {
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
            { pruneSourceInformation: false },
          )) as RawLambda;
        this.setParserError(undefined);
        this.rawLambdaState.setLambda(lambda);
      } catch (error) {
        assertErrorThrown(error);
        if (error instanceof ParserError) {
          this.setParserError(error);
        }
        this.queryBuilderState.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
      }
    } else {
      this.clearErrors();
      this.rawLambdaState.setLambda(emptyLambda);
    }
  }

  *convertLambdaObjectToGrammarString(options: {
    pretty?: boolean | undefined;
  }): GeneratorFn<void> {
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
            options.pretty,
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
        this.queryBuilderState.applicationStore.logService.error(
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

  openModal(mode: QueryBuilderTextEditorMode, isReadOnly?: boolean): void {
    try {
      const rawLambda = this.queryBuilderState.buildQuery();
      if (mode === QueryBuilderTextEditorMode.TEXT) {
        this.setQueryRawLambdaState(new QueryBuilderRawLambdaState(rawLambda));
      }
      if (mode === QueryBuilderTextEditorMode.JSON) {
        this.setLambdaJson(
          JSON.stringify(
            pruneSourceInformation(
              this.queryBuilderState.graphManagerState.graphManager.serializeRawValueSpecification(
                rawLambda,
              ),
            ),
            null,
            DEFAULT_TAB_SIZE,
          ),
        );
      }
      this.setMode(mode);
      this.setIsReadOnly(isReadOnly);
    } catch (error) {
      assertErrorThrown(error);
      this.queryBuilderState.applicationStore.notificationService.notifyError(
        error,
      );
    }
  }

  *closeModal(): GeneratorFn<void> {
    this.closingQueryState.inProgress();
    if (this.mode === QueryBuilderTextEditorMode.TEXT && !this.isReadOnly) {
      yield flowResult(this.convertLambdaGrammarStringToObject());
      if (this.parserError) {
        this.queryBuilderState.applicationStore.notificationService.notifyError(
          `Can't parse query. Please fix error before closing: ${this.parserError.message}`,
        );
      } else {
        this.queryBuilderState.rebuildWithQuery(this.rawLambdaState.lambda, {
          preserveParameterValues: true,
          preserveResult: true,
        });
        this.setMode(undefined);
      }
      return;
    }
    this.setIsReadOnly(undefined);
    this.closingQueryState.complete();

    this.setMode(undefined);
  }
}

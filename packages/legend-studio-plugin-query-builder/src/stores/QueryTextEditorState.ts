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

import type { EditorStore } from '@finos/legend-studio';
import {
  CORE_LOG_EVENT,
  LambdaEditorState,
  LAMBDA_START,
  ParserError,
  RawLambda,
  TAB_SIZE,
} from '@finos/legend-studio';
import { observable, action, flow, makeObservable } from 'mobx';
import type { QueryBuilderState } from './QueryBuilderState';

export class QueryRawLambdaState {
  lambda: RawLambda;

  constructor(lambda: RawLambda) {
    this.lambda = lambda;

    makeObservable(this, {
      lambda: observable,
      setLambda: action,
    });
  }

  get lambdaId(): string {
    return 'query-builder';
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
  editorStore: EditorStore;
  rawLambdaState: QueryRawLambdaState;
  isConvertingLambdaToString = false;
  mode: QueryTextEditorMode | undefined;
  /**
   * This is used to store the JSON string when viewing the query in JSON mode
   * TODO: consider moving this to another state if we need to simplify the logic of text-mode
   */
  readOnlylambdaJson = '';

  constructor(editorStore: EditorStore, queryBuilderState: QueryBuilderState) {
    super('', LAMBDA_START);

    makeObservable(this, {
      rawLambdaState: observable,
      isConvertingLambdaToString: observable,
      mode: observable,
      setQueryRawLambdaState: action,
      setMode: action,
      openModal: action,
      closeModal: action,
    });

    this.editorStore = editorStore;
    this.queryBuilderState = queryBuilderState;
    this.rawLambdaState = new QueryRawLambdaState(RawLambda.createStub());
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

  convertLambdaGrammarStringToObject = flow(function* (
    this: QueryTextEditorState,
  ) {
    const emptyLambda = RawLambda.createStub();
    if (this.lambdaString) {
      try {
        const lambda =
          (yield this.editorStore.graphState.graphManager.pureCodeToLambda(
            this.fullLambdaString,
            this.rawLambdaState.lambdaId,
          )) as RawLambda | undefined;
        this.setParserError(undefined);
        this.rawLambdaState.setLambda(lambda ?? emptyLambda);
      } catch (error: unknown) {
        if (error instanceof ParserError) {
          this.setParserError(error);
        }
        this.editorStore.applicationStore.logger.error(
          CORE_LOG_EVENT.PARSING_PROBLEM,
          error,
        );
      }
    } else {
      this.clearErrors();
      this.rawLambdaState.setLambda(emptyLambda);
    }
  });

  convertLambdaObjectToGrammarString = flow(function* (
    this: QueryTextEditorState,
    pretty: boolean,
  ) {
    if (this.rawLambdaState.lambda.body) {
      this.isConvertingLambdaToString = true;
      try {
        const lambdas = new Map<string, RawLambda>();
        lambdas.set(
          this.rawLambdaState.lambdaId,
          new RawLambda(
            this.rawLambdaState.lambda.parameters,
            this.rawLambdaState.lambda.body,
          ),
        );
        const isolatedLambdas =
          (yield this.editorStore.graphState.graphManager.lambdaToPureCode(
            lambdas,
            pretty,
          )) as Map<string, string>;
        const grammarText = isolatedLambdas.get(this.rawLambdaState.lambdaId);
        this.setLambdaString(
          grammarText !== undefined
            ? this.extractLambdaString(grammarText)
            : '',
        );
        this.clearErrors();
        this.isConvertingLambdaToString = false;
      } catch (error: unknown) {
        this.editorStore.applicationStore.logger.error(
          CORE_LOG_EVENT.PARSING_PROBLEM,
          error,
        );
        this.isConvertingLambdaToString = false;
      }
    } else {
      this.clearErrors();
      this.setLambdaString('');
    }
  });

  openModal(mode: QueryTextEditorMode): void {
    const rawLambda = this.queryBuilderState.getRawLambdaQuery();
    if (mode === QueryTextEditorMode.TEXT) {
      this.setQueryRawLambdaState(new QueryRawLambdaState(rawLambda));
    }
    if (mode === QueryTextEditorMode.JSON) {
      this.setLambdaJson(
        JSON.stringify(
          this.editorStore.graphState.graphManager.pruneSourceInformation(
            this.editorStore.graphState.graphManager.serializeRawValueSpecification(
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

  closeModal = flow(function* (this: QueryTextEditorState) {
    if (this.mode === QueryTextEditorMode.TEXT) {
      yield this.convertLambdaGrammarStringToObject();
      if (this.parserError) {
        this.editorStore.applicationStore.notifyError(
          `Can't parse query. Please fix error before closing: ${this.parserError.message}`,
        );
      } else {
        this.queryBuilderState.initWithRawLambda(this.rawLambdaState.lambda);
        this.setMode(undefined);
      }
      return;
    }
    this.setMode(undefined);
  });
}

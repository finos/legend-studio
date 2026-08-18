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

import type { EditorStore } from '@finos/legend-application-studio';
import {
  GRAPH_MANAGER_EVENT,
  isStubbed_RawLambda,
  LAMBDA_PIPE,
  ParserError,
  RawLambda,
} from '@finos/legend-graph';
import { LambdaEditorState } from '@finos/legend-query-builder';
import {
  assertErrorThrown,
  LogEvent,
  type GeneratorFn,
} from '@finos/legend-shared';
import type { DataSpaceExecutableTemplate } from '@finos/legend-extension-dsl-data-space/graph';

/**
 * A fully empty `RawLambda` (no body, no parameters) is not valid PURE and
 * will fail to compile once it's part of the graph — e.g. the very first
 * `analyzeMappingModelCoverage` call made when opening Query Builder sends
 * the full graph model to engine for compilation. A newly created inline
 * executable therefore needs a self-contained, always-valid placeholder
 * query (an empty string literal) rather than `stub_RawLambda()`.
 */
export const stub_DataSpaceExecutableTemplateQuery = (): RawLambda =>
  new RawLambda([], [{ _type: 'string', value: '' }]);

export class DataSpaceExecutableTemplateLambdaState extends LambdaEditorState {
  readonly editorStore: EditorStore;
  readonly executableTemplate: DataSpaceExecutableTemplate;
  lastComputedLambdaString: string | undefined;

  constructor(
    editorStore: EditorStore,
    executableTemplate: DataSpaceExecutableTemplate,
  ) {
    super('', LAMBDA_PIPE, { typeAheadEnabled: true });
    this.editorStore = editorStore;
    this.executableTemplate = executableTemplate;
  }

  override get lambdaId(): string {
    return `data-space-executable-template-${this.executableTemplate.title}`;
  }

  *convertLambdaGrammarStringToObject(): GeneratorFn<void> {
    if (this.lambdaString === this.lastComputedLambdaString) {
      return;
    }
    if (this.lambdaString) {
      try {
        const lambda =
          (yield this.editorStore.graphManagerState.graphManager.pureCodeToLambda(
            this.fullLambdaString,
            this.lambdaId,
          )) as RawLambda;
        this.setParserError(undefined);
        this.executableTemplate.query = lambda;
        this.lastComputedLambdaString = this.lambdaString;
      } catch (error) {
        assertErrorThrown(error);
        if (error instanceof ParserError) {
          this.setParserError(error);
        }
        this.editorStore.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
      }
    } else {
      this.clearErrors();
    }
  }

  *convertLambdaObjectToGrammarString(options?: {
    pretty?: boolean | undefined;
    preserveCompilationError?: boolean | undefined;
  }): GeneratorFn<void> {
    if (!isStubbed_RawLambda(this.executableTemplate.query)) {
      try {
        const lambdas = new Map<string, RawLambda>();
        lambdas.set(this.lambdaId, this.executableTemplate.query);
        const isolatedLambdas =
          (yield this.editorStore.graphManagerState.graphManager.lambdasToPureCode(
            lambdas,
            options?.pretty,
          )) as Map<string, string>;
        const grammarText = isolatedLambdas.get(this.lambdaId);
        const nextLambdaString =
          grammarText !== undefined
            ? this.extractLambdaString(grammarText)
            : '';
        this.setLambdaString(nextLambdaString);
        this.lastComputedLambdaString = nextLambdaString || undefined;
        this.clearErrors({
          preserveCompilationError: options?.preserveCompilationError,
        });
      } catch (error) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
      }
    } else {
      this.clearErrors();
      this.setLambdaString('');
    }
  }
}

export class DataSpaceExecutableTemplateStateCache {
  readonly editorStore: EditorStore;
  private readonly states = new Map<
    DataSpaceExecutableTemplate,
    DataSpaceExecutableTemplateLambdaState
  >();

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
  }

  getLambdaState(
    executableTemplate: DataSpaceExecutableTemplate,
  ): DataSpaceExecutableTemplateLambdaState {
    let state = this.states.get(executableTemplate);
    if (!state) {
      state = new DataSpaceExecutableTemplateLambdaState(
        this.editorStore,
        executableTemplate,
      );
      this.states.set(executableTemplate, state);
    }
    return state;
  }
}

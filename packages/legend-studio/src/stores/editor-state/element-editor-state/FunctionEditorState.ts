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

import { computed, observable, action, flow, makeObservable } from 'mobx';
import type { EditorStore } from '../../EditorStore';
import { LambdaEditorState } from './LambdaEditorState';
import { guaranteeType, assertType } from '@finos/legend-studio-shared';
import { ElementEditorState } from './ElementEditorState';
import { CORE_LOG_EVENT } from '../../../utils/Logger';
import { LAMBDA_START } from '../../../models/MetaModelConst';
import type { CompilationError } from '../../../models/metamodels/pure/action/EngineError';
import { ParserError } from '../../../models/metamodels/pure/action/EngineError';
import type { PackageableElement } from '../../../models/metamodels/pure/model/packageableElements/PackageableElement';
import { ConcreteFunctionDefinition } from '../../../models/metamodels/pure/model/packageableElements/domain/ConcreteFunctionDefinition';
import { RawLambda } from '../../../models/metamodels/pure/model/rawValueSpecification/RawLambda';

export enum FUNCTION_SPEC_TAB {
  GENERAL = 'GENERAL',
  TAGGED_VALUES = 'TAGGED_VALUES',
  STEREOTYPES = 'STEREOTYPES',
}

export class FunctionBodyEditorState extends LambdaEditorState {
  editorStore: EditorStore;
  functionElement: ConcreteFunctionDefinition;
  isConvertingFunctionBodyToString = false;

  constructor(
    functionElement: ConcreteFunctionDefinition,
    editorStore: EditorStore,
  ) {
    super('', LAMBDA_START);

    makeObservable(this, {
      functionElement: observable,
      isConvertingFunctionBodyToString: observable,
    });

    this.functionElement = functionElement;
    this.editorStore = editorStore;
  }

  convertLambdaGrammarStringToObject = flow(function* (
    this: FunctionBodyEditorState,
  ) {
    if (this.lambdaString) {
      try {
        const lambda =
          (yield this.editorStore.graphState.graphManager.pureCodeToLambda(
            this.fullLambdaString,
            this.functionElement.lambdaId,
          )) as RawLambda | undefined;
        this.setParserError(undefined);
        this.functionElement.body = lambda ? (lambda.body as object[]) : [];
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
      this.functionElement.body = [];
    }
  });

  convertLambdaObjectToGrammarString = flow(function* (
    this: FunctionBodyEditorState,
    pretty: boolean,
    firstLoad?: boolean,
  ) {
    if (!this.functionElement.isStub) {
      this.isConvertingFunctionBodyToString = true;
      try {
        const lambdas = new Map<string, RawLambda>();
        const functionLamba = new RawLambda(
          [],
          this.functionElement.body as object,
        );
        lambdas.set(this.functionElement.lambdaId, functionLamba);
        const isolatedLambdas =
          (yield this.editorStore.graphState.graphManager.lambdaToPureCode(
            lambdas,
            pretty,
          )) as Map<string, string>;
        const grammarText = isolatedLambdas.get(this.functionElement.lambdaId);
        if (grammarText) {
          let grammarString = this.extractLambdaString(grammarText);
          if (
            this.functionElement.body.length > 1 &&
            grammarString.endsWith('}')
          ) {
            // The lambda object to string converter wraps the lambda inside a '{}' in the case where there are more than one expressions inside the function
            // causing a parsing error. To handle this we extract only whats inside the '{}' and add ';' to avoid error.
            grammarString = grammarString.slice(0, -1);
            grammarString = `${
              grammarString.endsWith('\n')
                ? grammarString.slice(0, -1)
                : grammarString
            };`;
          }
          this.setLambdaString(grammarString);
        } else {
          this.setLambdaString('');
        }
        // `firstLoad` flag is used in the first rendering of the function editor (in a `useEffect`)
        // This flag helps block editing while the JSON is converting to text and to avoid reseting parser/compiler error in reveal error
        if (!firstLoad) {
          this.clearErrors();
        }
        this.isConvertingFunctionBodyToString = false;
      } catch (error: unknown) {
        this.editorStore.applicationStore.logger.error(
          CORE_LOG_EVENT.PARSING_PROBLEM,
          error,
        );
        this.isConvertingFunctionBodyToString = false;
      }
    } else {
      this.clearErrors();
      this.setLambdaString('');
    }
  });
}

export class FunctionEditorState extends ElementEditorState {
  selectedTab: FUNCTION_SPEC_TAB;
  functionBodyEditorState: FunctionBodyEditorState;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      selectedTab: observable,
      functionElement: computed,
      setSelectedTab: action,
      reprocess: action,
    });

    assertType(
      element,
      ConcreteFunctionDefinition,
      'Element inside function editor state must be a function',
    );
    this.selectedTab = FUNCTION_SPEC_TAB.GENERAL;
    this.functionBodyEditorState = new FunctionBodyEditorState(
      element,
      this.editorStore,
    );
  }

  get functionElement(): ConcreteFunctionDefinition {
    return guaranteeType(
      this.element,
      ConcreteFunctionDefinition,
      'Element inside function editor state must be a function',
    );
  }
  setSelectedTab(tab: FUNCTION_SPEC_TAB): void {
    this.selectedTab = tab;
  }

  revealCompilationError(compilationError: CompilationError): boolean {
    let revealed = false;
    try {
      if (compilationError.sourceInformation) {
        if (this.selectedTab !== FUNCTION_SPEC_TAB.GENERAL) {
          this.selectedTab = FUNCTION_SPEC_TAB.GENERAL;
        }
        this.functionBodyEditorState.setCompilationError(compilationError);
        revealed = true;
      }
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.warn(
        CORE_LOG_EVENT.COMPILATION_PROBLEM,
        `Can't locate error`,
        error,
      );
    }
    return revealed;
  }

  reprocess(
    newElement: ConcreteFunctionDefinition,
    editorStore: EditorStore,
  ): FunctionEditorState {
    const functionEditorState = new FunctionEditorState(
      editorStore,
      newElement,
    );
    functionEditorState.selectedTab = this.selectedTab;
    return functionEditorState;
  }
}

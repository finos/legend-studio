/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { computed, observable, action, flow } from 'mobx';
import { EditorStore } from 'Stores/EditorStore';
import { LambdaEditorState } from './LambdaEditorState';
import { guaranteeType, assertType } from 'Utilities/GeneralUtil';
import { ElementEditorState } from './ElementEditorState';
import { LOG_EVENT, Log } from 'Utilities/Logger';
import { JsonToGrammarInput } from 'EXEC/grammar/JsonToGrammarInput';
import { executionClient } from 'API/ExecutionClient';
import { deserialize } from 'serializr';
import { GrammarToJsonInput } from 'EXEC/grammar/GrammarToJsonInput';
import { RenderStyle } from 'EXEC/grammar/RenderStyle';
import { LAMBDA_START } from 'MetaModelConst';
import { CompilationError, ParserError } from 'EXEC/ExecutionServerError';
import { PackageableElement } from 'MM/model/packageableElements/PackageableElement';
import { ConcreteFunctionDefinition } from 'MM/model/packageableElements/domain/ConcreteFunctionDefinition';
import { Lambda } from 'MM/model/valueSpecification/raw/Lambda';

export enum FUNCTION_SPEC_TAB {
  GENERAL = 'GENERAL',
  TAGGED_VALUES = 'TAGGED_VALUES',
  STEREOTYPES = 'STEREOTYPES'
}

export class FunctionBodyEditorState extends LambdaEditorState {
  @observable functionElement: ConcreteFunctionDefinition;
  @observable isConvertingFunctionBodyToString = false;

  constructor(functionElement: ConcreteFunctionDefinition) {
    super('', LAMBDA_START);
    this.functionElement = functionElement;
  }

  convertLambdaGrammarStringToObject = flow(function* (this: FunctionBodyEditorState) {
    if (this.lambdaString) {
      try {
        const lambdas = new Map<string, string>();
        lambdas.set(this.functionElement.lambdaId, this.fullLambdaString);
        const result = deserialize(JsonToGrammarInput, yield executionClient.transformGrammarToJSON({ isolatedLambdas: lambdas }));
        const parserError = result.isolatedLambdas?.lambdaErrors?.get(this.functionElement.lambdaId);
        this.setParserError(parserError ? deserialize(ParserError, parserError) : undefined);
        if (!this.parserError) {
          const lambda = result.isolatedLambdas?.lambdas?.get(this.functionElement.lambdaId);
          this.functionElement.body = lambda ? (lambda.body as object[]) : [];
        }
      } catch (error) {
        Log.error(LOG_EVENT.PARSING_PROBLEM, error);
      }
    } else {
      this.clearErrors();
      this.functionElement.body = [];
    }
  });

  convertLambdaObjectToGrammarString = flow(function* (this: FunctionBodyEditorState, renderStyle: RenderStyle, firstLoad: boolean = false) {
    if (!this.functionElement.isStub) {
      this.isConvertingFunctionBodyToString = firstLoad;
      try {
        const lambdas = new Map<string, Lambda>();
        const functionLamba = new Lambda([], this.functionElement.body as object);
        lambdas.set(this.functionElement.lambdaId, functionLamba);
        const result = deserialize(GrammarToJsonInput, yield executionClient.transformJSONToGrammar({ isolatedLambdas: { lambdas }, renderStyle: renderStyle }));
        const grammarText = result.isolatedLambdas?.get(this.functionElement.lambdaId);
        if (grammarText) {
          let grammarString = this.extractLambdaString(grammarText);
          if (this.functionElement.body.length > 1 && grammarString.endsWith('}')) {
            // The lambda object to string converter wraps the lambda inside a '{}' in the case where there are more than one expressions inside the function
            // causing a parsing error. To handle this we extract only whats inside the '{}' and add ';' to avoid error.
            grammarString = grammarString.slice(0, -1);
            grammarString = `${grammarString.endsWith('\n') ? grammarString.slice(0, -1) : grammarString};`;
          }
          this.setLambdaString(grammarString);
        } else {
          this.setLambdaString('');
        }
        // `firstLoad` flag is used in the first rendering of the function editor (in a `useEffect`)
        // This flag helps block editing while the JSON is converting to text and to avoid reseting parser/compiler error in reveal error
        if (!firstLoad) { this.clearErrors() }
        this.isConvertingFunctionBodyToString = false;
      } catch (error) {
        Log.error(LOG_EVENT.PARSING_PROBLEM, error);
        this.isConvertingFunctionBodyToString = false;
      }
    } else {
      this.clearErrors();
      this.setLambdaString('');
    }
  });
}

export class FunctionEditorState extends ElementEditorState {
  @observable selectedTab: FUNCTION_SPEC_TAB;
  functionBodyEditorState: FunctionBodyEditorState;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);
    assertType(element, ConcreteFunctionDefinition, 'Element inside function editor state must be a function');
    this.selectedTab = FUNCTION_SPEC_TAB.GENERAL;
    this.functionBodyEditorState = new FunctionBodyEditorState(element);
  }

  @computed get functionElement(): ConcreteFunctionDefinition { return guaranteeType(this.element, ConcreteFunctionDefinition, 'Element inside function editor state must be a function') }
  @action setSelectedTab(tab: FUNCTION_SPEC_TAB): void { this.selectedTab = tab }

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
    } catch (error) {
      Log.warn(LOG_EVENT.COMPILATION_PROBLEM, `Can't locate error`, error);
    }
    return revealed;
  }

  @action reprocess(newElement: ConcreteFunctionDefinition, editorStore: EditorStore): FunctionEditorState {
    const functionEditorState = new FunctionEditorState(editorStore, newElement);
    functionEditorState.selectedTab = this.selectedTab;
    return functionEditorState;
  }
}

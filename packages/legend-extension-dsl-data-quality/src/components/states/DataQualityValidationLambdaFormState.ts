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

import {
  type GraphManagerState,
  matchFunctionName,
  type ObserverContext,
} from '@finos/legend-graph';
import { DATA_QUALITY_TERMINAL_ASSERTION_HELPER_FUNCTIONS } from '../constants/DataQualityConstants.js';
import { action, computed, makeObservable, observable } from 'mobx';
import type {
  DataQualityValidationAssertionFunction,
  DataQualityValidationCustomHelperFunction,
  DataQualityValidationFilterFunction,
} from '../utils/DataQualityValidationFunction.js';
import { DataQualityValidationFunctionFactory } from '../utils/DataQualityValidationFunctionFactory.js';
import { DataQualityValidationFunctionCloningVisitor } from '../utils/DataQualityValidationFunctionCloningVisitor.js';
import type { LambdaBody } from '../utils/DataQualityLambdaParameterParser.js';
import {
  DataQualityValidateFunctionToPureLambdaVisitor,
  relationRelDeclaration,
} from '../utils/DataQualityValidateFunctionToPureLambdaVisitor.js';
import { DataQualityValidationDescriptionGeneratorVisitor } from '../utils/DataQualityValidationDescriptionGeneratorVisitor.js';
import { DataQualityValidationNameGeneratorVisitor } from '../utils/DataQualityValidationNameGeneratorVisitor.js';
import {
  observe_AssertionFunction,
  observe_FilterFunction,
} from '../utils/DataQualityValidationFunctionObserver.js';

export class DataQualityValidationLambdaFormState {
  rule: DataQualityValidationAssertionFunction;
  private validationFuncFactory: DataQualityValidationFunctionFactory;
  private observerContext: ObserverContext;
  private graphManagerState: GraphManagerState;
  private rootParameters: LambdaBody[] = [relationRelDeclaration];

  constructor(
    graphManagerState: GraphManagerState,
    observerContext: ObserverContext,
  ) {
    this.validationFuncFactory = new DataQualityValidationFunctionFactory(
      graphManagerState.graph,
      observerContext,
    );
    this.graphManagerState = graphManagerState;
    this.observerContext = observerContext;
    this.rule = this.createEmptyRule();

    makeObservable(this, {
      rule: observable,
      addRuleFunction: action,
      assertion: computed,
      otherFunction: computed,
      handleValidationBodyChange: action,
      addOtherFunctionToCurrentRule: action,
      setRootParameters: action,
    });
  }

  createEmptyRule() {
    const assertionFunc = this.validationFuncFactory.createAssertionFunction(
      DATA_QUALITY_TERMINAL_ASSERTION_HELPER_FUNCTIONS.ASSERT_RELATION_EMPTY,
    );
    assertionFunc.parameters.otherParam = observe_FilterFunction(
      this.validationFuncFactory.createFilterFunction(),
    ) as DataQualityValidationCustomHelperFunction;

    return observe_AssertionFunction(assertionFunc);
  }

  setRootParameters(parameters: LambdaBody[]) {
    if (parameters.length) {
      this.rootParameters = parameters;
    }
  }

  addRuleFunction = (body: LambdaBody) => {
    const { function: functionName = '' } = body;
    if (
      matchFunctionName(
        functionName,
        Object.values(DATA_QUALITY_TERMINAL_ASSERTION_HELPER_FUNCTIONS),
      )
    ) {
      this.rule = this.validationFuncFactory.createAssertionFunction(
        DATA_QUALITY_TERMINAL_ASSERTION_HELPER_FUNCTIONS.ASSERT_RELATION_EMPTY,
      );

      this.rule.createParameterFromLambda(
        body,
        this.graphManagerState.graph,
        this.observerContext,
      );
    } else {
      const ruleFunction =
        this.validationFuncFactory.createFunction(functionName);
      ruleFunction.createParameterFromLambda(
        body,
        this.graphManagerState.graph,
        this.observerContext,
      );
      this.rule.parameters.otherParam = observe_FilterFunction(
        ruleFunction as
          | DataQualityValidationFilterFunction
          | DataQualityValidationCustomHelperFunction,
      );
      observe_AssertionFunction(this.rule);
    }
  };

  handleValidationBodyChange = (name: string) => {
    const currentFunc = this.rule.parameters.otherParam;

    if (currentFunc) {
      const visitor = new DataQualityValidationFunctionCloningVisitor(
        name,
        this.validationFuncFactory,
        this.observerContext,
      );

      this.rule.parameters.otherParam = currentFunc.accept<
        | DataQualityValidationFilterFunction
        | DataQualityValidationCustomHelperFunction
      >(visitor);
    }
  };

  getDescription() {
    const visitor = new DataQualityValidationDescriptionGeneratorVisitor();
    if (this.rule.parameters.otherParam) {
      return this.rule.parameters.otherParam.accept(visitor);
    }
    return '';
  }

  getSuggestedName() {
    const visitor = new DataQualityValidationNameGeneratorVisitor();
    if (this.rule.parameters.otherParam) {
      return this.rule.parameters.otherParam.accept(visitor);
    }
    return '';
  }

  toPureLambdaObject() {
    const visitor = new DataQualityValidateFunctionToPureLambdaVisitor(
      this.graphManagerState,
    );

    return {
      body: [this.rule.accept(visitor)],
      parameters: this.rootParameters,
    };
  }

  addOtherFunctionToCurrentRule() {
    const emptyFunction = observe_FilterFunction(
      this.validationFuncFactory.createFilterFunction(),
    ) as DataQualityValidationCustomHelperFunction;
    this.copyVariableRef(this.assertion, emptyFunction);

    this.rule.parameters.otherParam = emptyFunction;
    return emptyFunction;
  }

  get assertion() {
    return this.rule;
  }

  get otherFunction() {
    if (this.rule.parameters.otherParam) {
      return this.rule.parameters.otherParam;
    }

    this.addOtherFunctionToCurrentRule();
    return this.rule.parameters.otherParam;
  }

  private copyVariableRef(
    parent: DataQualityValidationAssertionFunction,
    child: DataQualityValidationCustomHelperFunction,
  ) {
    if (parent.parameters.variableDeclaration) {
      child.parameters.variableDeclaration =
        parent.parameters.variableDeclaration;
      delete parent.parameters.variableDeclaration;
    }
  }
}

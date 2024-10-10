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
  type ObserverContext,
  type Type,
  type ValueSpecification,
  type PureModel,
  type GraphManagerState,
  type RawLambda,
  GenericType,
  GenericTypeExplicitReference,
  observe_ValueSpecification,
  observe_VariableExpression,
  VariableExpression,
  SimpleFunctionExpression,
  PackageableElementExplicitReference,
  LambdaFunction,
  FunctionType,
  CORE_PURE_PATH,
  extractElementNameFromPath,
  Multiplicity,
  PrimitiveInstanceValue,
  PrimitiveType,
  SUPPORTED_FUNCTIONS,
  areMultiplicitiesEqual,
  ParameterValue,
  buildRawLambdaFromLambdaFunction,
} from '@finos/legend-graph';
import {
  addUniqueEntry,
  deleteEntry,
  type Hashable,
  hashArray,
  IllegalStateError,
  uuid,
  isNonNullable,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { makeObservable, observable, action, computed } from 'mobx';
import { generateVariableExpressionMockValue } from './ValueSpecificationEditorHelper.js';
import {
  valueSpecification_setGenericType,
  valueSpecification_setMultiplicity,
} from './ValueSpecificationModifierHelper.js';

export enum PARAMETER_SUBMIT_ACTION {
  RUN = 'RUN',
  EXPORT = 'EXPORT',
  DATA_CUBE = 'DATA_CUBE',
}

enum LAMABA_PARAMETER_HASH_STRUCTURE {
  LAMBDA_PARAMETER_STATE = 'LAMBDA_PARAMETER_STATE',
  LAMBDA_PARAMETERS_STATE = 'LAMBDA_PARAMETERS_STATE',
}

export const buildParametersLetLambdaFunc = (
  graph: PureModel,
  lambdaParametersStates: LambdaParameterState[],
): LambdaFunction => {
  const letlambdaFunction = new LambdaFunction(
    new FunctionType(
      PackageableElementExplicitReference.create(
        graph.getType(CORE_PURE_PATH.ANY),
      ),
      Multiplicity.ONE,
    ),
  );
  letlambdaFunction.expressionSequence = lambdaParametersStates
    .map((queryParamState) => {
      if (queryParamState.value) {
        const letFunc = new SimpleFunctionExpression(
          extractElementNameFromPath(SUPPORTED_FUNCTIONS.LET),
        );
        const letVar = new PrimitiveInstanceValue(
          GenericTypeExplicitReference.create(
            new GenericType(PrimitiveType.STRING),
          ),
        );
        letVar.values = [queryParamState.variableName];
        letFunc.parametersValues.push(letVar);
        letFunc.parametersValues.push(queryParamState.value);
        return letFunc;
      }
      return undefined;
    })
    .filter(isNonNullable);
  return letlambdaFunction;
};

/**
 * For most query executions we will use the stragtical method of sending in `paramValues` as part of the execution input payload.
 * However when the user wants to use a function value as the parameter value, engine does not understand this i.e for date param the functions `now()`, `today()`.
 * Engine Does not support this because those functions require a building of execution nodes inside the execution plan.
 * To continue supporting this execution flow , we will add let statements for parameter values with function values so that they can be evaluated to constants in the execution plan.
 */
export const doesLambdaParameterStateContainFunctionValues = (
  parameterState: LambdaParameterState,
): boolean =>
  parameterState.value instanceof SimpleFunctionExpression &&
  [Multiplicity.ONE, Multiplicity.ZERO_ONE].some((p) =>
    areMultiplicitiesEqual(p, parameterState.parameter.multiplicity),
  );

export const getParameterStatesWithFunctionValues = (
  parameterStates: LambdaParameterState[],
): LambdaParameterState[] =>
  parameterStates.filter(doesLambdaParameterStateContainFunctionValues);

export const buildExecutionParameterValues = (
  paramStates: LambdaParameterState[],
  graphState: GraphManagerState,
): ParameterValue[] =>
  paramStates
    .filter((ps) => !doesLambdaParameterStateContainFunctionValues(ps))
    .map((queryParamState) => {
      const paramValue = new ParameterValue();
      paramValue.name = queryParamState.parameter.name;
      paramValue.value = graphState.graphManager.serializeValueSpecification(
        guaranteeNonNullable(queryParamState.value),
      );
      return paramValue;
    });

export const getExecutionQueryFromRawLambda = (
  rawLambda: RawLambda,
  parameterStates: LambdaParameterState[],
  graphManagerState: GraphManagerState,
): RawLambda => {
  const paramsWithLetStatements =
    getParameterStatesWithFunctionValues(parameterStates);
  if (paramsWithLetStatements.length > 0) {
    const execuLambdaFunction = buildParametersLetLambdaFunc(
      graphManagerState.graph,
      paramsWithLetStatements,
    );
    // remove parameters added as let statements from lambda parameters
    execuLambdaFunction.functionType.parameters = parameterStates
      .filter((ps) => !paramsWithLetStatements.includes(ps))
      .map((e) => e.parameter);
    const execQuery = buildRawLambdaFromLambdaFunction(
      execuLambdaFunction,
      graphManagerState,
    );
    // reset paramaters
    if (Array.isArray(rawLambda.body) && Array.isArray(execQuery.body)) {
      execQuery.body = [
        ...(execQuery.body as object[]),
        ...(rawLambda.body as object[]),
      ];
      return execQuery;
    }
  }
  return rawLambda;
};

export const buildExecutionQueryFromLambdaFunction = (
  lambdaFunction: LambdaFunction,
  parameterStates: LambdaParameterState[],
  graphManagerState: GraphManagerState,
): LambdaFunction => {
  const funcParameterStates =
    getParameterStatesWithFunctionValues(parameterStates);
  if (funcParameterStates.length) {
    // To handle parameter value with function calls we
    // 1. remove those parameters from parameter list
    // 2. add let statements with parameter values
    lambdaFunction.functionType.parameters = parameterStates
      .filter((ps) => !funcParameterStates.includes(ps))
      .map((e) => e.parameter);
    const letsFuncs = buildParametersLetLambdaFunc(
      graphManagerState.graph,
      funcParameterStates,
    );
    lambdaFunction.expressionSequence = [
      ...letsFuncs.expressionSequence,
      ...lambdaFunction.expressionSequence,
    ];
  } else {
    lambdaFunction.functionType.parameters = parameterStates.map(
      (e) => e.parameter,
    );
  }
  return lambdaFunction;
};

export class LambdaParameterState implements Hashable {
  readonly uuid = uuid();
  readonly parameter: VariableExpression;
  readonly graph: PureModel;
  readonly observerContext: ObserverContext;

  value: ValueSpecification | undefined;

  constructor(
    variableExpression: VariableExpression,
    observerContext: ObserverContext,
    graph: PureModel,
  ) {
    makeObservable(this, {
      value: observable,
      setValue: action,
      mockParameterValue: action,
      hashCode: computed,
    });

    this.observerContext = observerContext;
    this.parameter = observe_VariableExpression(variableExpression);
    this.graph = graph;
  }

  get hashCode(): string {
    return hashArray([
      LAMABA_PARAMETER_HASH_STRUCTURE.LAMBDA_PARAMETER_STATE,
      this.parameter,
    ]);
  }

  mockParameterValue(): void {
    this.setValue(
      generateVariableExpressionMockValue(
        this.parameter,
        this.graph,
        this.observerContext,
        { useCurrentDateDependentFunctions: true },
      ),
    );
  }

  setValue(value: ValueSpecification | undefined): void {
    if (value instanceof VariableExpression) {
      throw new IllegalStateError(
        'Can not assign a parameter to another parameter',
      );
    }
    this.value = value
      ? observe_ValueSpecification(value, this.observerContext)
      : undefined;
  }

  changeVariableType(type: Type): void {
    if (type !== this.variableType) {
      valueSpecification_setGenericType(
        this.parameter,
        GenericTypeExplicitReference.create(new GenericType(type)),
      );
      this.mockParameterValue();
    }
  }

  changeMultiplicity(
    variableExpression: VariableExpression,
    mul: Multiplicity,
  ): void {
    const current = this.parameter.multiplicity;
    if (!areMultiplicitiesEqual(current, mul)) {
      valueSpecification_setMultiplicity(variableExpression, mul);
      this.mockParameterValue();
    }
  }

  get variableName(): string {
    return this.parameter.name;
  }

  get variableType(): Type | undefined {
    return this.parameter.genericType?.value.rawType;
  }
}

export class ParameterInstanceValuesEditorState {
  showModal = false;
  submitAction:
    | {
        handler: () => Promise<void>;
        label: string;
      }
    | undefined;

  constructor() {
    makeObservable(this, {
      showModal: observable,
      submitAction: observable,
      setShowModal: action,
      open: action,
      setSubmitAction: action,
    });
  }

  setShowModal(val: boolean): void {
    this.showModal = val;
  }

  setSubmitAction(
    val:
      | {
          handler: () => Promise<void>;
          label: string;
        }
      | undefined,
  ): void {
    this.submitAction = val;
  }

  open(handler: () => Promise<void>, label: string): void {
    this.setSubmitAction({ handler, label });
    this.setShowModal(true);
  }

  close(): void {
    this.setSubmitAction(undefined);
    this.setShowModal(false);
  }
}

export abstract class LambdaParametersState implements Hashable {
  parameterStates: LambdaParameterState[] = [];
  parameterValuesEditorState = new ParameterInstanceValuesEditorState();

  constructor() {
    makeObservable(this, {
      hashCode: computed,
    });
  }

  get hashCode(): string {
    return hashArray([
      LAMABA_PARAMETER_HASH_STRUCTURE.LAMBDA_PARAMETERS_STATE,
      hashArray(this.parameterStates),
    ]);
  }

  addParameter(val: LambdaParameterState): void {
    addUniqueEntry(this.parameterStates, val);
  }

  removeParameter(val: LambdaParameterState): void {
    deleteEntry(this.parameterStates, val);
  }

  setParameters(val: LambdaParameterState[]): void {
    this.parameterStates = val;
  }
}

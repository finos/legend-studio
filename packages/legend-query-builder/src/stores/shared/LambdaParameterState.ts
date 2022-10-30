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
  GenericType,
  GenericTypeExplicitReference,
  observe_ValueSpecification,
  observe_VariableExpression,
  PrimitiveInstanceValue,
  PRIMITIVE_TYPE,
  VariableExpression,
  LambdaFunction,
  CORE_PURE_PATH,
  FunctionType,
  SimpleFunctionExpression,
  SUPPORTED_FUNCTIONS,
  extractElementNameFromPath,
  PackageableElementExplicitReference,
  Multiplicity,
} from '@finos/legend-graph';
import {
  addUniqueEntry,
  deleteEntry,
  type Hashable,
  hashArray,
  IllegalStateError,
  isNonNullable,
  uuid,
} from '@finos/legend-shared';
import { makeObservable, observable, action, computed } from 'mobx';
import { generateVariableExpressionMockValue } from './ValueSpecificationEditorHelper.js';
import {
  valueSpecification_setGenericType,
  valueSpecification_setMultiplicity,
} from './ValueSpecificationModifierHelper.js';

export enum PARAMETER_SUBMIT_ACTION {
  EXECUTE = 'EXECUTE',
  EXPORT = 'EXPORT',
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
            new GenericType(graph.getPrimitiveType(PRIMITIVE_TYPE.STRING)),
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

export class LambdaParameterState implements Hashable {
  readonly uuid = uuid();
  readonly parameter: VariableExpression;
  readonly graph: PureModel;
  readonly observableContext: ObserverContext;

  value: ValueSpecification | undefined;

  constructor(
    variableExpression: VariableExpression,
    observableContext: ObserverContext,
    graph: PureModel,
  ) {
    makeObservable(this, {
      value: observable,
      setValue: action,
      mockParameterValue: action,
      hashCode: computed,
    });
    this.observableContext = observableContext;
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
      generateVariableExpressionMockValue(this.parameter, this.graph),
    );
  }

  setValue(value: ValueSpecification | undefined): void {
    if (value instanceof VariableExpression) {
      throw new IllegalStateError(
        'Can not assign a parameter to another parameter',
      );
    }
    this.value = value
      ? observe_ValueSpecification(value, this.observableContext)
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
    lowerBound: number,
    uppderBound: number | undefined,
  ): void {
    const current = this.parameter.multiplicity;
    if (
      current.lowerBound !== lowerBound ||
      current.upperBound !== uppderBound
    ) {
      valueSpecification_setMultiplicity(
        variableExpression,
        this.graph.getMultiplicity(lowerBound, uppderBound),
      );
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

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
  type InstanceValue,
  type Multiplicity,
  type ObserverContext,
  type Type,
  type ValueSpecification,
  type PureModel,
  CollectionInstanceValue,
  Enumeration,
  EnumValueExplicitReference,
  EnumValueInstanceValue,
  GenericType,
  GenericTypeExplicitReference,
  getEnumValue,
  observe_ValueSpecification,
  observe_VariableExpression,
  PrimitiveInstanceValue,
  PrimitiveType,
  PRIMITIVE_TYPE,
  VariableExpression,
  LambdaFunction,
  TYPICAL_MULTIPLICITY_TYPE,
  CORE_PURE_PATH,
  FunctionType,
  SimpleFunctionExpression,
  SUPPORTED_FUNCTIONS,
  extractElementNameFromPath,
} from '@finos/legend-graph';
import {
  addUniqueEntry,
  deleteEntry,
  IllegalStateError,
  isNonNullable,
  Randomizer,
  uuid,
} from '@finos/legend-shared';
import { makeObservable, observable, action } from 'mobx';
import {
  genericType_setRawType,
  multiplicity_setLowerBound,
  multiplicity_setUpperBound,
} from './ValueSpecificationModifierHelper.js';
import { format, addDays } from 'date-fns';
import { DATE_FORMAT, DATE_TIME_FORMAT } from '../const.js';

export enum PARAMETER_SUBMIT_ACTION {
  EXECUTE = 'EXECUTE',
  EXPORT = 'EXPORT',
}

export const createMockEnumerationProperty = (
  enumeration: Enumeration,
): string =>
  new Randomizer().getRandomItemInCollection(enumeration.values)?.name ?? '';

const createMockPrimitiveProperty = (
  primitiveType: PrimitiveType,
  propertyName: string,
): string | number | boolean => {
  const randomizer = new Randomizer();
  switch (primitiveType.name) {
    case PRIMITIVE_TYPE.BOOLEAN:
      return randomizer.getRandomItemInCollection([true, false]) ?? true;
    case PRIMITIVE_TYPE.FLOAT:
      return randomizer.getRandomFloat();
    case PRIMITIVE_TYPE.DECIMAL:
      return randomizer.getRandomDouble();
    case PRIMITIVE_TYPE.NUMBER:
    case PRIMITIVE_TYPE.INTEGER:
      return randomizer.getRandomWholeNumber(100);
    // NOTE that `Date` is the umbrella type that comprises `StrictDate` and `DateTime`, but for simplicity, we will generate `Date` as `StrictDate`
    case PRIMITIVE_TYPE.DATE:
    case PRIMITIVE_TYPE.STRICTDATE:
      return format(
        randomizer.getRandomDate(
          new Date(Date.now()),
          addDays(Date.now(), 100),
        ),
        DATE_FORMAT,
      );
    case PRIMITIVE_TYPE.DATETIME:
      return format(
        randomizer.getRandomDate(
          new Date(Date.now()),
          addDays(Date.now(), 100),
        ),
        DATE_TIME_FORMAT,
      );
    case PRIMITIVE_TYPE.STRING:
    default:
      return `${propertyName} ${randomizer.getRandomWholeNumber(100)}`;
  }
};

export const buildParametersLetLambdaFunc = (
  graph: PureModel,
  lambdaParametersStates: LambdaParameterState[],
): LambdaFunction => {
  const multiplicityOne = graph.getTypicalMultiplicity(
    TYPICAL_MULTIPLICITY_TYPE.ONE,
  );
  const typeString = graph.getPrimitiveType(PRIMITIVE_TYPE.STRING);
  const typeAny = graph.getType(CORE_PURE_PATH.ANY);
  const letlambdaFunction = new LambdaFunction(
    new FunctionType(typeAny, multiplicityOne),
  );
  letlambdaFunction.expressionSequence = lambdaParametersStates
    .map((queryParamState) => {
      if (queryParamState.value) {
        const letFunc = new SimpleFunctionExpression(
          extractElementNameFromPath(SUPPORTED_FUNCTIONS.LET),
          multiplicityOne,
        );
        const letVar = new PrimitiveInstanceValue(
          GenericTypeExplicitReference.create(new GenericType(typeString)),
          multiplicityOne,
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

export class LambdaParameterState {
  readonly uuid = uuid();
  readonly parameter: VariableExpression;
  observableContext: ObserverContext;
  value: ValueSpecification | undefined;

  constructor(
    variableExpression: VariableExpression,
    observableContext: ObserverContext,
  ) {
    makeObservable(this, {
      value: observable,
      setValue: action,
      mockParameterValue: action,
    });
    this.observableContext = observableContext;
    this.parameter = observe_VariableExpression(variableExpression);
  }

  mockParameterValue(): void {
    this.setValue(
      this.generateMockValues(
        this.parameter.genericType?.value.rawType,
        this.parameter.multiplicity,
      ),
    );
  }

  private generateMockValues(
    varType: Type | undefined,
    multiplicity: Multiplicity,
  ): InstanceValue | undefined {
    if ((!multiplicity.upperBound || multiplicity.upperBound > 1) && varType) {
      return new CollectionInstanceValue(
        multiplicity,
        GenericTypeExplicitReference.create(new GenericType(varType)),
      );
    }
    if (varType instanceof PrimitiveType) {
      const primitiveInst = new PrimitiveInstanceValue(
        GenericTypeExplicitReference.create(new GenericType(varType)),
        multiplicity,
      );
      primitiveInst.values = [
        createMockPrimitiveProperty(
          varType,
          this.parameter.name === '' ? 'myVar' : this.parameter.name,
        ),
      ];
      return primitiveInst;
    } else if (varType instanceof Enumeration) {
      const enumValueInstance = new EnumValueInstanceValue(
        GenericTypeExplicitReference.create(new GenericType(varType)),
        multiplicity,
      );
      const mock = createMockEnumerationProperty(varType);
      if (mock !== '') {
        enumValueInstance.values = [
          EnumValueExplicitReference.create(getEnumValue(varType, mock)),
        ];
      }
      return enumValueInstance;
    }
    return undefined;
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
      const genricType = this.parameter.genericType?.value;
      if (genricType) {
        genericType_setRawType(genricType, type);
      }
      this.mockParameterValue();
    }
  }

  changeMultiplicity(
    lowerBound: number,
    uppderBound: number | undefined,
  ): void {
    const current = this.parameter.multiplicity;
    if (
      current.lowerBound !== lowerBound ||
      current.upperBound !== uppderBound
    ) {
      multiplicity_setLowerBound(current, lowerBound);
      multiplicity_setUpperBound(current, uppderBound);
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
export class LambdaParametersState {
  parameterStates: LambdaParameterState[] = [];
  parameterValuesEditorState = new ParameterInstanceValuesEditorState();

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

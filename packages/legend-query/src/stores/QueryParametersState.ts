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
import format from 'date-fns/format';
import addDays from 'date-fns/addDays';
import {
  type InstanceValue,
  type Type,
  type ValueSpecification,
  EnumValueExplicitReference,
  EnumValueInstanceValue,
  Enumeration,
  CollectionInstanceValue,
  PrimitiveType,
  PrimitiveInstanceValue,
  GenericType,
  GenericTypeExplicitReference,
  Multiplicity,
  PRIMITIVE_TYPE,
  VariableExpression,
  observe_VariableExpression,
  observe_ValueSpecification,
} from '@finos/legend-graph';
import {
  addUniqueEntry,
  deleteEntry,
  IllegalStateError,
  Randomizer,
  uuid,
} from '@finos/legend-shared';
import { observable, makeObservable, action } from 'mobx';
import type { QueryBuilderState } from './QueryBuilderState';
import { DATE_FORMAT, DATE_TIME_FORMAT } from '@finos/legend-application';
import {
  multiplicity_setLowerBound,
  multiplicity_setUpperBound,
  genericType_setRawType,
} from './QueryBuilderValueSpecificationModifierHelper';

export enum QUERY_BUILDER_PARAMETER_TREE_DND_TYPE {
  VARIABLE = 'VARIABLE',
}

export interface QueryBuilderParameterDragSource {
  variable: QueryParameterState;
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

export class QueryParameterState {
  readonly uuid = uuid();
  readonly queryParameterState: QueryParametersState;
  readonly parameter: VariableExpression;
  value: ValueSpecification | undefined;

  constructor(
    queryParameterState: QueryParametersState,
    variableExpression: VariableExpression,
  ) {
    makeObservable(this, {
      value: observable,
      setValue: action,
      mockParameterValue: action,
    });

    this.queryParameterState = queryParameterState;
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
          EnumValueExplicitReference.create(varType.getValue(mock)),
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
      ? observe_ValueSpecification(
          value,
          this.queryParameterState.queryBuilderState.observableContext,
        )
      : undefined;
  }

  static createDefault(
    queryParameterState: QueryParametersState,
  ): QueryParameterState {
    return new QueryParameterState(
      queryParameterState,
      new VariableExpression(
        '',
        new Multiplicity(1, 1),
        GenericTypeExplicitReference.create(
          new GenericType(
            queryParameterState.queryBuilderState.graphManagerState.graph.getPrimitiveType(
              PRIMITIVE_TYPE.STRING,
            ),
          ),
        ),
      ),
    );
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

export enum PARAMETER_SUBMIT_ACTION {
  EXECUTE = 'EXECUTE',
  EXPORT = 'EXPORT',
}

export class ParameterInstanceValuesEditorState {
  showModal = false;
  submitAction:
    | {
        handler: () => Promise<void>;
        label: PARAMETER_SUBMIT_ACTION;
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
          label: PARAMETER_SUBMIT_ACTION;
        }
      | undefined,
  ): void {
    this.submitAction = val;
  }

  open(handler: () => Promise<void>, label: PARAMETER_SUBMIT_ACTION): void {
    this.setSubmitAction({ handler, label });
    this.setShowModal(true);
  }

  close(): void {
    this.setSubmitAction(undefined);
    this.setShowModal(false);
  }
}

export class QueryParametersState {
  selectedParameter: QueryParameterState | undefined;
  queryBuilderState: QueryBuilderState;
  parameters: QueryParameterState[] = [];
  parameterValuesEditorState = new ParameterInstanceValuesEditorState();

  constructor(queryBuilderState: QueryBuilderState) {
    makeObservable(this, {
      parameterValuesEditorState: observable,
      parameters: observable,
      selectedParameter: observable,
      setSelectedParameter: action,
      addParameter: action,
      removeParameter: action,
    });

    this.queryBuilderState = queryBuilderState;
  }

  setSelectedParameter(val: QueryParameterState | undefined): void {
    this.selectedParameter = val;
  }

  addParameter(val: QueryParameterState): void {
    addUniqueEntry(this.parameters, val);
  }

  removeParameter(val: QueryParameterState): void {
    deleteEntry(this.parameters, val);
  }
}

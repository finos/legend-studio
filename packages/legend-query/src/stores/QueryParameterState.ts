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
import type { InstanceValue, Type } from '@finos/legend-graph';
import {
  CollectionInstanceValue,
  PrimitiveType,
  PrimitiveInstanceValue,
  GenericType,
  GenericTypeExplicitReference,
  Multiplicity,
  PRIMITIVE_TYPE,
  VariableExpression,
} from '@finos/legend-graph';
import {
  addUniqueEntry,
  deleteEntry,
  Randomizer,
  uuid,
} from '@finos/legend-shared';
import { observable, makeObservable, action } from 'mobx';
import type { QueryBuilderState } from './QueryBuilderState';
import { DATE_FORMAT, DATE_TIME_FORMAT } from '@finos/legend-application';

export enum QUERY_BUILDER_PARAMETER_TREE_DND_TYPE {
  VARIABLE = 'VARIABLE',
}

export interface QueryBuilderParameterDragSource {
  variable: ParameterState;
}

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

export class ParameterState {
  uuid = uuid();
  queryParameterState: QueryParameterState;
  parameter: VariableExpression;
  values: InstanceValue | undefined;

  constructor(
    queryParameterState: QueryParameterState,
    variableExpression: VariableExpression,
  ) {
    makeObservable(this, {
      parameter: observable,
      values: observable,
      setValues: action,
      mockParameterValues: action,
    });
    this.queryParameterState = queryParameterState;
    this.parameter = variableExpression;
  }

  mockParameterValues(): void {
    this.setValues(
      this.mockValues(
        this.parameter.genericType?.value.rawType,
        this.parameter.multiplicity,
      ),
    );
  }

  mockValues(
    varType: Type | undefined,
    multiplicity: Multiplicity,
  ): InstanceValue | undefined {
    if (varType instanceof PrimitiveType) {
      if (!multiplicity.upperBound || multiplicity.upperBound > 1) {
        const collectionInst = new CollectionInstanceValue(
          multiplicity,
          GenericTypeExplicitReference.create(new GenericType(varType)),
        );
        return collectionInst;
      } else {
        const primitiveInst = new PrimitiveInstanceValue(
          GenericTypeExplicitReference.create(new GenericType(varType)),
          multiplicity,
        );
        if (multiplicity.lowerBound !== 0) {
          primitiveInst.values = [
            createMockPrimitiveProperty(varType, this.parameter.name),
          ];
        }
        return primitiveInst;
      }
    }
    return undefined;
  }

  setValues(values: InstanceValue | undefined): void {
    this.values = values;
  }

  static createDefault(
    queryParameterState: QueryParameterState,
  ): ParameterState {
    return new ParameterState(
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
      this.parameter.genericType?.value.setRawType(type);
      this.mockParameterValues();
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
      current.setLowerBound(lowerBound);
      current.setUpperBound(uppderBound);
      this.mockParameterValues();
    }
  }

  get variableName(): string {
    return this.parameter.name;
  }

  get variableType(): Type | undefined {
    return this.parameter.genericType?.value.rawType;
  }
}

export class QueryParameterState {
  panelIsOpen = false;
  selectedParameter: ParameterState | undefined;
  queryBuilderState: QueryBuilderState;
  parameters: ParameterState[] = [];

  constructor(queryBuilderState: QueryBuilderState) {
    makeObservable(this, {
      panelIsOpen: observable,
      parameters: observable,
      selectedParameter: observable,
      setPanelIsOpen: action,
      setSelectedParameter: action,
      addParameter: action,
      removeParameter: action,
    });

    this.queryBuilderState = queryBuilderState;
  }

  setPanelIsOpen(value: boolean): void {
    this.panelIsOpen = value;
  }

  setSelectedParameter(val: ParameterState | undefined): void {
    this.selectedParameter = val;
  }

  addParameter(val: ParameterState): void {
    addUniqueEntry(this.parameters, val);
  }

  removeParameter(val: ParameterState): void {
    deleteEntry(this.parameters, val);
  }
}

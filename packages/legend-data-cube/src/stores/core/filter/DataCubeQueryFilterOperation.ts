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
  formatDate,
  guaranteeNonNullable,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import type { DataCubeOperationValue } from '../DataCubeQueryEngine.js';
import type { DataCubeQuerySnapshotFilterCondition } from '../DataCubeQuerySnapshot.js';
import type { DataCubeColumn } from '../models/DataCubeColumn.js';
import {
  DATE_FORMAT,
  DATE_TIME_FORMAT,
  PRIMITIVE_TYPE,
  V1_AppliedFunction,
  V1_AppliedProperty,
  V1_CBoolean,
  V1_CDateTime,
  V1_CDecimal,
  V1_CFloat,
  V1_CInteger,
  V1_CStrictDate,
  V1_CStrictTime,
  V1_CString,
  V1_PrimitiveValueSpecification,
} from '@finos/legend-graph';

// --------------------------------- UTILITIES ---------------------------------

export function generateDefaultFilterConditionPrimitiveTypeValue(
  type: string,
): unknown {
  switch (type) {
    case PRIMITIVE_TYPE.STRING:
      return '';
    case PRIMITIVE_TYPE.BOOLEAN:
      return false;
    case PRIMITIVE_TYPE.BYTE:
      return btoa('');
    case PRIMITIVE_TYPE.NUMBER:
    case PRIMITIVE_TYPE.DECIMAL:
    case PRIMITIVE_TYPE.FLOAT:
    case PRIMITIVE_TYPE.INTEGER:
    case PRIMITIVE_TYPE.BINARY:
      return 0;
    case PRIMITIVE_TYPE.DATE:
    case PRIMITIVE_TYPE.STRICTDATE:
      return formatDate(new Date(Date.now()), DATE_FORMAT);
    case PRIMITIVE_TYPE.DATETIME:
      return formatDate(new Date(Date.now()), DATE_TIME_FORMAT);
    default:
      throw new UnsupportedOperationError(
        `Can't generate value for type '${type}'`,
      );
  }
}

export function getFilterOperation(
  operator: string,
  operators: DataCubeQueryFilterOperation[],
) {
  return guaranteeNonNullable(
    operators.find((op) => op.operator === operator),
    `Can't find filter operation '${operator}'`,
  );
}

function _primitiveType(type: V1_PrimitiveValueSpecification): string {
  switch (true) {
    case type instanceof V1_CString:
      return PRIMITIVE_TYPE.STRING;
    case type instanceof V1_CBoolean:
      return PRIMITIVE_TYPE.BOOLEAN;
    case type instanceof V1_CDecimal:
      return PRIMITIVE_TYPE.DECIMAL;
    case type instanceof V1_CInteger:
      return PRIMITIVE_TYPE.INTEGER;
    case type instanceof V1_CFloat:
      return PRIMITIVE_TYPE.FLOAT;
    case type instanceof V1_CStrictDate:
      return PRIMITIVE_TYPE.STRICTDATE;
    case type instanceof V1_CDateTime:
      return PRIMITIVE_TYPE.DATETIME;
    case type instanceof V1_CStrictTime:
      return PRIMITIVE_TYPE.STRICTTIME;
    default:
      throw new UnsupportedOperationError(
        `Unsupported primitive value '${type}'`,
      );
  }
}

function _primitiveValue(type: V1_PrimitiveValueSpecification): any {
  switch (true) {
    case type instanceof V1_CString:
    case type instanceof V1_CBoolean:
    case type instanceof V1_CDecimal:
    case type instanceof V1_CInteger:
    case type instanceof V1_CFloat:
    case type instanceof V1_CStrictDate:
    case type instanceof V1_CDateTime:
    case type instanceof V1_CStrictTime:
      return type.value;
    default:
      throw new UnsupportedOperationError(
        `Unsupported primitive value '${type}'`,
      );
  }
}

// --------------------------------- CONTRACT ---------------------------------

export abstract class DataCubeQueryFilterOperation {
  abstract get label(): React.ReactNode;
  abstract get textLabel(): string;
  abstract get description(): string;
  abstract get operator(): string;

  abstract isCompatibleWithColumn(column: DataCubeColumn): boolean;
  abstract isCompatibleWithValue(value: DataCubeOperationValue): boolean;

  abstract generateDefaultValue(
    column: DataCubeColumn,
  ): DataCubeOperationValue | undefined;

  buildConditionSnapshot(
    expression: V1_AppliedFunction,
  ): DataCubeQuerySnapshotFilterCondition | undefined {
    const property = expression.parameters[0];
    const value = expression.parameters[1];
    if (property instanceof V1_AppliedProperty) {
      let filterConditionSnapshot = {
        name: property.property,
        operator: this.operator,
        type: property.class!, // TODO: fix this in engine (missing clas in V1_AppliedProperty)
      } as DataCubeQuerySnapshotFilterCondition;

      if (value instanceof V1_PrimitiveValueSpecification) {
        filterConditionSnapshot.value = {
          type: _primitiveType(value),
          value: _primitiveValue(value),
        } satisfies DataCubeOperationValue;
      } else if (value instanceof V1_AppliedProperty) {
        filterConditionSnapshot.value = {
          value: value.property,
          type: value.class!,
        } satisfies DataCubeOperationValue;
      } else if (
        value instanceof V1_AppliedFunction &&
        value.function == 'toLower'
      ) {
        const actualValue = value.parameters[0];
        if (actualValue instanceof V1_PrimitiveValueSpecification) {
          filterConditionSnapshot.value = {
            type: _primitiveType(actualValue),
            value: _primitiveValue(actualValue),
          } satisfies DataCubeOperationValue;
        } else if (actualValue instanceof V1_AppliedProperty) {
          filterConditionSnapshot.value = {
            value: actualValue.property,
            type: actualValue.class!,
          } satisfies DataCubeOperationValue;
        }
      } else {
        filterConditionSnapshot.value = undefined;
      }
      return filterConditionSnapshot satisfies DataCubeQuerySnapshotFilterCondition;
    }
    return undefined;
  }

  abstract buildConditionExpression(
    condition: DataCubeQuerySnapshotFilterCondition,
  ): V1_AppliedFunction | undefined;
}

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
  DataCubeQueryFilterOperation,
  generateDefaultFilterConditionPrimitiveTypeValue,
} from './DataCubeQueryFilterOperation.js';
import type { DataCubeQuerySnapshotFilterCondition } from '../DataCubeQuerySnapshot.js';
import type { DataCubeColumn } from '../model/DataCubeColumn.js';
import {
  DataCubeColumnDataType,
  DataCubeFunction,
  DataCubeQueryFilterOperator,
  ofDataType,
  type DataCubeOperationValue,
} from '../DataCubeQueryEngine.js';
import {
  _function,
  _functionName,
  _property,
  _value,
  _var,
} from '../DataCubeQueryBuilderUtils.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  matchFunctionName,
  V1_AppliedFunction,
  V1_PrimitiveValueSpecification,
  type V1_AppliedProperty,
} from '@finos/legend-graph';
import {
  _buildConditionSnapshotProperty,
  _dataCubeOperationValue,
} from '../DataCubeQuerySnapshotBuilderUtils.js';

export class DataCubeQueryFilterOperation__EqualCaseInsensitive extends DataCubeQueryFilterOperation {
  override get label() {
    return '= (case-insensitive)';
  }

  override get textLabel() {
    return '= (case-insensitive)';
  }

  override get description() {
    return 'equals (case-insensitive)';
  }

  override get operator() {
    return DataCubeQueryFilterOperator.EQUAL_CASE_INSENSITIVE;
  }

  isCompatibleWithColumn(column: DataCubeColumn) {
    return ofDataType(column.type, [DataCubeColumnDataType.TEXT]);
  }

  isCompatibleWithValue(value: DataCubeOperationValue) {
    return (
      ofDataType(value.type, [DataCubeColumnDataType.TEXT]) &&
      value.value !== undefined &&
      !Array.isArray(value.value)
    );
  }

  generateDefaultValue(column: DataCubeColumn) {
    return {
      type: column.type,
      value: generateDefaultFilterConditionPrimitiveTypeValue(column.type),
    };
  }

  buildConditionSnapshot(expression: V1_AppliedFunction) {
    if (
      expression.parameters[0] instanceof V1_AppliedFunction &&
      expression.parameters[1] instanceof V1_AppliedFunction &&
      matchFunctionName(
        expression.parameters[0].function,
        DataCubeFunction.TO_LOWERCASE,
      ) &&
      matchFunctionName(expression.function, DataCubeFunction.EQUAL)
    ) {
      const func = expression;
      func.parameters = [
        expression.parameters[0].parameters[0]!,
        expression.parameters[1].parameters[0]!,
      ];
      const value = func.parameters[1];
      const filterConditionSnapshot = _buildConditionSnapshotProperty(
        func.parameters[0] as V1_AppliedProperty,
        this.operator,
      );
      if (value instanceof V1_PrimitiveValueSpecification) {
        filterConditionSnapshot.value = _dataCubeOperationValue(value);
        return filterConditionSnapshot satisfies DataCubeQuerySnapshotFilterCondition;
      }
      return undefined;
    }
    return undefined;
  }

  buildConditionExpression(condition: DataCubeQuerySnapshotFilterCondition) {
    const variable = _var();
    return _function(_functionName(DataCubeFunction.EQUAL), [
      _function(_functionName(DataCubeFunction.TO_LOWERCASE), [
        _property(condition.name, variable),
      ]),
      _function(_functionName(DataCubeFunction.TO_LOWERCASE), [
        _value(guaranteeNonNullable(condition.value), variable),
      ]),
    ]);
  }
}

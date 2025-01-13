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
import { DataCubeQueryFilterOperation } from './DataCubeQueryFilterOperation.js';
import type { DataCubeQuerySnapshotFilterCondition } from '../DataCubeQuerySnapshot.js';
import type { DataCubeColumn } from '../model/DataCubeColumn.js';
import {
  DataCubeColumnDataType,
  DataCubeFunction,
  DataCubeOperationAdvancedValueType,
  DataCubeQueryFilterOperator,
  ofDataType,
  type DataCubeOperationValue,
} from '../DataCubeQueryEngine.js';
import {
  _function,
  _functionName,
  _not,
  _property,
  _value,
  _var,
} from '../DataCubeQueryBuilderUtils.js';
import { guaranteeNonNullable, isString } from '@finos/legend-shared';
import {
  matchFunctionName,
  V1_AppliedFunction,
  V1_AppliedProperty,
} from '@finos/legend-graph';
import { _buildConditionSnapshotProperty } from '../DataCubeQuerySnapshotBuilderUtils.js';

export class DataCubeQueryFilterOperation__NotEqualCaseInsensitiveColumn extends DataCubeQueryFilterOperation {
  override get label() {
    return '!= (case-insensitive) value in column';
  }

  override get textLabel() {
    return '!= (case-insensitive) value in column';
  }

  override get description() {
    return 'does not equal (case-insensitive) value in column';
  }

  override get operator() {
    return DataCubeQueryFilterOperator.NOT_EQUAL_CASE_INSENSITIVE_COLUMN;
  }

  isCompatibleWithColumn(column: DataCubeColumn) {
    return ofDataType(column.type, [DataCubeColumnDataType.TEXT]);
  }

  isCompatibleWithValue(value: DataCubeOperationValue) {
    return (
      value.type === DataCubeOperationAdvancedValueType.COLUMN &&
      value.value !== undefined &&
      isString(value.value)
    );
  }

  generateDefaultValue(column: DataCubeColumn) {
    return {
      type: DataCubeOperationAdvancedValueType.COLUMN,
      value: column.name,
    };
  }

  buildConditionSnapshot(
    expression: V1_AppliedFunction,
    columnGetter: (name: string) => DataCubeColumn | undefined,
  ) {
    if (
      matchFunctionName(expression.function, DataCubeFunction.NOT) &&
      expression.parameters[0] instanceof V1_AppliedFunction &&
      expression.parameters[0].parameters[0] instanceof V1_AppliedFunction &&
      expression.parameters[0].parameters[1] instanceof V1_AppliedFunction &&
      matchFunctionName(
        expression.parameters[0].function,
        DataCubeFunction.EQUAL,
      ) &&
      matchFunctionName(
        expression.parameters[0].parameters[0].function,
        DataCubeFunction.TO_LOWERCASE,
      )
    ) {
      const func = expression.parameters[0];
      func.parameters = [
        expression.parameters[0].parameters[0].parameters[0]!,
        expression.parameters[0].parameters[1].parameters[0]!,
      ];
      const value = func.parameters[1];
      const filterConditionSnapshot = _buildConditionSnapshotProperty(
        func.parameters[0] as V1_AppliedProperty,
        this.operator,
      );
      if (value instanceof V1_AppliedProperty) {
        filterConditionSnapshot.value = {
          value: value.property,
          type: DataCubeOperationAdvancedValueType.COLUMN,
        } satisfies DataCubeOperationValue;
        return filterConditionSnapshot satisfies DataCubeQuerySnapshotFilterCondition;
      }
      return undefined;
    }
    return undefined;
  }

  buildConditionExpression(condition: DataCubeQuerySnapshotFilterCondition) {
    const variable = _var();
    return _not(
      _function(_functionName(DataCubeFunction.EQUAL), [
        _function(_functionName(DataCubeFunction.TO_LOWERCASE), [
          _property(condition.name, variable),
        ]),
        _function(_functionName(DataCubeFunction.TO_LOWERCASE), [
          _value(guaranteeNonNullable(condition.value), variable),
        ]),
      ]),
    );
  }
}

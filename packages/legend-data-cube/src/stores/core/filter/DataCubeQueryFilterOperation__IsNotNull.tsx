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
  DataCubeQueryFilterOperator,
  ofDataType,
  type DataCubeOperationValue,
} from '../DataCubeQueryEngine.js';
import {
  _function,
  _functionName,
  _not,
  _property,
} from '../DataCubeQueryBuilderUtils.js';
import {
  matchFunctionName,
  V1_AppliedFunction,
  type V1_AppliedProperty,
} from '@finos/legend-graph';
import { _buildConditionSnapshotProperty } from '../DataCubeQuerySnapshotBuilderUtils.js';

export class DataCubeQueryFilterOperation__IsNotNull extends DataCubeQueryFilterOperation {
  override get label() {
    return 'is not null';
  }

  override get textLabel() {
    return '!= NULL';
  }

  override get description() {
    return 'is not NULL';
  }

  override get operator() {
    return DataCubeQueryFilterOperator.IS_NOT_NULL;
  }

  isCompatibleWithColumn(column: DataCubeColumn) {
    return ofDataType(column.type, [
      DataCubeColumnDataType.TEXT,
      DataCubeColumnDataType.NUMBER,
      DataCubeColumnDataType.DATE,
      DataCubeColumnDataType.TIME,
    ]);
  }

  isCompatibleWithValue(value: DataCubeOperationValue) {
    return (
      ofDataType(value.type, [
        DataCubeColumnDataType.TEXT,
        DataCubeColumnDataType.NUMBER,
        DataCubeColumnDataType.DATE,
        DataCubeColumnDataType.TIME,
      ]) &&
      value.value !== undefined &&
      !Array.isArray(value.value)
    );
  }

  generateDefaultValue(column: DataCubeColumn) {
    return undefined;
  }

  buildConditionSnapshot(expression: V1_AppliedFunction) {
    if (
      matchFunctionName(expression.function, DataCubeFunction.NOT) &&
      expression.parameters[0] instanceof V1_AppliedFunction &&
      matchFunctionName(
        expression.parameters[0].function,
        DataCubeFunction.IS_EMPTY,
      )
    ) {
      const filterConditionSnapshot = _buildConditionSnapshotProperty(
        expression.parameters[0].parameters[0] as V1_AppliedProperty,
        this.operator,
      );
      filterConditionSnapshot.value = undefined;
      return filterConditionSnapshot;
    }
    return undefined;
  }

  buildConditionExpression(condition: DataCubeQuerySnapshotFilterCondition) {
    return _not(
      _function(_functionName(DataCubeFunction.IS_EMPTY), [
        _property(condition.name),
      ]),
    );
  }
}

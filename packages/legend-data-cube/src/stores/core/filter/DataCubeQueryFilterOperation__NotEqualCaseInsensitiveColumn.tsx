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
import type { DataCubeSnapshotFilterCondition } from '../DataCubeSnapshot.js';
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
} from '../DataCubeQueryBuilderUtils.js';
import { isString, returnUndefOnError } from '@finos/legend-shared';
import { type V1_AppliedFunction } from '@finos/legend-graph';
import {
  _filterCondition_caseSensitive,
  _unwrapNotFilterCondition,
} from '../DataCubeSnapshotBuilderUtils.js';

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
      value.value !== undefined &&
      value.type === DataCubeOperationAdvancedValueType.COLUMN &&
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
    columnGetter: (name: string) => DataCubeColumn,
  ) {
    return this._finalizeConditionSnapshot(
      _filterCondition_caseSensitive(
        returnUndefOnError(() => _unwrapNotFilterCondition(expression)),
        DataCubeFunction.EQUAL,
        columnGetter,
      ),
    );
  }

  buildConditionExpression(condition: DataCubeSnapshotFilterCondition) {
    return _not(
      _function(_functionName(DataCubeFunction.EQUAL), [
        _function(_functionName(DataCubeFunction.TO_LOWERCASE), [
          _function(_functionName(DataCubeFunction.TO_ONE), [
            _property(condition.name),
          ]),
        ]),
        _function(_functionName(DataCubeFunction.TO_LOWERCASE), [
          _function(_functionName(DataCubeFunction.TO_ONE), [
            _value(condition.value),
          ]),
        ]),
      ]),
    );
  }
}

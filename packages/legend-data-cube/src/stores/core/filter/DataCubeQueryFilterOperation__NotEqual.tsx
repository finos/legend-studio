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
  isPrimitiveType,
  ofDataType,
  _defaultPrimitiveTypeValue,
  type DataCubeOperationValue,
} from '../DataCubeQueryEngine.js';
import {
  _function,
  _functionName,
  _not,
  _property,
  _value,
} from '../DataCubeQueryBuilderUtils.js';
import { returnUndefOnError } from '@finos/legend-shared';
import { type V1_AppliedFunction } from '@finos/legend-graph';
import {
  _unwrapNotFilterCondition,
  _filterCondition_base,
} from '../DataCubeQuerySnapshotBuilderUtils.js';

export class DataCubeQueryFilterOperation__NotEqual extends DataCubeQueryFilterOperation {
  override get label() {
    return '!=';
  }

  override get textLabel() {
    return '!=';
  }

  override get description() {
    return 'does not equal';
  }

  override get operator() {
    return DataCubeQueryFilterOperator.NOT_EQUAL;
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
      value.value !== undefined &&
      isPrimitiveType(value.type) &&
      ofDataType(value.type, [
        DataCubeColumnDataType.TEXT,
        DataCubeColumnDataType.NUMBER,
        DataCubeColumnDataType.DATE,
        DataCubeColumnDataType.TIME,
      ]) &&
      !Array.isArray(value.value)
    );
  }

  generateDefaultValue(column: DataCubeColumn) {
    return {
      type: column.type,
      value: _defaultPrimitiveTypeValue(column.type),
    };
  }

  buildConditionSnapshot(
    expression: V1_AppliedFunction,
    columnGetter: (name: string) => DataCubeColumn,
  ) {
    const unwrapped = returnUndefOnError(() =>
      _unwrapNotFilterCondition(expression),
    );
    if (!unwrapped) {
      return undefined;
    }
    return this._finalizeConditionSnapshot(
      _filterCondition_base(unwrapped, columnGetter, DataCubeFunction.EQUAL),
    );
  }

  buildConditionExpression(condition: DataCubeQuerySnapshotFilterCondition) {
    return _not(
      _function(_functionName(DataCubeFunction.EQUAL), [
        _property(condition.name),
        _value(condition.value),
      ]),
    );
  }
}

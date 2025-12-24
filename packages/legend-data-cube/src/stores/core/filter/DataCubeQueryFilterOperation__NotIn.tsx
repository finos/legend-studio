/**
 * Copyright (c) 2025-present, Goldman Sachs
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
  DataCubeQueryFilterOperator,
  isPrimitiveType,
  ofDataType,
  _defaultPrimitiveTypeValue,
  DataCubeOperationAdvancedValueType,
  type DataCubeOperationValue,
} from '../DataCubeQueryEngine.js';
import {
  _function,
  _functionName,
  _not,
  _property,
  _value,
} from '../DataCubeQueryBuilderUtils.js';
import { type V1_AppliedFunction } from '@finos/legend-graph';
import {
  _filterCondition_base,
  _unwrapNotFilterCondition,
} from '../DataCubeSnapshotBuilderUtils.js';
import { returnUndefOnError } from '@finos/legend-shared';

export class DataCubeQueryFilterOperation__NotIn extends DataCubeQueryFilterOperation {
  override get label() {
    return 'not in list of';
  }

  override get textLabel() {
    return 'not in list of';
  }

  override get description() {
    return 'not in list of';
  }

  override get operator() {
    return DataCubeQueryFilterOperator.NOT_IN;
  }

  isCompatibleWithColumn(column: DataCubeColumn) {
    return ofDataType(column.type, [
      DataCubeColumnDataType.TEXT,
      DataCubeColumnDataType.NUMBER,
      DataCubeColumnDataType.DATE,
    ]);
  }

  isCompatibleWithValue(value: DataCubeOperationValue) {
    if (value.value === undefined) {
      return false;
    }
    if (value.type === DataCubeOperationAdvancedValueType.LIST) {
      if (
        !Array.isArray(value.value) ||
        (value.value as unknown[]).length === 0
      ) {
        return false;
      }
      return (value.value as unknown[]).every((v) => {
        const maybe = v as DataCubeOperationValue;
        return (
          maybe.value !== undefined &&
          isPrimitiveType(maybe.type) &&
          ofDataType(maybe.type, [
            DataCubeColumnDataType.TEXT,
            DataCubeColumnDataType.NUMBER,
            DataCubeColumnDataType.DATE,
          ])
        );
      });
    }
    return (
      isPrimitiveType(value.type) &&
      ofDataType(value.type, [
        DataCubeColumnDataType.TEXT,
        DataCubeColumnDataType.NUMBER,
        DataCubeColumnDataType.DATE,
      ]) &&
      Array.isArray(value.value) &&
      (value.value as unknown[]).length > 0
    );
  }

  generateDefaultValue(column: DataCubeColumn) {
    return {
      type: DataCubeOperationAdvancedValueType.LIST,
      value: [
        {
          type: column.type,
          value: _defaultPrimitiveTypeValue(column.type),
        },
      ],
    };
  }

  buildConditionSnapshot(
    expression: V1_AppliedFunction,
    columnGetter: (name: string) => DataCubeColumn,
  ) {
    return this._finalizeConditionSnapshot(
      _filterCondition_base(
        returnUndefOnError(() => _unwrapNotFilterCondition(expression)),
        DataCubeFunction.IN,
        columnGetter,
      ),
    );
  }

  buildConditionExpression(condition: DataCubeSnapshotFilterCondition) {
    // use the same IN function but differ in operator to indicate negation
    return _not(
      _function(_functionName(DataCubeFunction.IN), [
        _property(condition.name),
        _value(condition.value),
      ]),
    );
  }
}

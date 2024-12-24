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
import type { DataCubeColumn } from '../models/DataCubeColumn.js';
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
} from '../DataCubeQueryBuilderUtils.js';
import { guaranteeNonNullable } from '@finos/legend-shared';

export class DataCubeQueryFilterOperation__LessThan extends DataCubeQueryFilterOperation {
  override get label() {
    return '<';
  }

  override get textLabel() {
    return '<';
  }

  override get description() {
    return 'is less than';
  }

  override get operator() {
    return DataCubeQueryFilterOperator.LESS_THAN;
  }

  isCompatibleWithColumn(column: DataCubeColumn) {
    return ofDataType(column.type, [
      DataCubeColumnDataType.NUMBER,
      DataCubeColumnDataType.DATE,
      DataCubeColumnDataType.TIME,
    ]);
  }

  isCompatibleWithValue(value: DataCubeOperationValue) {
    return (
      ofDataType(value.type, [
        DataCubeColumnDataType.NUMBER,
        DataCubeColumnDataType.DATE,
        DataCubeColumnDataType.TIME,
      ]) &&
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

  buildConditionExpression(condition: DataCubeQuerySnapshotFilterCondition) {
    return _function(_functionName(DataCubeFunction.LESS_THAN), [
      _property(condition.name),
      _value(guaranteeNonNullable(condition.value)),
    ]);
  }
}

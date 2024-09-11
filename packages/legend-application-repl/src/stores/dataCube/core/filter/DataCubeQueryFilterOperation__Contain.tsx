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

import { type V1_AppliedFunction } from '@finos/legend-graph';
import {
  DataCubeQueryFilterOperation,
  generateDefaultFilterConditionPrimitiveTypeValue,
} from './DataCubeQueryFilterOperation.js';
import type {
  DataCubeQuerySnapshotColumn,
  DataCubeQuerySnapshotFilterCondition,
} from '../DataCubeQuerySnapshot.js';
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

export class DataCubeQueryFilterOperation__Contain extends DataCubeQueryFilterOperation {
  override get label() {
    return 'contains';
  }

  override get textLabel() {
    return 'contains';
  }

  override get description(): string {
    return 'contains';
  }

  override get operator(): string {
    return DataCubeQueryFilterOperator.CONTAIN;
  }

  isCompatibleWithColumn(column: DataCubeQuerySnapshotColumn) {
    return ofDataType(column.type, [DataCubeColumnDataType.TEXT]);
  }

  isCompatibleWithValue(value: DataCubeOperationValue) {
    return (
      ofDataType(value.type, [DataCubeColumnDataType.TEXT]) &&
      value.value !== undefined &&
      !Array.isArray(value.value)
    );
  }

  generateDefaultValue(column: DataCubeQuerySnapshotColumn) {
    return {
      type: column.type,
      value: generateDefaultFilterConditionPrimitiveTypeValue(column.type),
    };
  }

  buildConditionSnapshot(expression: V1_AppliedFunction) {
    // TODO: @akphi - implement this for roundtrip testing
    return undefined;
  }

  buildConditionExpression(condition: DataCubeQuerySnapshotFilterCondition) {
    return _function(_functionName(DataCubeFunction.CONTAINS), [
      _property(condition.name),
      _value(guaranteeNonNullable(condition.value)),
    ]);
  }
}

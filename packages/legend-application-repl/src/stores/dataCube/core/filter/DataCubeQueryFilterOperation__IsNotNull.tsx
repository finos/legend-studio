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
  ofType,
} from './DataCubeQueryFilterOperation.js';
import type {
  DataCubeQuerySnapshotColumn,
  DataCubeQuerySnapshotFilterCondition,
} from '../DataCubeQuerySnapshot.js';
import {
  DataCubeFunction,
  DataCubeQueryFilterOperator,
  type DataCubeOperationValue,
} from '../DataCubeQueryEngine.js';
import {
  _function,
  _functionName,
  _not,
  _property,
} from '../DataCubeQueryBuilderUtils.js';

export class DataCubeQueryFilterOperation__IsNotNull extends DataCubeQueryFilterOperation {
  override get label() {
    return 'is not null';
  }

  override get textLabel() {
    return '!= NULL';
  }

  override get description(): string {
    return 'is not NULL';
  }

  override get operator(): string {
    return DataCubeQueryFilterOperator.IS_NOT_NULL;
  }

  isCompatibleWithColumn(column: DataCubeQuerySnapshotColumn) {
    return ofType(column.type, ['string', 'number', 'date']);
  }

  isCompatibleWithValue(value: DataCubeOperationValue) {
    return (
      ofType(value.type, ['string', 'number', 'date']) &&
      value.value !== undefined &&
      !Array.isArray(value.value)
    );
  }

  generateDefaultValue(column: DataCubeQuerySnapshotColumn) {
    return undefined;
  }

  buildConditionSnapshot(expression: V1_AppliedFunction) {
    // TODO: @akphi - implement this for roundtrip testing
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

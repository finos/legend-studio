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
  getCurrentMomentValueType,
  isCurrentMomentValue,
  type DataCubeOperationValue,
} from '../DataCubeQueryEngine.js';
import type { DataCubeSnapshotFilterCondition } from '../DataCubeSnapshot.js';
import type { DataCubeColumn } from '../model/DataCubeColumn.js';
import { type V1_AppliedFunction } from '@finos/legend-graph';

export abstract class DataCubeQueryFilterOperation {
  abstract get label(): React.ReactNode;
  abstract get textLabel(): string;
  abstract get description(): string;
  abstract get operator(): string;

  abstract isCompatibleWithColumn(column: DataCubeColumn): boolean;
  abstract isCompatibleWithValue(value: DataCubeOperationValue): boolean;
  abstract generateDefaultValue(column: DataCubeColumn): DataCubeOperationValue;

  abstract buildConditionSnapshot(
    expression: V1_AppliedFunction,
    columnGetter: (name: string) => DataCubeColumn,
  ): DataCubeSnapshotFilterCondition | undefined;

  protected _finalizeConditionSnapshot(
    data:
      | {
          column: DataCubeColumn;
          value: DataCubeOperationValue;
        }
      | undefined,
  ): DataCubeSnapshotFilterCondition | undefined {
    if (!data) {
      return undefined;
    }
    const { column, value } = data;
    if (
      !this.isCompatibleWithColumn(column) ||
      !this.isCompatibleWithValue(value)
    ) {
      return undefined;
    }
    // NOTE: `isCompatibleWithValue()` cannot tell whether a current-moment
    // value (`today()`/`now()`) makes sense for the column it is compared
    // against, since it does not have access to the column, so check here that
    // the column actually carries a date.
    if (
      isCurrentMomentValue(value) &&
      !getCurrentMomentValueType(column.type)
    ) {
      return undefined;
    }
    return {
      ...column,
      operator: this.operator,
      value,
    };
  }

  abstract buildConditionExpression(
    condition: DataCubeSnapshotFilterCondition,
  ): V1_AppliedFunction | undefined;
}

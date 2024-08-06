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

import type { DataCubeOperationValue } from '../DataCubeQueryEngine.js';
import type {
  DataCubeQuerySnapshotColumn,
  DataCubeQuerySnapshotFilterCondition,
} from '../DataCubeQuerySnapshot.js';
import type { V1_AppliedFunction } from '@finos/legend-graph';

export abstract class DataCubeQueryFilterOperation {
  abstract get label(): React.ReactNode;
  abstract get description(): string;
  abstract get operator(): string;

  abstract isCompatibleWithColumn(column: DataCubeQuerySnapshotColumn): boolean;
  abstract isCompatibleWithValue(value: DataCubeOperationValue): boolean;

  abstract generateDefaultValue(
    column: DataCubeQuerySnapshotColumn,
  ): DataCubeOperationValue | undefined;

  abstract buildConditionSnapshot(
    expression: V1_AppliedFunction,
  ): DataCubeQuerySnapshotFilterCondition | undefined;

  abstract buildConditionExpression(
    condition: DataCubeQuerySnapshotFilterCondition,
  ): V1_AppliedFunction | undefined;
}
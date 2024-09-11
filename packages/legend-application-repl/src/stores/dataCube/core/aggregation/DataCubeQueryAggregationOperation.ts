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

import type {
  DataCubeQuerySnapshotAggregateColumn,
  DataCubeQuerySnapshotColumn,
} from '../DataCubeQuerySnapshot.js';
import { type V1_AppliedFunction } from '@finos/legend-graph';

// --------------------------------- CONTRACT ---------------------------------

export abstract class DataCubeQueryAggregationOperation {
  abstract get label(): React.ReactNode;
  abstract get textLabel(): string;
  abstract get description(): string;
  abstract get operator(): string;

  abstract isCompatibleWithColumn(column: DataCubeQuerySnapshotColumn): boolean;

  abstract buildAggregateColumnSnapshot(
    expression: V1_AppliedFunction,
  ): DataCubeQuerySnapshotAggregateColumn | undefined;

  abstract buildAggregateColumn(
    condition: DataCubeQuerySnapshotAggregateColumn,
  ): V1_AppliedFunction | undefined;
}

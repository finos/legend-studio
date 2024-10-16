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

import { guaranteeNonNullable } from '@finos/legend-shared';
import type { DataCubeColumn } from '../models/DataCubeColumn.js';
import { type V1_ColSpec } from '@finos/legend-graph';
import type { DataCubeColumnConfiguration } from '../models/DataCubeConfiguration.js';

// --------------------------------- UTILITIES ---------------------------------

export function getAggregateOperation(
  operator: string,
  aggregateOperations: DataCubeQueryAggregateOperation[],
) {
  return guaranteeNonNullable(
    aggregateOperations.find((op) => op.operator === operator),
    `Can't find aggregate operation '${operator}'`,
  );
}

// --------------------------------- CONTRACT ---------------------------------

export abstract class DataCubeQueryAggregateOperation {
  abstract get label(): React.ReactNode;
  abstract get textLabel(): string;
  abstract get description(): string;
  abstract get operator(): string;

  abstract isCompatibleWithColumn(column: DataCubeColumn): boolean;

  abstract buildAggregateColumn(
    column: DataCubeColumnConfiguration,
  ): V1_ColSpec | undefined;
}

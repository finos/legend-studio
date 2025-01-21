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

import type { DataCubeColumn } from '../model/DataCubeColumn.js';
import { type V1_ColSpec } from '@finos/legend-graph';
import type { DataCubeColumnConfiguration } from '../model/DataCubeConfiguration.js';
import type { DataCubeOperationValue } from '../DataCubeQueryEngine.js';
import type { DataCubeQuerySnapshotAggregateColumn } from '../DataCubeQuerySnapshot.js';

export abstract class DataCubeQueryAggregateOperation {
  abstract get label(): React.ReactNode;
  abstract get textLabel(): string;
  abstract get description(): string;
  abstract get operator(): string;

  abstract isCompatibleWithColumn(column: DataCubeColumn): boolean;
  abstract isCompatibleWithParameterValues(
    values: DataCubeOperationValue[],
  ): boolean;
  abstract generateDefaultParameterValues(
    column: DataCubeColumn,
  ): DataCubeOperationValue[];

  abstract buildAggregateColumnSnapshot(
    colSpec: V1_ColSpec,
    columnGetter: (name: string) => DataCubeColumn,
  ): DataCubeQuerySnapshotAggregateColumn | undefined;

  protected _finalizeAggregateColumnSnapshot(
    data:
      | {
          column: DataCubeColumn;
          paramterValues: DataCubeOperationValue[];
        }
      | undefined,
  ): DataCubeQuerySnapshotAggregateColumn | undefined {
    if (!data) {
      return undefined;
    }
    const { column, paramterValues } = data;
    if (
      !this.isCompatibleWithColumn(column) ||
      !this.isCompatibleWithParameterValues(paramterValues)
    ) {
      return undefined;
    }
    return {
      ...column,
      operator: this.operator,
      parameterValues: paramterValues,
    };
  }

  abstract buildAggregateColumnExpression(
    column: DataCubeColumnConfiguration,
  ): V1_ColSpec | undefined;
}

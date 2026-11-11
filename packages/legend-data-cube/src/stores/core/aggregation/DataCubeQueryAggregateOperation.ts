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
import type { DataCubeSnapshotAggregateColumn } from '../DataCubeSnapshot.js';

export abstract class DataCubeQueryAggregateOperation {
  abstract get label(): React.ReactNode;
  abstract get textLabel(): string;
  abstract get description(): string;
  abstract get operator(): string;

  abstract isCompatibleWithColumn(column: DataCubeColumn): boolean;
  abstract isCompatibleWithParameterValues(
    values: DataCubeOperationValue[],
  ): boolean;
  /**
   * NOTE: for aggregations which reference another column, e.g. the weights of a
   * weighted average, the default parameter values are picked among the available
   * columns; if none is compatible, the result would not be compatible with this
   * aggregation, i.e. `isCompatibleWithParameterValues()` returns false.
   */
  abstract generateDefaultParameterValues(
    column: DataCubeColumn,
    availableColumns?: DataCubeColumn[] | undefined,
  ): DataCubeOperationValue[];

  /**
   * The label of the parameter at the specified index, shown when editing it
   */
  getParameterLabel(index: number): string | undefined {
    return undefined;
  }

  /**
   * Whether the specified column can be used as the column referenced by the
   * aggregation, e.g. the weights of a weighted average
   */
  isCompatibleWithParameterColumn(column: DataCubeColumn): boolean {
    return false;
  }

  /**
   * Whether the aggregated values can be fractional even when the values of the
   * aggregated column are not, e.g. the average of integers
   */
  get hasFractionalResult(): boolean {
    return false;
  }

  /**
   * Whether aggregating the aggregated values of groups of rows gives the same result as
   * aggregating all of their rows, e.g. the sum of sums is the sum, but the median of
   * medians is not the median. After horizontal pivot, group rows are aggregated from the
   * aggregated values of pivot() rows, so aggregations which do not support this are
   * aggregated with `uniqueValueOnly()` instead, i.e. group rows only show a value when
   * all rows below them agree on it.
   *
   * NOTE: some long-standing aggregations, e.g. average, do not support this either, but
   * are kept as is to not change the values of existing data cubes.
   */
  supportsReaggregation(
    parameterValues: DataCubeOperationValue[],
    getAggregateOperator: (columnName: string) => string | undefined,
  ): boolean {
    return true;
  }

  abstract buildAggregateColumnSnapshot(
    colSpec: V1_ColSpec,
    columnGetter: (name: string) => DataCubeColumn,
  ): DataCubeSnapshotAggregateColumn | undefined;

  protected _finalizeAggregateColumnSnapshot(
    data:
      | {
          column: DataCubeColumn;
          parameterValues: DataCubeOperationValue[];
        }
      | undefined,
  ): DataCubeSnapshotAggregateColumn | undefined {
    if (!data) {
      return undefined;
    }
    const { column, parameterValues } = data;
    if (
      !this.isCompatibleWithColumn(column) ||
      !this.isCompatibleWithParameterValues(parameterValues)
    ) {
      return undefined;
    }
    return {
      ...column,
      operator: this.operator,
      parameterValues,
    };
  }

  abstract buildAggregateColumnExpression(
    column: DataCubeColumnConfiguration,
  ): V1_ColSpec | undefined;
}

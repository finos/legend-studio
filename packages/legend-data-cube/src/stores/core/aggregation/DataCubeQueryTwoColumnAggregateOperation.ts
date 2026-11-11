/**
 * Copyright (c) 2026-present, Goldman Sachs
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
import type { V1_ColSpec } from '@finos/legend-graph';
import {
  guaranteeIsString,
  isString,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { DataCubeQueryAggregateOperation } from './DataCubeQueryAggregateOperation.js';
import {
  DataCubeColumnDataType,
  DataCubeOperationAdvancedValueType,
  ofDataType,
  type DataCubeOperationValue,
} from '../DataCubeQueryEngine.js';
import type { DataCubeColumnConfiguration } from '../model/DataCubeConfiguration.js';
import { _aggCol_rowMapper } from '../DataCubeQueryBuilderUtils.js';
import { _agg_rowMapper } from '../DataCubeSnapshotBuilderUtils.js';

/**
 * Aggregation which pairs up the values of the aggregated column with those of
 * another (numeric) column, e.g. weighted average, correlation, etc.
 * These are expressed using rowMapper(), e.g.
 * ~col : x|rowMapper($x.col, $x.other) : x|$x->wavg()
 *
 * The other column is the (only) parameter of the aggregation.
 */
export abstract class DataCubeQueryTwoColumnAggregateOperation extends DataCubeQueryAggregateOperation {
  protected abstract get aggregateFunction(): string;
  protected abstract get parameterLabel(): string;

  override isCompatibleWithParameterColumn(column: DataCubeColumn) {
    return ofDataType(column.type, [DataCubeColumnDataType.NUMBER]);
  }

  override getParameterLabel(index: number) {
    return index === 0 ? this.parameterLabel : undefined;
  }

  override supportsReaggregation(
    parameterValues: DataCubeOperationValue[],
    getAggregateOperator: (columnName: string) => string | undefined,
  ) {
    return false;
  }

  override isCompatibleWithParameterValues(values: DataCubeOperationValue[]) {
    return (
      values.length === 1 &&
      values[0] !== undefined &&
      values[0].type === DataCubeOperationAdvancedValueType.COLUMN &&
      isString(values[0].value)
    );
  }

  override generateDefaultParameterValues(
    column: DataCubeColumn,
    availableColumns?: DataCubeColumn[] | undefined,
  ): DataCubeOperationValue[] {
    const parameterColumn = availableColumns?.find(
      (col) =>
        col.name !== column.name && this.isCompatibleWithParameterColumn(col),
    );
    return parameterColumn
      ? [
          {
            type: DataCubeOperationAdvancedValueType.COLUMN,
            value: parameterColumn.name,
          },
        ]
      : [];
  }

  override buildAggregateColumnSnapshot(
    colSpec: V1_ColSpec,
    columnGetter: (name: string) => DataCubeColumn,
  ) {
    return this._finalizeAggregateColumnSnapshot(
      _agg_rowMapper(colSpec, this.aggregateFunction, columnGetter),
    );
  }

  override buildAggregateColumnExpression(column: DataCubeColumnConfiguration) {
    const parameterValue = column.aggregationParameters[0];
    if (
      !parameterValue ||
      !this.isCompatibleWithParameterValues(column.aggregationParameters)
    ) {
      throw new UnsupportedOperationError(
        `Can't build aggregate column '${column.name}': aggregation '${this.textLabel}' requires another column (${this.parameterLabel})`,
      );
    }
    return _aggCol_rowMapper(
      column,
      this.aggregateFunction,
      guaranteeIsString(parameterValue.value),
    );
  }
}

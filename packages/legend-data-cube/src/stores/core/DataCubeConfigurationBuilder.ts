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
  DataCubeColumnConfiguration,
  DataCubeConfiguration,
} from './model/DataCubeConfiguration.js';
import {
  DataCubeQueryAggregateOperator,
  DataCubeColumnKind,
  DataCubeFontTextAlignment,
  DataCubeOperationAdvancedValueType,
  getAggregateOperation,
} from './DataCubeQueryEngine.js';
import { _findCol, type DataCubeColumn } from './model/DataCubeColumn.js';
import type { DataCubeSnapshotProcessingContext } from './DataCubeSnapshot.js';
import type { DataCubeQueryAggregateOperation } from './aggregation/DataCubeQueryAggregateOperation.js';
import { at, isString } from '@finos/legend-shared';
import { getDefaultDecimals, isNumericType } from './DataCubeColumnTypes.js';

/**
 * The default aggregation of a column, based on its type
 */
export function getDefaultAggregateOperator(type: string) {
  return isNumericType(type)
    ? DataCubeQueryAggregateOperator.SUM
    : DataCubeQueryAggregateOperator.UNIQUE;
}

export function newColumnConfiguration(
  column: DataCubeColumn,
  context?: DataCubeSnapshotProcessingContext | undefined,
  aggregateOperations?: DataCubeQueryAggregateOperation[] | undefined,
): DataCubeColumnConfiguration {
  const { name, type, typeVariableValues } = column;
  const config = new DataCubeColumnConfiguration(
    name,
    type,
    typeVariableValues,
  );

  if (isNumericType(type)) {
    config.kind = DataCubeColumnKind.MEASURE;
    config.decimals = getDefaultDecimals(column);
    config.displayCommas = true;
    config.negativeNumberInParens = true;
    config.textAlign = DataCubeFontTextAlignment.RIGHT;
    config.excludedFromPivot = false;
    config.aggregateOperator = getDefaultAggregateOperator(type);
    config.pivotStatisticColumnFunction = DataCubeQueryAggregateOperator.SUM;
  } else {
    config.kind = DataCubeColumnKind.DIMENSION;
    config.excludedFromPivot = true;
    config.aggregateOperator = getDefaultAggregateOperator(type);
  }

  if (context) {
    const { snapshot, groupByAggColumns, pivotAggColumns, pivotSortColumns } =
      context;
    const data = snapshot.data;

    // process column selection
    config.isSelected = Boolean(
      _findCol(data.groupExtendedColumns, name) ??
        _findCol(data.selectColumns, name),
    );

    if (data.groupBy ?? data.pivot) {
      const groupByAggCol = _findCol(groupByAggColumns, name);
      const pivotAggCol = _findCol(pivotAggColumns, name);

      // process column kind
      if (
        _findCol(data.pivot?.columns ?? [], name) ??
        _findCol(data.groupBy?.columns ?? [], name)
      ) {
        config.kind = DataCubeColumnKind.DIMENSION;
        config.excludedFromPivot = true;
      }

      // aggregation
      const aggCol = groupByAggCol ?? pivotAggCol;
      if (aggCol) {
        config.aggregateOperator = aggCol.operator;
        config.aggregationParameters = aggCol.parameterValues;
        if (config.decimals !== undefined) {
          config.decimals = getDefaultDecimals(column, {
            hasFractionalValues: aggregateOperations?.find(
              (operation) => operation.operator === aggCol.operator,
            )?.hasFractionalResult,
          });
        }
      }

      // exclude from pivot
      if (data.pivot) {
        config.excludedFromPivot = !pivotAggCol;
      }

      // process pivot sort direction
      if (data.pivot) {
        const pivotSortCol = _findCol(pivotSortColumns, name);
        if (pivotSortCol) {
          config.pivotSortDirection = pivotSortCol.direction;
        }
      }
    }
  }

  return config;
}

export function newConfiguration(
  context: DataCubeSnapshotProcessingContext,
  aggregateOperations?: DataCubeQueryAggregateOperation[] | undefined,
): DataCubeConfiguration {
  const { snapshot, groupBySortColumns } = context;
  const data = snapshot.data;
  const configuration = new DataCubeConfiguration();

  // NOTE: the order of the column configurations is determined by
  // the order of columns specified in the select() expression.
  // Unselected columns will follow the order they are defined (i.e. source
  // columns followed by leaf-level extended columns)
  const columns = [
    ...data.selectColumns,
    ...data.groupExtendedColumns,
    ...[...data.sourceColumns, ...data.leafExtendedColumns].filter(
      (col) => !_findCol(data.selectColumns, col.name),
    ),
  ];
  configuration.columns = columns.map((column) =>
    newColumnConfiguration(column, context, aggregateOperations),
  );

  // process tree column sort direction
  //
  // since we have made sure all groupBy sort columns must be of the same direction
  // we simply retrieve the direction from the one of the column provided
  if (groupBySortColumns?.length) {
    configuration.treeColumnSortDirection = at(groupBySortColumns, 0).direction;
  }

  return configuration;
}

/**
 * Returns the columns which the aggregation of the specified column can reference,
 * e.g. the weights of a weighted average. These must be available when aggregating,
 * so this excludes unselected columns, group-level extended columns (computed after
 * aggregation), and horizontal pivot columns (consumed by pivot).
 *
 * When horizontal pivot is active, columns aggregated by pivot() are only available
 * afterwards as pivot result columns, so the aggregation of a column which is not
 * aggregated by pivot(), i.e. a dimension or a measure excluded from pivot, cannot
 * reference them.
 */
export function getAggregationParameterColumns<
  T extends DataCubeColumnConfiguration,
>(
  column: DataCubeColumnConfiguration,
  columns: T[],
  horizontalPivotColumns: DataCubeColumn[],
  groupExtendedColumns: DataCubeColumn[],
): T[] {
  const isAggregatedByPivot = (col: DataCubeColumnConfiguration) =>
    horizontalPivotColumns.length !== 0 &&
    col.kind === DataCubeColumnKind.MEASURE &&
    !col.excludedFromPivot;
  return columns.filter(
    (col) =>
      col.name !== column.name &&
      col.isSelected &&
      !_findCol(groupExtendedColumns, col.name) &&
      !_findCol(horizontalPivotColumns, col.name) &&
      (isAggregatedByPivot(column) || !isAggregatedByPivot(col)),
  );
}

/**
 * Checks whether the aggregation of the specified column references a column it can no
 * longer reference, e.g. when the weights of a weighted average have since been unselected
 * or used for horizontal pivot. Such aggregation should fall back to the default one.
 */
export function hasUnavailableAggregationParameterColumns(
  column: DataCubeColumnConfiguration,
  operation: DataCubeQueryAggregateOperation,
  parameterColumns: DataCubeColumn[],
) {
  return column.aggregationParameters.some((value) => {
    if (value.type !== DataCubeOperationAdvancedValueType.COLUMN) {
      return false;
    }
    const parameterColumn = isString(value.value)
      ? _findCol(parameterColumns, value.value)
      : undefined;
    return (
      !parameterColumn ||
      !operation.isCompatibleWithParameterColumn(parameterColumn)
    );
  });
}

/**
 * Sets the aggregation of the specified column, with its default parameter values.
 *
 * NOTE: integers are displayed without decimals, unless they are aggregated into
 * fractional values, e.g. averaged, so adjust the number of decimals when it is the
 * default one for the current aggregation; since whether it has been customized is
 * not tracked, a number of decimals customized to that default is adjusted as well.
 *
 * NOTE: the default parameter columns, e.g. the weights of a weighted average, are
 * picked among measures first, since dimensions are unlikely to be meant as such.
 */
export function setColumnAggregateOperation(
  column: DataCubeColumnConfiguration,
  operation: DataCubeQueryAggregateOperation,
  aggregateOperations: DataCubeQueryAggregateOperation[],
  parameterColumns: DataCubeColumnConfiguration[],
) {
  const currentOperation = getAggregateOperation(
    column.aggregateOperator,
    aggregateOperations,
  );
  if (
    column.decimals ===
    getDefaultDecimals(column, {
      hasFractionalValues: currentOperation.hasFractionalResult,
    })
  ) {
    column.decimals = getDefaultDecimals(column, {
      hasFractionalValues: operation.hasFractionalResult,
    });
  }
  column.aggregateOperator = operation.operator;
  column.aggregationParameters = operation.generateDefaultParameterValues(
    column,
    [
      ...parameterColumns.filter(
        (col) => col.kind === DataCubeColumnKind.MEASURE,
      ),
      ...parameterColumns.filter(
        (col) => col.kind !== DataCubeColumnKind.MEASURE,
      ),
    ],
  );
}

/**
 * Columns referenced by aggregations, e.g. the weights of a weighted average, might
 * no longer be available, e.g. when they have been unselected or used for horizontal
 * pivot, in which case, the aggregations fall back to the default ones.
 */
export function fallBackUnavailableAggregations(
  columns: DataCubeColumnConfiguration[],
  horizontalPivotColumns: DataCubeColumn[],
  groupExtendedColumns: DataCubeColumn[],
  aggregateOperations: DataCubeQueryAggregateOperation[],
) {
  columns
    .filter(
      (column) =>
        column.isSelected &&
        // only compute the columns which can be referenced when needed since
        // this goes through all columns
        column.aggregationParameters.some(
          (value) => value.type === DataCubeOperationAdvancedValueType.COLUMN,
        ),
    )
    .forEach((column) => {
      const parameterColumns = getAggregationParameterColumns(
        column,
        columns,
        horizontalPivotColumns,
        groupExtendedColumns,
      );
      if (
        hasUnavailableAggregationParameterColumns(
          column,
          getAggregateOperation(column.aggregateOperator, aggregateOperations),
          parameterColumns,
        )
      ) {
        setColumnAggregateOperation(
          column,
          getAggregateOperation(
            getDefaultAggregateOperator(column.type),
            aggregateOperations,
          ),
          aggregateOperations,
          parameterColumns,
        );
      }
    });
}

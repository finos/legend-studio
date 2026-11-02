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
} from './DataCubeQueryEngine.js';
import { _findCol, type DataCubeColumn } from './model/DataCubeColumn.js';
import type { DataCubeSnapshotProcessingContext } from './DataCubeSnapshot.js';
import { at } from '@finos/legend-shared';
import { getDefaultDecimals, isNumericType } from './DataCubeColumnTypes.js';

export function newColumnConfiguration(
  column: DataCubeColumn,
  context?: DataCubeSnapshotProcessingContext | undefined,
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
    config.aggregateOperator = DataCubeQueryAggregateOperator.SUM;
    config.pivotStatisticColumnFunction = DataCubeQueryAggregateOperator.SUM;
  } else {
    config.kind = DataCubeColumnKind.DIMENSION;
    config.excludedFromPivot = true;
    config.aggregateOperator = DataCubeQueryAggregateOperator.UNIQUE;
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
    newColumnConfiguration(column, context),
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

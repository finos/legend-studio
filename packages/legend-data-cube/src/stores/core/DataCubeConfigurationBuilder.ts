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

import { PRIMITIVE_TYPE } from '@finos/legend-graph';
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
import type { DataCubeQuerySnapshotProcessingContext } from './DataCubeQuerySnapshot.js';
import { at } from '@finos/legend-shared';

export function newColumnConfiguration(
  column: DataCubeColumn,
  context?: DataCubeQuerySnapshotProcessingContext | undefined,
): DataCubeColumnConfiguration {
  const { name, type } = column;
  const config = new DataCubeColumnConfiguration(name, type);

  switch (type) {
    case PRIMITIVE_TYPE.NUMBER:
    case PRIMITIVE_TYPE.INTEGER:
    case PRIMITIVE_TYPE.DECIMAL:
    case PRIMITIVE_TYPE.FLOAT: {
      config.kind = DataCubeColumnKind.MEASURE;
      config.decimals = type === PRIMITIVE_TYPE.INTEGER ? 0 : 2;
      config.displayCommas = true;
      config.negativeNumberInParens = true;
      config.textAlign = DataCubeFontTextAlignment.RIGHT; // always align number to the right
      config.excludedFromPivot = false;
      config.aggregateOperator = DataCubeQueryAggregateOperator.SUM;
      config.pivotStatisticColumnFunction = DataCubeQueryAggregateOperator.SUM;
      break;
    }
    default: {
      config.kind = DataCubeColumnKind.DIMENSION;
      config.excludedFromPivot = true;
      config.aggregateOperator = DataCubeQueryAggregateOperator.UNIQUE;
      break;
    }
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

    const groupByAggCol = _findCol(groupByAggColumns, name);
    const pivotAggCol = _findCol(pivotAggColumns, name);
    const aggCol = groupByAggCol ?? pivotAggCol;
    if (aggCol) {
      // aggregator
      config.aggregateOperator = aggCol.operator;
      config.aggregationParameters = aggCol.parameterValues;

      // exclude from pivot
      config.excludedFromPivot =
        groupByAggCol !== undefined && pivotAggCol === undefined;
    }

    // process pivot sort direction
    const pivotSortCol = _findCol(pivotSortColumns, name);
    if (pivotSortCol) {
      config.pivotSortDirection = pivotSortCol.direction;
    }

    // process column kind
    //
    // if aggregation is present and if the column is aggregated on
    // it must be a measure
    if (data.groupBy ?? data.pivot) {
      config.kind = aggCol
        ? DataCubeColumnKind.MEASURE
        : DataCubeColumnKind.DIMENSION;
    }
  }

  return config;
}

export function newConfiguration(
  context: DataCubeQuerySnapshotProcessingContext,
): DataCubeConfiguration {
  const { snapshot, groupBySortColumns } = context;
  const data = snapshot.data;
  const configuration = new DataCubeConfiguration();
  const columns = [
    ...data.sourceColumns,
    ...data.leafExtendedColumns,
    ...data.groupExtendedColumns,
  ];
  configuration.columns = columns.map((column) =>
    newColumnConfiguration(column, context),
  );

  // process tree column sort direction
  //
  // since we have made sure all groupBy sort columns must be of the same direction
  // we simply retrieve the direction from the one of the column provided
  if (groupBySortColumns.length) {
    configuration.treeColumnSortDirection = at(groupBySortColumns, 0).direction;
  }

  return configuration;
}

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
import type {
  DataCubeQuerySnapshot,
  DataCubeQuerySnapshotAggregateColumn,
} from './DataCubeQuerySnapshot.js';

export function newColumnConfiguration(
  column: DataCubeColumn,
  context?:
    | {
        snapshot: DataCubeQuerySnapshot;
        pivotAggCols: DataCubeQuerySnapshotAggregateColumn[];
        groupByAggCols: DataCubeQuerySnapshotAggregateColumn[];
      }
    | undefined,
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
    const { snapshot, groupByAggCols, pivotAggCols } = context;
    const data = snapshot.data;

    config.isSelected = Boolean(
      _findCol(data.groupExtendedColumns, name) ??
        _findCol(data.selectColumns, name),
    );

    const groupByAggCol = _findCol(groupByAggCols, name);
    const pivotAggCol = _findCol(pivotAggCols, name);
    const aggCol = groupByAggCol ?? pivotAggCol;
    if (aggCol) {
      config.aggregateOperator = aggCol.operator;
      config.aggregationParameters = aggCol.parameterValues;
      config.excludedFromPivot =
        groupByAggCol !== undefined && pivotAggCol === undefined;

      // TODO: column kind
    }
  }

  return config;
}

export function newConfiguration(
  snapshot: DataCubeQuerySnapshot,
  pivotAggCols: DataCubeQuerySnapshotAggregateColumn[],
  groupByAggCols: DataCubeQuerySnapshotAggregateColumn[],
): DataCubeConfiguration {
  const data = snapshot.data;
  const configuration = new DataCubeConfiguration();
  const columns = [
    ...data.sourceColumns,
    ...data.leafExtendedColumns,
    ...data.groupExtendedColumns,
  ];
  configuration.columns = columns.map((column) =>
    newColumnConfiguration(column, { snapshot, pivotAggCols, groupByAggCols }),
  );
  return configuration;
}

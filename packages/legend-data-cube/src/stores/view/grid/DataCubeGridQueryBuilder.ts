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
  PRIMITIVE_TYPE,
  V1_GenericTypeInstance,
  type V1_ColSpec,
  type V1_AppliedFunction,
  V1_GenericType,
  V1_RelationType,
  V1_getGenericTypeFullPath,
} from '@finos/legend-graph';
import { type DataCubeQuerySnapshot } from '../../core/DataCubeQuerySnapshot.js';
import {
  DataCubeQueryFilterGroupOperator,
  DataCubeQueryFilterOperator,
  DataCubeFunction,
  type DataCubeQueryFunctionMap,
  isPivotResultColumnName,
  PIVOT_COLUMN_NAME_VALUE_SEPARATOR,
  DataCubeQuerySortDirection,
} from '../../core/DataCubeQueryEngine.js';
import {
  guaranteeNonNullable,
  guaranteeType,
  isNullable,
  uniq,
} from '@finos/legend-shared';
import {
  _groupByAggCols,
  _colSpec,
  _cols,
  _filter,
  _function,
  _lambda,
  _var,
  _functionCompositionUnProcessor,
  _property,
  _collection,
  _col,
} from '../../core/DataCubeQueryBuilderUtils.js';
import {
  INTERNAL__GRID_CLIENT_MISSING_VALUE,
  INTERNAL__GRID_CLIENT_ROOT_AGGREGATION_COLUMN_ID,
  INTERNAL__GRID_CLIENT_ROW_GROUPING_COUNT_AGG_COLUMN_ID,
  type DataCubeGridClientDataFetchRequest,
} from './DataCubeGridClientEngine.js';
import { DataCubeConfiguration } from '../../core/model/DataCubeConfiguration.js';
import type { DataCubeQueryFilterOperation } from '../../core/filter/DataCubeQueryFilterOperation.js';
import type { DataCubeQueryAggregateOperation } from '../../core/aggregation/DataCubeQueryAggregateOperation.js';
import { _colSpecArrayParam } from '../../core/DataCubeQuerySnapshotBuilderUtils.js';
import { buildExecutableQuery } from '../../core/DataCubeQueryBuilder.js';
import type { DataCubeSource } from '../../core/model/DataCubeSource.js';

/*****************************************************************************
 * [GRID]
 *
 * These are utilities used to build adhoc executable queries for fetching
 * data for the grid. The grid comes with features that requires building
 * slight modifications of the persistent query that would be generated from
 * the snapshot, such as in the case of pagination, drilldown (group by).
 *****************************************************************************/

// --------------------------------- BUILDING BLOCKS ---------------------------------

export function _aggCountCol() {
  const variable = _var();
  return _colSpec(
    INTERNAL__GRID_CLIENT_ROW_GROUPING_COUNT_AGG_COLUMN_ID,
    _lambda([variable], [variable]),
    _lambda([variable], [_function(DataCubeFunction.COUNT, [variable])]),
  );
}

function _aggCountCastCol(colName: string) {
  const variable = _var();
  return _colSpec(
    colName,
    _lambda([variable], [_property(colName, variable)]),
    _lambda([variable], [_function(DataCubeFunction.SUM, [variable])]),
  );
}

// if pivot is present, modify pivot and pivot cast expressions to include
// count aggregation columns.
function _addCountAggColumnToPivot(
  funcMap: DataCubeQueryFunctionMap,
  countAggColumns: V1_ColSpec[],
): void {
  if (funcMap.pivot && funcMap.pivotCast) {
    _colSpecArrayParam(funcMap.pivot, 1).colSpecs.push(_aggCountCol());
    const castColumns = guaranteeType(
      guaranteeType(
        guaranteeType(funcMap.pivotCast.parameters[0], V1_GenericTypeInstance)
          .genericType.typeArguments[0],
        V1_GenericType,
      ).rawType,
      V1_RelationType,
    ).columns.map((column) =>
      _colSpec(
        column.name,
        undefined,
        undefined,
        V1_getGenericTypeFullPath(column.genericType),
      ),
    );
    uniq(
      castColumns
        .filter((col) => isPivotResultColumnName(col.name))
        .map((col) =>
          col.name.substring(
            0,
            col.name.lastIndexOf(PIVOT_COLUMN_NAME_VALUE_SEPARATOR),
          ),
        ),
    )
      .map(
        (col) =>
          col +
          PIVOT_COLUMN_NAME_VALUE_SEPARATOR +
          INTERNAL__GRID_CLIENT_ROW_GROUPING_COUNT_AGG_COLUMN_ID,
      )
      .map((col) => _colSpec(col, undefined, undefined, PRIMITIVE_TYPE.INTEGER))
      .forEach((col) => {
        castColumns.push(col);
        countAggColumns.push(col);
      });
  }
}

// --------------------------------- MAIN ---------------------------------

export function buildGridDataFetchExecutableQuery(
  request: DataCubeGridClientDataFetchRequest,
  snapshot: DataCubeQuerySnapshot,
  source: DataCubeSource,
  executionContextBuilder: (
    source: DataCubeSource,
  ) => V1_AppliedFunction | undefined,
  filterOperations: DataCubeQueryFilterOperation[],
  aggregateOperations: DataCubeQueryAggregateOperation[],
  enablePagination: boolean,
) {
  const processedSnapshot = snapshot.clone();
  const configuration = DataCubeConfiguration.serialization.fromJson(
    processedSnapshot.data.configuration,
  );
  if (configuration.showRootAggregation) {
    processedSnapshot.data.groupBy = {
      columns: [
        {
          name: INTERNAL__GRID_CLIENT_ROOT_AGGREGATION_COLUMN_ID,
          type: PRIMITIVE_TYPE.STRING,
        },
        ...(processedSnapshot.data.groupBy?.columns ?? []),
      ],
    };
  }
  return buildExecutableQuery(
    processedSnapshot,
    source,
    executionContextBuilder,
    filterOperations,
    aggregateOperations,
    {
      postProcessor: generateGridDataFetchExecutableQueryPostProcessor(request),
      rootAggregation: {
        columnName: INTERNAL__GRID_CLIENT_ROOT_AGGREGATION_COLUMN_ID,
      },
      pagination:
        enablePagination &&
        request.startRow !== undefined &&
        request.endRow !== undefined
          ? {
              start: request.startRow,
              end: request.endRow,
            }
          : undefined,
    },
  );
}

function generateGridDataFetchExecutableQueryPostProcessor(
  request: DataCubeGridClientDataFetchRequest,
) {
  return (
    snapshot: DataCubeQuerySnapshot,
    sequence: V1_AppliedFunction[],
    funcMap: DataCubeQueryFunctionMap,
    configuration: DataCubeConfiguration,
    filterOperations: DataCubeQueryFilterOperation[],
    aggregateOperations: DataCubeQueryAggregateOperation[],
  ) => {
    const _unprocess = _functionCompositionUnProcessor(sequence, funcMap);
    const data = snapshot.data;

    if (funcMap.groupBy) {
      // --------------------------------- GROUP BY ---------------------------------
      const groupBy = guaranteeNonNullable(data.groupBy);

      // if any level of drilldown has been done
      // add a pre-filter to groupBy()
      if (request.groupKeys.length) {
        sequence.splice(
          sequence.indexOf(funcMap.groupBy),
          0,
          _function(DataCubeFunction.FILTER, [
            _lambda(
              [_var()],
              [
                _filter(
                  {
                    conditions: request.groupKeys.map((value, i) => {
                      const groupByColumn = guaranteeNonNullable(
                        groupBy.columns[i],
                      );
                      if (
                        isNullable(value) ||
                        value === INTERNAL__GRID_CLIENT_MISSING_VALUE
                      ) {
                        return {
                          ...groupByColumn,
                          operator: DataCubeQueryFilterOperator.IS_NULL,
                          value: undefined,
                        };
                      }
                      const condition = {
                        ...groupByColumn,
                        operator: DataCubeQueryFilterOperator.EQUAL,
                        value: undefined,
                      };
                      switch (groupByColumn.type) {
                        case PRIMITIVE_TYPE.BOOLEAN:
                          return {
                            ...condition,
                            value: {
                              type: PRIMITIVE_TYPE.BOOLEAN,
                              value: value === 'true',
                            },
                          };
                        case PRIMITIVE_TYPE.INTEGER:
                          return {
                            ...condition,
                            value: {
                              type: groupByColumn.type,
                              value: parseInt(value, 10),
                            },
                          };
                        case PRIMITIVE_TYPE.NUMBER:
                        case PRIMITIVE_TYPE.DECIMAL:
                        case PRIMITIVE_TYPE.FLOAT:
                          return {
                            ...condition,
                            value: {
                              type: groupByColumn.type,
                              value: parseFloat(value),
                            },
                          };
                        case PRIMITIVE_TYPE.STRING:
                        case PRIMITIVE_TYPE.DATE:
                        case PRIMITIVE_TYPE.DATETIME:
                        case PRIMITIVE_TYPE.STRICTDATE:
                        case PRIMITIVE_TYPE.STRICTTIME:
                        default:
                          return {
                            ...condition,
                            value: { type: groupByColumn.type, value },
                          };
                      }
                    }),
                    groupOperator: DataCubeQueryFilterGroupOperator.AND,
                  },
                  filterOperations,
                ),
              ],
            ),
          ]),
        );
      }

      // if pivot is present, populate the count aggregation columns
      // by modifying pivot and pivot cast function expressions
      const countAggColumns: V1_ColSpec[] = [];
      _addCountAggColumnToPivot(funcMap, countAggColumns);

      // modify groupBy() based off the current drilldown level
      if (request.groupKeys.length < groupBy.columns.length) {
        const groupByIdx = sequence.indexOf(funcMap.groupBy);
        const groupByColumns = groupBy.columns.slice(
          0,
          request.groupKeys.length + 1,
        );
        const groupByFunc = _function(DataCubeFunction.GROUP_BY, [
          _cols(groupByColumns.map((col) => _colSpec(col.name))),
          _cols([
            ..._groupByAggCols(
              groupByColumns,
              snapshot,
              configuration,
              aggregateOperations,
            ),

            // if pivot is present, add sum aggregation columns for each
            // count aggregation column from pivot aggregation
            // else, simply add a count aggregation column
            ...(countAggColumns.length
              ? countAggColumns.map((col) => _aggCountCastCol(col.name))
              : [_aggCountCol()]),
          ]),
        ]);
        sequence[groupByIdx] = groupByFunc;
        funcMap.groupBy = groupByFunc;

        // update sort accordingly
        const groupBySort = guaranteeNonNullable(funcMap.groupBySort);
        groupBySort.parameters[0] = _collection(
          groupByColumns.map((col) =>
            _function(
              configuration.treeColumnSortDirection ===
                DataCubeQuerySortDirection.ASCENDING
                ? DataCubeFunction.ASCENDING
                : DataCubeFunction.DESCENDING,
              [_col(col.name)],
            ),
          ),
        );
      } else {
        // when maximum level of drilldown is reached, we simply just need to
        // filter the data to match drilldown values, no groupBy() is needed.
        _unprocess('groupBy');
        _unprocess('groupBySort');
      }
    }
  };
}

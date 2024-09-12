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
  type V1_AppliedFunction,
  extractElementNameFromPath as _name,
} from '@finos/legend-graph';
import { type DataCubeQuerySnapshot } from '../core/DataCubeQuerySnapshot.js';
import {
  DataCubeQueryFilterGroupOperator,
  DataCubeQueryFilterOperator,
  DataCubeFunction,
  type DataCubeQueryFunctionMap,
} from '../core/DataCubeQueryEngine.js';
import { guaranteeNonNullable, isNullable } from '@finos/legend-shared';
import {
  _groupByAggCols,
  _colSpec,
  _cols,
  _filter,
  _function,
  _lambda,
  _var,
} from '../core/DataCubeQueryBuilderUtils.js';
import {
  INTERNAL__GRID_CLIENT_MISSING_VALUE,
  INTERNAL__GRID_CLIENT_ROW_GROUPING_COUNT_AGG_COLUMN_ID,
} from './DataCubeGridClientEngine.js';
import type { DataCubeConfiguration } from '../core/DataCubeConfiguration.js';
import type { DataCubeQueryFilterOperation } from '../core/filter/DataCubeQueryFilterOperation.js';
import type { DataCubeQueryAggregateOperation } from '../core/aggregation/DataCubeQueryAggregateOperation.js';

/*****************************************************************************
 * [GRID]
 *
 * These are utilities used to build adhoc executable queries for fetching
 * data for the grid. The grid comes with features that requires building
 * slight modifications of the persistent query that would be generated from
 * the snapshot, such as in the case of pagination, drilldown (group by).
 *****************************************************************************/

// --------------------------------- BUILDING BLOCKS ---------------------------------

function _rowGroupingCountCol() {
  const variable = _var();
  return _colSpec(
    INTERNAL__GRID_CLIENT_ROW_GROUPING_COUNT_AGG_COLUMN_ID,
    _lambda([variable], [variable]),
    _lambda([variable], [_function(DataCubeFunction.COUNT, [variable])]),
  );
}
// --------------------------------- MAIN ---------------------------------

export function generateRowGroupingDrilldownExecutableQueryPostProcessor(
  drilldownValues: (string | null | undefined)[],
) {
  return (
    snapshot: DataCubeQuerySnapshot,
    sequence: V1_AppliedFunction[],
    funcMap: DataCubeQueryFunctionMap,
    configuration: DataCubeConfiguration,
    filterOperations: DataCubeQueryFilterOperation[],
    aggregateOperations: DataCubeQueryAggregateOperation[],
  ) => {
    const _unprocess = (funcMapKey: keyof DataCubeQueryFunctionMap) => {
      const func = funcMap[funcMapKey];
      if (func) {
        sequence.splice(sequence.indexOf(func), 1);
        funcMap[funcMapKey] = undefined;
      }
    };
    const data = snapshot.data;

    if (funcMap.groupBy) {
      // --------------------------------- GROUP BY ---------------------------------
      const groupBy = guaranteeNonNullable(data.groupBy);

      // if any level of drilldown has been done
      // add a pre-filter to groupBy()
      if (drilldownValues.length) {
        sequence.splice(
          sequence.indexOf(funcMap.groupBy),
          0,
          _function(_name(DataCubeFunction.FILTER), [
            _lambda(
              [_var()],
              [
                _filter(
                  {
                    conditions: drilldownValues.map((value, i) => {
                      const groupByColumn = guaranteeNonNullable(
                        groupBy.columns[i],
                      );
                      if (
                        isNullable(value) ||
                        value === INTERNAL__GRID_CLIENT_MISSING_VALUE
                      ) {
                        return {
                          ...groupByColumn,
                          operation: DataCubeQueryFilterOperator.IS_NULL,
                          value: undefined,
                        };
                      }
                      const condition = {
                        ...groupByColumn,
                        operation: DataCubeQueryFilterOperator.EQUAL,
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

      // modify groupBy() based off the current drilldown level
      if (drilldownValues.length < groupBy.columns.length) {
        const groupByIdx = sequence.indexOf(funcMap.groupBy);
        const groupByColumns = groupBy.columns.slice(
          0,
          drilldownValues.length + 1,
        );
        const groupByFunc = _function(_name(DataCubeFunction.GROUP_BY), [
          _cols(groupByColumns.map((col) => _colSpec(col.name))),
          _cols([
            ..._groupByAggCols(
              groupByColumns,
              snapshot,
              configuration,
              aggregateOperations,
            ),
            _rowGroupingCountCol(), // get the count for each group
          ]),
        ]);
        sequence[groupByIdx] = groupByFunc;
        funcMap.groupBy = groupByFunc;
      } else {
        // when maximum level of drilldown is reached, we simply just need to
        // filter the data to match drilldown values, no groupBy() is needed.
        _unprocess('groupBy');
      }

      // --------------------------------- PIVOT ---------------------------------
      // TODO: @akphi - implement this and CAST
    }
  };
}

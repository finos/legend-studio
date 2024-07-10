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
  type V1_AppliedFunction,
  extractElementNameFromPath as _name,
} from '@finos/legend-graph';
import { type DataCubeQuerySnapshot } from '../core/DataCubeQuerySnapshot.js';
import {
  DataCubeQueryFilterGroupOperation,
  DataCubeQueryFilterOperation,
  DataCubeFunction,
  type DataCubeQueryFunctionMap,
} from '../core/DataCubeQueryEngine.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  _aggCols,
  _colSpec,
  _cols,
  _filter,
  _function,
  _groupByExtend,
  _lambda,
  _var,
} from '../core/DataCubeQueryBuilder.js';
import { INTERNAL__GRID_CLIENT_ROW_GROUPING_COUNT_AGG_COLUMN_ID } from './DataCubeGridClientEngine.js';

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
  drilldownValues: string[],
) {
  return (
    snapshot: DataCubeQuerySnapshot,
    sequence: V1_AppliedFunction[],
    funcMap: DataCubeQueryFunctionMap,
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
                _filter({
                  conditions: drilldownValues.map((drilldownValue, i) => ({
                    ...guaranteeNonNullable(groupBy.columns[i]),
                    operation: DataCubeQueryFilterOperation.EQUAL,
                    value: drilldownValue,
                  })),
                  groupOperation: DataCubeQueryFilterGroupOperation.AND,
                }),
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
          _cols([..._aggCols(groupBy.aggColumns), _rowGroupingCountCol()]),
        ]);
        sequence[groupByIdx] = groupByFunc;
        funcMap.groupBy = groupByFunc;

        // extend columns to maintain the same set of columns prior to groupBy()
        const groupByExtend = _groupByExtend(
          snapshot.stageCols('aggregation'),
          [...groupByColumns, ...groupBy.aggColumns],
        );
        _unprocess('groupByExtend');
        funcMap.groupByExtend = groupByExtend;
        if (groupByExtend) {
          sequence.splice(groupByIdx + 1, 0, groupByExtend);
        }
      } else {
        // when maximum level of drilldown is reached, we simply just need to
        // filter the data to match drilldown values, no groupBy() is needed.
        _unprocess('groupBy');
        _unprocess('groupByExtend');
      }

      // --------------------------------- PIVOT ---------------------------------
      // TODO: @akphi - implement this and CAST
    }
  };
}

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

/***************************************************************************************
 * [CORE]
 *
 * This and its corresponding utilitites are used to build the executable query from
 * the query snapshot. The executable query is then used to fetch data.
 ***************************************************************************************/

import { PRIMITIVE_TYPE, type V1_AppliedFunction } from '@finos/legend-graph';
import { type DataCubeQuerySnapshot } from './DataCubeQuerySnapshot.js';
import { at } from '@finos/legend-shared';
import {
  DataCubeFunction,
  DataCubeQuerySortDirection,
  type DataCubeQueryFunctionMap,
} from './DataCubeQueryEngine.js';
import { DataCubeConfiguration } from './model/DataCubeConfiguration.js';
import type { DataCubeQueryFilterOperation } from './filter/DataCubeQueryFilterOperation.js';
import {
  _col,
  _collection,
  _cols,
  _colSpec,
  _deserializeLambda,
  _filter,
  _function,
  _groupByAggCols,
  _lambda,
  _pivotAggCols,
  _castCols,
  _primitiveValue,
  _var,
  _functionCompositionProcessor,
  _extendRootAggregation,
} from './DataCubeQueryBuilderUtils.js';
import type { DataCubeQueryAggregateOperation } from './aggregation/DataCubeQueryAggregateOperation.js';
import type { DataCubeSource } from './model/DataCubeSource.js';
import { _findCol } from './model/DataCubeColumn.js';

export function buildExecutableQuery(
  snapshot: DataCubeQuerySnapshot,
  source: DataCubeSource,
  executionContextBuilder: (
    source: DataCubeSource,
  ) => V1_AppliedFunction | undefined,
  filterOperations: DataCubeQueryFilterOperation[],
  aggregateOperations: DataCubeQueryAggregateOperation[],
  options?: {
    postProcessor?: (
      snapshot: DataCubeQuerySnapshot,
      sequence: V1_AppliedFunction[],
      funcMap: DataCubeQueryFunctionMap,
      configuration: DataCubeConfiguration,
      filterOperations: DataCubeQueryFilterOperation[],
      aggregateOperations: DataCubeQueryAggregateOperation[],
    ) => void;
    rootAggregation?:
      | {
          columnName: string;
        }
      | undefined;
    pagination?:
      | {
          start: number;
          end: number;
        }
      | undefined;
    skipExecutionContext?: boolean;
  },
) {
  const data = snapshot.data;
  const configuration = DataCubeConfiguration.serialization.fromJson(
    data.configuration,
  );
  const sequence: V1_AppliedFunction[] = [];
  const funcMap: DataCubeQueryFunctionMap = {};
  const _process = _functionCompositionProcessor(sequence, funcMap);

  // --------------------------------- LEAF-LEVEL EXTEND ---------------------------------

  if (data.leafExtendedColumns.length) {
    _process(
      'leafExtend',
      data.leafExtendedColumns.map((col) =>
        _function(DataCubeFunction.EXTEND, [
          _cols([
            _colSpec(
              col.name,
              _deserializeLambda(col.mapFn),
              col.reduceFn ? _deserializeLambda(col.reduceFn) : undefined,
            ),
          ]),
        ]),
      ),
    );
  }

  // --------------------------------- FILTER ---------------------------------

  if (data.filter) {
    _process(
      'filter',
      _function(DataCubeFunction.FILTER, [
        _lambda([_var()], [_filter(data.filter, filterOperations)]),
      ]),
    );
  }

  // --------------------------------- SELECT ---------------------------------

  if (data.selectColumns.length) {
    _process(
      'select',
      _function(DataCubeFunction.SELECT, [
        _cols(data.selectColumns.map((col) => _colSpec(col.name))),
      ]),
    );
  }

  // --------------------------------- PIVOT ---------------------------------

  if (data.pivot) {
    const pivot = data.pivot;

    // pre-sort to maintain stable order for pivot result columns
    _process(
      'sort',
      _function(DataCubeFunction.SORT, [
        _collection(
          data.pivot.columns.map((col) =>
            _function(
              _findCol(configuration.columns, col.name)?.pivotSortDirection ===
                DataCubeQuerySortDirection.DESCENDING
                ? DataCubeFunction.DESCENDING
                : DataCubeFunction.ASCENDING,
              [_col(col.name)],
            ),
          ),
        ),
      ]),
    );

    _process(
      'pivot',
      _function(DataCubeFunction.PIVOT, [
        _cols(pivot.columns.map((col) => _colSpec(col.name))),
        _cols(
          _pivotAggCols(
            pivot.columns,
            snapshot,
            configuration,
            aggregateOperations,
          ),
        ),
      ]),
    );

    if (pivot.castColumns.length) {
      _process(
        'pivotCast',
        _function(DataCubeFunction.CAST, [_castCols(pivot.castColumns)]),
      );
    }
  }

  // --------------------------------- GROUP BY ---------------------------------

  if (data.groupBy) {
    const groupBy = data.groupBy;
    if (configuration.showRootAggregation && options?.rootAggregation) {
      sequence.push(_extendRootAggregation(options.rootAggregation.columnName));
    }
    _process(
      'groupBy',
      _function(DataCubeFunction.GROUP_BY, [
        _cols(groupBy.columns.map((col) => _colSpec(col.name))),
        _cols(
          _groupByAggCols(
            groupBy.columns,
            snapshot,
            configuration,
            aggregateOperations,
          ),
        ),
      ]),
    );
    _process(
      'groupBySort',
      _function(DataCubeFunction.SORT, [
        _collection(
          groupBy.columns.map((col) =>
            _function(
              configuration.treeColumnSortDirection ===
                DataCubeQuerySortDirection.ASCENDING
                ? DataCubeFunction.ASCENDING
                : DataCubeFunction.DESCENDING,
              [_col(col.name)],
            ),
          ),
        ),
      ]),
    );
  }

  // --------------------------------- GROUP-LEVEL EXTEND ---------------------------------

  if (data.groupExtendedColumns.length) {
    _process(
      'groupExtend',
      data.groupExtendedColumns.map((col) =>
        _function(DataCubeFunction.EXTEND, [
          _cols([
            _colSpec(
              col.name,
              _deserializeLambda(col.mapFn),
              col.reduceFn ? _deserializeLambda(col.reduceFn) : undefined,
            ),
          ]),
        ]),
      ),
    );
  }

  // --------------------------------- SORT ---------------------------------

  if (data.sortColumns.length) {
    _process(
      'sort',
      _function(DataCubeFunction.SORT, [
        _collection(
          data.sortColumns.map((col) =>
            _function(
              col.direction === DataCubeQuerySortDirection.ASCENDING
                ? DataCubeFunction.ASCENDING
                : DataCubeFunction.DESCENDING,
              [_col(col.name)],
            ),
          ),
        ),
      ]),
    );
  }

  // --------------------------------- LIMIT ---------------------------------

  if (data.limit !== undefined) {
    _process(
      'limit',
      _function(DataCubeFunction.LIMIT, [
        _primitiveValue(PRIMITIVE_TYPE.INTEGER, data.limit),
      ]),
    );
  }

  // --------------------------------- SLICE ---------------------------------

  if (options?.pagination) {
    sequence.push(
      _function(DataCubeFunction.SLICE, [
        _primitiveValue(PRIMITIVE_TYPE.INTEGER, options.pagination.start),
        _primitiveValue(PRIMITIVE_TYPE.INTEGER, options.pagination.end),
      ]),
    );
  }

  // --------------------------------- FINALIZE ---------------------------------

  const executionContext = executionContextBuilder(source);
  if (executionContext) {
    sequence.push(executionContext);
  }

  options?.postProcessor?.(
    snapshot,
    sequence,
    funcMap,
    configuration,
    filterOperations,
    aggregateOperations,
  );

  if (sequence.length === 0) {
    return source.query;
  }
  for (let i = 0; i < sequence.length; i++) {
    at(sequence, i).parameters.unshift(
      i === 0 ? source.query : at(sequence, i - 1),
    );
  }
  return at(sequence, sequence.length - 1);
}

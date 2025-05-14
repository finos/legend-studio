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
 * the snapshot. The executable query is then used to fetch data.
 ***************************************************************************************/

import {
  PRIMITIVE_TYPE,
  V1_AppliedProperty,
  V1_CString,
  V1_Lambda,
  V1_Variable,
  type V1_AppliedFunction,
} from '@finos/legend-graph';
import {
  type DataCubeSnapshot,
  type DataCubeSnapshotExtendedColumn,
  type DataCubeSnapshotGroupBy,
} from './DataCubeSnapshot.js';
import { at, guaranteeType } from '@finos/legend-shared';
import {
  DataCubeFunction,
  DataCubeQueryFilterGroupOperator,
  DataCubeQuerySortDirection,
  type DataCubeQueryFunctionMap,
} from './DataCubeQueryEngine.js';
import { DataCubeConfiguration } from './model/DataCubeConfiguration.js';
import {
  _col,
  _collection,
  _cols,
  _colSpec,
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
  _flattenFilterSnapshot,
} from './DataCubeQueryBuilderUtils.js';
import type { DataCubeSource } from './model/DataCubeSource.js';
import { _findCol, _toCol } from './model/DataCubeColumn.js';
import type { DataCubeEngine } from './DataCubeEngine.js';
import {
  DIMENSIONAL_L0_COLUMN,
  type DataCubeDimensionalNode,
} from '../view/grid/DataCubeGridDimensionalTree.js';

export function buildExecutableQuery(
  snapshot: DataCubeSnapshot,
  source: DataCubeSource,
  engine: DataCubeEngine,
  options?: {
    postProcessor?: (
      snapshot: DataCubeSnapshot,
      sequence: V1_AppliedFunction[],
      funcMap: DataCubeQueryFunctionMap,
      configuration: DataCubeConfiguration,
      engine: DataCubeEngine,
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
              guaranteeType(
                engine.deserializeValueSpecification(col.mapFn),
                V1_Lambda,
              ),
              col.reduceFn
                ? guaranteeType(
                    engine.deserializeValueSpecification(col.reduceFn),
                    V1_Lambda,
                  )
                : undefined,
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
        _lambda([_var()], [_filter(data.filter, engine.filterOperations)]),
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
            engine.aggregateOperations,
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
            engine.aggregateOperations,
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
              guaranteeType(
                engine.deserializeValueSpecification(col.mapFn),
                V1_Lambda,
              ),
              col.reduceFn
                ? guaranteeType(
                    engine.deserializeValueSpecification(col.reduceFn),
                    V1_Lambda,
                  )
                : undefined,
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

  if (!options?.skipExecutionContext) {
    const executionContext = engine.buildExecutionContext(source);
    if (executionContext) {
      sequence.push(executionContext);
    }
  }

  options?.postProcessor?.(snapshot, sequence, funcMap, configuration, engine);

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

export function buildDimensionalExecutableQuery(
  snapshot: DataCubeSnapshot,
  source: DataCubeSource,
  engine: DataCubeEngine,
  nodes: DataCubeDimensionalNode[],
  options?: {
    postProcessor?: (
      snapshot: DataCubeSnapshot,
      sequence: V1_AppliedFunction[],
      funcMap: DataCubeQueryFunctionMap,
      configuration: DataCubeConfiguration,
      engine: DataCubeEngine,
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

  // ------------------------------ DIMENSIONS -------------------------------------

  if (data.dimensionalTree && nodes.length > 0) {
    const dimensionColNames = configuration.dimensions.dimensions.flatMap(
      (col) => col.columns,
    );

    // removing columns which have been added to represent diimensions
    configuration.columns = configuration.columns.map((col) => {
      if (dimensionColNames.includes(col.name)) {
        col.isSelected = false;
      }
      return col;
    });

    // Adding dimensions to the extended column
    nodes.forEach((node) => {
      const lambda = new V1_Lambda();
      const parameter = new V1_Variable();
      parameter.name = 'temp';
      if (node.column === DIMENSIONAL_L0_COLUMN) {
        const defaultValue = new V1_CString();
        defaultValue.value = node.column;
        lambda.body = [defaultValue];
      } else {
        const defaultValue = new V1_AppliedProperty();
        defaultValue.parameters = [parameter];
        defaultValue.property = node.column;
        lambda.body = [defaultValue];
      }
      lambda.parameters = [parameter];
      data.leafExtendedColumns.unshift({
        name: node.dimension,
        type: PRIMITIVE_TYPE.STRING,
        mapFn: engine.serializeValueSpecification(lambda),
      } satisfies DataCubeSnapshotExtendedColumn);
    });

    // Adding dimensions to selected list
    data.selectColumns = data.selectColumns.filter(
      (col) => !dimensionColNames.includes(col.name),
    );

    const dimensionCols = nodes.map((col) =>
      _toCol({ name: col.dimension, type: PRIMITIVE_TYPE.STRING }),
    );
    data.selectColumns.unshift(...dimensionCols);

    // Adding filter based on group by nodes
    const groupByNodes = nodes.flatMap((x) => x.groupByNodes);
    if (groupByNodes.length > 0) {
      const filter = [
        _flattenFilterSnapshot(nodes.flatMap((x) => x.groupByNodes)),
      ];
      if (data.filter) {
        filter.push(data.filter);
        data.filter = {
          groupOperator: DataCubeQueryFilterGroupOperator.AND,
          conditions: filter,
        };
      } else {
        data.filter = filter.at(0);
      }
    }

    // Adding dimensions to groupby
    if (data.groupBy) {
      data.groupBy.columns.unshift(...dimensionCols);
    } else {
      data.groupBy = {
        columns: dimensionCols,
      } satisfies DataCubeSnapshotGroupBy;
    }
  }

  // --------------------------------- LEAF-LEVEL EXTEND ---------------------------------

  if (data.leafExtendedColumns.length) {
    _process(
      'leafExtend',
      data.leafExtendedColumns.map((col) =>
        _function(DataCubeFunction.EXTEND, [
          _cols([
            _colSpec(
              col.name,
              guaranteeType(
                engine.deserializeValueSpecification(col.mapFn),
                V1_Lambda,
              ),
              col.reduceFn
                ? guaranteeType(
                    engine.deserializeValueSpecification(col.reduceFn),
                    V1_Lambda,
                  )
                : undefined,
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
        _lambda([_var()], [_filter(data.filter, engine.filterOperations)]),
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

  // TODO: rethink pivots for dimensional grid mode

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
            engine.aggregateOperations,
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

  // TODO: implement group level extends for dimensional grid mode

  // --------------------------------- SORT ---------------------------------

  // TODO: implement sort for dimensional grid mode

  // --------------------------------- LIMIT ---------------------------------

  // TODO: rethink limits for dimensional grid mode

  // --------------------------------- SLICE ---------------------------------

  // TODO: rethink slice for dimensional grid mode
  // slice can lead to incorrect view of data for dimensionality

  // --------------------------------- FINALIZE ---------------------------------

  if (!options?.skipExecutionContext) {
    const executionContext = engine.buildExecutionContext(source);
    if (executionContext) {
      sequence.push(executionContext);
    }
  }

  options?.postProcessor?.(snapshot, sequence, funcMap, configuration, engine);

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

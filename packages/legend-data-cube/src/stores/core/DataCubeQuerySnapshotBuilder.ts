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
 * This and its corresponding utilitites are used to build the query snapshot from the
 * executable query. This is needed when we initialize the engine by loading a
 * persisted query.
 ***************************************************************************************/

import {
  V1_AppliedFunction,
  V1_CInteger,
  extractElementNameFromPath as _name,
  matchFunctionName,
  type V1_ValueSpecification,
  V1_Lambda,
} from '@finos/legend-graph';
import type { DataCubeQuery } from './model/DataCubeQuery.js';
import {
  DataCubeQuerySnapshot,
  type DataCubeQuerySnapshotAggregateColumn,
  type DataCubeQuerySnapshotProcessingContext,
  type DataCubeQuerySnapshotSortColumn,
} from './DataCubeQuerySnapshot.js';
import {
  _findCol,
  _toCol,
  type DataCubeColumn,
} from './model/DataCubeColumn.js';
import {
  assertTrue,
  at,
  guaranteeNonNullable,
  isNonNullable,
} from '@finos/legend-shared';
import {
  DataCubeFunction,
  type DataCubeQueryFunctionMap,
} from './DataCubeQueryEngine.js';
import { newConfiguration } from './DataCubeConfigurationBuilder.js';
import {
  _colSpecArrayParam,
  _param,
  _extractExtendedColumns,
  _filter,
  _relationType,
  _genericTypeParam,
  _packageableType,
  _aggCol,
  _sort,
  _unwrapLambda,
  _pivotSort,
  _groupBySort,
  _validatePivot,
  _checkDuplicateColumns,
  _validateGroupBy,
} from './DataCubeQuerySnapshotBuilderUtils.js';
import type { DataCubeSource } from './model/DataCubeSource.js';
import type { DataCubeEngine } from './DataCubeEngine.js';
import {
  _deserializeValueSpecification,
  _serializeValueSpecification,
} from './DataCubeQueryBuilderUtils.js';

// --------------------------------- BUILDING BLOCKS ---------------------------------

const _SUPPORTED_TOP_LEVEL_FUNCTIONS: {
  func: string;
  /**
   * If there are multiple signature to a function, such as extend(), this indicates
   * the minimum number of parameters. And a stopping condition needs to be provided.
   *
   * Note that this is a naive mechanism to process simple functions, by no means, it's
   * meant to mimic generic function matcher.
   */
  parameters: number;
  stopCondition?: ((_func: V1_AppliedFunction) => boolean) | undefined;
}[] = [
  {
    func: DataCubeFunction.EXTEND,
    parameters: 1,
    // handle OLAP form where first parameter is over() expression used to construct the window
    stopCondition: (_func) =>
      matchFunctionName(_func.function, DataCubeFunction.EXTEND) &&
      _func.parameters[0] instanceof V1_AppliedFunction &&
      matchFunctionName(_func.parameters[0].function, DataCubeFunction.OVER),
  },
  { func: DataCubeFunction.FILTER, parameters: 1 },
  { func: DataCubeFunction.SELECT, parameters: 1 },
  { func: DataCubeFunction.GROUP_BY, parameters: 2 },
  { func: DataCubeFunction.PIVOT, parameters: 2 },
  { func: DataCubeFunction.CAST, parameters: 1 },
  { func: DataCubeFunction.SORT, parameters: 1 },
  { func: DataCubeFunction.LIMIT, parameters: 1 },
];

type FunctionSequenceCompositionNodePattern = {
  name: string;
  repeat?: boolean | undefined;
  required?: boolean | undefined;
};
type FunctionSequenceCompositionSimpleNodePattern =
  FunctionSequenceCompositionNodePattern & {
    func: string;
  };
type FunctionSequenceCompositionGroupNodePattern =
  FunctionSequenceCompositionNodePattern & {
    funcs: FunctionSequenceCompositionSimpleNodePattern[];
  };

enum _FUNCTION_SEQUENCE_COMPOSITION_PART {
  LEAF_EXTEND = 'leaf_extend',
  FILTER = 'filter',
  SELECT = 'select',
  PIVOT__GROUP = 'pivot__group',
  PIVOT_SORT = 'pivot_sort',
  PIVOT = 'pivot',
  PIVOT_CAST = 'pivot_cast',
  GROUP_BY__GROUP = 'group_by__group',
  GROUP_BY = 'group_by',
  GROUP_BY_SORT = 'group_by_sort',
  GROUP_EXTEND = 'group_extend',
  SORT = 'sort',
  LIMIT = 'limit',
}

// This corresponds to the function sequence that we currently support:
//
// ->extend()*
// ->filter()
// ->select()
// ->sort()->pivot()->cast()
// ->groupBy()->sort()
// ->extend()*
// ->sort()
// ->limit()
//
const _FUNCTION_SEQUENCE_COMPOSITION_PATTERN: (
  | FunctionSequenceCompositionSimpleNodePattern
  | FunctionSequenceCompositionGroupNodePattern
)[] = [
  {
    // leaf-level extend
    name: _FUNCTION_SEQUENCE_COMPOSITION_PART.LEAF_EXTEND,
    func: DataCubeFunction.EXTEND,
    repeat: true,
  },
  {
    name: _FUNCTION_SEQUENCE_COMPOSITION_PART.FILTER,
    func: DataCubeFunction.FILTER,
  },
  {
    name: _FUNCTION_SEQUENCE_COMPOSITION_PART.SELECT,
    func: DataCubeFunction.SELECT,
  },
  {
    name: _FUNCTION_SEQUENCE_COMPOSITION_PART.PIVOT__GROUP,
    funcs: [
      {
        // sort to ensure stable column ordering
        name: _FUNCTION_SEQUENCE_COMPOSITION_PART.PIVOT_SORT,
        func: DataCubeFunction.SORT,
        required: true,
      },
      {
        name: _FUNCTION_SEQUENCE_COMPOSITION_PART.PIVOT,
        func: DataCubeFunction.PIVOT,
        required: true,
      },
      {
        // cast to a relation type post pivot() to enable type-checking
        name: _FUNCTION_SEQUENCE_COMPOSITION_PART.PIVOT_CAST,
        func: DataCubeFunction.CAST,
        required: true,
      },
    ],
  },
  {
    name: _FUNCTION_SEQUENCE_COMPOSITION_PART.GROUP_BY__GROUP,
    funcs: [
      {
        name: _FUNCTION_SEQUENCE_COMPOSITION_PART.GROUP_BY,
        func: DataCubeFunction.GROUP_BY,
        required: true,
      },
      {
        // sort to ensure stable row ordering
        name: _FUNCTION_SEQUENCE_COMPOSITION_PART.GROUP_BY_SORT,
        func: DataCubeFunction.SORT,
        required: true,
      },
    ],
  },
  {
    // group-level extend
    name: _FUNCTION_SEQUENCE_COMPOSITION_PART.GROUP_EXTEND,
    func: DataCubeFunction.EXTEND,
    repeat: true,
  },
  {
    name: _FUNCTION_SEQUENCE_COMPOSITION_PART.SORT,
    func: DataCubeFunction.SORT,
  },
  {
    name: _FUNCTION_SEQUENCE_COMPOSITION_PART.LIMIT,
    func: DataCubeFunction.LIMIT,
  },
];
const _FUNCTION_SEQUENCE_COMPOSITION_PATTERN_REGEXP = new RegExp(
  `^${_FUNCTION_SEQUENCE_COMPOSITION_PATTERN
    .map((node) =>
      'funcs' in node
        ? `(${node.funcs
            .map(
              (childNode) =>
                `(?<${childNode.name}>${childNode.repeat ? `(?:<${_name(childNode.func)}>____\\d+)*` : `<${_name(childNode.func)}>____\\d+`})${childNode.repeat ? '' : !childNode.required ? '?' : ''}`,
            )
            .join('')})${node.repeat ? '*' : !node.required ? '?' : ''}`
        : `(?<${node.name}>${node.repeat ? `(?:<${_name(node.func)}>____\\d+)*` : `<${_name(node.func)}>____\\d+`})${node.repeat ? '' : !node.required ? '?' : ''}`,
    )
    .join('')}$`,
);

/**
 * Turn the function sequence into a map of available functions
 * for easier construction of the snapshot
 */
function extractFunctionMap(
  query: V1_ValueSpecification,
): DataCubeQueryFunctionMap {
  // Make sure this is a sequence of function calls
  if (!(query instanceof V1_AppliedFunction)) {
    throw new Error(`Can't process expression: expected a function expression`);
  }
  const sequence: V1_AppliedFunction[] = [];
  let currentFunc = query;

  while (currentFunc instanceof V1_AppliedFunction) {
    const supportedFunc = _SUPPORTED_TOP_LEVEL_FUNCTIONS.find((spec) =>
      matchFunctionName(currentFunc.function, spec.func),
    );

    // Check that all functions in sequence are supported (matching name and number of parameters)
    if (!supportedFunc) {
      throw new Error(
        `Can't process expression: found unsupported function ${currentFunc.function}()`,
      );
    }

    // recursively unwrap the nested function expression to build the function sequence,
    // i.e. if we have the expression x(y(z(t(...)))), we need to unwrap them and build the sequence
    // t(...)->z()->y()->x() and simultaneously, remove the first parameter from each function for
    // simplicity, except for the innermost function
    if (currentFunc.parameters.length > supportedFunc.parameters) {
      // if stop condition is fulfilled, no more function sequence drilling is needed
      if (supportedFunc.stopCondition?.(currentFunc)) {
        sequence.unshift(currentFunc);
        break;
      }

      // assert that the supported function has the expected number of parameters
      assertTrue(
        currentFunc.parameters.length === supportedFunc.parameters + 1,
        `Can't process ${_name(currentFunc.function)}() expression: expected at most ${supportedFunc.parameters + 1} parameters provided, got ${currentFunc.parameters.length}`,
      );
      const func = _param(
        currentFunc,
        0,
        V1_AppliedFunction,
        `Can't process expression: expected a sequence of function calls (e.g. x()->y()->z())`,
      );
      currentFunc.parameters = currentFunc.parameters.slice(1);
      sequence.unshift(currentFunc);
      currentFunc = func;
    } else {
      sequence.unshift(currentFunc);
      break;
    }
  }

  // Check that sequence follows the supported pattern
  const sequenceFormText = sequence
    .map((func, idx) => `<${_name(func.function)}>____${idx}`)
    .join('');
  const matchResult = sequenceFormText.match(
    _FUNCTION_SEQUENCE_COMPOSITION_PATTERN_REGEXP,
  );
  if (!matchResult) {
    throw new Error(
      `Can't process expression: unsupported function composition ${sequence.map((fn) => `${_name(fn.function)}()`).join('->')} (supported composition: ${_FUNCTION_SEQUENCE_COMPOSITION_PATTERN.map((node) => `${'funcs' in node ? `[${node.funcs.map((childNode) => `${_name(childNode.func)}()`).join('->')}]` : `${_name(node.func)}()`}`).join('->')})`,
    );
  }

  const _process = (key: string): V1_AppliedFunction[] | undefined => {
    const match = matchResult.groups?.[key];
    if (!match) {
      return undefined;
    }
    const funcMatches = match.match(/\<.*?\>____\d+/g);
    if (!funcMatches?.length) {
      return undefined;
    }

    return funcMatches
      .map((funcMatch) => {
        const idx = Number(funcMatch.split('____')[1]);
        if (isNaN(idx) || idx >= sequence.length) {
          return undefined;
        }
        const func = at(sequence, idx);
        return func;
      })
      .filter(isNonNullable);
  };

  return {
    leafExtend: _process(_FUNCTION_SEQUENCE_COMPOSITION_PART.LEAF_EXTEND),
    select: _process(_FUNCTION_SEQUENCE_COMPOSITION_PART.SELECT)?.[0],
    filter: _process(_FUNCTION_SEQUENCE_COMPOSITION_PART.FILTER)?.[0],
    pivotSort: _process(_FUNCTION_SEQUENCE_COMPOSITION_PART.PIVOT_SORT)?.[0],
    pivot: _process(_FUNCTION_SEQUENCE_COMPOSITION_PART.PIVOT)?.[0],
    pivotCast: _process(_FUNCTION_SEQUENCE_COMPOSITION_PART.PIVOT_CAST)?.[0],
    groupBy: _process(_FUNCTION_SEQUENCE_COMPOSITION_PART.GROUP_BY)?.[0],
    groupBySort: _process(
      _FUNCTION_SEQUENCE_COMPOSITION_PART.GROUP_BY_SORT,
    )?.[0],
    groupExtend: _process(_FUNCTION_SEQUENCE_COMPOSITION_PART.GROUP_EXTEND),
    sort: _process(_FUNCTION_SEQUENCE_COMPOSITION_PART.SORT)?.[0],
    limit: _process(_FUNCTION_SEQUENCE_COMPOSITION_PART.LIMIT)?.[0],
  };
}

// --------------------------------- MAIN ---------------------------------

/**
 * Analyze the partial query to build a query snapshot.
 *
 * Implementation-wise, this extracts the function call sequence, then walk the
 * sequence in order to fill in the information for the snapshot.
 */
export async function validateAndBuildQuerySnapshot(
  partialQuery: V1_ValueSpecification,
  source: DataCubeSource,
  baseQuery: DataCubeQuery,
  engine: DataCubeEngine,
) {
  // --------------------------------- BASE ---------------------------------
  // Build the function call sequence and the function map to make the
  // analysis more ergonomic

  // Clone the query since we will mutate it during the process
  const query = _deserializeValueSpecification(
    _serializeValueSpecification(partialQuery),
  );
  const funcMap = extractFunctionMap(query);
  const snapshot = DataCubeQuerySnapshot.create({});
  const data = snapshot.data;
  const registeredColumns = new Map<string, DataCubeColumn>();
  /**
   * We want to make sure all columns, either from source or created, e.g. extended columns,
   * have unique names. This is to simplify the logic within DataCube so different components
   * can easily refer to columns by name without having to worry about conflicts.
   */
  const _checkColName = (col: DataCubeColumn, message: string) => {
    if (registeredColumns.has(col.name)) {
      throw new Error(message);
    }
    registeredColumns.set(col.name, col);
  };
  const colsMap = new Map<string, DataCubeColumn>();
  const _getCol = (colName: string) => {
    const column = guaranteeNonNullable(
      colsMap.get(colName),
      `Can't find column '${colName}'`,
    );
    return _toCol(column);
  };
  const _setCol = (col: DataCubeColumn) => colsMap.set(col.name, col);

  // -------------------------------- SOURCE --------------------------------

  data.sourceColumns = source.columns;

  // validate
  _checkDuplicateColumns(
    data.sourceColumns,
    (colName) =>
      `Can't process source: found duplicate source columns '${colName}'`,
  );
  data.sourceColumns.forEach((col) =>
    _checkColName(
      col,
      `Can't process source: another column with name '${col.name}' is already registered`,
    ),
  );

  data.sourceColumns.forEach((col) => _setCol(col));

  // --------------------------- LEAF-LEVEL EXTEND ---------------------------

  if (funcMap.leafExtend?.length) {
    data.leafExtendedColumns = await _extractExtendedColumns(
      funcMap.leafExtend,
      Array.from(colsMap.values()),
      engine,
    );

    // validate
    // NOTE: these duplication checks might not be necessary since compiler would catch these
    // issues anyway, but we leave them here to be defensive
    _checkDuplicateColumns(
      data.leafExtendedColumns,
      (colName) =>
        `Can't process extend() expression: found duplicate extended columns '${colName}'`,
    );
    data.leafExtendedColumns.forEach((col) =>
      _checkColName(
        col,
        `Can't process extend() expression: another column with name '${col.name}' is already registered`,
      ),
    );

    data.leafExtendedColumns.forEach((col) => _setCol(col));
  }

  // --------------------------------- FILTER ---------------------------------

  if (funcMap.filter) {
    const lambda = _param(
      funcMap.filter,
      0,
      V1_Lambda,
      `Can't process filter() expression: expected parameter at index 0 to be a lambda expression`,
    );
    data.filter = _filter(
      _unwrapLambda(lambda, `Can't process filter() expression`),
      _getCol,
      engine.filterOperations,
    );
  }

  // --------------------------------- SELECT ---------------------------------

  if (funcMap.select) {
    data.selectColumns = _colSpecArrayParam(funcMap.select, 0).colSpecs.map(
      (colSpec) => _getCol(colSpec.name),
    );

    // validate
    _checkDuplicateColumns(
      data.selectColumns,
      (colName) =>
        `Can't process select() expression: found duplicate select columns '${colName}'`,
    );

    // restrict the set of available columns to only selected columns
    colsMap.clear();
    data.selectColumns.forEach((col) => _setCol(col));
  } else {
    // mandate that if select() expression is not present, we consider this
    // as no-column is selected
    colsMap.clear();
  }

  // --------------------------------- PIVOT ---------------------------------

  let pivotAggColumns: DataCubeQuerySnapshotAggregateColumn[] = [];
  let pivotSortColumns: DataCubeQuerySnapshotSortColumn[] = [];
  if (funcMap.pivot && funcMap.pivotCast && funcMap.pivotSort) {
    const pivotColumns = _colSpecArrayParam(funcMap.pivot, 0).colSpecs.map(
      (colSpec) => _getCol(colSpec.name),
    );
    const castColumns = _relationType(
      _genericTypeParam(funcMap.pivotCast, 0).genericType,
    ).columns.map((column) => ({
      name: column.name,
      type: _packageableType(column.genericType).fullPath,
    }));
    data.pivot = {
      columns: pivotColumns,
      castColumns: castColumns,
    };

    // process aggregate columns
    pivotAggColumns = _colSpecArrayParam(funcMap.pivot, 1).colSpecs.map(
      (colSpec) => _aggCol(colSpec, _getCol, engine.aggregateOperations),
    );
    // process sort columns
    pivotSortColumns = _pivotSort(funcMap.pivotSort, pivotColumns, _getCol);

    // validate
    _validatePivot(data.pivot, pivotAggColumns, Array.from(colsMap.values()));

    // restrict the set of available columns to only casted columns
    colsMap.clear();
    castColumns.forEach((col) => _setCol(col));
  }

  // --------------------------------- GROUP BY ---------------------------------

  let groupByAggColumns: DataCubeQuerySnapshotAggregateColumn[] = [];
  let groupBySortColumns: DataCubeQuerySnapshotSortColumn[] = [];
  if (funcMap.groupBy && funcMap.groupBySort) {
    const groupByColumns = _colSpecArrayParam(funcMap.groupBy, 0).colSpecs.map(
      (colSpec) => _getCol(colSpec.name),
    );
    data.groupBy = {
      columns: groupByColumns,
    };

    // process aggregate columns
    groupByAggColumns = _colSpecArrayParam(funcMap.groupBy, 1).colSpecs.map(
      (colSpec) => _aggCol(colSpec, _getCol, engine.aggregateOperations),
    );
    // process sort columns
    groupBySortColumns = _groupBySort(
      funcMap.groupBySort,
      groupByColumns,
      _getCol,
    );

    // validate
    _validateGroupBy(
      data.groupBy,
      groupByAggColumns,
      data.pivot,
      pivotAggColumns,
      Array.from(colsMap.values()),
    );
  }

  // --------------------------- GROUP-LEVEL EXTEND ---------------------------

  if (funcMap.groupExtend?.length) {
    data.groupExtendedColumns = await _extractExtendedColumns(
      funcMap.groupExtend,
      Array.from(colsMap.values()),
      engine,
    );

    // validate
    // NOTE: these duplication checks might not be necessary since compiler would catch these
    // issues anyway, but we leave them here to be defensive
    _checkDuplicateColumns(
      data.groupExtendedColumns,
      (colName) =>
        `Can't process extend() expression: found duplicate extended columns '${colName}'`,
    );
    data.groupExtendedColumns.forEach((col) =>
      _checkColName(
        col,
        `Can't process extend() expression: another column with name '${col.name}' is already registered`,
      ),
    );

    data.groupExtendedColumns.forEach((col) => _setCol(col));
  }

  // --------------------------------- SORT ---------------------------------

  if (funcMap.sort) {
    data.sortColumns = _sort(funcMap.sort, _getCol);

    // validate
    _checkDuplicateColumns(
      data.sortColumns,
      (colName) =>
        `Can't process sort() expression: found duplicate sort columns '${colName}'`,
    );
  }

  // --------------------------------- LIMIT ---------------------------------

  if (funcMap.limit) {
    // NOTE: negative number -10 is parsed as minus(10) so this check will also
    // reject negative number
    const value = _param(
      funcMap.limit,
      0,
      V1_CInteger,
      `Can't process limit() expression: expected limit to be a non-negative integer value`,
    );
    data.limit = value.value;
  }

  // --------------------------------- CONFIGURATION ---------------------------------

  const configuration = validateAndBuildConfiguration(
    {
      snapshot,
      groupByAggColumns,
      groupBySortColumns,
      pivotAggColumns,
      pivotSortColumns,
    },
    baseQuery,
    engine,
  );
  data.configuration = configuration.serialize();

  return snapshot.finalize();
}

/**
 * Builds and/or validates the configuration.
 *
 * TL;DR;
 * If not provided, generate a default configuration based off the metadata extracted
 * when processing the query in previous steps.
 * If provided, check if the configuration aggree with the query processing metadata.
 *
 * CONTEXT:
 * A data-cube conceptually consists of a data query, in form of a Pure query, instead
 * of a particular specification object format, and this configuration, that holds mostly
 * layout and styling customization. But there are overlaps, i.e. certain _meta_ query
 * configuration are stored in this configuration, e.g. column aggregation type, because
 * a column aggregation's preference needs to be specified even when there's no aggregation
 * specified over that column in the data query.
 *
 * But in the example above, if the column is part of an aggregation, we have to ensure
 * the configuration is consistent with the query. Conflicts can happen, for example:
 * - column kind and type conflict with aggregation
 * - column kind and type conflict with the column configuration
 *
 * In those cases, we need to make sure the query and the configuration to agree.
 * If a config is provided, we will need to validate that config. If none is provided,
 * we will generate a config from the query processing metadata, in which case, no
 * validation is needed. The latter case comes up quite often where the query comes from a
 * different source, such as Studio or Query, or another part of Engine, and the layout
 * configuration is not specified.
 */
function validateAndBuildConfiguration(
  context: DataCubeQuerySnapshotProcessingContext,
  baseQuery: DataCubeQuery,
  engine: DataCubeEngine,
) {
  const data = context.snapshot.data;
  const config = baseQuery.configuration;
  // generate a default configuration anyway to be used to compare with the
  // provided configuration for validation purpose
  const _config = newConfiguration(context);

  if (!config) {
    return _config;
  }

  // check tree column sort direction (only relevant if groupBy is present)
  if (data.groupBy) {
    assertTrue(
      config.treeColumnSortDirection === _config.treeColumnSortDirection,
      `Can't process configuration: tree column sort direction mismatch (expected: '${_config.treeColumnSortDirection.toLowerCase()}', found: '${config.treeColumnSortDirection.toLowerCase()}')`,
    );
  }

  // check columns
  const columns = config.columns;
  const _columns = _config.columns;
  const columnNames = new Set<string>();

  // check for duplicate columns
  columns.forEach((col) => {
    if (columnNames.has(col.name)) {
      throw new Error(
        `Can't process configuration: found duplicate columns '${col.name}'`,
      );
    } else {
      columnNames.add(col.name);
    }
  });

  // check for extra columns
  columns.forEach((col) => {
    if (!_findCol(_columns, col.name)) {
      throw new Error(
        `Can't process configuration: found extra column '${col.name}'`,
      );
    }
  });

  // check for missing columns
  _columns.forEach((col) => {
    if (!_findCol(columns, col.name)) {
      throw new Error(
        `Can't process configuration: missing column '${col.name}'`,
      );
    }
  });

  // check for columns ordering
  const columnsOrdering = [
    ...data.selectColumns,
    ...data.groupExtendedColumns,
    ...[...data.sourceColumns, ...data.leafExtendedColumns].filter(
      (col) => !_findCol(data.selectColumns, col.name),
    ),
  ];
  columnsOrdering.forEach((_col, idx) => {
    const col = at(columns, idx);
    assertTrue(
      _col.name === col.name,
      `Can't process configuration: column ordering mismatch at index ${idx} (expected: '${_col.name}', found: '${col.name})', expected ordering: ${columnsOrdering.map((c) => c.name).join(', ')}`,
    );
  });

  columns.forEach((column) => {
    const _column = guaranteeNonNullable(_findCol(_columns, column.name));

    // check type
    assertTrue(
      column.type === _column.type,
      `Can't process configuration: type mismatch for column '${column.name}' (expected: '${_column.type}', found: '${column.type}')`,
    );

    // check selection
    assertTrue(
      column.isSelected === _column.isSelected,
      `Can't process configuration: selection mismatch for column '${column.name}' (expected: '${_column.isSelected}', found: '${column.isSelected}')`,
    );

    // check kind (only relevant if aggregation is present)
    if (data.pivot ?? data.groupBy) {
      assertTrue(
        column.kind === _column.kind,
        `Can't process configuration: kind mismatch for column '${column.name}' (expected: '${_column.kind.toLowerCase()}', found: '${column.kind.toLowerCase()}')`,
      );
    }

    // check aggregation (only relevant if aggregation is present)
    if (data.pivot ?? data.groupBy) {
      assertTrue(
        column.aggregateOperator === _column.aggregateOperator,
        `Can't process configuration: aggregation operator mismatch for column '${column.name}' (expected: '${_column.aggregateOperator}', found: '${column.aggregateOperator}')`,
      );
      assertTrue(
        engine
          .getAggregateOperation(column.aggregateOperator)
          .isCompatibleWithParameterValues(column.aggregationParameters),
        `Can't process configuration: incompatible aggregation parameter values for column '${column.name}' (operator: '${column.aggregateOperator}')`,
      );
    }

    // check pivot sort direction and exclusion (only relevant if pivot is present)
    if (data.pivot) {
      assertTrue(
        column.excludedFromPivot === _column.excludedFromPivot,
        `Can't process configuration: pivot exclusion mismatch for column '${column.name}' (expected: '${_column.excludedFromPivot}', found: '${column.excludedFromPivot}')`,
      );
      assertTrue(
        column.pivotSortDirection === _column.pivotSortDirection,
        `Can't process configuration: pivot sort direction mismatch for column '${column.name}' (expected: '${_column.pivotSortDirection?.toLowerCase() ?? 'none'}', found: '${column.pivotSortDirection?.toLowerCase() ?? 'none'}')`,
      );
    }
  });

  return config;
}

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
 * These are utilities used to build the query snapshot from the executable query.
 * This is needed when we initialize the application by loading a persisted query.
 ***************************************************************************************/

import {
  PRIMITIVE_TYPE,
  V1_AppliedFunction,
  V1_CInteger,
  V1_ClassInstance,
  V1_ColSpec,
  V1_ColSpecArray,
  V1_Collection,
  V1_Lambda,
  V1_serializeValueSpecification,
  extractElementNameFromPath as _name,
  matchFunctionName,
  type V1_ValueSpecification,
} from '@finos/legend-graph';
import type { DataCubeQuery } from '../../../server/DataCubeQuery.js';
import {
  DataCubeQuerySnapshot,
  type DataCubeQuerySnapshotAggregateColumn,
  type DataCubeQuerySnapshotColumn,
} from './DataCubeQuerySnapshot.js';
import {
  assertTrue,
  assertType,
  guaranteeNonNullable,
  guaranteeType,
  UnsupportedOperationError,
  type Clazz,
} from '@finos/legend-shared';
import {
  DataCubeQuerySortOperation,
  DataCubeFunction,
  type DataCubeQueryFunctionMap,
  DataCubeAggregateOperation,
} from './DataCubeQueryEngine.js';
import { DataCubeConfiguration } from './DataCubeConfiguration.js';
import { buildDefaultConfiguration } from './DataCubeConfigurationBuilder.js';

// --------------------------------- UTILITIES ---------------------------------

function _param<T extends V1_ValueSpecification>(
  func: V1_AppliedFunction,
  paramIdx: number,
  clazz: Clazz<T>,
): T {
  assertTrue(
    func.parameters.length >= paramIdx + 1,
    `Can't process ${_name(func.function)}: Expected at least ${paramIdx + 1} parameter(s)`,
  );
  return guaranteeType(
    func.parameters[paramIdx],
    clazz,
    `Can't process ${_name(func.function)}: Found unexpected type for parameter at index ${paramIdx}`,
  );
}

function _colSpecParam(func: V1_AppliedFunction, paramIdx: number) {
  return guaranteeType(
    _param(func, paramIdx, V1_ClassInstance).value,
    V1_ColSpec,
    `Can't process ${_name(func.function)}: Expected parameter at index ${paramIdx} to be a column specification`,
  );
}

function _colSpecArrayParam(func: V1_AppliedFunction, paramIdx: number) {
  return guaranteeType(
    _param(func, paramIdx, V1_ClassInstance).value,
    V1_ColSpecArray,
    `Can't process ${_name(func.function)}: Expected parameter at index ${paramIdx} to be a column specification list`,
  );
}

function _funcMatch(
  value: V1_ValueSpecification | undefined,
  functionNames: string | string[],
) {
  assertType(
    value,
    V1_AppliedFunction,
    `Can't process function: Found unexpected value specification type`,
  );
  assertTrue(
    matchFunctionName(
      value.function,
      Array.isArray(functionNames) ? functionNames : [functionNames],
    ),
    `Can't process function: Expected function name to be one of [${Array.isArray(functionNames) ? functionNames.join(', ') : functionNames}]`,
  );
  return value;
}

function _aggFuncMatch(
  value: V1_ValueSpecification | undefined,
  functionNames: string | string[],
) {
  assertType(
    value,
    V1_Lambda,
    `Can't process aggregation: Found unexpected value specification type`,
  );
  return _funcMatch(value.body[0], functionNames);
}

export function _defaultAggCol(
  name: string,
  type: string,
): DataCubeQuerySnapshotAggregateColumn | undefined {
  switch (type) {
    case PRIMITIVE_TYPE.NUMBER:
    case PRIMITIVE_TYPE.INTEGER:
    case PRIMITIVE_TYPE.DECIMAL:
    case PRIMITIVE_TYPE.FLOAT: {
      return {
        name,
        type,
        operation: DataCubeAggregateOperation.SUM,
        parameters: [],
      };
    }
    default:
      return undefined;
  }
}

function _aggCol(colSpec: V1_ColSpec, column: DataCubeQuerySnapshotColumn) {
  const func = _aggFuncMatch(
    colSpec.function2,
    Object.values(DataCubeFunction),
  );
  if (matchFunctionName(func.function, DataCubeFunction.COUNT)) {
    return {
      ...column,
      operation: DataCubeAggregateOperation.COUNT,
      parameters: [],
    };
  } else if (matchFunctionName(func.function, DataCubeFunction.SUM)) {
    return {
      ...column,
      operation: DataCubeAggregateOperation.SUM,
      parameters: [],
    };
  } else if (matchFunctionName(func.function, DataCubeFunction.AVERAGE)) {
    return {
      ...column,
      operation: DataCubeAggregateOperation.AVERAGE,
      parameters: [],
    };
  } else if (matchFunctionName(func.function, DataCubeFunction.MIN)) {
    return {
      ...column,
      operation: DataCubeAggregateOperation.MIN,
      parameters: [],
    };
  } else if (matchFunctionName(func.function, DataCubeFunction.MAX)) {
    return {
      ...column,
      operation: DataCubeAggregateOperation.MAX,
      parameters: [],
    };
  } else if (matchFunctionName(func.function, DataCubeFunction.FIRST)) {
    return {
      ...column,
      operation: DataCubeAggregateOperation.FIRST,
      parameters: [],
    };
  } else if (matchFunctionName(func.function, DataCubeFunction.LAST)) {
    return {
      ...column,
      operation: DataCubeAggregateOperation.LAST,
      parameters: [],
    };
  } else if (matchFunctionName(func.function, DataCubeFunction.VAR_POP)) {
    return {
      ...column,
      operation: DataCubeAggregateOperation.VAR_POP,
      parameters: [],
    };
  } else if (matchFunctionName(func.function, DataCubeFunction.VAR_SAMP)) {
    return {
      ...column,
      operation: DataCubeAggregateOperation.VAR_SAMP,
      parameters: [],
    };
  } else if (matchFunctionName(func.function, DataCubeFunction.STDDEV_POP)) {
    return {
      ...column,
      operation: DataCubeAggregateOperation.STDDEV_POP,
      parameters: [],
    };
  } else if (matchFunctionName(func.function, DataCubeFunction.STDDEV_SAMP)) {
    return {
      ...column,
      operation: DataCubeAggregateOperation.STDDEV_SAMP,
      parameters: [],
    };
  } else {
    throw new UnsupportedOperationError(
      `Unsupported aggregate function '${func.function}'`,
    );
  }
}

// --------------------------------- BUILDING BLOCKS ---------------------------------

const _SUPPORTED_TOP_LEVEL_FUNCTIONS: {
  func: string;
  parameters: number;
}[] = [
  { func: DataCubeFunction.FILTER, parameters: 1 },
  { func: DataCubeFunction.EXTEND, parameters: 1 },
  { func: DataCubeFunction.SELECT, parameters: 1 },
  { func: DataCubeFunction.GROUP_BY, parameters: 3 },
  { func: DataCubeFunction.LIMIT, parameters: 1 },
  { func: DataCubeFunction.PIVOT, parameters: 3 },
  { func: DataCubeFunction.SORT, parameters: 1 },

  { func: DataCubeFunction.CAST, parameters: 1 },
];

// NOTE: this corresponds to the sequence:
// filter()->extend()->groupBy()->select()->pivot()->cast()->extend()->sort()->limit()
// which represents the ONLY query shape that we currently support
const _FUNCTION_SEQUENCE_COMPOSITION_PATTERN: {
  func: string;
  repeat?: boolean | undefined;
  required?: boolean | undefined;
}[] = [
  { func: DataCubeFunction.FILTER },
  { func: DataCubeFunction.EXTEND },
  { func: DataCubeFunction.SELECT },
  { func: DataCubeFunction.GROUP_BY },
  { func: DataCubeFunction.PIVOT },
  { func: DataCubeFunction.CAST },
  { func: DataCubeFunction.EXTEND },
  { func: DataCubeFunction.SORT },
  { func: DataCubeFunction.LIMIT },
];
const _FUNCTION_SEQUENCE_COMPOSITION_PATTERN_REGEXP = new RegExp(
  `^${_FUNCTION_SEQUENCE_COMPOSITION_PATTERN
    .map(
      (entry) =>
        `(?:<${_name(entry.func)}>)${entry.repeat ? '*' : !entry.required ? '?' : ''}`,
    )
    .join('')}$`,
);

/**
 * Since the query created by DataCube will be a chain call of various functions,
 * this utility function will extract that sequence of function calls as well as
 * do various basic checks for the validity, composition, and order of those functions.
 */
function extractQueryFunctionSequence(query: V1_ValueSpecification) {
  // Make sure this is a sequence of function calls
  if (!(query instanceof V1_AppliedFunction)) {
    throw new Error(
      `Query must be a sequence of function calls (e.g. x()->y()->z())`,
    );
  }
  const sequence: V1_AppliedFunction[] = [];
  let currentQuery = query;
  while (currentQuery instanceof V1_AppliedFunction) {
    const supportedFunc = _SUPPORTED_TOP_LEVEL_FUNCTIONS.find((spec) =>
      matchFunctionName(currentQuery.function, spec.func),
    );

    // Check that all functions in sequence are supported
    if (!supportedFunc) {
      throw new Error(`Found unsupported function ${currentQuery.function}()`);
    }
    if (currentQuery.parameters.length > supportedFunc.parameters) {
      const vs = currentQuery.parameters[0];
      if (!(vs instanceof V1_AppliedFunction)) {
        throw new Error(
          `Query must be a sequence of function calls (e.g. x()->y()->z())`,
        );
      }
      currentQuery.parameters = currentQuery.parameters.slice(1);
      sequence.unshift(currentQuery);
      currentQuery = vs;
    } else {
      sequence.unshift(currentQuery);
      break;
    }
  }

  // Check that sequence follows the supported pattern
  const sequenceFormText = sequence
    .map((func) => `<${_name(func.function)}>`)
    .join('');
  if (!sequenceFormText.match(_FUNCTION_SEQUENCE_COMPOSITION_PATTERN_REGEXP)) {
    throw new Error(
      `Unsupported function composition ${sequence.map((fn) => `${_name(fn.function)}()`).join('->')} (supported composition: ${_FUNCTION_SEQUENCE_COMPOSITION_PATTERN.map((entry) => `${_name(entry.func)}()`).join('->')})`,
    );
  }

  // Special checks
  // Check that the first and second extend() must be separated by either groupBy() or pivot() (i.e. aggregation)
  const firstExtendIndex = sequence.findIndex((func) =>
    matchFunctionName(func.function, DataCubeFunction.EXTEND),
  );
  const secondExtendIndex = sequence.findLastIndex((func) =>
    matchFunctionName(func.function, DataCubeFunction.EXTEND),
  );
  if (firstExtendIndex !== -1 && firstExtendIndex !== secondExtendIndex) {
    const seq = sequence.slice(firstExtendIndex + 1, secondExtendIndex);
    if (
      !seq.some(
        (func) =>
          matchFunctionName(func.function, DataCubeFunction.GROUP_BY) ||
          matchFunctionName(func.function, DataCubeFunction.PIVOT),
      )
    ) {
      throw new Error(
        `Found invalid usage of group-level extend() for query without aggregation such as pivot() and groupBy()`,
      );
    }
  }

  // Check that pivot() and cast() must co-present and stand consecutively in the sequence
  const pivotFunc = sequence.find((func) =>
    matchFunctionName(func.function, DataCubeFunction.PIVOT),
  );
  const castFunc = sequence.find((func) =>
    matchFunctionName(func.function, DataCubeFunction.CAST),
  );
  if (Boolean(pivotFunc) !== Boolean(castFunc)) {
    throw new Error(`Found usage of dynamic function pivot() without casting`);
  }

  return sequence;
}

/**
 * Turn the function sequence into a map of available functions
 * for easier construction of the snapshot
 */
function extractFunctionMap(
  sequence: V1_AppliedFunction[],
): DataCubeQueryFunctionMap {
  let leafExtend: V1_AppliedFunction | undefined = undefined;
  let groupExtend: V1_AppliedFunction | undefined = undefined;
  const aggregationFuncIndex = sequence.findLastIndex((func) =>
    matchFunctionName(func.function, [
      DataCubeFunction.PIVOT,
      DataCubeFunction.GROUP_BY,
    ]),
  );
  const firstExtendIndex = sequence.findIndex((func) =>
    matchFunctionName(func.function, DataCubeFunction.EXTEND),
  );
  const secondExtendIndex = sequence.findLastIndex((func) =>
    matchFunctionName(func.function, DataCubeFunction.EXTEND),
  );
  if (aggregationFuncIndex !== -1) {
    if (firstExtendIndex !== secondExtendIndex) {
      leafExtend = sequence[firstExtendIndex];
      groupExtend = sequence[secondExtendIndex];
    }
  } else {
    if (firstExtendIndex !== -1) {
      leafExtend = sequence[firstExtendIndex];
    }
  }

  const select = sequence.find((func) =>
    matchFunctionName(func.function, DataCubeFunction.SELECT),
  );
  const filter = sequence.find((func) =>
    matchFunctionName(func.function, DataCubeFunction.FILTER),
  );
  const groupBy = sequence.find((func) =>
    matchFunctionName(func.function, DataCubeFunction.GROUP_BY),
  );
  const pivot = sequence.find((func) =>
    matchFunctionName(func.function, DataCubeFunction.PIVOT),
  );
  const pivotCast = sequence.find((func) =>
    matchFunctionName(func.function, DataCubeFunction.CAST),
  );
  const sort = sequence.find((func) =>
    matchFunctionName(func.function, DataCubeFunction.SORT),
  );
  const limit = sequence.find((func) =>
    matchFunctionName(func.function, DataCubeFunction.LIMIT),
  );
  return {
    leafExtend,
    select,
    filter,
    groupBy,
    pivot,
    pivotCast,
    groupExtend,
    sort,
    limit,
  };
}

// --------------------------------- MAIN ---------------------------------

/**
 * Analyze the partial query to build a query snapshot.
 *
 * Implementation-wise, this extracts the function call sequence, then walk the
 * sequence in order to fill in the information for the snapshot.
 */
export function validateAndBuildQuerySnapshot(
  partialQuery: V1_ValueSpecification,
  sourceQuery: V1_ValueSpecification,
  baseQuery: DataCubeQuery,
) {
  // --------------------------------- BASE ---------------------------------
  // Build the function call sequence and the function map to make the
  // analysis more ergonomic

  const sequence = extractQueryFunctionSequence(partialQuery);
  const funcMap = extractFunctionMap(sequence);
  const snapshot = DataCubeQuerySnapshot.create(
    baseQuery.name,
    baseQuery.source.runtime,
    V1_serializeValueSpecification(sourceQuery, []),
    {},
  );
  const data = snapshot.data;
  const colsMap = new Map<string, DataCubeQuerySnapshotColumn>();
  const _col = (colSpec: V1_ColSpec) => {
    const column = guaranteeNonNullable(
      colsMap.get(colSpec.name),
      `Can't find column '${colSpec.name}'`,
    );
    return {
      name: column.name,
      type: column.type,
    };
  };

  // --------------------------------- SOURCE ---------------------------------

  data.sourceColumns = baseQuery.source.columns.map((col) => ({
    name: col.name,
    type: col.type,
  }));
  data.sourceColumns.map((col) => colsMap.set(col.name, col));

  // --------------------------------- FILTER ---------------------------------

  if (funcMap.filter) {
    // data.selectColumns = _colSpecArrayParam(funcMap.select, 0).colSpecs.map(
    //   (colSpec) => ({
    //     _col(colSpec),
    //   }),
    // );
  }

  // --------------------------------- LEAF EXTEND ---------------------------------
  // TODO: @akphi - implement this

  // --------------------------------- SELECT ---------------------------------

  if (funcMap.select) {
    data.selectColumns = _colSpecArrayParam(funcMap.select, 0).colSpecs.map(
      (colSpec) => _col(colSpec),
    );
  }

  // --------------------------------- GROUP BY ---------------------------------

  if (funcMap.groupBy) {
    data.groupBy = {
      columns: _colSpecArrayParam(funcMap.groupBy, 0).colSpecs.map((colSpec) =>
        _col(colSpec),
      ),
      aggColumns: _colSpecArrayParam(funcMap.groupBy, 1).colSpecs.map(
        (colSpec) => _aggCol(colSpec, _col(colSpec)),
      ),
      // TODO: verify agg columns agree with pivot agg columns
      // TODO: verify groupByExtend expression that all columns are accounted for
    };
  }

  // --------------------------------- PIVOT ---------------------------------
  // TODO: @akphi - implement this

  // --------------------------------- CAST ---------------------------------
  // TODO: @akphi - implement this

  // --------------------------------- GROUP EXTEND ---------------------------------
  // TODO: @akphi - implement this

  // --------------------------------- SORT ---------------------------------

  if (funcMap.sort) {
    data.sortColumns = _param(funcMap.sort, 0, V1_Collection).values.map(
      (value) => {
        const sortColFunc = _funcMatch(value, [
          DataCubeFunction.ASC,
          DataCubeFunction.DESC,
        ]);
        return {
          ..._col(_colSpecParam(sortColFunc, 0)),
          operation:
            _name(sortColFunc.function) === DataCubeFunction.ASC
              ? DataCubeQuerySortOperation.ASCENDING
              : DataCubeQuerySortOperation.DESCENDING,
        };
      },
    );
  }

  // --------------------------------- LIMIT ---------------------------------

  if (funcMap.limit) {
    const value = funcMap.limit.parameters[0];
    assertType(value, V1_CInteger);
    data.limit = value.value;
  }

  // --------------------------------- CONFIGURATION ---------------------------------
  // The data query takes precedence over the configuration, we do this for 2 reasons
  // 1. The purpose of the configuration is to provide the layout and styling
  //    customization on top of the data query result grid. If conflicts happen between
  //    the configuration and the query, we will reconciliate by modifying the configuration
  // 2. The configuration when missing, can be generated from default presets. This helps
  //    helps with use cases where the query might comes from a different source, such as
  //    Studio or Query, or another part of Engine.

  const configuration = baseQuery.configuration
    ? DataCubeConfiguration.serialization.fromJson(baseQuery.configuration)
    : buildDefaultConfiguration(baseQuery.source.columns);
  data.configuration =
    DataCubeConfiguration.serialization.toJson(configuration);
  // TODO: @akphi - implement the logic to reconcile the configuration with the query
  // - columns (missing/extra columns - remove or generate default column configuration)
  // - column kind
  // - column type
  // - base off the type, check the settings
  // - aggregation

  return snapshot.finalize();
}

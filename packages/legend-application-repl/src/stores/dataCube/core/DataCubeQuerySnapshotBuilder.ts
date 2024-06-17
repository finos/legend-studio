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
  V1_AppliedFunction,
  V1_CInteger,
  V1_ClassInstance,
  V1_ColSpec,
  V1_ColSpecArray,
  V1_Collection,
  V1_serializeValueSpecification,
  extractElementNameFromPath,
  matchFunctionName,
  type V1_ValueSpecification,
} from '@finos/legend-graph';
import type { DataCubeQuery } from '../../../server/models/DataCubeQuery.js';
import {
  DataCubeQuerySnapshot,
  DataCubeQuerySnapshotSortDirection,
  type DataCubeQuerySnapshotColumn,
} from './DataCubeQuerySnapshot.js';
import {
  assertTrue,
  assertType,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import {
  DataCubeFunction,
  type DataCubeQueryFunctionMap,
} from './DataCubeQueryEngine.js';

const _SUPPORTED_TOP_LEVEL_FUNCTIONS: {
  func: string;
  parameters: number;
}[] = [
  { func: DataCubeFunction.EXTEND, parameters: 1 },
  { func: DataCubeFunction.FILTER, parameters: 1 },
  { func: DataCubeFunction.GROUP_BY, parameters: 3 },
  { func: DataCubeFunction.LIMIT, parameters: 1 },
  { func: DataCubeFunction.PIVOT, parameters: 3 },
  { func: DataCubeFunction.SELECT, parameters: 1 },
  { func: DataCubeFunction.SORT, parameters: 1 },

  { func: DataCubeFunction.CAST, parameters: 1 },
];

// NOTE: this corresponds to the sequence:
// extend()->rename()->filter()->groupBy()->select()->pivot()->cast()->extend()->sort()->limit()
// which represents the ONLY query shape that we currently support
const _FUNCTION_SEQUENCE_COMPOSITION_PATTERN: {
  func: string;
  repeat?: boolean | undefined;
  required?: boolean | undefined;
}[] = [
  { func: DataCubeFunction.EXTEND },
  { func: DataCubeFunction.FILTER },
  { func: DataCubeFunction.GROUP_BY },
  { func: DataCubeFunction.PIVOT },
  { func: DataCubeFunction.CAST },
  { func: DataCubeFunction.EXTEND },
  { func: DataCubeFunction.SELECT },
  { func: DataCubeFunction.SORT },
  { func: DataCubeFunction.LIMIT },
];
const _FUNCTION_SEQUENCE_COMPOSITION_PATTERN_REGEXP = new RegExp(
  `^${_FUNCTION_SEQUENCE_COMPOSITION_PATTERN
    .map(
      (entry) =>
        `(?:<${extractElementNameFromPath(entry.func)}>)${entry.repeat ? '*' : !entry.required ? '?' : ''}`,
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
    .map((func) => `<${extractElementNameFromPath(func.function)}>`)
    .join('');
  if (!sequenceFormText.match(_FUNCTION_SEQUENCE_COMPOSITION_PATTERN_REGEXP)) {
    throw new Error(
      `Unsupported function composition ${sequence.map((fn) => `${extractElementNameFromPath(fn.function)}()`).join('->')} (supported composition: ${_FUNCTION_SEQUENCE_COMPOSITION_PATTERN.map((entry) => `${extractElementNameFromPath(entry.func)}()`).join('->')})`,
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

  const filter = sequence.find((func) =>
    matchFunctionName(func.function, DataCubeFunction.FILTER),
  );
  const groupBy = sequence.find((func) =>
    matchFunctionName(func.function, DataCubeFunction.GROUP_BY),
  );
  const select = sequence.find((func) =>
    matchFunctionName(func.function, DataCubeFunction.SELECT),
  );
  const pivot = sequence.find((func) =>
    matchFunctionName(func.function, DataCubeFunction.PIVOT),
  );
  const cast = sequence.find((func) =>
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
    filter,
    groupBy,
    pivot,
    pivotCast: cast,
    groupExtend,
    select,
    sort,
    limit,
  };
}

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
    baseQuery.configuration,
  );
  const data = snapshot.data;

  // --------------------------------- SOURCE ---------------------------------

  data.originalColumns = baseQuery.source.columns;
  const columnsMap = new Map<string, DataCubeQuerySnapshotColumn>();
  data.originalColumns.map((col) => columnsMap.set(col.name, col));

  // leafExtendedColumns: DataCubeQueryExtendedColumnSnapshot[] = [];
  // filter: ValueSpecification[0..1]; // TODO
  // renamedColumns: DataCubeQuerySnapshotRenamedColumn[] = [];
  // groupByColumns: DataCubeQuerySnapshotColumn[] = [];
  // groupByAggColumns: DataCubeQuerySnapshotAggregateColumn[] = [];
  // selectedColumns: DataCubeQuerySnapshotColumn[] = [];
  // pivotColumns: DataCubeQuerySnapshotColumn[] = [];
  // pivotAggColumns: DataCubeQuerySnapshotAggregateColumn[] = [];
  // castColumns: DataCubeQuerySnapshotColumn[] = [];
  // groupExtendedColumns: DataCubeQueryExtendedColumnSnapshot[] = [];
  // limit: number | undefined = undefined;
  // configuration: DataCubeConfiguration;

  // --------------------------------- LEAF EXTEND ---------------------------------
  // TODO: @akphi - implement this

  // --------------------------------- FILTER ---------------------------------
  // TODO: @akphi - implement this

  // --------------------------------- GROUP BY ---------------------------------
  // TODO: @akphi - implement this

  // --------------------------------- PIVOT ---------------------------------
  // TODO: @akphi - implement this

  // --------------------------------- CAST ---------------------------------
  // TODO: @akphi - implement this

  // --------------------------------- GROUP EXTEND ---------------------------------
  // TODO: @akphi - implement this

  // --------------------------------- SORT ---------------------------------

  if (funcMap.sort) {
    const sortColumns = funcMap.sort.parameters[0];
    assertType(
      sortColumns,
      V1_Collection,
      `Can't process ${extractElementNameFromPath(
        DataCubeFunction.SORT,
      )}(): columns cannot be extracted`,
    );
    data.sortColumns = sortColumns.values.map((column) => {
      try {
        assertType(column, V1_AppliedFunction);
        assertTrue(
          matchFunctionName(column.function, [
            DataCubeFunction.ASC,
            DataCubeFunction.DESC,
          ]),
        );
        const direction =
          extractElementNameFromPath(column.function) === DataCubeFunction.ASC
            ? DataCubeQuerySnapshotSortDirection.ASCENDING
            : DataCubeQuerySnapshotSortDirection.DESCENDING;
        assertTrue(column.parameters.length === 1);
        assertType(column.parameters[0], V1_ClassInstance);
        assertType(column.parameters[0].value, V1_ColSpec);
        const name = column.parameters[0].value.name;
        const matchingColumn = guaranteeNonNullable(columnsMap.get(name));
        const type = matchingColumn.type;
        return { name, type, direction };
      } catch {
        throw new Error(
          `Can't process ${extractElementNameFromPath(
            DataCubeFunction.SORT,
          )}(): column sort information cannot be extracted`,
        );
      }
    });
  }

  // --------------------------------- SELECT ---------------------------------

  if (funcMap.select) {
    const selectColumns = funcMap.select.parameters[0];
    assertTrue(
      selectColumns instanceof V1_ClassInstance &&
        selectColumns.value instanceof V1_ColSpecArray,
      `Can't process ${extractElementNameFromPath(
        DataCubeFunction.SELECT,
      )}(): columns cannot be extracted`,
    );
    const colSpecArray = (selectColumns as V1_ClassInstance)
      .value as V1_ColSpecArray;
    data.selectColumns = colSpecArray.colSpecs.map((column) => {
      try {
        const matchingColumn = guaranteeNonNullable(
          columnsMap.get(column.name),
        );
        assertType(column, V1_ColSpec);
        return {
          name: column.name,
          type: matchingColumn.type,
        };
      } catch {
        throw new Error(
          `Can't process ${extractElementNameFromPath(
            DataCubeFunction.SELECT,
          )}(): column information cannot be extracted`,
        );
      }
    });
  }

  // --------------------------------- LIMIT ---------------------------------

  if (funcMap.limit) {
    const value = funcMap.limit.parameters[0];
    assertType(value, V1_CInteger);
    data.limit = value.value;
  }

  return snapshot;
}

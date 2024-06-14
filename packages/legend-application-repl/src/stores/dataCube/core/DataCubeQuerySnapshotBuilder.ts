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
  V1_ClassInstance,
  V1_ColSpec,
  V1_ColSpecArray,
  V1_Collection,
  V1_serializeValueSpecification,
  extractElementNameFromPath,
  matchFunctionName,
  type V1_ValueSpecification,
} from '@finos/legend-graph';
import { DATA_CUBE_FUNCTION } from '../DataCubeMetaModelConst.js';
import type { DataCubeQuery } from '../../../server/models/DataCubeQuery.js';
import {
  DataCubeQuerySnapshotSortDirection,
  createSnapshot,
  type DataCubeQuerySnapshotColumn,
} from './DataCubeQuerySnapshot.js';
import {
  assertTrue,
  assertType,
  guaranteeNonNullable,
} from '@finos/legend-shared';

const _SUPPORTED_TOP_LEVEL_FUNCTIONS: {
  func: string;
  parameters: number;
}[] = [
  { func: DATA_CUBE_FUNCTION.EXTEND, parameters: 1 },
  { func: DATA_CUBE_FUNCTION.FILTER, parameters: 1 },
  { func: DATA_CUBE_FUNCTION.GROUP_BY, parameters: 3 },
  { func: DATA_CUBE_FUNCTION.LIMIT, parameters: 1 },
  { func: DATA_CUBE_FUNCTION.PIVOT, parameters: 3 },
  { func: DATA_CUBE_FUNCTION.RENAME, parameters: 2 },
  { func: DATA_CUBE_FUNCTION.SELECT, parameters: 1 },
  { func: DATA_CUBE_FUNCTION.SORT, parameters: 1 },

  { func: DATA_CUBE_FUNCTION.CAST, parameters: 1 },
];

// NOTE: this corresponds to the sequence:
// extend()->rename()->filter()->groupBy()->select()->pivot()->cast()->extend()->sort()->limit()
// which represents the ONLY query shape that we currently support
const _FUNCTION_SEQUENCE_COMPOSITION_PATTERN: {
  func: string;
  repeat?: boolean | undefined;
  required?: boolean | undefined;
}[] = [
  { func: DATA_CUBE_FUNCTION.EXTEND },
  { func: DATA_CUBE_FUNCTION.RENAME, repeat: true }, // rename() can be repeated since each call only allow renaming one column
  { func: DATA_CUBE_FUNCTION.FILTER },
  { func: DATA_CUBE_FUNCTION.GROUP_BY },
  { func: DATA_CUBE_FUNCTION.PIVOT },
  { func: DATA_CUBE_FUNCTION.CAST },
  { func: DATA_CUBE_FUNCTION.EXTEND },
  { func: DATA_CUBE_FUNCTION.SELECT },
  { func: DATA_CUBE_FUNCTION.SORT },
  { func: DATA_CUBE_FUNCTION.LIMIT },
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
    matchFunctionName(func.function, DATA_CUBE_FUNCTION.EXTEND),
  );
  const secondExtendIndex = sequence.findLastIndex((func) =>
    matchFunctionName(func.function, DATA_CUBE_FUNCTION.EXTEND),
  );
  if (firstExtendIndex !== -1 && firstExtendIndex !== secondExtendIndex) {
    const seq = sequence.slice(firstExtendIndex + 1, secondExtendIndex);
    if (
      !seq.some(
        (func) =>
          matchFunctionName(func.function, DATA_CUBE_FUNCTION.GROUP_BY) ||
          matchFunctionName(func.function, DATA_CUBE_FUNCTION.PIVOT),
      )
    ) {
      throw new Error(
        `Found invalid usage of group-level extend() for query without aggregation such as pivot() and groupBy()`,
      );
    }
  }

  // Check that pivot() and cast() must co-present and stand consecutively in the sequence
  const pivotFunc = sequence.find((func) =>
    matchFunctionName(func.function, DATA_CUBE_FUNCTION.PIVOT),
  );
  const castFunc = sequence.find((func) =>
    matchFunctionName(func.function, DATA_CUBE_FUNCTION.CAST),
  );
  if (Boolean(pivotFunc) !== Boolean(castFunc)) {
    throw new Error(`Found usage of dynamic function pivot() without casting`);
  }

  return sequence;
}

type FunctionMap = {
  leafExtend: V1_AppliedFunction | undefined;
  rename: V1_AppliedFunction[] | undefined;
  filter: V1_AppliedFunction | undefined;
  groupBy: V1_AppliedFunction | undefined;
  pivot: V1_AppliedFunction | undefined;
  cast: V1_AppliedFunction | undefined;
  groupExtend: V1_AppliedFunction | undefined;
  select: V1_AppliedFunction | undefined;
  sort: V1_AppliedFunction | undefined;
  limit: V1_AppliedFunction | undefined;
};

/**
 * Turn the function sequence into a map of available functions
 * for easier construction of the snapshot
 */
function extractFunctionMap(sequence: V1_AppliedFunction[]): FunctionMap {
  let leafExtend: V1_AppliedFunction | undefined = undefined;
  let groupExtend: V1_AppliedFunction | undefined = undefined;
  const aggregationFuncIndex = sequence.findLastIndex((func) =>
    matchFunctionName(func.function, [
      DATA_CUBE_FUNCTION.PIVOT,
      DATA_CUBE_FUNCTION.GROUP_BY,
    ]),
  );
  const firstExtendIndex = sequence.findIndex((func) =>
    matchFunctionName(func.function, DATA_CUBE_FUNCTION.EXTEND),
  );
  const secondExtendIndex = sequence.findLastIndex((func) =>
    matchFunctionName(func.function, DATA_CUBE_FUNCTION.EXTEND),
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

  const rename = sequence.filter((func) =>
    matchFunctionName(func.function, DATA_CUBE_FUNCTION.RENAME),
  );
  const filter = sequence.find((func) =>
    matchFunctionName(func.function, DATA_CUBE_FUNCTION.FILTER),
  );
  const groupBy = sequence.find((func) =>
    matchFunctionName(func.function, DATA_CUBE_FUNCTION.GROUP_BY),
  );
  const select = sequence.find((func) =>
    matchFunctionName(func.function, DATA_CUBE_FUNCTION.SELECT),
  );
  const pivot = sequence.find((func) =>
    matchFunctionName(func.function, DATA_CUBE_FUNCTION.PIVOT),
  );
  const cast = sequence.find((func) =>
    matchFunctionName(func.function, DATA_CUBE_FUNCTION.CAST),
  );
  const sort = sequence.find((func) =>
    matchFunctionName(func.function, DATA_CUBE_FUNCTION.SORT),
  );
  const limit = sequence.find((func) =>
    matchFunctionName(func.function, DATA_CUBE_FUNCTION.LIMIT),
  );
  return {
    leafExtend,
    rename,
    filter,
    groupBy,
    pivot,
    cast,
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
  const snapshot = createSnapshot(
    baseQuery.name,
    baseQuery.source.runtime,
    V1_serializeValueSpecification(sourceQuery, []),
    baseQuery.configuration,
  );

  // --------------------------------- SOURCE ---------------------------------

  snapshot.originalColumns = baseQuery.source.columns;
  const columnsMap = new Map<string, DataCubeQuerySnapshotColumn>();
  snapshot.originalColumns.map((col) => columnsMap.set(col.name, col));

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

  // --------------------------------- RENAME ---------------------------------
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
        DATA_CUBE_FUNCTION.SORT,
      )}(): columns cannot be extracted`,
    );
    snapshot.sortColumns = sortColumns.values.map((column) => {
      try {
        assertType(column, V1_AppliedFunction);
        assertTrue(
          matchFunctionName(column.function, [
            DATA_CUBE_FUNCTION.ASC,
            DATA_CUBE_FUNCTION.DESC,
          ]),
        );
        const direction =
          extractElementNameFromPath(column.function) === DATA_CUBE_FUNCTION.ASC
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
            DATA_CUBE_FUNCTION.SORT,
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
        DATA_CUBE_FUNCTION.SELECT,
      )}(): columns cannot be extracted`,
    );
    const colSpecArray = (selectColumns as V1_ClassInstance)
      .value as V1_ColSpecArray;
    snapshot.selectColumns = colSpecArray.colSpecs.map((column) => {
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
            DATA_CUBE_FUNCTION.SELECT,
          )}(): column information cannot be extracted`,
        );
      }
    });
  }

  // --------------------------------- LIMIT ---------------------------------
  // TODO: @akphi - implement this

  return snapshot;
}

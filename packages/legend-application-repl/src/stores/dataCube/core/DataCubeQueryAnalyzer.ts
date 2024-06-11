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
  V1_AppliedFunction,
  V1_ClassInstance,
  V1_ColSpec,
  V1_Collection,
  V1_serializeValueSpecification,
  extractElementNameFromPath,
  matchFunctionName,
  type V1_ValueSpecification,
} from '@finos/legend-graph';
import {
  DATA_CUBE_FUNCTIONS,
  DATA_CUBE_COLUMN_SORT_DIRECTION,
} from '../DataCubeMetaModelConst.js';
import type { DataCubeQuery } from '../../../server/models/DataCubeQuery.js';
import {
  DataCubeQuerySnapshotColumnOrigin,
  createSnapshot,
  type DataCubeQuerySnapshotColumnWithOrigin,
} from './DataCubeQuerySnapshot.js';
import {
  assertErrorThrown,
  assertTrue,
  assertType,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import type { DataCubeEngine } from './DataCubeEngine.js';

const _SUPPORTED_TOP_LEVEL_FUNCTIONS: {
  func: string;
  parameters: number;
}[] = [
  { func: DATA_CUBE_FUNCTIONS.EXTEND, parameters: 1 },
  { func: DATA_CUBE_FUNCTIONS.FILTER, parameters: 1 },
  { func: DATA_CUBE_FUNCTIONS.GROUP_BY, parameters: 3 },
  { func: DATA_CUBE_FUNCTIONS.LIMIT, parameters: 1 },
  { func: DATA_CUBE_FUNCTIONS.PIVOT, parameters: 3 },
  { func: DATA_CUBE_FUNCTIONS.RENAME, parameters: 2 },
  { func: DATA_CUBE_FUNCTIONS.SELECT, parameters: 1 },
  { func: DATA_CUBE_FUNCTIONS.SORT, parameters: 1 },

  { func: DATA_CUBE_FUNCTIONS.CAST, parameters: 1 },
];

// NOTE: this corresponds to the sequence:
// extend()->rename()->filter()->groupBy()->select()->pivot()->cast()->extend()->sort()->limit()
// which represents the ONLY query shape that we currently support
const _FUNCTION_SEQUENCE_COMPOSITION_PATTERN: {
  func: string;
  repeat?: boolean | undefined;
  required?: boolean | undefined;
}[] = [
  { func: DATA_CUBE_FUNCTIONS.EXTEND },
  { func: DATA_CUBE_FUNCTIONS.RENAME, repeat: true }, // rename() can be repeated since each call only allow renaming one column
  { func: DATA_CUBE_FUNCTIONS.FILTER },
  { func: DATA_CUBE_FUNCTIONS.GROUP_BY },
  { func: DATA_CUBE_FUNCTIONS.SELECT },
  { func: DATA_CUBE_FUNCTIONS.PIVOT },
  { func: DATA_CUBE_FUNCTIONS.CAST },
  { func: DATA_CUBE_FUNCTIONS.EXTEND },
  { func: DATA_CUBE_FUNCTIONS.SORT },
  { func: DATA_CUBE_FUNCTIONS.LIMIT },
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
      `Query sequence must be a sequence of function calls (e.g. x()->y()->z())`,
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
          `Query sequence must be a sequence of function calls (e.g. x()->y()->z())`,
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
    matchFunctionName(func.function, DATA_CUBE_FUNCTIONS.EXTEND),
  );
  const secondExtendIndex = sequence.findLastIndex((func) =>
    matchFunctionName(func.function, DATA_CUBE_FUNCTIONS.EXTEND),
  );
  if (firstExtendIndex !== -1 && firstExtendIndex !== secondExtendIndex) {
    const seq = sequence.slice(firstExtendIndex + 1, secondExtendIndex);
    if (
      !seq.some(
        (func) =>
          matchFunctionName(func.function, DATA_CUBE_FUNCTIONS.GROUP_BY) ||
          matchFunctionName(func.function, DATA_CUBE_FUNCTIONS.PIVOT),
      )
    ) {
      throw new Error(
        `Found invalid usage of group-level extend() for query without aggregation such as pivot() and groupBy()`,
      );
    }
  }

  // Check that pivot() and cast() must co-present and stand consecutively in the sequence
  const pivotFunc = sequence.find((func) =>
    matchFunctionName(func.function, DATA_CUBE_FUNCTIONS.PIVOT),
  );
  const castFunc = sequence.find((func) =>
    matchFunctionName(func.function, DATA_CUBE_FUNCTIONS.CAST),
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
  select: V1_AppliedFunction | undefined;
  pivot: V1_AppliedFunction | undefined;
  cast: V1_AppliedFunction | undefined;
  groupExtend: V1_AppliedFunction | undefined;
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
      DATA_CUBE_FUNCTIONS.PIVOT,
      DATA_CUBE_FUNCTIONS.GROUP_BY,
    ]),
  );
  const firstExtendIndex = sequence.findIndex((func) =>
    matchFunctionName(func.function, DATA_CUBE_FUNCTIONS.EXTEND),
  );
  const secondExtendIndex = sequence.findLastIndex((func) =>
    matchFunctionName(func.function, DATA_CUBE_FUNCTIONS.EXTEND),
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
    matchFunctionName(func.function, DATA_CUBE_FUNCTIONS.RENAME),
  );
  const filter = sequence.find((func) =>
    matchFunctionName(func.function, DATA_CUBE_FUNCTIONS.FILTER),
  );
  const groupBy = sequence.find((func) =>
    matchFunctionName(func.function, DATA_CUBE_FUNCTIONS.GROUP_BY),
  );
  const select = sequence.find((func) =>
    matchFunctionName(func.function, DATA_CUBE_FUNCTIONS.SELECT),
  );
  const pivot = sequence.find((func) =>
    matchFunctionName(func.function, DATA_CUBE_FUNCTIONS.PIVOT),
  );
  const cast = sequence.find((func) =>
    matchFunctionName(func.function, DATA_CUBE_FUNCTIONS.CAST),
  );
  const sort = sequence.find((func) =>
    matchFunctionName(func.function, DATA_CUBE_FUNCTIONS.SORT),
  );
  const limit = sequence.find((func) =>
    matchFunctionName(func.function, DATA_CUBE_FUNCTIONS.LIMIT),
  );
  return {
    leafExtend,
    rename,
    filter,
    groupBy,
    select,
    pivot,
    cast,
    groupExtend,
    sort,
    limit,
  };
}

/**
 * Analyze the partial query to build the base snapshot.
 *
 * NOTE: the base snapshot is almost, but not a complete snapshot.
 * It has key information about the partial query filled in, these are the bits
 * required to reconstruct the query just from the snapshot.
 * However, it lacks analytics information, such as extended columns' lambda code,
 * which might be useful for initializing the editors. These should get filled in
 * at a later stage in the analysis/initialization flow.
 *
 * Implementation-wise, this extracts the function call sequence, then walk the
 * sequence in order to fill in the information for the snapshot.
 */
export function validateAndBuildBaseSnapshot(
  baseQuery: DataCubeQuery,
  analytics: {
    sourceQuery: V1_ValueSpecification;
    partialQuery: V1_ValueSpecification | undefined;
  },
) {
  // --------------------------------- BASE ---------------------------------
  // Build the function call sequence and the function map to make the
  // analysis more ergonomic

  const { partialQuery, sourceQuery } = analytics;
  const sequence = partialQuery
    ? extractQueryFunctionSequence(partialQuery)
    : [];
  const funcMap = extractFunctionMap(sequence);
  const snapshot = createSnapshot(
    baseQuery.name,
    baseQuery.source.runtime,
    V1_serializeValueSpecification(sourceQuery, []),
    baseQuery.configuration,
  );

  // --------------------------------- SOURCE ---------------------------------

  snapshot.originalColumns = baseQuery.source.columns;
  const columns: DataCubeQuerySnapshotColumnWithOrigin[] =
    snapshot.originalColumns.map((col) => ({
      ...col,
      origin: DataCubeQuerySnapshotColumnOrigin.SOURCE,
    }));

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

  // --------------------------------- SELECT ---------------------------------
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
        DATA_CUBE_FUNCTIONS.SORT,
      )}(): columns cannot be extracted`,
    );
    snapshot.sortColumns = sortColumns.values.map((col) => {
      try {
        assertType(col, V1_AppliedFunction);
        assertTrue(
          matchFunctionName(col.function, [
            DATA_CUBE_FUNCTIONS.ASC,
            DATA_CUBE_FUNCTIONS.DESC,
          ]),
        );
        const direction =
          extractElementNameFromPath(col.function) === DATA_CUBE_FUNCTIONS.ASC
            ? DATA_CUBE_COLUMN_SORT_DIRECTION.ASCENDING
            : DATA_CUBE_COLUMN_SORT_DIRECTION.DESCENDING;
        assertTrue(col.parameters.length === 1);
        assertType(col.parameters[0], V1_ClassInstance);
        assertType(col.parameters[0].value, V1_ColSpec);
        const name = col.parameters[0].value.name;
        const type = guaranteeNonNullable(
          columns.find((c) => c.name === name),
        ).type;
        return { name, type, direction };
      } catch {
        throw new Error(
          `Can't process ${extractElementNameFromPath(
            DATA_CUBE_FUNCTIONS.SORT,
          )}(): column sort information cannot be extracted`,
        );
      }
    });
  }

  // --------------------------------- LIMIT ---------------------------------
  // TODO: @akphi - implement this

  // --------------------------------- FINALIZE ---------------------------------

  snapshot.columns = columns;

  return snapshot;
}

export async function buildSnapshotFromQuery(
  baseQuery: DataCubeQuery,
  engine: DataCubeEngine,
) {
  let partialQuery: V1_ValueSpecification | undefined;
  if (baseQuery.partialQuery) {
    try {
      partialQuery = await engine.parseQuery(baseQuery.partialQuery);
    } catch (error) {
      assertErrorThrown(error);
      throw new Error(
        `Can't parse partial query [${baseQuery.partialQuery}]: ${error.message}`,
      );
    }
  } else {
    partialQuery = undefined;
  }

  let sourceQuery: V1_ValueSpecification;
  try {
    sourceQuery = await engine.parseQuery(baseQuery.source.query);
  } catch (error) {
    assertErrorThrown(error);
    throw new Error(
      `Can't parse source query [${baseQuery.source.query}]: ${error.message}`,
    );
  }

  const snapshot = validateAndBuildBaseSnapshot(baseQuery, {
    partialQuery,
    sourceQuery,
  });

  return snapshot;
}

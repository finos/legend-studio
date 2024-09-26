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
 * executable query. This is needed when we initialize the application by loading a
 * persisted query.
 ***************************************************************************************/

import {
  V1_AppliedFunction,
  V1_CInteger,
  type V1_ColSpec,
  V1_Collection,
  V1_serializeValueSpecification,
  extractElementNameFromPath as _name,
  matchFunctionName,
  type V1_ValueSpecification,
} from '@finos/legend-graph';
import type { DataCubeQuery } from '../engine/DataCubeQuery.js';
import {
  _toCol,
  DataCubeQuerySnapshot,
  type DataCubeQuerySnapshotColumn,
} from './DataCubeQuerySnapshot.js';
import { assertType, guaranteeNonNullable } from '@finos/legend-shared';
import {
  DataCubeQuerySortDirection,
  DataCubeFunction,
  type DataCubeQueryFunctionMap,
} from './DataCubeQueryEngine.js';
import { DataCubeConfiguration } from './DataCubeConfiguration.js';
import { buildDefaultConfiguration } from './DataCubeConfigurationBuilder.js';
import {
  _colSpecArrayParam,
  _colSpecParam,
  _funcMatch,
  _param,
} from './DataCubeQuerySnapshotBuilderUtils.js';

// --------------------------------- BUILDING BLOCKS ---------------------------------

const _SUPPORTED_TOP_LEVEL_FUNCTIONS: {
  func: string;
  parameters: number;
}[] = [
  { func: DataCubeFunction.EXTEND, parameters: 1 },
  { func: DataCubeFunction.FILTER, parameters: 1 },
  { func: DataCubeFunction.SELECT, parameters: 1 },
  { func: DataCubeFunction.GROUP_BY, parameters: 3 },
  { func: DataCubeFunction.PIVOT, parameters: 3 },
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

// NOTE: this corresponds to the sequence:
// extend()->filter()->select()->sort()->pivot()->cast()->groupBy()->extend()->sort()->limit()
// which represents the ONLY query shape that we currently support
const _FUNCTION_SEQUENCE_COMPOSITION_PATTERN: (
  | FunctionSequenceCompositionSimpleNodePattern
  | FunctionSequenceCompositionGroupNodePattern
)[] = [
  { name: 'leaf_extend', func: DataCubeFunction.EXTEND }, // leaf-level extend
  { name: 'filter', func: DataCubeFunction.FILTER },
  { name: 'select', func: DataCubeFunction.SELECT },
  {
    name: 'pivot_group',
    funcs: [
      { name: 'pivot_sort', func: DataCubeFunction.SORT, required: true }, // pre-pivot sort
      { name: 'pivot', func: DataCubeFunction.PIVOT, required: true },
      { name: 'pivot_cast', func: DataCubeFunction.CAST, required: true }, // cast to a relation type post pivot() to enable type-checking
    ],
  },
  { name: 'group_by', func: DataCubeFunction.GROUP_BY },
  { name: 'group_extend', func: DataCubeFunction.EXTEND }, // group-level extend
  { name: 'sort', func: DataCubeFunction.SORT },
  { name: 'limit', func: DataCubeFunction.LIMIT },
];
const _FUNCTION_SEQUENCE_COMPOSITION_PATTERN_REGEXP = new RegExp(
  `^${_FUNCTION_SEQUENCE_COMPOSITION_PATTERN
    .map((node) =>
      'funcs' in node
        ? `(${node.funcs.map(
            (childNode) =>
              `(?<${childNode.name}><${_name(childNode.func)}>)${childNode.repeat ? '*' : !childNode.required ? '?' : ''}`,
          )})${node.repeat ? '*' : !node.required ? '?' : ''}`
        : `(?<${node.name}><${_name(node.func)}>)${node.repeat ? '*' : !node.required ? '?' : ''}`,
    )
    .join('')}$`,
);

type FunctionSequenceMatchingResult = {
  sequence: V1_AppliedFunction[];
  leafExtend: boolean;
  pivot: boolean;
  groupExtend: boolean;
  sort: boolean;
};
/**
 * Since the query created by DataCube will be a chain call of various functions,
 * this utility function will extract that sequence of function calls as well as
 * do various basic checks for the validity, composition, and order of those functions.
 */
function extractQueryFunctionSequence(
  query: V1_ValueSpecification,
): FunctionSequenceMatchingResult {
  // Make sure this is a sequence of function calls
  if (!(query instanceof V1_AppliedFunction)) {
    throw new Error(
      `Query must be a sequence of function calls (e.g. x()->y()->z())`,
    );
  }
  const sequence: V1_AppliedFunction[] = [];
  let currentFunc = query;
  while (currentFunc instanceof V1_AppliedFunction) {
    const supportedFunc = _SUPPORTED_TOP_LEVEL_FUNCTIONS.find((spec) =>
      matchFunctionName(currentFunc.function, spec.func),
    );

    // Check that all functions in sequence are supported
    if (!supportedFunc) {
      throw new Error(`Found unsupported function ${currentFunc.function}()`);
    }
    if (currentFunc.parameters.length > supportedFunc.parameters) {
      const vs = currentFunc.parameters[0];
      if (!(vs instanceof V1_AppliedFunction)) {
        throw new Error(
          `Query must be a sequence of function calls (e.g. x()->y()->z())`,
        );
      }
      currentFunc.parameters = currentFunc.parameters.slice(1);
      sequence.unshift(currentFunc);
      currentFunc = vs;
    } else {
      sequence.unshift(currentFunc);
      break;
    }
  }

  // Check that sequence follows the supported pattern
  const sequenceFormText = sequence
    .map((func) => `<${_name(func.function)}>`)
    .join('');
  const matchResult = sequenceFormText.match(
    _FUNCTION_SEQUENCE_COMPOSITION_PATTERN_REGEXP,
  );
  if (!matchResult) {
    throw new Error(
      `Unsupported function composition ${sequence.map((fn) => `${_name(fn.function)}()`).join('->')} (supported composition: ${_FUNCTION_SEQUENCE_COMPOSITION_PATTERN.map((node) => `${'funcs' in node ? `[${node.funcs.map((childNode) => `${_name(childNode.func)}()`).join('->')}]` : `${_name(node.func)}()`}`).join('->')})`,
    );
  }

  return {
    sequence,
    leafExtend: Boolean(matchResult.groups?.leaf_extend),
    pivot: Boolean(matchResult.groups?.pivot),
    groupExtend: Boolean(matchResult.groups?.group_extend),
    sort: Boolean(matchResult.groups?.sort),
  };
}

/**
 * Turn the function sequence into a map of available functions
 * for easier construction of the snapshot
 */
function extractFunctionMap(
  sequenceMatchingResult: FunctionSequenceMatchingResult,
): DataCubeQueryFunctionMap {
  const {
    sequence,
    leafExtend: hasLeafExtend,
    groupExtend: hasGroupExtend,
    pivot: hasPivot,
    sort: hasSort,
  } = sequenceMatchingResult;
  const leafExtend = hasLeafExtend
    ? sequence.find((func) =>
        matchFunctionName(func.function, DataCubeFunction.EXTEND),
      )
    : undefined;
  const filter = sequence.find((func) =>
    matchFunctionName(func.function, DataCubeFunction.FILTER),
  );
  const select = sequence.find((func) =>
    matchFunctionName(func.function, DataCubeFunction.SELECT),
  );
  const pivotSort = hasPivot
    ? sequence.find((func) =>
        matchFunctionName(func.function, DataCubeFunction.SORT),
      )
    : undefined;
  const pivot = hasPivot
    ? sequence.find((func) =>
        matchFunctionName(func.function, DataCubeFunction.PIVOT),
      )
    : undefined;
  const pivotCast = hasPivot
    ? sequence.find((func) =>
        matchFunctionName(func.function, DataCubeFunction.CAST),
      )
    : undefined;
  const groupBy = sequence.find((func) =>
    matchFunctionName(func.function, DataCubeFunction.GROUP_BY),
  );
  const groupExtend = hasGroupExtend
    ? sequence.find((func) =>
        matchFunctionName(func.function, DataCubeFunction.EXTEND),
      )
    : undefined;
  const sort = hasSort
    ? sequence.find((func) =>
        matchFunctionName(func.function, DataCubeFunction.SORT),
      )
    : undefined;
  const limit = sequence.find((func) =>
    matchFunctionName(func.function, DataCubeFunction.LIMIT),
  );

  return {
    leafExtend: leafExtend,
    select,
    filter,
    groupBy,
    pivotSort,
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

  const sequenceMatchingResult = extractQueryFunctionSequence(partialQuery);
  const funcMap = extractFunctionMap(sequenceMatchingResult);
  const snapshot = DataCubeQuerySnapshot.create(
    baseQuery.name,
    baseQuery.source.runtime,
    baseQuery.source.mapping,
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
    return _toCol(column);
  };

  // --------------------------------- SOURCE ---------------------------------

  data.sourceColumns = baseQuery.source.columns.map(_toCol);
  data.sourceColumns.map((col) => colsMap.set(col.name, col));

  // --------------------------------- LEAF-LEVEL EXTEND ---------------------------------
  /** TODO: @datacube roundtrip */

  // --------------------------------- FILTER ---------------------------------

  if (funcMap.filter) {
    /** TODO: @datacube roundtrip */
    data.filter = undefined;
  }

  // --------------------------------- SELECT ---------------------------------

  if (funcMap.select) {
    data.selectColumns = _colSpecArrayParam(funcMap.select, 0).colSpecs.map(
      (colSpec) => _col(colSpec),
    );
  }

  // --------------------------------- PIVOT ---------------------------------
  /** TODO: @datacube roundtrip */
  // TODO: verify group-by agg columns, pivot agg columns and configuration agree

  // --------------------------------- GROUP BY ---------------------------------

  if (funcMap.groupBy) {
    data.groupBy = {
      columns: _colSpecArrayParam(funcMap.groupBy, 0).colSpecs.map((colSpec) =>
        _col(colSpec),
      ),
      // TODO: verify group-by agg columns, pivot agg columns and configuration agree
    };
  }

  // --------------------------------- GROUP-LEVEL EXTEND ---------------------------------
  /** TODO: @datacube roundtrip */

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
          direction:
            _name(sortColFunc.function) === DataCubeFunction.ASC
              ? DataCubeQuerySortDirection.ASCENDING
              : DataCubeQuerySortDirection.DESCENDING,
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
  // NOTE: we aim to keep the data query a Pure query instead of a specification object
  // so this configuration holds mostly layout and styling customization.
  // But there are overlaps, i.e. certain data query configuration are stored in the
  // configuration, e.g. column aggregation type, this is because a column
  // aggregation's preference can be populated even when there's no aggregation specified
  // in the data query.
  //
  // Arguably, the query should be the single source for these information, but when
  // the configuration for a particular data query function coming from multiple sources
  // conflict, we need to do some reconciliation (or throw error). Some examples include:
  // - missing/extra columns present in the configuration
  // - column kind and type conflict with aggregation
  // - column kind and type conflict with the column configuration
  //
  // In certain cases, configuration needs to be generated from default presets. This
  // helps with use cases where the query might comes from a different source, such as
  // Studio or Query, or another part of Engine.
  const configuration = baseQuery.configuration
    ? DataCubeConfiguration.serialization.fromJson(baseQuery.configuration)
    : buildDefaultConfiguration([
        ...baseQuery.source.columns,
        ...data.leafExtendedColumns,
        ...data.groupExtendedColumns,
      ]);
  data.configuration =
    DataCubeConfiguration.serialization.toJson(configuration);
  /**
   * TODO: @datacube roundtrip - implement the logic to reconcile the configuration with the query
   * - columns (missing/extra columns - remove or generate default column configuration)
   * - column kind
   * - column type
   * - base off the type, check the settings
   * - aggregation
   * - verify group-by agg columns, pivot agg columns and configuration agree
   */

  return snapshot.finalize();
}

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
  extractElementNameFromPath as _name,
  matchFunctionName,
  type V1_ValueSpecification,
} from '@finos/legend-graph';
import type { DataCubeQuery } from './models/DataCubeQuery.js';
import { DataCubeQuerySnapshot } from './DataCubeQuerySnapshot.js';
import { _toCol, type DataCubeColumn } from './models/DataCubeColumn.js';
import { assertType, guaranteeNonNullable } from '@finos/legend-shared';
import {
  DataCubeQuerySortDirection,
  DataCubeFunction,
  type DataCubeQueryFunctionMap,
} from './DataCubeQueryEngine.js';
import { DataCubeConfiguration } from './models/DataCubeConfiguration.js';
import { buildDefaultConfiguration } from './DataCubeConfigurationBuilder.js';
import {
  _colSpecArrayParam,
  _colSpecParam,
  _funcMatch,
  _param,
} from './DataCubeQuerySnapshotBuilderUtils.js';
import type { DataCubeSource } from './models/DataCubeSource.js';

// --------------------------------- BUILDING BLOCKS ---------------------------------

const _SUPPORTED_TOP_LEVEL_FUNCTIONS: {
  func: string;
  parameters: number;
}[] = [
  { func: DataCubeFunction.EXTEND, parameters: 2 }, // support both signatures of extend()
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
                `(?<${childNode.name}><${_name(childNode.func)}>____\\d+)${childNode.repeat ? '*' : !childNode.required ? '?' : ''}`,
            )
            .join('')})${node.repeat ? '*' : !node.required ? '?' : ''}`
        : `(?<${node.name}><${_name(node.func)}>____\\d+)${node.repeat ? '*' : !node.required ? '?' : ''}`,
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
    .map((func, idx) => `<${_name(func.function)}>____${idx}`)
    .join('');
  const matchResult = sequenceFormText.match(
    _FUNCTION_SEQUENCE_COMPOSITION_PATTERN_REGEXP,
  );
  if (!matchResult) {
    throw new Error(
      `Unsupported function composition ${sequence.map((fn) => `${_name(fn.function)}()`).join('->')} (supported composition: ${_FUNCTION_SEQUENCE_COMPOSITION_PATTERN.map((node) => `${'funcs' in node ? `[${node.funcs.map((childNode) => `${_name(childNode.func)}()`).join('->')}]` : `${_name(node.func)}()`}`).join('->')})`,
    );
  }

  const _process = (key: string): V1_AppliedFunction | undefined => {
    const match = matchResult.groups?.[key];
    if (!match || match.indexOf('____') === -1) {
      return undefined;
    }
    const idx = Number(match.split('____')[1]);
    if (isNaN(idx) || idx >= sequence.length) {
      return undefined;
    }
    return sequence[idx];
  };

  return {
    leafExtend: _process(_FUNCTION_SEQUENCE_COMPOSITION_PART.LEAF_EXTEND),
    select: _process(_FUNCTION_SEQUENCE_COMPOSITION_PART.SELECT),
    filter: _process(_FUNCTION_SEQUENCE_COMPOSITION_PART.FILTER),
    pivotSort: _process(_FUNCTION_SEQUENCE_COMPOSITION_PART.PIVOT_SORT),
    pivot: _process(_FUNCTION_SEQUENCE_COMPOSITION_PART.PIVOT_CAST),
    pivotCast: _process(_FUNCTION_SEQUENCE_COMPOSITION_PART.PIVOT_CAST),
    groupBy: _process(_FUNCTION_SEQUENCE_COMPOSITION_PART.GROUP_BY),
    groupBySort: _process(_FUNCTION_SEQUENCE_COMPOSITION_PART.GROUP_BY_SORT),
    groupExtend: _process(_FUNCTION_SEQUENCE_COMPOSITION_PART.GROUP_EXTEND),
    sort: _process(_FUNCTION_SEQUENCE_COMPOSITION_PART.SORT),
    limit: _process(_FUNCTION_SEQUENCE_COMPOSITION_PART.LIMIT),
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
  source: DataCubeSource,
  baseQuery: DataCubeQuery,
) {
  // --------------------------------- BASE ---------------------------------
  // Build the function call sequence and the function map to make the
  // analysis more ergonomic

  const funcMap = extractFunctionMap(partialQuery);
  const snapshot = DataCubeQuerySnapshot.create({});
  const data = snapshot.data;
  const colsMap = new Map<string, DataCubeColumn>();
  const _col = (colSpec: V1_ColSpec) => {
    const column = guaranteeNonNullable(
      colsMap.get(colSpec.name),
      `Can't find column '${colSpec.name}'`,
    );
    return _toCol(column);
  };

  // --------------------------------- SOURCE ---------------------------------

  data.sourceColumns = source.sourceColumns;
  data.sourceColumns.map((col) => colsMap.set(col.name, col));

  // --------------------------------- LEAF-LEVEL EXTEND ---------------------------------
  /** TODO: @datacube roundtrip */

  // --------------------------------- FILTER ---------------------------------
  /** TODO: @datacube roundtrip */

  // --------------------------------- SELECT ---------------------------------

  if (funcMap.select) {
    data.selectColumns = _colSpecArrayParam(funcMap.select, 0).colSpecs.map(
      (colSpec) => _col(colSpec),
    );
  }

  // --------------------------------- PIVOT ---------------------------------
  /** TODO: @datacube roundtrip */
  // TODO: verify groupBy agg columns, pivot agg columns and configuration agree

  // --------------------------------- GROUP BY ---------------------------------

  if (funcMap.groupBy) {
    data.groupBy = {
      columns: _colSpecArrayParam(funcMap.groupBy, 0).colSpecs.map((colSpec) =>
        _col(colSpec),
      ),
      // TODO: verify groupBy agg columns, pivot agg columns and configuration agree
      // TODO: verify groupBy sort columns and configuration agree
    };
  }

  // --------------------------------- GROUP-LEVEL EXTEND ---------------------------------
  /** TODO: @datacube roundtrip */

  // --------------------------------- SORT ---------------------------------

  if (funcMap.sort) {
    data.sortColumns = _param(funcMap.sort, 0, V1_Collection).values.map(
      (value) => {
        const sortColFunc = _funcMatch(value, [
          DataCubeFunction.ASCENDING,
          DataCubeFunction.DESCENDING,
        ]);
        return {
          ..._col(_colSpecParam(sortColFunc, 0)),
          direction:
            _name(sortColFunc.function) === DataCubeFunction.ASCENDING
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
        ...source.sourceColumns,
        ...data.leafExtendedColumns,
        ...data.groupExtendedColumns,
      ]);
  data.configuration = configuration.serialize();
  /**
   * TODO: @datacube roundtrip - implement the logic to reconcile the configuration with the query
   * - [ ] columns (missing/extra columns - remove or generate default column configuration)
   * - [ ] column kind
   * - [ ] column type
   * - [ ] base off the type, check the settings
   * - [ ] aggregation
   * - [ ] verify groupBy agg columns, pivot agg columns and configuration agree
   * - [ ] verify groupBy sort columns and tree column sort direction configuration agree
   */

  return snapshot.finalize();
}

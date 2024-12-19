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
  V1_AppliedProperty,
  V1_ClassInstance,
  V1_ColSpec,
  V1_ColSpecArray,
  V1_Lambda,
  V1_ValueSpecification,
  extractElementNameFromPath as _name,
  matchFunctionName,
} from '@finos/legend-graph';
import { type DataCubeColumn } from './models/DataCubeColumn.js';
import {
  assertTrue,
  assertType,
  guaranteeNonNullable,
  guaranteeType,
  type Clazz,
} from '@finos/legend-shared';
import {
  DataCubeEngineFilterOperator,
  DataCubeQueryFilterGroupOperator,
  TREE_COLUMN_VALUE_SEPARATOR,
} from './DataCubeQueryEngine.js';
import type {
  DataCubeQuerySnapshotFilter,
  DataCubeQuerySnapshotFilterCondition,
} from './DataCubeQuerySnapshot.js';
import { DataCubeQueryFilterOperation__Contain } from './filter/DataCubeQueryFilterOperation__Contain.js';
import { DataCubeQueryFilterOperation__EndWith } from './filter/DataCubeQueryFilterOperation__EndWith.js';
import { DataCubeQueryFilterOperation__Equal } from './filter/DataCubeQueryFilterOperation__Equal.js';
import { DataCubeQueryFilterOperation__GreaterThan } from './filter/DataCubeQueryFilterOperation__GreaterThan.js';
import { DataCubeQueryFilterOperation__GreaterThanOrEqual } from './filter/DataCubeQueryFilterOperation__GreaterThanOrEqual.js';
import { DataCubeQueryFilterOperation__IsNull } from './filter/DataCubeQueryFilterOperation__IsNull.js';
import { DataCubeQueryFilterOperation__LessThanOrEqual } from './filter/DataCubeQueryFilterOperation__LessThanOrEqual.js';
import { DataCubeQueryFilterOperation__StartWith } from './filter/DataCubeQueryFilterOperation__StartWith.js';
import { DataCubeQueryFilterOperation__LessThan } from './filter/DataCubeQueryFilterOperation__LessThan.js';
import { DataCubeQueryFilterOperation__NotContain } from './filter/DataCubeQueryFilterOperation__NotContain.js';
import { DataCubeQueryFilterOperation__NotEndWith } from './filter/DataCubeQueryFilterOperation__NotEndWith.js';
import { DataCubeQueryFilterOperation__NotEqual } from './filter/DataCubeQueryFilterOperation__NotEqual.js';
import { DataCubeQueryFilterOperation__IsNotNull } from './filter/DataCubeQueryFilterOperation__IsNotNull.js';
import { DataCubeQueryFilterOperation__NotStartWith } from './filter/DataCubeQueryFilterOperation__NotStartWith.js';
import { DataCubeQueryFilterOperation__NotEqualColumn } from './filter/DataCubeQueryFilterOperation__NotEqualColumn.js';
import { DataCubeQueryFilterOperation__EqualColumn } from './filter/DataCubeQueryFilterOperation__EqualColumn.js';
import { DataCubeQueryFilterOperation__GreaterThanColumn } from './filter/DataCubeQueryFilterOperation__GreaterThanColumn.js';
import { DataCubeQueryFilterOperation__GreaterThanOrEqualColumn } from './filter/DataCubeQueryFilterOperation__GreaterThanOrEqualColumn.js';
import { DataCubeQueryFilterOperation__LessThanColumn } from './filter/DataCubeQueryFilterOperation__LessThanColumn.js';
import { DataCubeQueryFilterOperation__LessThanOrEqualColumn } from './filter/DataCubeQueryFilterOperation__LessThanOrEqualColumn.js';
import { DataCubeQueryFilterOperation__EqualCaseInsensitiveColumn } from './filter/DataCubeQueryFilterOperation__EqualCaseInsensitiveColumn.js';
import { DataCubeQueryFilterOperation__EqualCaseInsensitive } from './filter/DataCubeQueryFilterOperation__EqualCaseInsensitive.js';
import { DataCubeQueryFilterOperation__ContainCaseInsensitive } from './filter/DataCubeQueryFilterOperation__ContainCaseInsensitive.js';
import { DataCubeQueryFilterOperation__EndWithCaseInsensitive } from './filter/DataCubeQueryFilterOperation__EndWithCaseInsensitive.js';
import { DataCubeQueryFilterOperation__StartWithCaseInsensitive } from './filter/DataCubeQueryFilterOperation__StartWithCaseInsensitive.js';
import { DataCubeQueryFilterOperation__NotEqualCaseInsensitiveColumn } from './filter/DataCubeQueryFilterOperation__NotEqualCaseInsensitiveColumn.js';
import { DataCubeQueryFilterOperation__NotEqualCaseInsensitive } from './filter/DataCubeQueryFilterOperation__NotEqualCaseInsensitive.js';

// --------------------------------- UTILITIES ---------------------------------

export function _param<T extends V1_ValueSpecification>(
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

export function _colSpecParam(func: V1_AppliedFunction, paramIdx: number) {
  return guaranteeType(
    _param(func, paramIdx, V1_ClassInstance).value,
    V1_ColSpec,
    `Can't process ${_name(func.function)}: Expected parameter at index ${paramIdx} to be a column specification`,
  );
}

export function _lambdaBody(func: V1_AppliedFunction, paramIdx: number) {
  return guaranteeType(
    _param(func, paramIdx, V1_Lambda),
    V1_Lambda,
    `Can't process ${_name(func.function)}: Expected parameter at index ${paramIdx} to be a value specification`,
  );
}

export function _colSpecArrayParam(func: V1_AppliedFunction, paramIdx: number) {
  return guaranteeType(
    _param(func, paramIdx, V1_ClassInstance).value,
    V1_ColSpecArray,
    `Can't process ${_name(func.function)}: Expected parameter at index ${paramIdx} to be a column specification list`,
  );
}

export function _funcMatch(
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

// --------------------------------- BUILDING BLOCKS ---------------------------------

/**
 * This method prunes expanded paths that are no longer valid due to changes in group by columns.
 * It finds the last common group by column between the previous and current group by columns and
 * prune the expanded paths beyond that point.
 */
export function _pruneExpandedPaths(
  prevGroupByCols: DataCubeColumn[],
  currentGroupByCols: DataCubeColumn[],
  expandedPaths: string[],
) {
  const length = Math.min(prevGroupByCols.length, currentGroupByCols.length);
  if (!length) {
    return [];
  }
  let lastCommonIndex = -1;
  for (let i = 0; i < length; i++) {
    if (
      guaranteeNonNullable(prevGroupByCols[i]).name !==
        guaranteeNonNullable(currentGroupByCols[i]).name ||
      guaranteeNonNullable(prevGroupByCols[i]).type !==
        guaranteeNonNullable(currentGroupByCols[i]).type
    ) {
      break;
    }
    lastCommonIndex = i;
  }
  return expandedPaths
    .filter(
      (path) =>
        path.split(TREE_COLUMN_VALUE_SEPARATOR).length <= lastCommonIndex + 1,
    )
    .sort();
}

export function _buildFilterSnapshot(
  vs: V1_ValueSpecification,
): DataCubeQuerySnapshotFilter {
  let stack = [vs];

  let filterConditionSnapshot = [];
  let filterSnapshot = {
    groupOperator: DataCubeQueryFilterGroupOperator.AND,
  } as DataCubeQuerySnapshotFilter;
  if (vs instanceof V1_AppliedFunction) {
    switch (vs.function) {
      case DataCubeQueryFilterGroupOperator.OR:
      case DataCubeQueryFilterGroupOperator.AND:
        filterSnapshot.groupOperator = vs.function;
        stack.pop();
        vs.parameters.forEach((param) => stack.push(param));
        break;
    }
  }
  // filterSnapshot.groupOperator = DataCubeQueryFilterGroupOperator.AND;
  while (stack.length > 0) {
    let toApply = stack.shift();
    if (toApply instanceof V1_AppliedFunction) {
      if (toApply.parameters[0] instanceof V1_AppliedProperty) {
        filterConditionSnapshot.push(_buildFilterConditionSnapshot(toApply)!);
      } else if (
        toApply.parameters[0] instanceof V1_AppliedFunction &&
        toApply.parameters[0].function === 'toLower'
      ) {
        filterConditionSnapshot.push(_buildFilterConditionSnapshot(toApply)!);
      } else if (toApply.function === DataCubeEngineFilterOperator.NOT) {
        if (toApply.parameters[0] instanceof V1_AppliedFunction) {
          if (
            toApply.parameters[0].function ===
              DataCubeQueryFilterGroupOperator.AND ||
            toApply.parameters[0].function ===
              DataCubeQueryFilterGroupOperator.OR
          ) {
            let conditionSnapshot = _buildFilterSnapshot(
              toApply.parameters[0],
            )!;
            conditionSnapshot.not = true;
            filterConditionSnapshot.push(conditionSnapshot);
          } else if (
            toApply.parameters[0].function === DataCubeEngineFilterOperator.NOT
          ) {
            filterConditionSnapshot.push(
              _buildFilterConditionSnapshot(toApply.parameters[0])!,
            );
            filterSnapshot.not = true;
          } else {
            if (
              [
                DataCubeEngineFilterOperator.GREATER_THAN,
                DataCubeEngineFilterOperator.GREATER_THAN_OR_EQUAL,
                DataCubeEngineFilterOperator.LESS_THAN,
                DataCubeEngineFilterOperator.LESS_THAN_OR_EQUAL,
              ].filter(
                (param) =>
                  toApply.parameters[0] instanceof V1_AppliedFunction &&
                  param === toApply.parameters[0].function,
              ).length > 0 ||
              (toApply.parameters[0].parameters[0] as V1_AppliedFunction)
                .function == 'toLower'
            ) {
              let conditionSnapshot = _buildFilterConditionSnapshot(
                toApply.parameters[0],
              )!;
              conditionSnapshot.not = true;
              filterConditionSnapshot.push(conditionSnapshot);
            } else {
              filterConditionSnapshot.push(
                _buildFilterConditionSnapshot(toApply)!,
              );
            }
          }
        }
      }
      // else
      // {
      //   toApply.parameters.forEach((param) => stack.push(param));
      // }
      // if (vs instanceof V1_AppliedFunction && (vs.function === DataCubeQueryFilterGroupOperator.OR))
      // {
      //   filterSnapshot.groupOperator = DataCubeQueryFilterGroupOperator.OR;
      // }
      if (
        toApply instanceof V1_AppliedFunction &&
        (toApply.function === DataCubeQueryFilterGroupOperator.OR ||
          toApply.function === DataCubeQueryFilterGroupOperator.AND)
      ) {
        filterConditionSnapshot.push(_buildFilterConditionSnapshot(toApply)!);
      }
    }
  }
  filterSnapshot.conditions = filterConditionSnapshot;
  return filterSnapshot;
}

function _buildFilterConditionSnapshot(
  af: V1_AppliedFunction,
): DataCubeQuerySnapshotFilterCondition | undefined {
  if (af.parameters[1] && af.parameters[1] instanceof V1_AppliedProperty) {
    switch (af.function) {
      case DataCubeEngineFilterOperator.EQUAL:
        return new DataCubeQueryFilterOperation__EqualColumn().buildConditionSnapshot(
          af,
        );
      case DataCubeEngineFilterOperator.GREATER_THAN:
        return new DataCubeQueryFilterOperation__GreaterThanColumn().buildConditionSnapshot(
          af,
        );
      case DataCubeEngineFilterOperator.GREATER_THAN_OR_EQUAL:
        return new DataCubeQueryFilterOperation__GreaterThanOrEqualColumn().buildConditionSnapshot(
          af,
        );
      case DataCubeEngineFilterOperator.LESS_THAN:
        return new DataCubeQueryFilterOperation__LessThanColumn().buildConditionSnapshot(
          af,
        );
      case DataCubeEngineFilterOperator.LESS_THAN_OR_EQUAL:
        return new DataCubeQueryFilterOperation__LessThanOrEqualColumn().buildConditionSnapshot(
          af,
        );
      case DataCubeEngineFilterOperator.NOT:
        return _buildNotFilterConditionSnapshot(
          af.parameters[0] as V1_AppliedFunction,
        );
      default:
        return undefined;
    }
  } else if (
    af.parameters[0] instanceof V1_AppliedFunction &&
    af.parameters[0].function === DataCubeEngineFilterOperator.TO_LOWERCASE
  ) {
    return _buildCaseInsensitiveFilterConditionSnapshot(af);
  } else {
    switch (af.function) {
      case DataCubeEngineFilterOperator.CONTAINS:
        return new DataCubeQueryFilterOperation__Contain().buildConditionSnapshot(
          af,
        );
      case DataCubeEngineFilterOperator.ENDS_WITH:
        return new DataCubeQueryFilterOperation__EndWith().buildConditionSnapshot(
          af,
        );
      case DataCubeEngineFilterOperator.EQUAL:
        return new DataCubeQueryFilterOperation__Equal().buildConditionSnapshot(
          af,
        );
      case DataCubeEngineFilterOperator.GREATER_THAN:
        return new DataCubeQueryFilterOperation__GreaterThan().buildConditionSnapshot(
          af,
        );
      case DataCubeEngineFilterOperator.GREATER_THAN_OR_EQUAL:
        return new DataCubeQueryFilterOperation__GreaterThanOrEqual().buildConditionSnapshot(
          af,
        );
      case DataCubeEngineFilterOperator.IS_EMPTY:
        return new DataCubeQueryFilterOperation__IsNull().buildConditionSnapshot(
          af,
        );
      case DataCubeEngineFilterOperator.LESS_THAN:
        return new DataCubeQueryFilterOperation__LessThan().buildConditionSnapshot(
          af,
        );
      case DataCubeEngineFilterOperator.LESS_THAN_OR_EQUAL:
        return new DataCubeQueryFilterOperation__LessThanOrEqual().buildConditionSnapshot(
          af,
        );
      case DataCubeEngineFilterOperator.STARTS_WITH:
        return new DataCubeQueryFilterOperation__StartWith().buildConditionSnapshot(
          af,
        );
      case DataCubeEngineFilterOperator.NOT:
        return _buildNotFilterConditionSnapshot(
          af.parameters[0] as V1_AppliedFunction,
        );
      default:
        return undefined;
    }
  }
}

function _buildNotFilterConditionSnapshot(
  af: V1_AppliedFunction,
): DataCubeQuerySnapshotFilterCondition | undefined {
  if (af.parameters[1] && af.parameters[1] instanceof V1_AppliedProperty) {
    switch (af.function) {
      case DataCubeEngineFilterOperator.EQUAL:
        return new DataCubeQueryFilterOperation__NotEqualColumn().buildConditionSnapshot(
          af,
        );
      default:
        return undefined;
    }
  } else if (
    af.parameters[0] instanceof V1_AppliedFunction &&
    af.parameters[0].function === 'toLower'
  ) {
    let func = af.parameters[0] as V1_AppliedFunction;
    if (af.function === DataCubeEngineFilterOperator.EQUAL) {
      if (
        func.parameters[1] &&
        func.parameters[1] instanceof V1_AppliedProperty
      ) {
        return new DataCubeQueryFilterOperation__NotEqualCaseInsensitiveColumn().buildConditionSnapshot(
          func,
        );
      }
      return new DataCubeQueryFilterOperation__NotEqualCaseInsensitive().buildConditionSnapshot(
        func,
      );
    }
  } else {
    switch (af.function) {
      case DataCubeEngineFilterOperator.CONTAINS:
        return new DataCubeQueryFilterOperation__NotContain().buildConditionSnapshot(
          af,
        );
      case DataCubeEngineFilterOperator.ENDS_WITH:
        return new DataCubeQueryFilterOperation__NotEndWith().buildConditionSnapshot(
          af,
        );
      case DataCubeEngineFilterOperator.EQUAL:
        return new DataCubeQueryFilterOperation__NotEqual().buildConditionSnapshot(
          af,
        );
      case DataCubeEngineFilterOperator.IS_EMPTY:
        return new DataCubeQueryFilterOperation__IsNotNull().buildConditionSnapshot(
          af,
        );
      case DataCubeEngineFilterOperator.STARTS_WITH:
        return new DataCubeQueryFilterOperation__NotStartWith().buildConditionSnapshot(
          af,
        );
      default:
        return undefined;
    }
  }
}

function _buildCaseInsensitiveFilterConditionSnapshot(
  af: V1_AppliedFunction,
): DataCubeQuerySnapshotFilterCondition | undefined {
  let func = af;
  if (
    af.parameters[0] instanceof V1_AppliedFunction &&
    af.parameters[1] instanceof V1_AppliedFunction
  ) {
    func.parameters = [
      af.parameters[0].parameters[0]!,
      af.parameters[1].parameters[0]!,
    ];
  }
  if (func.parameters[1] && func.parameters[1] instanceof V1_AppliedProperty) {
    switch (af.function) {
      case DataCubeEngineFilterOperator.EQUAL:
        return new DataCubeQueryFilterOperation__EqualCaseInsensitiveColumn().buildConditionSnapshot(
          func,
        );
      default:
        return undefined;
    }
  } else {
    switch (af.function) {
      case DataCubeEngineFilterOperator.CONTAINS:
        return new DataCubeQueryFilterOperation__ContainCaseInsensitive().buildConditionSnapshot(
          func,
        );
      case DataCubeEngineFilterOperator.ENDS_WITH:
        return new DataCubeQueryFilterOperation__EndWithCaseInsensitive().buildConditionSnapshot(
          func,
        );
      case DataCubeEngineFilterOperator.EQUAL:
        return new DataCubeQueryFilterOperation__EqualCaseInsensitive().buildConditionSnapshot(
          func,
        );
      case DataCubeEngineFilterOperator.STARTS_WITH:
        return new DataCubeQueryFilterOperation__StartWithCaseInsensitive().buildConditionSnapshot(
          func,
        );
      default:
        return undefined;
    }
  }
}

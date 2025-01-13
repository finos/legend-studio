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
  PRIMITIVE_TYPE,
  V1_AppliedFunction,
  type V1_AppliedProperty,
  V1_CBoolean,
  V1_CDateTime,
  V1_CDecimal,
  V1_CFloat,
  V1_CInteger,
  V1_CStrictDate,
  V1_CStrictTime,
  V1_CString,
  V1_ClassInstance,
  V1_ColSpec,
  V1_ColSpecArray,
  V1_GenericTypeInstance,
  type V1_ValueSpecification,
  type V1_PrimitiveValueSpecification,
  extractElementNameFromPath as _name,
  matchFunctionName,
  V1_RelationType,
  V1_PackageableType,
  type V1_GenericType,
} from '@finos/legend-graph';
import { type DataCubeColumn } from './model/DataCubeColumn.js';
import {
  assertTrue,
  assertType,
  getNonNullableEntry,
  guaranteeNonNullable,
  guaranteeType,
  IllegalStateError,
  uniq,
  UnsupportedOperationError,
  type Clazz,
} from '@finos/legend-shared';
import {
  DataCubeFunction,
  DataCubeQueryFilterGroupOperator,
  TREE_COLUMN_VALUE_SEPARATOR,
  type DataCubeOperationValue,
  type DataCubeQueryFilterOperator,
} from './DataCubeQueryEngine.js';
import type {
  DataCubeQuerySnapshotFilter,
  DataCubeQuerySnapshotFilterCondition,
} from './DataCubeQuerySnapshot.js';
import { _serializeValueSpecification } from './DataCubeQueryBuilderUtils.js';
import type { DataCubeQueryFilterOperation } from './filter/DataCubeQueryFilterOperation.js';

// --------------------------------- UTILITIES ---------------------------------

export function _param<T extends V1_ValueSpecification>(
  func: V1_AppliedFunction,
  paramIdx: number,
  clazz: Clazz<T>,
  message?: string | undefined,
): T {
  assertTrue(
    func.parameters.length >= paramIdx + 1,
    `Can't process ${_name(func.function)}() expression: Expected at least ${paramIdx + 1} parameter(s)`,
  );
  return guaranteeType(
    func.parameters[paramIdx],
    clazz,
    message ??
      `Can't process ${_name(func.function)}() expression: Found unexpected type for parameter at index ${paramIdx}`,
  );
}

export function _colSpecParam(func: V1_AppliedFunction, paramIdx: number) {
  return guaranteeType(
    _param(func, paramIdx, V1_ClassInstance).value,
    V1_ColSpec,
    `Can't process ${_name(func.function)}() expression: Expected parameter at index ${paramIdx} to be a column specification`,
  );
}

export function _colSpecArrayParam(func: V1_AppliedFunction, paramIdx: number) {
  return guaranteeType(
    _param(func, paramIdx, V1_ClassInstance).value,
    V1_ColSpecArray,
    `Can't process ${_name(func.function)}() expression: Expected parameter at index ${paramIdx} to be a column specification list`,
  );
}

export function _genericTypeParam(func: V1_AppliedFunction, paramIdx: number) {
  return _param(
    func,
    paramIdx,
    V1_GenericTypeInstance,
    `Can't process ${_name(func.function)}: Expected parameter at index ${paramIdx} to be a generic type instance`,
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
    `Can't process function: Expected function to be one of [${uniq((Array.isArray(functionNames) ? functionNames : [functionNames]).map(_name)).join(', ')}]`,
  );
  return value;
}

export function _relationType(genericType: V1_GenericType) {
  return guaranteeType(
    genericType.typeArguments?.[0]?.rawType,
    V1_RelationType,
    `Can't process generic type: failed to extract relation type`,
  );
}

export function _packageableType(genericType: V1_GenericType) {
  return guaranteeType(
    genericType.rawType,
    V1_PackageableType,
    `Can't process generic type: failed to extract packageable type`,
  );
}

export function _operationPrimitiveValue(
  value: V1_PrimitiveValueSpecification,
): DataCubeOperationValue | undefined {
  switch (true) {
    case value instanceof V1_CString:
      return { value: value.value, type: PRIMITIVE_TYPE.STRING };
    case value instanceof V1_CBoolean:
      return { value: value.value, type: PRIMITIVE_TYPE.BOOLEAN };
    case value instanceof V1_CDecimal:
      return { value: value.value, type: PRIMITIVE_TYPE.DECIMAL };
    case value instanceof V1_CInteger:
      return { value: value.value, type: PRIMITIVE_TYPE.INTEGER };
    case value instanceof V1_CFloat:
      return { value: value.value, type: PRIMITIVE_TYPE.FLOAT };
    case value instanceof V1_CStrictDate:
      return { value: value.value, type: PRIMITIVE_TYPE.STRICTDATE };
    case value instanceof V1_CDateTime:
      return { value: value.value, type: PRIMITIVE_TYPE.DATETIME };
    case value instanceof V1_CStrictTime:
      return { value: value.value, type: PRIMITIVE_TYPE.STRICTTIME };
    default:
      return undefined;
  }
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

export function _extractExtendedColumns(func: V1_AppliedFunction) {
  const extendFuncs: V1_AppliedFunction[] = [];
  let currentFunc = func;

  while (currentFunc instanceof V1_AppliedFunction) {
    // since we are processing a chain of extend(), we can finish processing when
    // encountering a different function.
    if (!matchFunctionName(currentFunc.function, DataCubeFunction.EXTEND)) {
      break;
    }

    if (currentFunc.parameters.length === 2) {
      const valueSpecification = currentFunc.parameters[0];
      if (!(valueSpecification instanceof V1_AppliedFunction)) {
        throw new IllegalStateError(
          `Can't process extend() expression: Expected a chain of function calls (e.g. x()->y()->z())`,
        );
      } else {
        currentFunc.parameters = currentFunc.parameters.slice(1);
        extendFuncs.unshift(currentFunc);
        currentFunc = valueSpecification;
      }
    } else {
      assertTrue(
        currentFunc.parameters.length === 1,
        `Can't process extend() expression: Expected 1 parameter, got ${currentFunc.parameters.length}`,
      );
      extendFuncs.unshift(currentFunc);
      break;
    }
  }
  return extendFuncs.map((extendFunc) => {
    const colSpecs = _colSpecArrayParam(extendFunc, 0).colSpecs;
    assertTrue(
      colSpecs.length === 1,
      `Can't process extend() expression: Expected 1 column specification, got ${colSpecs.length}`,
    );
    const colSpec = getNonNullableEntry(colSpecs, 0);
    return {
      name: colSpec.name,
      type: '', // NOTE: we don't have type information for extended columns at this point
      mapFn: _serializeValueSpecification(
        guaranteeNonNullable(
          colSpec.function1,
          `Can't process extend() expression: Expected a transformation function expression`,
        ),
      ),
      reduceFn: colSpec.function2
        ? _serializeValueSpecification(colSpec.function2)
        : undefined,
    };
  });
}

export function _filter(
  value: V1_ValueSpecification,
  columnGetter: (name: string) => DataCubeColumn,
  filterOperations: DataCubeQueryFilterOperation[],
): DataCubeQuerySnapshotFilter {
  if (!(value instanceof V1_AppliedFunction)) {
    throw new Error(
      `Can't process filter() expression: Expected a function expression`,
    );
  }

  const group: DataCubeQuerySnapshotFilter = {
    // default to AND group for case where there is only one condition
    groupOperator: DataCubeQueryFilterGroupOperator.AND,
    conditions: [],
  };

  if (matchFunctionName(value.function, DataCubeFunction.AND)) {
    value.parameters.forEach((param) => {
      group.conditions.push(
        _filterCondition(param, columnGetter, filterOperations)!,
      );
    });
  } else if (matchFunctionName(value.function, DataCubeFunction.OR)) {
    group.groupOperator = DataCubeQueryFilterGroupOperator.OR;
    value.parameters.forEach((param) => {
      group.conditions.push(
        _filterCondition(param, columnGetter, filterOperations)!,
      );
    });
  } else {
    // handles the case where the root is a simple condition or a NOT condition
    group.conditions.push(
      _filterCondition(value, columnGetter, filterOperations)!,
    );
  }
  return group;
}

export function _unwrapNotFilterCondition(func: V1_AppliedFunction) {
  assertTrue(
    matchFunctionName(func.function, DataCubeFunction.NOT),
    `Can't process filter condition expression: failed to unwrap not() function`,
  );
  return _param(func, 0, V1_AppliedFunction);
}

function _filterCondition(
  value: V1_ValueSpecification,
  columnGetter: (name: string) => DataCubeColumn,
  filterOperations: DataCubeQueryFilterOperation[],
): DataCubeQuerySnapshotFilterCondition | DataCubeQuerySnapshotFilter {
  if (!(value instanceof V1_AppliedFunction)) {
    throw new UnsupportedOperationError(
      `Can't process filter condition expression: Expected a function expression`,
    );
  }

  // handle group condition
  if (
    matchFunctionName(value.function, [
      DataCubeFunction.AND,
      DataCubeFunction.OR,
    ])
  ) {
    return _filter(value, columnGetter, filterOperations);
  }

  // run through the list of supported filter operations to find the one that can process the condition
  for (const filterOperation of filterOperations) {
    const condition = filterOperation.buildConditionSnapshot(
      value,
      columnGetter,
    );
    if (condition) {
      return condition;
    }
  }

  // if no match found, proceed to unwrap if it's a NOT condition
  if (matchFunctionName(value.function, DataCubeFunction.NOT)) {
    // run through the list of supported filter operations to find the one that can process the condition
    // again. Processing in this order ensures cases like x != y can be recognized as NOT_EQUAL operator
    // instead of NOT(x == y)
    const unwrapped = _unwrapNotFilterCondition(value);
    for (const filterOperation of filterOperations) {
      const condition = filterOperation.buildConditionSnapshot(
        unwrapped,
        columnGetter,
      );
      if (condition) {
        condition.not = true;
        return condition;
      }
    }

    // if no match found, try to see if the condition is a group condition and process
    if (
      unwrapped instanceof V1_AppliedFunction &&
      matchFunctionName(unwrapped.function, [
        DataCubeFunction.AND,
        DataCubeFunction.OR,
      ])
    ) {
      const condition = _filter(unwrapped, columnGetter, filterOperations);
      condition.not = true;
      return condition;
    }
  }

  // if no match found, throw error, we encountered a filter condition form that we don't support
  throw new Error(`Can't process filter condition: no matching operator found`);
}

export function _buildConditionSnapshotProperty(
  property: V1_AppliedProperty,
  operator: DataCubeQueryFilterOperator,
): DataCubeQuerySnapshotFilterCondition {
  return {
    name: property.property,
    operator: operator,
    type: property.class!, // TODO: fix this in engine (missing class in V1_AppliedProperty)
  } as DataCubeQuerySnapshotFilterCondition;
}

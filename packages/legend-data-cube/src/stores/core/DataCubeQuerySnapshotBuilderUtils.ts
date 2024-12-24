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
  V1_AppliedProperty,
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
  V1_Lambda,
  V1_PrimitiveValueSpecification,
  type V1_ValueSpecification,
  extractElementNameFromPath as _name,
  matchFunctionName,
} from '@finos/legend-graph';
import { type DataCubeColumn } from './models/DataCubeColumn.js';
import {
  assertTrue,
  assertType,
  guaranteeNonNullable,
  guaranteeType,
  UnsupportedOperationError,
  type Clazz,
} from '@finos/legend-shared';
import {
  DataCubeEngineFilterOperator,
  DataCubeOperationAdvancedValueType,
  DataCubeQueryFilterGroupOperator,
  DataCubeQueryFilterOperator,
  TREE_COLUMN_VALUE_SEPARATOR,
  type DataCubeOperationValue,
} from './DataCubeQueryEngine.js';
import type {
  DataCubeQuerySnapshotFilter,
  DataCubeQuerySnapshotFilterCondition,
} from './DataCubeQuerySnapshot.js';

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

export function _lambdaParam(func: V1_AppliedFunction, paramIdx: number) {
  return guaranteeType(
    _param(func, paramIdx, V1_Lambda),
    V1_Lambda,
    `Can't process ${_name(func.function)}: Expected parameter at index ${paramIdx} to be a lambda expression`,
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
  const filterSnapshot = {} as DataCubeQuerySnapshotFilter;
  const filterConditionSnapshot = [];

  if (vs instanceof V1_AppliedFunction) {
    switch (vs.function) {
      case DataCubeQueryFilterGroupOperator.OR:
      case DataCubeQueryFilterGroupOperator.AND:
        filterSnapshot.groupOperator = vs.function;
        break;
      default:
        filterSnapshot.groupOperator = DataCubeQueryFilterGroupOperator.AND;
    }

    if (
      vs.function === DataCubeQueryFilterGroupOperator.AND ||
      vs.function === DataCubeQueryFilterGroupOperator.OR
    ) {
      vs.parameters.forEach((param) => {
        filterConditionSnapshot.push(_buildSubFilter(param)!);
      });
    } else {
      filterConditionSnapshot.push(_buildSubFilter(vs)!);
    }
  }
  filterSnapshot.conditions = filterConditionSnapshot;
  return filterSnapshot;
}

function _buildSubFilter(
  vs: V1_ValueSpecification,
):
  | DataCubeQuerySnapshotFilterCondition
  | DataCubeQuerySnapshotFilter
  | undefined {
  if (vs instanceof V1_AppliedFunction) {
    if (
      Object.values(DataCubeEngineFilterOperator).includes(
        vs.function as DataCubeEngineFilterOperator,
      ) &&
      vs.function !== DataCubeEngineFilterOperator.NOT
    ) {
      return _buildFilterConditionSnapshot(vs);
    } else if (vs.function === DataCubeEngineFilterOperator.NOT) {
      const notCondition = _buildNotFilterConditionSnapshot(
        vs.parameters[0] as V1_AppliedFunction,
      );
      if (notCondition) {
        return notCondition;
      } else {
        const filterSnapshot = _buildFilterSnapshot(
          vs.parameters[0] as V1_ValueSpecification,
        );
        filterSnapshot.not = true;
        return filterSnapshot;
      }
    } else if (vs.parameters[0] instanceof V1_AppliedFunction) {
      return _buildFilterSnapshot(vs);
    }
  }
  return undefined;
}

function _buildFilterConditionSnapshot(
  af: V1_AppliedFunction,
): DataCubeQuerySnapshotFilterCondition | undefined {
  if (af.parameters[1] && af.parameters[1] instanceof V1_AppliedProperty) {
    switch (af.function) {
      case DataCubeEngineFilterOperator.EQUAL:
        return _buildConditionSnapshotPropertyValue(
          af,
          DataCubeQueryFilterOperator.EQUAL_COLUMN,
        );
      case DataCubeEngineFilterOperator.GREATER_THAN:
        return _buildConditionSnapshotPropertyValue(
          af,
          DataCubeQueryFilterOperator.GREATER_THAN_COLUMN,
        );
      case DataCubeEngineFilterOperator.GREATER_THAN_OR_EQUAL:
        return _buildConditionSnapshotPropertyValue(
          af,
          DataCubeQueryFilterOperator.GREATER_THAN_OR_EQUAL_COLUMN,
        );
      case DataCubeEngineFilterOperator.LESS_THAN:
        return _buildConditionSnapshotPropertyValue(
          af,
          DataCubeQueryFilterOperator.GREATER_THAN_OR_EQUAL_COLUMN,
        );
      case DataCubeEngineFilterOperator.LESS_THAN:
        return _buildConditionSnapshotPropertyValue(
          af,
          DataCubeQueryFilterOperator.LESS_THAN_COLUMN,
        );
      case DataCubeEngineFilterOperator.LESS_THAN_OR_EQUAL:
        return _buildConditionSnapshotPropertyValue(
          af,
          DataCubeQueryFilterOperator.LESS_THAN_OR_EQUAL_COLUMN,
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
        return _buildConditionSnapshotPrimitiveValue(
          af,
          DataCubeQueryFilterOperator.CONTAIN,
        );
      case DataCubeEngineFilterOperator.ENDS_WITH:
        return _buildConditionSnapshotPrimitiveValue(
          af,
          DataCubeQueryFilterOperator.END_WITH,
        );
      case DataCubeEngineFilterOperator.EQUAL:
        return _buildConditionSnapshotPrimitiveValue(
          af,
          DataCubeQueryFilterOperator.EQUAL,
        );
      case DataCubeEngineFilterOperator.GREATER_THAN:
        return _buildConditionSnapshotPrimitiveValue(
          af,
          DataCubeQueryFilterOperator.GREATER_THAN,
        );
      case DataCubeEngineFilterOperator.GREATER_THAN_OR_EQUAL:
        return _buildConditionSnapshotPrimitiveValue(
          af,
          DataCubeQueryFilterOperator.GREATER_THAN_OR_EQUAL,
        );
      case DataCubeEngineFilterOperator.IS_EMPTY:
        return _buildConditionSnapshotNoValue(
          af,
          DataCubeQueryFilterOperator.IS_NULL,
        );
      case DataCubeEngineFilterOperator.LESS_THAN:
        return _buildConditionSnapshotPrimitiveValue(
          af,
          DataCubeQueryFilterOperator.LESS_THAN,
        );
      case DataCubeEngineFilterOperator.LESS_THAN_OR_EQUAL:
        return _buildConditionSnapshotPrimitiveValue(
          af,
          DataCubeQueryFilterOperator.LESS_THAN_OR_EQUAL,
        );
      case DataCubeEngineFilterOperator.STARTS_WITH:
        return _buildConditionSnapshotPrimitiveValue(
          af,
          DataCubeQueryFilterOperator.START_WITH,
        );
      default:
        return undefined;
    }
  }
}

function _buildCaseInsensitiveFilterConditionSnapshot(
  af: V1_AppliedFunction,
): DataCubeQuerySnapshotFilterCondition | undefined {
  const func = af;
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
        return _buildConditionSnapshotPrimitiveValue(
          func,
          DataCubeQueryFilterOperator.EQUAL_CASE_INSENSITIVE_COLUMN,
        );
      default:
        return undefined;
    }
  } else {
    switch (af.function) {
      case DataCubeEngineFilterOperator.CONTAINS:
        return _buildConditionSnapshotPrimitiveValue(
          func,
          DataCubeQueryFilterOperator.CONTAIN_CASE_INSENSITIVE,
        );
      case DataCubeEngineFilterOperator.ENDS_WITH:
        return _buildConditionSnapshotPrimitiveValue(
          func,
          DataCubeQueryFilterOperator.END_WITH_CASE_INSENSITIVE,
        );
      case DataCubeEngineFilterOperator.EQUAL:
        return _buildConditionSnapshotPrimitiveValue(
          func,
          DataCubeQueryFilterOperator.EQUAL_CASE_INSENSITIVE,
        );
      case DataCubeEngineFilterOperator.STARTS_WITH:
        return _buildConditionSnapshotPrimitiveValue(
          func,
          DataCubeQueryFilterOperator.START_WITH_CASE_INSENSITIVE,
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
        return _buildConditionSnapshotPropertyValue(
          af,
          DataCubeQueryFilterOperator.NOT_EQUAL_COLUMN,
        );
      default:
        return undefined;
    }
  } else if (
    af.parameters[0] instanceof V1_AppliedFunction &&
    af.parameters[0].function === DataCubeEngineFilterOperator.TO_LOWERCASE
  ) {
    if (af.function === DataCubeEngineFilterOperator.EQUAL) {
      const func = af;
      if (
        af.parameters[0] instanceof V1_AppliedFunction &&
        af.parameters[1] instanceof V1_AppliedFunction
      ) {
        func.parameters = [
          af.parameters[0].parameters[0]!,
          af.parameters[1].parameters[0]!,
        ];
      }
      if (
        func.parameters[1] &&
        func.parameters[1] instanceof V1_AppliedProperty
      ) {
        return _buildConditionSnapshotPrimitiveValue(
          func,
          DataCubeQueryFilterOperator.NOT_EQUAL_CASE_INSENSITIVE_COLUMN,
        );
      }
      return _buildConditionSnapshotPrimitiveValue(
        func,
        DataCubeQueryFilterOperator.NOT_EQUAL_CASE_INSENSITIVE,
      );
    }
  } else {
    switch (af.function) {
      case DataCubeEngineFilterOperator.CONTAINS:
        return _buildConditionSnapshotPrimitiveValue(
          af,
          DataCubeQueryFilterOperator.NOT_CONTAIN,
        );
      case DataCubeEngineFilterOperator.ENDS_WITH:
        return _buildConditionSnapshotPrimitiveValue(
          af,
          DataCubeQueryFilterOperator.NOT_END_WITH,
        );
      case DataCubeEngineFilterOperator.EQUAL:
        return _buildConditionSnapshotPrimitiveValue(
          af,
          DataCubeQueryFilterOperator.NOT_EQUAL,
        );
      case DataCubeEngineFilterOperator.IS_EMPTY:
        return _buildConditionSnapshotNoValue(
          af,
          DataCubeQueryFilterOperator.IS_NOT_NULL,
        );
      case DataCubeEngineFilterOperator.STARTS_WITH:
        return _buildConditionSnapshotPrimitiveValue(
          af,
          DataCubeQueryFilterOperator.NOT_START_WITH,
        );
      default:
        return undefined;
    }
  }
  return undefined;
}

export function _dataCubeOperationValue(
  vs: V1_PrimitiveValueSpecification,
): DataCubeOperationValue {
  switch (true) {
    case vs instanceof V1_CString:
      return _buildDataCubeOperationValue(PRIMITIVE_TYPE.STRING, vs.value);
    case vs instanceof V1_CBoolean:
      return _buildDataCubeOperationValue(PRIMITIVE_TYPE.BOOLEAN, vs.value);
    case vs instanceof V1_CDecimal:
      return _buildDataCubeOperationValue(PRIMITIVE_TYPE.DECIMAL, vs.value);
    case vs instanceof V1_CInteger:
      return _buildDataCubeOperationValue(PRIMITIVE_TYPE.INTEGER, vs.value);
    case vs instanceof V1_CFloat:
      return _buildDataCubeOperationValue(PRIMITIVE_TYPE.FLOAT, vs.value);
    case vs instanceof V1_CStrictDate:
      return _buildDataCubeOperationValue(PRIMITIVE_TYPE.STRICTDATE, vs.value);
    case vs instanceof V1_CDateTime:
      return _buildDataCubeOperationValue(PRIMITIVE_TYPE.DATETIME, vs.value);
    case vs instanceof V1_CStrictTime:
      return _buildDataCubeOperationValue(PRIMITIVE_TYPE.STRICTTIME, vs.value);
    default:
      throw new UnsupportedOperationError(
        `Unsupported primitive value '${vs}'`,
      );
  }
}

function _buildDataCubeOperationValue(
  type: string,
  value: unknown,
): DataCubeOperationValue {
  return {
    value: value,
    type: type,
  } satisfies DataCubeOperationValue;
}

function _buildConditionSnapshotPrimitiveValue(
  expression: V1_AppliedFunction,
  operator: DataCubeQueryFilterOperator,
): DataCubeQuerySnapshotFilterCondition | undefined {
  const value = expression.parameters[1];
  const filterConditionSnapshot = _buildConditionSnapshotProperty(
    expression.parameters[0] as V1_AppliedProperty,
    operator,
  );
  if (value instanceof V1_PrimitiveValueSpecification) {
    filterConditionSnapshot.value = _dataCubeOperationValue(value);
  }
  return filterConditionSnapshot satisfies DataCubeQuerySnapshotFilterCondition;
}

function _buildConditionSnapshotPropertyValue(
  expression: V1_AppliedFunction,
  operator: DataCubeQueryFilterOperator,
): DataCubeQuerySnapshotFilterCondition | undefined {
  const value = expression.parameters[1];
  const filterConditionSnapshot = _buildConditionSnapshotProperty(
    expression.parameters[0] as V1_AppliedProperty,
    operator,
  );

  if (value instanceof V1_AppliedProperty) {
    filterConditionSnapshot.value = {
      value: value.property,
      type: DataCubeOperationAdvancedValueType.COLUMN,
    } satisfies DataCubeOperationValue;
  }
  return filterConditionSnapshot satisfies DataCubeQuerySnapshotFilterCondition;
}

function _buildConditionSnapshotNoValue(
  expression: V1_AppliedFunction,
  operator: DataCubeQueryFilterOperator,
): DataCubeQuerySnapshotFilterCondition | undefined {
  const filterConditionSnapshot = _buildConditionSnapshotProperty(
    expression.parameters[0] as V1_AppliedProperty,
    operator,
  );
  filterConditionSnapshot.value = undefined;
  return filterConditionSnapshot;
}

function _buildConditionSnapshotProperty(
  property: V1_AppliedProperty,
  operator: DataCubeQueryFilterOperator,
): DataCubeQuerySnapshotFilterCondition {
  return {
    name: property.property,
    operator: operator,
    type: property.class!, // TODO: fix this in engine (missing clas in V1_AppliedProperty)
  } as DataCubeQuerySnapshotFilterCondition;
}

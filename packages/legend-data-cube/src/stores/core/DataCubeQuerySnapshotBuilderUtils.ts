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
  V1_GenericTypeInstance,
  type V1_ValueSpecification,
  V1_PrimitiveValueSpecification,
  extractElementNameFromPath as _name,
  matchFunctionName,
  V1_RelationType,
  V1_PackageableType,
  type V1_GenericType,
} from '@finos/legend-graph';
import { type DataCubeColumn } from './model/DataCubeColumn.js';
import {
  assertErrorThrown,
  assertTrue,
  assertType,
  at,
  guaranteeNonNullable,
  guaranteeType,
  uniq,
  UnsupportedOperationError,
  type Clazz,
} from '@finos/legend-shared';
import {
  DataCubeFunction,
  DataCubeOperationAdvancedValueType,
  DataCubeQueryFilterGroupOperator,
  getDataType,
  TREE_COLUMN_VALUE_SEPARATOR,
  type DataCubeOperationValue,
} from './DataCubeQueryEngine.js';
import type {
  DataCubeQuerySnapshotFilter,
  DataCubeQuerySnapshotFilterCondition,
} from './DataCubeQuerySnapshot.js';
import type { DataCubeQueryFilterOperation } from './filter/DataCubeQueryFilterOperation.js';
import type { DataCubeEngine } from './DataCubeEngine.js';
import {
  _cols,
  _colSpec,
  _function,
  _lambda,
  _serializeValueSpecification,
} from './DataCubeQueryBuilderUtils.js';
import { INTERNAL__DataCubeSource } from './model/DataCubeSource.js';

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
    genericType.typeArguments[0]?.rawType,
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
): DataCubeOperationValue {
  if (value instanceof V1_CString) {
    return { value: value.value, type: PRIMITIVE_TYPE.STRING };
  } else if (value instanceof V1_CBoolean) {
    return { value: value.value, type: PRIMITIVE_TYPE.BOOLEAN };
  } else if (value instanceof V1_CDecimal) {
    return { value: value.value, type: PRIMITIVE_TYPE.DECIMAL };
  } else if (value instanceof V1_CInteger) {
    return { value: value.value, type: PRIMITIVE_TYPE.INTEGER };
  } else if (value instanceof V1_CFloat) {
    return { value: value.value, type: PRIMITIVE_TYPE.FLOAT };
  } else if (value instanceof V1_CStrictDate) {
    return { value: value.value, type: PRIMITIVE_TYPE.STRICTDATE };
  } else if (value instanceof V1_CDateTime) {
    return { value: value.value, type: PRIMITIVE_TYPE.DATETIME };
  } else if (value instanceof V1_CStrictTime) {
    return { value: value.value, type: PRIMITIVE_TYPE.STRICTTIME };
  }
  throw new UnsupportedOperationError(`Can't process primitive value`);
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
      at(prevGroupByCols, i).name !== at(currentGroupByCols, i).name ||
      at(prevGroupByCols, i).type !== at(currentGroupByCols, i).type
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

export async function _extractExtendedColumns(
  funcs: V1_AppliedFunction[],
  currentColumns: DataCubeColumn[],
  engine: DataCubeEngine,
) {
  const colSpecs = funcs.map((extendFunc) => {
    // TODO: support extend() with window (OLAP), this assertion will no longer work
    const _colSpecs = _colSpecArrayParam(extendFunc, 0).colSpecs;
    assertTrue(
      _colSpecs.length === 1,
      `Can't process extend() expression: Expected 1 column specification, got ${_colSpecs.length}`,
    );
    return at(_colSpecs, 0);
  });

  // get the types
  const sourceQuery = engine.synthesizeMinimalSourceQuery(currentColumns);
  const sequence = colSpecs.map((colSpec) =>
    _function(DataCubeFunction.EXTEND, [
      _cols([
        _colSpec(
          colSpec.name,
          guaranteeNonNullable(
            colSpec.function1,
            `Can't process extend() expression: Expected a transformation function expression for column '${colSpec.name}'`,
          ),
          colSpec.function2,
        ),
      ]),
    ]),
  );
  for (let i = 0; i < sequence.length; i++) {
    at(sequence, i).parameters.unshift(
      i === 0 ? sourceQuery : at(sequence, i - 1),
    );
  }
  const query = at(sequence, sequence.length - 1);
  let columns: DataCubeColumn[] = [];
  try {
    columns = (
      await engine.getQueryRelationReturnType(
        _lambda([], [query]),
        new INTERNAL__DataCubeSource(),
      )
    ).columns;
  } catch (error) {
    assertErrorThrown(error);
    throw new Error(
      `Can't process extend() expression: failed to retrieve type information for columns. Error: ${error.message}`,
    );
  }

  return colSpecs.map((colSpec) => ({
    name: colSpec.name,
    type: guaranteeNonNullable(
      columns.find((column) => column.name === colSpec.name),
      `Can't process extend() expression: failed to retrieve type information for column '${colSpec.name}'`,
    ).type,
    mapFn: _serializeValueSpecification(
      guaranteeNonNullable(
        colSpec.function1,
        `Can't process extend() expression: Expected a transformation function expression for column '${colSpec.name}'`,
      ),
    ),
    reduceFn: colSpec.function2
      ? _serializeValueSpecification(colSpec.function2)
      : undefined,
  }));
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
        _filterCondition(param, columnGetter, filterOperations),
      );
    });
  } else if (matchFunctionName(value.function, DataCubeFunction.OR)) {
    group.groupOperator = DataCubeQueryFilterGroupOperator.OR;
    value.parameters.forEach((param) => {
      group.conditions.push(
        _filterCondition(param, columnGetter, filterOperations),
      );
    });
  } else {
    // handles the case where the root is a simple condition or a NOT condition
    group.conditions.push(
      _filterCondition(value, columnGetter, filterOperations),
    );
  }
  return group;
}

export function _unwrapNotFilterCondition(func: V1_AppliedFunction) {
  assertTrue(
    matchFunctionName(func.function, DataCubeFunction.NOT),
    `Can't process filter condition expression: failed to unwrap not() function`,
  );
  assertTrue(
    func.parameters.length === 1,
    `Can't process not() function: Expected 1 parameter`,
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

function _filterConditionValue(
  value: V1_ValueSpecification | undefined,
  column: DataCubeColumn,
  columnGetter: (name: string) => DataCubeColumn,
) {
  if (value instanceof V1_PrimitiveValueSpecification) {
    return _operationPrimitiveValue(value);
  } else if (value instanceof V1_AppliedProperty) {
    const column2 = columnGetter(value.property);
    if (getDataType(column.type) !== getDataType(column2.type)) {
      return undefined;
    }
    return {
      value: column2.name,
      type: DataCubeOperationAdvancedValueType.COLUMN,
    };
  } else if (value === undefined) {
    return {
      type: DataCubeOperationAdvancedValueType.VOID,
    };
  }

  return undefined;
}

/**
 * Processes filter conditions of form: column | operator | value, e.g.
 * $x.Age > 5
 * $x.Name == 'abc'
 * $x.Name->startsWith('abc')
 * $x.Age > $x.Age2
 * $x.Name == $x.Name2
 */
export function _baseFilterCondition(
  expression: V1_AppliedFunction,
  columnGetter: (name: string) => DataCubeColumn,
  func: string,
) {
  if (matchFunctionName(expression.function, func)) {
    if (
      expression.parameters.length !== 2 &&
      expression.parameters.length !== 1
    ) {
      return undefined;
    }

    const column =
      expression.parameters[0] instanceof V1_AppliedProperty
        ? columnGetter(expression.parameters[0].property)
        : undefined;
    if (!column) {
      return undefined;
    }

    const value = _filterConditionValue(
      expression.parameters[1],
      column,
      columnGetter,
    );
    if (!value) {
      return undefined;
    }

    return {
      column,
      value,
    };
  }
  return undefined;
}

/**
 * Processes filter conditions of form: column (case-insensitive) | operator | value (case-insensitive), e.g.
 * $x.Name->toLower() == 'abc'->toLower()
 * $x.Name->toLower() == $x.Name2->toLower()
 */
export function _caseSensitiveBaseFilterCondition(
  expression: V1_AppliedFunction,
  columnGetter: (name: string) => DataCubeColumn,
  func: string,
) {
  if (matchFunctionName(expression.function, func)) {
    if (expression.parameters.length !== 2) {
      return undefined;
    }

    const param1 = expression.parameters[0];
    if (
      !(param1 instanceof V1_AppliedFunction) ||
      !matchFunctionName(param1.function, DataCubeFunction.TO_LOWERCASE)
    ) {
      return undefined;
    }
    if (param1.parameters.length !== 1) {
      return undefined;
    }
    const column =
      param1.parameters[0] instanceof V1_AppliedProperty
        ? columnGetter(param1.parameters[0].property)
        : undefined;
    if (!column) {
      return undefined;
    }

    const param2 = expression.parameters[1];
    if (
      !(param2 instanceof V1_AppliedFunction) ||
      !matchFunctionName(param2.function, DataCubeFunction.TO_LOWERCASE)
    ) {
      return undefined;
    }
    if (param2.parameters.length !== 1) {
      return undefined;
    }
    const value = _filterConditionValue(
      param2.parameters[0],
      column,
      columnGetter,
    );

    if (!value) {
      return undefined;
    }

    return {
      column,
      value,
    };
  }
  return undefined;
}

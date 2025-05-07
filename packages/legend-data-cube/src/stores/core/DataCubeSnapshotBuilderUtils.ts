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
  V1_Variable,
  type V1_ValueSpecification,
  V1_PrimitiveValueSpecification,
  extractElementNameFromPath as _name,
  matchFunctionName,
  V1_RelationType,
  V1_PackageableType,
  type V1_GenericType,
  V1_Collection,
  type V1_Lambda,
} from '@finos/legend-graph';
import { _findCol, type DataCubeColumn } from './model/DataCubeColumn.js';
import {
  assertErrorThrown,
  assertTrue,
  assertType,
  at,
  deepEqual,
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
  DataCubeQuerySortDirection,
  DEFAULT_LAMBDA_VARIABLE_NAME,
  getDataType,
  getPivotResultColumnBaseColumnName,
  isPivotResultColumnName,
  TREE_COLUMN_VALUE_SEPARATOR,
  type DataCubeOperationValue,
} from './DataCubeQueryEngine.js';
import type {
  DataCubeSnapshotAggregateColumn,
  DataCubeSnapshotFilter,
  DataCubeSnapshotFilterCondition,
  DataCubeSnapshotGroupBy,
  DataCubeSnapshotPivot,
} from './DataCubeSnapshot.js';
import type { DataCubeQueryFilterOperation } from './filter/DataCubeQueryFilterOperation.js';
import type { DataCubeEngine } from './DataCubeEngine.js';
import {
  _cols,
  _colSpec,
  _function,
  _lambda,
  _synthesizeMinimalSourceQuery,
} from './DataCubeQueryBuilderUtils.js';
import {
  INTERNAL__DataCubeSource,
  type DataCubeSource,
} from './model/DataCubeSource.js';
import type { DataCubeQueryAggregateOperation } from './aggregation/DataCubeQueryAggregateOperation.js';

// --------------------------------- UTILITIES ---------------------------------

export function _var(variable: V1_Variable) {
  assertTrue(
    variable.name === DEFAULT_LAMBDA_VARIABLE_NAME,
    `Can't process variable '${variable.name}': expected variable name to be '${DEFAULT_LAMBDA_VARIABLE_NAME}'`,
  );
}

export function _propertyCol(
  property: V1_AppliedProperty,
  columnGetter: (name: string) => DataCubeColumn,
) {
  assertTrue(
    property.parameters.length === 1,
    `Can't process property '${property.property}': expected exactly 1 parameter`,
  );
  const variable = guaranteeType(
    at(property.parameters, 0),
    V1_Variable,
    `Can't process property '${property.property}': failed to extract variable`,
  );
  _var(variable);
  return columnGetter(property.property);
}

export function _param<T extends V1_ValueSpecification>(
  func: V1_AppliedFunction,
  paramIdx: number,
  clazz: Clazz<T>,
  message?: string | undefined,
): T {
  assertTrue(
    func.parameters.length >= paramIdx + 1,
    `Can't process ${_name(func.function)}() expression: expected at least ${paramIdx + 1} parameter(s)`,
  );
  return guaranteeType(
    func.parameters[paramIdx],
    clazz,
    message ??
      `Can't process ${_name(func.function)}() expression: found unexpected type for parameter at index ${paramIdx}`,
  );
}

export function _colSpecParam(func: V1_AppliedFunction, paramIdx: number) {
  return guaranteeType(
    _param(func, paramIdx, V1_ClassInstance).value,
    V1_ColSpec,
    `Can't process ${_name(func.function)}() expression: expected parameter at index ${paramIdx} to be a column specification`,
  );
}

export function _colSpecArrayParam(func: V1_AppliedFunction, paramIdx: number) {
  return guaranteeType(
    _param(func, paramIdx, V1_ClassInstance).value,
    V1_ColSpecArray,
    `Can't process ${_name(func.function)}() expression: expected parameter at index ${paramIdx} to be a column specification list`,
  );
}

export function _genericTypeParam(func: V1_AppliedFunction, paramIdx: number) {
  return _param(
    func,
    paramIdx,
    V1_GenericTypeInstance,
    `Can't process ${_name(func.function)}: expected parameter at index ${paramIdx} to be a generic type instance`,
  );
}

export function _unwrapLambda(lambda: V1_Lambda, message?: string | undefined) {
  assertTrue(
    lambda.body.length === 1,
    `${message ?? `Can't process lambda`}: expected lambda body to have exactly 1 expression`,
  );
  assertTrue(
    lambda.parameters.length === 1,
    `${message ?? `Can't process lambda`}: expected lambda to have exactly 1 parameter`,
  );
  _var(at(lambda.parameters, 0));
  return at(lambda.body, 0);
}

export function _funcMatch(
  value: V1_ValueSpecification | undefined,
  functionNames: string | string[],
) {
  assertType(
    value,
    V1_AppliedFunction,
    `Can't process function: found unexpected value specification type`,
  );
  assertTrue(
    matchFunctionName(
      value.function,
      Array.isArray(functionNames) ? functionNames : [functionNames],
    ),
    `Can't process function: expected function to be one of [${uniq((Array.isArray(functionNames) ? functionNames : [functionNames]).map(_name)).join(', ')}]`,
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
  throw new UnsupportedOperationError(
    `Can't process unsupported operation primitive value`,
  );
}

export function _operationValue(
  value: V1_ValueSpecification | undefined,
  columnGetter: (name: string) => DataCubeColumn,
  columnChecker?: ((column: DataCubeColumn) => void) | undefined,
) {
  if (value instanceof V1_PrimitiveValueSpecification) {
    return _operationPrimitiveValue(value);
  } else if (value instanceof V1_AppliedProperty) {
    const column = _propertyCol(value, columnGetter);
    columnChecker?.(column);
    return {
      value: column.name,
      type: DataCubeOperationAdvancedValueType.COLUMN,
    };
  } else if (value === undefined) {
    return {
      type: DataCubeOperationAdvancedValueType.VOID,
    };
  }
  throw new UnsupportedOperationError(
    `Can't process unsupported operation value`,
  );
}

export function _checkDuplicateColumns(
  columns: DataCubeColumn[],
  message?: ((colName: string) => string) | undefined,
) {
  const cols = new Set<string>();
  columns.forEach((col) => {
    if (cols.has(col.name)) {
      throw new Error(
        message?.(col.name) ??
          `Can't process expression: found duplicate columns '${col.name}'`,
      );
    } else {
      cols.add(col.name);
    }
  });
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
  source?: DataCubeSource,
) {
  const colSpecs = funcs.map((extendFunc) => {
    // TODO: support extend() with window (OLAP), this assertion will no longer work
    const _colSpecs = _colSpecArrayParam(extendFunc, 0).colSpecs;
    assertTrue(
      _colSpecs.length === 1,
      `Can't process extend() expression: expected 1 column specification, got ${_colSpecs.length}`,
    );
    return at(_colSpecs, 0);
  });

  // get the types
  const sourceQuery = _synthesizeMinimalSourceQuery(currentColumns);
  const sequence = colSpecs.map((colSpec) =>
    _function(DataCubeFunction.EXTEND, [
      _cols([
        _colSpec(
          colSpec.name,
          guaranteeNonNullable(
            colSpec.function1,
            `Can't process extend() expression: expected a transformation function expression for column '${colSpec.name}'`,
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
        source ? source : new INTERNAL__DataCubeSource(),
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
      _findCol(columns, colSpec.name),
      `Can't process extend() expression: failed to retrieve type information for column '${colSpec.name}'`,
    ).type,
    mapFn: engine.serializeValueSpecification(
      guaranteeNonNullable(
        colSpec.function1,
        `Can't process extend() expression: expected a transformation function expression for column '${colSpec.name}'`,
      ),
    ),
    reduceFn: colSpec.function2
      ? engine.serializeValueSpecification(colSpec.function2)
      : undefined,
  }));
}

export function _filter(
  value: V1_ValueSpecification,
  columnGetter: (name: string) => DataCubeColumn,
  filterOperations: DataCubeQueryFilterOperation[],
): DataCubeSnapshotFilter {
  if (!(value instanceof V1_AppliedFunction)) {
    throw new Error(
      `Can't process filter() expression: expected a function expression`,
    );
  }

  const group: DataCubeSnapshotFilter = {
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
    `Can't process not() function: expected 1 parameter`,
  );
  return _param(func, 0, V1_AppliedFunction);
}

function _filterCondition(
  value: V1_ValueSpecification,
  columnGetter: (name: string) => DataCubeColumn,
  filterOperations: DataCubeQueryFilterOperation[],
): DataCubeSnapshotFilterCondition | DataCubeSnapshotFilter {
  if (!(value instanceof V1_AppliedFunction)) {
    throw new UnsupportedOperationError(
      `Can't process filter condition expression: expected a function expression`,
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

/**
 * Processes filter conditions of form: column | operator | value, e.g.
 * $x.Age > 5
 * $x.Name == 'abc'
 * $x.Name->startsWith('abc')
 * $x.Age > $x.Age2
 * $x.Name == $x.Name2
 */
export function _filterCondition_base(
  expression: V1_AppliedFunction | undefined,
  func: string,
  columnGetter: (name: string) => DataCubeColumn,
) {
  if (!expression) {
    return undefined;
  }
  try {
    if (matchFunctionName(expression.function, func)) {
      if (
        expression.parameters.length !== 2 &&
        expression.parameters.length !== 1
      ) {
        return undefined;
      }

      let column: DataCubeColumn | undefined;
      if (expression.parameters[0] instanceof V1_AppliedProperty) {
        column = _propertyCol(expression.parameters[0], columnGetter);
      }
      if (!column) {
        return undefined;
      }

      const value = _operationValue(
        expression.parameters[1],
        columnGetter,
        (_column) => {
          if (getDataType(column.type) !== getDataType(_column.type)) {
            throw new Error(
              `Can't process filter condition: found incompatible columns`,
            );
          }
        },
      );

      return {
        column,
        value,
      };
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/**
 * Processes filter conditions of form: column (case-insensitive) | operator | value (case-insensitive), e.g.
 * $x.Name->toLower() == 'abc'->toLower()
 * $x.Name->toLower() == $x.Name2->toLower()
 */
export function _filterCondition_caseSensitive(
  expression: V1_AppliedFunction | undefined,
  func: string,
  columnGetter: (name: string) => DataCubeColumn,
) {
  if (!expression) {
    return undefined;
  }
  try {
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
      let column: DataCubeColumn | undefined;
      if (param1.parameters[0] instanceof V1_AppliedProperty) {
        column = _propertyCol(param1.parameters[0], columnGetter);
      }
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
      const value = _operationValue(
        param2.parameters[0],
        columnGetter,
        (_column) => {
          if (getDataType(column.type) !== getDataType(_column.type)) {
            throw new Error(
              `Can't process filter condition: found incompatible columns`,
            );
          }
        },
      );

      return {
        column,
        value,
      };
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function _aggCol(
  colSpec: V1_ColSpec,
  columnGetter: (name: string) => DataCubeColumn,
  aggregateOperations: DataCubeQueryAggregateOperation[],
) {
  for (const operation of aggregateOperations) {
    const col = operation.buildAggregateColumnSnapshot(colSpec, columnGetter);
    if (col) {
      return col;
    }
  }
  throw new Error(
    `Can't process aggregate column '${colSpec.name}': no matching operator found`,
  );
}

export function _agg_base(
  colSpec: V1_ColSpec,
  func: string,
  columnGetter: (name: string) => DataCubeColumn,
) {
  try {
    if (colSpec.function1 && colSpec.function2) {
      const mapper = _unwrapLambda(colSpec.function1);
      const reducer = _unwrapLambda(colSpec.function2);

      if (
        mapper instanceof V1_AppliedProperty &&
        reducer instanceof V1_AppliedFunction &&
        reducer.parameters.length >= 1 &&
        matchFunctionName(reducer.function, func)
      ) {
        const column = _propertyCol(mapper, columnGetter);
        assertTrue(
          column.name === colSpec.name,
          `Can't process aggregate column: column name must match mapper column name`,
        );
        const variable = _param(reducer, 0, V1_Variable);
        _var(variable);

        return {
          column,
          paramterValues: reducer.parameters
            .slice(1)
            .map((value) => _operationValue(value, columnGetter)),
        };
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function _pivotSort(
  func: V1_AppliedFunction,
  pivotColumns: DataCubeColumn[],
  columnGetter: (name: string) => DataCubeColumn,
) {
  const sortColumns = _sort(func, columnGetter);
  const groupColumns = new Set(pivotColumns.map((col) => col.name));
  const columnsToSort = new Set(pivotColumns.map((col) => col.name));
  sortColumns.forEach((col) => {
    if (groupColumns.has(col.name)) {
      columnsToSort.delete(col.name);
    } else {
      throw new Error(
        `Can't process pivot() expression: sort column '${col.name}' must be a pivot column`,
      );
    }
  });
  if (columnsToSort.size !== 0) {
    throw new Error(
      `Can't process pivot() expression: found unsorted pivot column(s) (${Array.from(
        columnsToSort.values(),
      )
        .sort()
        .map((col) => `'${col}'`)
        .join(', ')})`,
    );
  }

  _checkDuplicateColumns(
    sortColumns,
    (colName) =>
      `Can't process pivot() expression: found duplicate sort columns '${colName}'`,
  );

  return sortColumns;
}

export function _validatePivot(
  pivot: DataCubeSnapshotPivot,
  pivotAggColumns: DataCubeSnapshotAggregateColumn[],
  availableColumns: DataCubeColumn[],
) {
  // check for duplicate columns
  const pivotColumns = pivot.columns;
  const castColumns = pivot.castColumns;
  _checkDuplicateColumns(
    pivotColumns,
    (colName) =>
      `Can't process pivot() expression: found duplicate pivot columns '${colName}'`,
  );
  _checkDuplicateColumns(
    pivotAggColumns,
    (colName) =>
      `Can't process pivot() expression: found duplicate aggregate columns '${colName}'`,
  );
  _checkDuplicateColumns(
    castColumns,
    (colName) =>
      `Can't process pivot() expression: found duplicate cast columns '${colName}'`,
  );

  // check pivot columns are not aggregated on
  pivotAggColumns.forEach((col) => {
    if (_findCol(pivotColumns, col.name)) {
      throw new Error(
        `Can't process pivot() expression: pivot column '${col.name}' must not be aggregated on`,
      );
    }
  });

  // check cast columns
  // NOTE: we cannot and should not do strict checks here as cast columns are dependent on the data

  // check that the columns used by pivot() as group columns are present in cast columns
  const pivotGroupColumns = availableColumns.filter(
    (col) =>
      !(
        _findCol(pivotColumns, col.name) ?? _findCol(pivotAggColumns, col.name)
      ),
  );
  pivotGroupColumns.forEach((col) => {
    if (!_findCol(castColumns, col.name)) {
      throw new Error(
        `Can't process pivot() expression: expected pivot group column '${col.name}' in cast columns`,
      );
    }
  });

  // check that columns used in pivot() should not show up in cast columns
  pivotColumns.forEach((col) => {
    if (_findCol(castColumns, col.name)) {
      throw new Error(
        `Can't process pivot() expression: expected pivot column '${col.name}' to not present in cast columns`,
      );
    }
  });
  pivotAggColumns.forEach((col) => {
    if (_findCol(castColumns, col.name)) {
      throw new Error(
        `Can't process pivot() expression: expected pivot aggregate column '${col.name}' to not present in cast columns`,
      );
    }
  });

  // check that cast column resulted from an aggregation (usually has name of form VAL1__|__COL1)
  // has a matching aggregate column (i.e. COL1)
  castColumns
    .filter((col) => isPivotResultColumnName(col.name))
    .forEach((col) => {
      const aggColName = getPivotResultColumnBaseColumnName(col.name);
      if (!_findCol(pivotAggColumns, aggColName)) {
        throw new Error(
          `Can't process pivot() expression: fail to match cast column '${col.name}' to a specified aggregate column`,
        );
      }
    });
}

export function _groupBySort(
  func: V1_AppliedFunction,
  groupByColumns: DataCubeColumn[],
  columnGetter: (name: string) => DataCubeColumn,
) {
  const sortColumns = _sort(func, columnGetter);
  const groupColumns = new Set(groupByColumns.map((col) => col.name));
  const columnsToSort = new Set(groupByColumns.map((col) => col.name));
  let sortDirection: DataCubeQuerySortDirection | undefined = undefined;
  sortColumns.forEach((col) => {
    if (groupColumns.has(col.name)) {
      columnsToSort.delete(col.name);
    } else {
      throw new Error(
        `Can't process groupBy() expression: sort column '${col.name}' must be a group column`,
      );
    }

    if (!sortDirection) {
      sortDirection = col.direction;
    } else if (col.direction !== sortDirection) {
      throw new Error(
        `Can't process groupBy() expression: all group columns must be sorted in the same direction`,
      );
    }
  });
  if (columnsToSort.size !== 0) {
    throw new Error(
      `Can't process groupBy() expression: found unsorted group column(s) (${Array.from(
        columnsToSort.values(),
      )
        .sort()
        .map((col) => `'${col}'`)
        .join(', ')})`,
    );
  }

  _checkDuplicateColumns(
    sortColumns,
    (colName) =>
      `Can't process groupBy() expression: found duplicate sort columns '${colName}'`,
  );

  return sortColumns;
}

export function _validateGroupBy(
  groupBy: DataCubeSnapshotGroupBy,
  groupByAggColumns: DataCubeSnapshotAggregateColumn[],
  pivot: DataCubeSnapshotPivot | undefined,
  pivotAggColumns: DataCubeSnapshotAggregateColumn[],
  availableColumns: DataCubeColumn[],
) {
  // check for duplicate columns
  const groupByColumns = groupBy.columns;
  _checkDuplicateColumns(
    groupByColumns,
    (colName) =>
      `Can't process groupBy() expression: found duplicate group columns '${colName}'`,
  );
  _checkDuplicateColumns(
    groupByAggColumns,
    (colName) =>
      `Can't process groupBy() expression: found duplicate aggregate columns '${colName}'`,
  );

  // check group columns are not aggregated on
  groupByAggColumns.forEach((col) => {
    if (_findCol(groupByColumns, col.name)) {
      throw new Error(
        `Can't process groupBy() expression: group column '${col.name}' must not be aggregated on`,
      );
    }
  });

  // check all available columns are either grouped on or aggregated on
  availableColumns.forEach((col) => {
    if (
      !(
        _findCol(groupByColumns, col.name) ??
        _findCol(groupByAggColumns, col.name)
      )
    ) {
      throw new Error(
        `Can't process groupBy() expression: column '${col.name}' is neither grouped nor aggregated on`,
      );
    }
  });

  // check against pivot if present
  if (pivot) {
    const aggCols = new Map<string, DataCubeSnapshotAggregateColumn>();

    // check if aggregation specification is consistent (i.e. same name, operator, parameterValues)
    // between groupBy aggregate columns
    // NOTE: we should not check type here as it can change dynamically due to aggregation, e.g.
    // an average aggregation on an integer-value column will result in a float-value column
    groupByAggColumns
      .filter((col) => isPivotResultColumnName(col.name))
      .forEach((col) => {
        const aggColName = getPivotResultColumnBaseColumnName(col.name);
        const aggCol = {
          ...col,
          name: aggColName,
        };

        const existingAggCol = aggCols.get(aggColName);

        if (!existingAggCol) {
          aggCols.set(aggColName, aggCol);
        } else if (
          // type should not be compared here as it can change dynamically due to aggregation
          !deepEqual(
            { ...existingAggCol, type: undefined },
            { ...aggCol, type: undefined },
          )
        ) {
          throw new Error(
            `Can't process groupBy() expression: found conflicting aggregation specification for column '${aggColName}'`,
          );
        }
      });

    // check if groupBy() aggregate columns are consistent with pivot() aggregate columns
    pivotAggColumns.forEach((pivotAggCol) => {
      const existingAggCol = aggCols.get(pivotAggCol.name);
      if (!existingAggCol) {
        throw new Error(
          `Can't process groupBy() expression: column '${pivotAggCol.name}' is aggregated in pivot() expression but not in groupBy() expression`,
        );
      }

      if (
        // type should not be compared here as it can change dynamically due to aggregation
        !deepEqual(
          { ...existingAggCol, type: undefined },
          { ...pivotAggCol, type: undefined },
        )
      ) {
        throw new Error(
          `Can't process groupBy() expression: found conflicting aggregation specification for column '${pivotAggCol.name}'`,
        );
      }
    });
  }
}

export function _sort(
  func: V1_AppliedFunction,
  columnGetter: (name: string) => DataCubeColumn,
) {
  return _param(
    func,
    0,
    V1_Collection,
    `Can't process sort() expression: expected parameter at index 0 to be a collection`,
  ).values.map((value) => {
    const sortColFunc = _funcMatch(value, [
      DataCubeFunction.ASCENDING,
      DataCubeFunction.DESCENDING,
    ]);
    return {
      ...columnGetter(_colSpecParam(sortColFunc, 0).name),
      direction: matchFunctionName(
        sortColFunc.function,
        DataCubeFunction.ASCENDING,
      )
        ? DataCubeQuerySortDirection.ASCENDING
        : DataCubeQuerySortDirection.DESCENDING,
    };
  });
}

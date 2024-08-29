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
 * These are utilities used to build the executable query from the query snapshot.
 * The executable query is then used to fetch data.
 ***************************************************************************************/

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
  V1_ClassInstanceType,
  V1_ColSpec,
  V1_ColSpecArray,
  V1_Collection,
  V1_Lambda,
  V1_Multiplicity,
  V1_PackageableElementPtr,
  type V1_PrimitiveValueSpecification,
  V1_Variable,
  V1_deserializeValueSpecification,
  extractElementNameFromPath as _functionName,
  type V1_ValueSpecification,
} from '@finos/legend-graph';
import {
  type DataCubeQuerySnapshotFilterCondition,
  type DataCubeQuerySnapshotFilter,
  _findCol,
  type DataCubeQuerySnapshotColumn,
  type DataCubeQuerySnapshotAggregateColumn,
} from './DataCubeQuerySnapshot.js';
import {
  guaranteeNonNullable,
  guaranteeIsString,
  guaranteeIsBoolean,
  guaranteeIsNumber,
  UnsupportedOperationError,
  guaranteeType,
  type PlainObject,
} from '@finos/legend-shared';
import {
  DataCubeFunction,
  DEFAULT_LAMBDA_VARIABLE_NAME,
  INTERNAL__FILLER_COUNT_AGG_COLUMN_NAME,
  DataCubeQueryFilterGroupOperator,
  DataCubeAggregateOperator,
  type DataCubeOperationValue,
  DataCubeOperationAdvancedValueType,
} from './DataCubeQueryEngine.js';
import type { DataCubeQueryFilterOperation } from './filter/DataCubeQueryFilterOperation.js';

// --------------------------------- UTILITIES ---------------------------------

export function _deserializeToLambda(json: PlainObject<V1_Lambda>) {
  return guaranteeType(V1_deserializeValueSpecification(json, []), V1_Lambda);
}

export function _var(name?: string | undefined) {
  const variable = new V1_Variable();
  variable.name = name ?? DEFAULT_LAMBDA_VARIABLE_NAME;
  return variable;
}

export function _property(name: string, variable?: V1_Variable | undefined) {
  const property = new V1_AppliedProperty();
  property.property = name;
  property.parameters.push(variable ?? _var());
  return property;
}

export function _lambda(
  parameters: V1_Variable[],
  body: V1_ValueSpecification[],
) {
  const lambda = new V1_Lambda();
  lambda.parameters = parameters;
  lambda.body = body;
  return lambda;
}

export { _functionName };
export function _function(
  functionName: string,
  parameters: V1_ValueSpecification[],
) {
  const func = new V1_AppliedFunction();
  func.function = functionName;
  func.parameters = parameters;
  return func;
}

export function _collection(values: V1_ValueSpecification[]) {
  const collection = new V1_Collection();
  collection.multiplicity = new V1_Multiplicity(values.length, values.length);
  collection.values = values;
  return collection;
}

export function _primitiveValue(type: string, value: unknown) {
  const _val = <T extends V1_PrimitiveValueSpecification & { value: unknown }>(
    primitiveValue: T,
    val: unknown,
  ): T => {
    primitiveValue.value = val;
    return primitiveValue;
  };
  switch (type) {
    case PRIMITIVE_TYPE.STRING:
      return _val(new V1_CString(), guaranteeIsString(value));
    case PRIMITIVE_TYPE.BOOLEAN:
      return _val(new V1_CBoolean(), guaranteeIsBoolean(value));
    case PRIMITIVE_TYPE.NUMBER:
    case PRIMITIVE_TYPE.DECIMAL:
      return _val(new V1_CDecimal(), guaranteeIsNumber(value));
    case PRIMITIVE_TYPE.INTEGER:
      return _val(new V1_CInteger(), guaranteeIsNumber(value));
    case PRIMITIVE_TYPE.FLOAT:
      return _val(new V1_CFloat(), guaranteeIsNumber(value));
    case PRIMITIVE_TYPE.DATE:
    case PRIMITIVE_TYPE.STRICTDATE:
      return _val(new V1_CStrictDate(), guaranteeIsString(value));
    case PRIMITIVE_TYPE.DATETIME:
      return _val(new V1_CDateTime(), guaranteeIsString(value));
    case PRIMITIVE_TYPE.STRICTTIME:
      return _val(new V1_CStrictTime(), guaranteeIsString(value));
    default:
      throw new UnsupportedOperationError(`Unsupported value type '${type}'`);
  }
}

export function _elementPtr(fullPath: string) {
  const ptr = new V1_PackageableElementPtr();
  ptr.fullPath = fullPath;
  return ptr;
}

function _classInstance(type: string, value: unknown) {
  const instance = new V1_ClassInstance();
  instance.type = type;
  instance.value = value;
  return instance;
}

export function _colSpec(
  name: string,
  function1?: V1_Lambda | undefined,
  function2?: V1_Lambda | undefined,
) {
  const colSpec = new V1_ColSpec();
  colSpec.name = name;
  colSpec.function1 = function1;
  colSpec.function2 = function2;
  return colSpec;
}

export function _value(
  value: DataCubeOperationValue,
  variable?: V1_Variable | undefined,
) {
  switch (value.type) {
    case PRIMITIVE_TYPE.STRING:
    case PRIMITIVE_TYPE.BOOLEAN:
    case PRIMITIVE_TYPE.NUMBER:
    case PRIMITIVE_TYPE.DECIMAL:
    case PRIMITIVE_TYPE.INTEGER:
    case PRIMITIVE_TYPE.FLOAT:
    case PRIMITIVE_TYPE.DATE:
    case PRIMITIVE_TYPE.DATETIME:
    case PRIMITIVE_TYPE.STRICTDATE:
    case PRIMITIVE_TYPE.STRICTTIME: {
      if (Array.isArray(value.value)) {
        return _collection(
          value.value.map((val) => _primitiveValue(value.type, val)),
        );
      }
      return _primitiveValue(value.type, value.value);
    }
    case DataCubeOperationAdvancedValueType.COLUMN:
      return _property(guaranteeIsString(value.value), variable);
    default:
      throw new UnsupportedOperationError(
        `Unsupported value type '${value.type}'`,
      );
  }
}

function _aggFunctionName(operation: string) {
  switch (operation) {
    case DataCubeAggregateOperator.SUM:
      return DataCubeFunction.SUM;
    case DataCubeAggregateOperator.AVERAGE:
      return DataCubeFunction.AVERAGE;
    case DataCubeAggregateOperator.COUNT:
      return DataCubeFunction.COUNT;
    case DataCubeAggregateOperator.MIN:
      return DataCubeFunction.MIN;
    case DataCubeAggregateOperator.MAX:
      return DataCubeFunction.MAX;
    case DataCubeAggregateOperator.FIRST:
      return DataCubeFunction.FIRST;
    case DataCubeAggregateOperator.LAST:
      return DataCubeFunction.LAST;
    case DataCubeAggregateOperator.VAR_POP:
      return DataCubeFunction.VAR_POP;
    case DataCubeAggregateOperator.VAR_SAMP:
      return DataCubeFunction.VAR_SAMP;
    case DataCubeAggregateOperator.STDDEV_POP:
      return DataCubeFunction.STDDEV_POP;
    case DataCubeAggregateOperator.STDDEV_SAMP:
      return DataCubeFunction.STDDEV_SAMP;
    default:
      throw new UnsupportedOperationError(
        `Unsupported aggregate operation '${operation}'`,
      );
  }
}

function _agg(
  agg: DataCubeQuerySnapshotAggregateColumn,
  variable?: V1_Variable | undefined,
) {
  const parameters = agg.parameters.map((param) => _value(param));
  return _function(_aggFunctionName(agg.operation), [
    variable ?? _var(),
    ...parameters,
  ]);
}

export function _not(fn: V1_AppliedFunction) {
  return _function(DataCubeFunction.NOT, [fn]);
}

// --------------------------------- BUILDING BLOCKS ---------------------------------

export function _col(
  name: string,
  function1?: V1_Lambda | undefined,
  function2?: V1_Lambda | undefined,
) {
  return _classInstance(
    V1_ClassInstanceType.COL_SPEC,
    _colSpec(name, function1, function2),
  );
}

export function _cols(colSpecs: V1_ColSpec[]) {
  const colSpecArray = new V1_ColSpecArray();
  colSpecArray.colSpecs = colSpecs;
  return _classInstance(V1_ClassInstanceType.COL_SPEC_ARRAY, colSpecArray);
}

export function _groupByAggCols(
  columns: DataCubeQuerySnapshotAggregateColumn[],
) {
  const variable = _var();
  return columns.length
    ? columns.map((agg) =>
        _colSpec(
          agg.name,
          _lambda([variable], [_property(agg.name, variable)]),
          _lambda([variable], [_agg(agg)]),
        ),
      )
    : // if no aggregates are specified, add a dummy count() aggregate to satisfy compiler
      [
        _colSpec(
          INTERNAL__FILLER_COUNT_AGG_COLUMN_NAME,
          _lambda([variable], [variable]),
          _lambda([variable], [_function(DataCubeFunction.COUNT, [variable])]),
        ),
      ];
}

export function _filter(
  filter: DataCubeQuerySnapshotFilter | DataCubeQuerySnapshotFilterCondition,
  filterOperations: DataCubeQueryFilterOperation[],
) {
  if ('groupOperator' in filter) {
    const filterGroup = filter;
    const groupOperation =
      filterGroup.groupOperator === DataCubeQueryFilterGroupOperator.AND
        ? DataCubeFunction.AND
        : DataCubeFunction.OR;
    let conditions: V1_AppliedFunction[] = [];
    filterGroup.conditions.forEach((condition) => {
      conditions.push(_filter(condition, filterOperations));
      // NOTE: a group operation (and/or) function can only have 2 parameters, so we
      // have to breakdown the group operation into nested group functions
      if (conditions.length === 2) {
        conditions = [_function(groupOperation, conditions)];
      }
    });
    const groupCondition = guaranteeNonNullable(conditions[0]);
    return filterGroup.not ? _not(groupCondition) : groupCondition;
  } else {
    const filterCondition = filter;
    const operation = filterOperations.find(
      (op) => op.operator === filterCondition.operation,
    );
    const condition = operation?.buildConditionExpression(filterCondition);
    if (!condition) {
      throw new UnsupportedOperationError(
        `Unsupported filter operation '${filterCondition.operation}'`,
      );
    }
    return filterCondition.not ? _not(condition) : condition;
  }
}

export function _groupByExtend(
  columns: DataCubeQuerySnapshotColumn[],
  columnsUsedInGroupBy: DataCubeQuerySnapshotColumn[],
) {
  const missingCols = columns.filter(
    (col) => !_findCol(columnsUsedInGroupBy, col.name),
  );
  return missingCols.length
    ? _function(_functionName(DataCubeFunction.EXTEND), [
        _cols(
          missingCols.map((col) =>
            _colSpec(
              col.name,
              _lambda([_var()], [_primitiveValue(PRIMITIVE_TYPE.STRING, '')]),
            ),
          ),
        ),
      ])
    : undefined;
}

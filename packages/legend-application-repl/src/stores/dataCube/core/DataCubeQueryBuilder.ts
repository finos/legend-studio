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
  extractElementNameFromPath as _name,
  type V1_ValueSpecification,
} from '@finos/legend-graph';
import {
  type DataCubeQuerySnapshotFilterCondition,
  type DataCubeQuerySnapshotFilter,
  type DataCubeQuerySnapshot,
  DataCubeQuerySnapshotSortOperation,
  DataCubeQuerySnapshotFilterOperation,
  DataCubeQueryFilterGroupOperation,
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
  type DataCubeQueryFunctionMap,
} from './DataCubeQueryEngine.js';

// --------------------------------- UTILITIES ---------------------------------

function _deserializeToLambda(json: PlainObject<V1_Lambda>) {
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

export function _function(
  functionName: string,
  parameters: V1_ValueSpecification[],
) {
  const func = new V1_AppliedFunction();
  func.function = functionName;
  func.parameters = parameters;
  return func;
}

function _collection(values: V1_ValueSpecification[]) {
  const collection = new V1_Collection();
  collection.multiplicity = new V1_Multiplicity(values.length, values.length);
  collection.values = values;
  return collection;
}

export function _value(
  type: string,
  value: unknown,
): V1_PrimitiveValueSpecification {
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
    case PRIMITIVE_TYPE.DATETIME:
      return _val(new V1_CDateTime(), guaranteeIsString(value));
    case PRIMITIVE_TYPE.STRICTDATE:
      return _val(new V1_CStrictDate(), guaranteeIsString(value));
    case PRIMITIVE_TYPE.STRICTTIME:
      return _val(new V1_CStrictTime(), guaranteeIsString(value));
    default:
      throw new UnsupportedOperationError(`Unsupported column type '${type}'`);
  }
}

function _elementPtr(fullPath: string) {
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

export function _aggCols(
  columns: DataCubeQuerySnapshotAggregateColumn[],
): V1_ColSpec[] {
  const variable = _var();
  return columns.length
    ? columns.map((agg) =>
        _colSpec(
          agg.name,
          _lambda([variable], [_property(agg.name, variable)]),
          _lambda([variable], [_function(agg.function, [variable])]),
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
): V1_ValueSpecification {
  if ('groupOperation' in filter) {
    const group = filter;
    const groupOperation =
      group.groupOperation === DataCubeQueryFilterGroupOperation.AND
        ? DataCubeFunction.AND
        : DataCubeFunction.OR;
    let conditions: V1_ValueSpecification[] = [];
    group.conditions.forEach((condition) => {
      conditions.push(_filter(condition));
      // NOTE: a group operation (and/or) function can only have 2 parameters, so we
      // have to breakdown the group operation into nested group functions
      if (conditions.length === 2) {
        conditions = [_function(groupOperation, conditions)];
      }
    });
    return guaranteeNonNullable(conditions[0]);
  } else {
    const condition = filter;
    const property = _property(condition.name);
    const _cond = (fn: string, ...p: V1_ValueSpecification[]) =>
      _function(_name(fn), [property, ...p]);
    const _val = () => _value(condition.type, condition.value);
    const _not = (fn: V1_AppliedFunction) =>
      _function(_name(DataCubeFunction.NOT), [fn]);
    switch (condition.operation) {
      case DataCubeQuerySnapshotFilterOperation.EQUAL:
        return _cond(DataCubeFunction.EQUAL, _val());
      case DataCubeQuerySnapshotFilterOperation.GREATER_THAN:
        return _cond(DataCubeFunction.GREATER_THAN, _val());
      case DataCubeQuerySnapshotFilterOperation.GREATER_THAN_OR_EQUAL:
        return _cond(DataCubeFunction.GREATER_THAN_EQUAL, _val());
      case DataCubeQuerySnapshotFilterOperation.LESS_THAN:
        return _cond(DataCubeFunction.LESS_THAN, _val());
      case DataCubeQuerySnapshotFilterOperation.LESS_THAN_OR_EQUAL:
        return _cond(DataCubeFunction.LESS_THAN_EQUAL, _val());
      case DataCubeQuerySnapshotFilterOperation.CONTAINS:
        return _cond(DataCubeFunction.CONTAINS, _val());
      case DataCubeQuerySnapshotFilterOperation.ENDS_WITH:
        return _cond(DataCubeFunction.ENDS_WITH, _val());
      case DataCubeQuerySnapshotFilterOperation.STARTS_WITH:
        return _cond(DataCubeFunction.STARTS_WITH, _val());
      case DataCubeQuerySnapshotFilterOperation.BLANK:
        return _cond(DataCubeFunction.IS_EMPTY);
      case DataCubeQuerySnapshotFilterOperation.NOT_EQUAL:
        return _not(_cond(DataCubeFunction.EQUAL, _val()));
      case DataCubeQuerySnapshotFilterOperation.NOT_BLANK:
        return _not(_cond(DataCubeFunction.IS_EMPTY));
      case DataCubeQuerySnapshotFilterOperation.NOT_CONTAINS:
        return _not(_cond(DataCubeFunction.CONTAINS, _val()));
      default:
        throw new UnsupportedOperationError(
          `Unsupported filter operation '${condition.operation}'`,
        );
    }
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
    ? _function(_name(DataCubeFunction.EXTEND), [
        _cols(
          missingCols.map((col) =>
            _colSpec(
              col.name,
              _lambda([_var()], [_value(PRIMITIVE_TYPE.STRING, '')]),
            ),
          ),
        ),
      ])
    : undefined;
}

// --------------------------------- MAIN ---------------------------------

export function buildExecutableQuery(
  snapshot: DataCubeQuerySnapshot,
  options?: {
    postProcessor?: (
      snapshot: DataCubeQuerySnapshot,
      sequence: V1_AppliedFunction[],
      funcMap: DataCubeQueryFunctionMap,
    ) => void;
    pagination?:
      | {
          start: number;
          end: number;
        }
      | undefined;
  },
): V1_ValueSpecification {
  const data = snapshot.data;
  const sourceQuery = V1_deserializeValueSpecification(data.sourceQuery, []);
  const sequence: V1_AppliedFunction[] = [];
  const funcMap: DataCubeQueryFunctionMap = {};
  const _process = (
    funcMapKey: keyof DataCubeQueryFunctionMap,
    func: V1_AppliedFunction,
  ) => {
    sequence.push(func);
    funcMap[funcMapKey] = func;
  };

  // --------------------------------- LEAF EXTEND ---------------------------------

  if (data.leafExtendedColumns.length) {
    _process(
      'leafExtend',
      _function(_name(DataCubeFunction.EXTEND), [
        _cols(
          data.leafExtendedColumns.map((col) =>
            _colSpec(col.name, _deserializeToLambda(col.lambda)),
          ),
        ),
      ]),
    );
  }

  // --------------------------------- SELECT ---------------------------------

  if (data.selectColumns.length) {
    _process(
      'select',
      _function(_name(DataCubeFunction.SELECT), [
        _cols(data.selectColumns.map((col) => _colSpec(col.name))),
      ]),
    );
  }

  // --------------------------------- FILTER ---------------------------------

  if (data.filter) {
    _process(
      'filter',
      _function(_name(DataCubeFunction.FILTER), [
        _lambda([_var()], [_filter(data.filter)]),
      ]),
    );
  }

  // --------------------------------- GROUP BY ---------------------------------

  if (data.groupBy) {
    const groupBy = data.groupBy;
    _process(
      'groupBy',
      _function(_name(DataCubeFunction.GROUP_BY), [
        _cols(groupBy.columns.map((col) => _colSpec(col.name))),
        _cols(_aggCols(groupBy.aggColumns)),
      ]),
    );

    // extend columns to maintain the same set of columns prior to groupBy()
    const groupByExtend = _groupByExtend(snapshot.stageCols('aggregation'), [
      ...groupBy.columns,
      ...groupBy.aggColumns,
    ]);
    if (groupByExtend) {
      _process('groupByExtend', groupByExtend);
    }
  }

  // --------------------------------- PIVOT ---------------------------------
  // TODO: @akphi - implement this and CAST

  // --------------------------------- GROUP EXTEND ---------------------------------

  if (data.groupExtendedColumns.length) {
    _process(
      'groupExtend',
      _function(_name(DataCubeFunction.EXTEND), [
        _cols(
          data.groupExtendedColumns.map((col) =>
            _colSpec(col.name, _deserializeToLambda(col.lambda)),
          ),
        ),
      ]),
    );
  }

  // --------------------------------- SORT ---------------------------------

  if (data.sortColumns.length) {
    _process(
      'sort',
      _function(_name(DataCubeFunction.SORT), [
        _collection(
          data.sortColumns.map((col) =>
            _function(
              _name(
                col.operation === DataCubeQuerySnapshotSortOperation.ASCENDING
                  ? DataCubeFunction.ASC
                  : DataCubeFunction.DESC,
              ),
              [_col(col.name)],
            ),
          ),
        ),
      ]),
    );
  }

  // --------------------------------- LIMIT ---------------------------------

  if (data.limit) {
    _process(
      'limit',
      _function(_name(DataCubeFunction.LIMIT), [
        _value(PRIMITIVE_TYPE.INTEGER, data.limit),
      ]),
    );
  }

  // --------------------------------- SLICE ---------------------------------

  if (options?.pagination) {
    sequence.push(
      _function(_name(DataCubeFunction.SLICE), [
        _value(PRIMITIVE_TYPE.INTEGER, options.pagination.start),
        _value(PRIMITIVE_TYPE.INTEGER, options.pagination.end),
      ]),
    );
  }

  // --------------------------------- FROM ---------------------------------

  sequence.push(
    _function(_name(DataCubeFunction.FROM), [_elementPtr(data.runtime)]),
  );

  // --------------------------------- FINALIZE ---------------------------------

  options?.postProcessor?.(snapshot, sequence, funcMap);

  if (!sequence.length) {
    return sourceQuery;
  }
  for (let i = 0; i < sequence.length; i++) {
    guaranteeNonNullable(sequence[i]).parameters.unshift(
      i === 0 ? sourceQuery : guaranteeNonNullable(sequence[i - 1]),
    );
  }
  return guaranteeNonNullable(sequence[sequence.length - 1]);
}

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
  extractElementNameFromPath,
  type V1_ValueSpecification,
  extractPackagePathFromPath,
  CORE_PURE_PATH,
  V1_GenericTypeInstance,
} from '@finos/legend-graph';
import {
  type DataCubeQuerySnapshotFilterCondition,
  type DataCubeQuerySnapshotFilter,
  type DataCubeQuerySnapshot,
} from './DataCubeQuerySnapshot.js';
import { type DataCubeColumn } from './models/DataCubeColumn.js';
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
  DataCubeQueryFilterGroupOperator,
  type DataCubeOperationValue,
  DataCubeOperationAdvancedValueType,
  DataCubeColumnKind,
  type DataCubeQueryFunctionMap,
  isPivotResultColumnName,
  getPivotResultColumnBaseColumnName,
  DEFAULT_ROOT_AGGREGATION_COLUMN_VALUE,
} from './DataCubeQueryEngine.js';
import type { DataCubeQueryFilterOperation } from './filter/DataCubeQueryFilterOperation.js';
import type { DataCubeQueryAggregateOperation } from './aggregation/DataCubeQueryAggregateOperation.js';
import {
  DataCubeColumnConfiguration,
  type DataCubeConfiguration,
} from './models/DataCubeConfiguration.js';

// --------------------------------- UTILITIES ---------------------------------

export function _functionCompositionProcessor(
  sequence: V1_AppliedFunction[],
  funcMap: DataCubeQueryFunctionMap,
) {
  return (key: keyof DataCubeQueryFunctionMap, func: V1_AppliedFunction) => {
    sequence.push(func);
    funcMap[key] = func;
  };
}

export function _functionCompositionUnProcessor(
  sequence: V1_AppliedFunction[],
  funcMap: DataCubeQueryFunctionMap,
) {
  return (key: keyof DataCubeQueryFunctionMap) => {
    const func = funcMap[key];
    if (func) {
      sequence.splice(sequence.indexOf(func), 1);
      funcMap[key] = undefined;
    }
  };
}

export function _deserializeLambda(json: PlainObject<V1_Lambda>) {
  return guaranteeType(V1_deserializeValueSpecification(json, []), V1_Lambda);
}

export function _deserializeFunction(json: PlainObject<V1_Lambda>) {
  return guaranteeType(
    V1_deserializeValueSpecification(json, []),
    V1_AppliedFunction,
  );
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

// NOTE: the list of auto-import are kept in `m3.pure` file in `finos/legend-pure`,
// this includes a more extensive list of packges which contain native functions, classes, etc.
// See https://github.com/finos/legend-pure/blob/master/legend-pure-core/legend-pure-m3-core/src/main/resources/platform/pure/grammar/m3.pure
const PURE_AUTO_IMPORT_PACKAGE_PATHS = [
  'meta::pure::metamodel',
  'meta::pure::metamodel::type',
  'meta::pure::metamodel::type::generics',
  'meta::pure::metamodel::relationship',
  'meta::pure::metamodel::valuespecification',
  'meta::pure::metamodel::multiplicity',
  'meta::pure::metamodel::function',
  'meta::pure::metamodel::function::property',
  'meta::pure::metamodel::extension',
  'meta::pure::metamodel::import',
  'meta::pure::functions::date',
  'meta::pure::functions::string',
  'meta::pure::functions::collection',
  'meta::pure::functions::meta',
  'meta::pure::functions::constraints',
  'meta::pure::functions::lang',
  'meta::pure::functions::boolean',
  'meta::pure::functions::tools',
  'meta::pure::functions::relation',
  'meta::pure::functions::io',
  'meta::pure::functions::math',
  'meta::pure::functions::asserts',
  'meta::pure::functions::test',
  'meta::pure::functions::multiplicity',
  'meta::pure::router',
  'meta::pure::service',
  'meta::pure::tds',
  'meta::pure::tools',
  'meta::pure::profiles',
];

export function _functionName(funcNameOrPath: string) {
  const funcPakagePath = extractPackagePathFromPath(funcNameOrPath);
  if (
    funcPakagePath &&
    PURE_AUTO_IMPORT_PACKAGE_PATHS.includes(funcPakagePath)
  ) {
    return extractElementNameFromPath(funcNameOrPath);
  }
  return funcNameOrPath;
}

export function _function(
  functionName: string,
  parameters: V1_ValueSpecification[],
) {
  const func = new V1_AppliedFunction();
  func.function = _functionName(functionName);
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
  type?: string | undefined,
) {
  const colSpec = new V1_ColSpec();
  colSpec.name = name;
  colSpec.function1 = function1;
  colSpec.function2 = function2;
  colSpec.type = type;
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

export function _not(fn: V1_AppliedFunction) {
  return _function(_functionName(DataCubeFunction.NOT), [fn]);
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

// NOTE: this is the column name used for the dummy count() aggregate
// when no aggregate is specified in groupBy() or pivot()
const INTERNAL__FILLER_COUNT_AGG_COLUMN_NAME =
  'INTERNAL__filler_count_agg_column';
// if no aggregates are specified, add a dummy count() aggregate to satisfy compiler
function fixEmptyAggCols(aggCols: V1_ColSpec[]) {
  const variable = _var();
  return aggCols.length
    ? aggCols
    : [
        _colSpec(
          INTERNAL__FILLER_COUNT_AGG_COLUMN_NAME,
          _lambda([variable], [variable]),
          _lambda([variable], [_function(DataCubeFunction.COUNT, [variable])]),
        ),
      ];
}

export function _aggCol_basic(column: DataCubeColumn, func: string) {
  const variable = _var();
  return _colSpec(
    column.name,
    _lambda([variable], [_property(column.name, variable)]),
    _lambda([variable], [_function(_functionName(func), [variable])]),
  );
}

export function _pivotAggCols(
  pivotColumns: DataCubeColumn[],
  snapshot: DataCubeQuerySnapshot,
  configuration: DataCubeConfiguration,
  aggregateOperations: DataCubeQueryAggregateOperation[],
) {
  const aggColumns = configuration.columns.filter(
    (column) =>
      column.isSelected &&
      // unlike groupBy, pivot aggreation on dimension columns (e.g. unique values aggregator)
      // are not helpful and therefore excluded
      column.kind === DataCubeColumnKind.MEASURE &&
      !pivotColumns.find((col) => col.name === column.name) &&
      !column.excludedFromPivot &&
      !snapshot.data.groupExtendedColumns.find(
        (col) => col.name === column.name,
      ),
  );
  return fixEmptyAggCols(
    aggColumns.map((agg) => {
      const operation = aggregateOperations.find(
        (op) => op.operator === agg.aggregateOperator,
      );
      const aggCol = operation?.buildAggregateColumn(agg);
      if (!aggCol) {
        throw new UnsupportedOperationError(
          `Unsupported aggregate operation '${agg.aggregateOperator}'`,
        );
      }
      return aggCol;
    }),
  );
}

export function _castCols(columns: DataCubeColumn[]) {
  const genericType = new V1_GenericTypeInstance();
  genericType.fullPath = CORE_PURE_PATH.RELATION;
  genericType.typeArguments = [
    _cols(
      columns.map((col) => _colSpec(col.name, undefined, undefined, col.type)),
    ),
  ];
  return genericType;
}

export function _groupByAggCols(
  groupByColumns: DataCubeColumn[],
  snapshot: DataCubeQuerySnapshot,
  configuration: DataCubeConfiguration,
  aggregateOperations: DataCubeQueryAggregateOperation[],
) {
  const pivot = snapshot.data.pivot;

  if (!pivot) {
    // NOTE: reference off column configuration so we follow the order of columns
    // established in columns selector
    const aggColumns = configuration.columns.filter(
      (column) =>
        column.isSelected &&
        !groupByColumns.find((col) => col.name === column.name) &&
        !snapshot.data.groupExtendedColumns.find(
          (col) => col.name === column.name,
        ),
    );
    return fixEmptyAggCols(
      aggColumns.map((agg) => {
        const operation = aggregateOperations.find(
          (op) => op.operator === agg.aggregateOperator,
        );
        const aggCol = operation?.buildAggregateColumn(agg);
        if (!aggCol) {
          throw new UnsupportedOperationError(
            `Unsupported aggregate operation '${agg.aggregateOperator}'`,
          );
        }
        return aggCol;
      }),
    );
  }

  const pivotResultColumns = pivot.castColumns.filter((col) =>
    isPivotResultColumnName(col.name),
  );
  const pivotGroupByColumns = pivot.castColumns.filter(
    (col) => !isPivotResultColumnName(col.name),
  );
  return fixEmptyAggCols([
    // for pivot result columns, resolve the base aggregate column to get aggregate configuration
    ...pivotResultColumns
      .map((column) => {
        const baseAggColName = getPivotResultColumnBaseColumnName(column.name);
        return {
          ...column,
          matchingColumnConfiguration: configuration.columns.find(
            (col) => col.name === baseAggColName,
          ),
        };
      })
      .filter((column) => column.matchingColumnConfiguration)
      .map((column) => {
        const columnConfiguration =
          DataCubeColumnConfiguration.serialization.fromJson(
            guaranteeNonNullable(
              column.matchingColumnConfiguration,
            ).serialize(),
          );
        columnConfiguration.name = column.name;
        const operation = aggregateOperations.find(
          (op) => op.operator === columnConfiguration.aggregateOperator,
        );
        const aggCol = operation?.buildAggregateColumn(columnConfiguration);
        if (!aggCol) {
          throw new UnsupportedOperationError(
            `Unsupported aggregate operation '${columnConfiguration.aggregateOperator}'`,
          );
        }
        return aggCol;
      }),
    // these are the columns which are available for groupBy but not selected for groupBy
    // operation, they would be aggregated as well
    ...pivotGroupByColumns
      .filter(
        (column) => !groupByColumns.find((col) => col.name === column.name),
      )
      .map((column) => {
        const columnConfiguration = guaranteeNonNullable(
          configuration.columns.find((col) => col.name === column.name),
        );
        const operation = aggregateOperations.find(
          (op) => op.operator === columnConfiguration.aggregateOperator,
        );
        const aggCol = operation?.buildAggregateColumn(columnConfiguration);
        if (!aggCol) {
          throw new UnsupportedOperationError(
            `Unsupported aggregate operation '${columnConfiguration.aggregateOperator}'`,
          );
        }
        return aggCol;
      }),
  ]);
}

export function _extendRootAggregation(columnName: string) {
  return _function(DataCubeFunction.EXTEND, [
    _col(
      columnName,
      _lambda(
        [_var()],
        [
          _primitiveValue(
            PRIMITIVE_TYPE.STRING,
            DEFAULT_ROOT_AGGREGATION_COLUMN_VALUE,
          ),
        ],
      ),
    ),
  ]);
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
      (op) => op.operator === filterCondition.operator,
    );
    const condition = operation?.buildConditionExpression(filterCondition);
    if (!condition) {
      throw new UnsupportedOperationError(
        `Unsupported filter operation '${filterCondition.operator}'`,
      );
    }
    return filterCondition.not ? _not(condition) : condition;
  }
}

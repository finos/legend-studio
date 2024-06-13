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
} from '@finos/legend-graph';
import type {
  DataCubeQueryFilterCondition,
  DataCubeQueryFilter,
  DataCubeQuerySnapshot,
} from './DataCubeQuerySnapshot.js';
import {
  guaranteeNonNullable,
  guaranteeIsString,
  guaranteeIsBoolean,
  guaranteeIsNumber,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import {
  DATA_CUBE_AGGREGATE_FUNCTION,
  DATA_CUBE_COLUMN_SORT_DIRECTION,
  DATA_CUBE_FILTER_OPERATION,
  DATA_CUBE_FUNCTIONS,
  DEFAULT_LAMBDA_VARIABLE_NAME,
} from '../DataCubeMetaModelConst.js';

function createColSpec(
  name: string,
  type?: string | undefined,
  function1?: V1_Lambda | undefined,
  function2?: V1_Lambda | undefined,
): V1_ClassInstance {
  const instance = new V1_ClassInstance();
  instance.type = V1_ClassInstanceType.COL_SPEC;
  const colSpec = new V1_ColSpec();
  colSpec.name = name;
  colSpec.type = type;
  colSpec.function1 = function1;
  colSpec.function2 = function2;
  instance.value = colSpec;
  return instance;
}

function getAggregationColSpec(
  column: string,
  functionName: string,
  columnType: string,
  // Temporary. Remove it when we support groupBy with empty aggregations
  columnName?: string,
): V1_ColSpec {
  const colSpec = new V1_ColSpec();
  const aggLambda = new V1_Lambda();
  const property = new V1_AppliedProperty();
  property.property = column;
  property.class = columnType;
  const defaultVariable = new V1_Variable();
  defaultVariable.name = DEFAULT_LAMBDA_VARIABLE_NAME;
  property.parameters = [defaultVariable];
  aggLambda.body.push(property);
  aggLambda.parameters.push(defaultVariable);
  colSpec.function1 = aggLambda;

  const funcLambda = new V1_Lambda();
  const aggFunc = new V1_AppliedFunction();
  aggFunc.function = functionName;
  const aggVariable = new V1_Variable();
  aggVariable.name = 'agg';
  funcLambda.body.push(aggFunc);
  aggFunc.parameters.push(aggVariable);
  funcLambda.parameters.push(aggVariable);
  colSpec.function2 = funcLambda;

  colSpec.name = columnName ?? column;
  return colSpec;
}

function getPrimitiveValueSpecification(
  type: string,
  column: unknown,
): V1_PrimitiveValueSpecification {
  switch (type) {
    case PRIMITIVE_TYPE.STRING: {
      const stringValue = new V1_CString();
      stringValue.value = guaranteeIsString(column);
      return stringValue;
    }
    case PRIMITIVE_TYPE.BOOLEAN: {
      const booleanValue = new V1_CBoolean();
      booleanValue.value = guaranteeIsBoolean(column);
      return booleanValue;
    }
    case PRIMITIVE_TYPE.NUMBER:
    case PRIMITIVE_TYPE.DECIMAL: {
      const cDecimal = new V1_CDecimal();
      cDecimal.value = guaranteeIsNumber(column);
      return cDecimal;
    }
    case PRIMITIVE_TYPE.INTEGER: {
      const cInteger = new V1_CInteger();
      cInteger.value = guaranteeIsNumber(column);
      return cInteger;
    }
    case PRIMITIVE_TYPE.FLOAT: {
      const cFloat = new V1_CFloat();
      cFloat.value = guaranteeIsNumber(column);
      return cFloat;
    }
    case PRIMITIVE_TYPE.DATE:
    case PRIMITIVE_TYPE.DATETIME: {
      const cDateTime = new V1_CDateTime();
      cDateTime.value = guaranteeIsString(column);
      return cDateTime;
    }
    case PRIMITIVE_TYPE.STRICTDATE: {
      const cStrictDate = new V1_CStrictDate();
      cStrictDate.value = guaranteeIsString(column);
      return cStrictDate;
    }
    case PRIMITIVE_TYPE.STRICTTIME: {
      const cStrictTime = new V1_CStrictTime();
      cStrictTime.value = guaranteeIsString(column);
      return cStrictTime;
    }
    default:
      throw new UnsupportedOperationError(
        `Unsupported dataCube column type ${type}`,
      );
  }
}

function processFilterQuery(filter: object): V1_ValueSpecification {
  const defaultVariable = new V1_Variable();
  defaultVariable.name = DEFAULT_LAMBDA_VARIABLE_NAME;
  if ('groupOperation' in filter) {
    const groupFilter = filter as DataCubeQueryFilter;
    let conditionExpressions: V1_ValueSpecification[] = [];
    groupFilter.conditions.forEach((condition) => {
      const conditionExpression = processFilterQuery(condition);
      conditionExpressions.push(conditionExpression);
      if (conditionExpressions.length === 2) {
        const groupCondition = groupFilter.groupOperation;
        const groupFunc = new V1_AppliedFunction();
        groupFunc.function = groupCondition;
        groupFunc.parameters = conditionExpressions;
        conditionExpressions = [groupFunc];
      }
    });
    if (conditionExpressions.length === 1) {
      return guaranteeNonNullable(conditionExpressions[0]);
    }
  } else {
    const condition = filter as DataCubeQueryFilterCondition;
    const filterCondition = new V1_AppliedFunction();
    const property = new V1_AppliedProperty();
    property.property = condition.name;
    property.class = condition.type;
    property.parameters = [defaultVariable];

    switch (condition.operation) {
      case DATA_CUBE_FILTER_OPERATION.EQUALS:
      case DATA_CUBE_FILTER_OPERATION.GREATER_THAN:
      case DATA_CUBE_FILTER_OPERATION.GREATER_THAN_OR_EQUAL:
      case DATA_CUBE_FILTER_OPERATION.LESS_THAN:
      case DATA_CUBE_FILTER_OPERATION.LESS_THAN_OR_EQUAL:
      case DATA_CUBE_FILTER_OPERATION.CONTAINS:
      case DATA_CUBE_FILTER_OPERATION.ENDS_WITH:
      case DATA_CUBE_FILTER_OPERATION.STARTS_WITH: {
        filterCondition.function = condition.operation;
        filterCondition.parameters.push(property);
        filterCondition.parameters.push(
          getPrimitiveValueSpecification(condition.type, condition.value),
        );
        break;
      }
      case DATA_CUBE_FILTER_OPERATION.BLANK: {
        filterCondition.function = condition.operation;
        filterCondition.parameters.push(property);
        break;
      }
      case DATA_CUBE_FILTER_OPERATION.NOT_EQUAL: {
        filterCondition.function = extractElementNameFromPath(
          DATA_CUBE_FUNCTIONS.NOT,
        );

        const filterConditionFunc = new V1_AppliedFunction();
        filterConditionFunc.function = DATA_CUBE_FILTER_OPERATION.EQUALS;
        filterConditionFunc.parameters.push(property);
        filterConditionFunc.parameters.push(
          getPrimitiveValueSpecification(condition.type, condition.value),
        );

        filterCondition.parameters.push(filterConditionFunc);
        break;
      }
      case DATA_CUBE_FILTER_OPERATION.NOT_BLANK: {
        filterCondition.function = extractElementNameFromPath(
          DATA_CUBE_FUNCTIONS.NOT,
        );

        const filterConditionFunc = new V1_AppliedFunction();
        filterConditionFunc.function = DATA_CUBE_FILTER_OPERATION.BLANK;
        filterConditionFunc.parameters.push(property);
        filterConditionFunc.parameters.push(
          getPrimitiveValueSpecification(condition.type, condition.value),
        );

        filterCondition.parameters.push(filterConditionFunc);
        break;
      }
      case DATA_CUBE_FILTER_OPERATION.NOT_CONTAINS: {
        filterCondition.function = extractElementNameFromPath(
          DATA_CUBE_FUNCTIONS.NOT,
        );

        const filterConditionFunc = new V1_AppliedFunction();
        filterConditionFunc.function = DATA_CUBE_FILTER_OPERATION.CONTAINS;
        filterConditionFunc.parameters.push(property);
        filterConditionFunc.parameters.push(
          getPrimitiveValueSpecification(condition.type, condition.value),
        );

        filterCondition.parameters.push(filterConditionFunc);
        break;
      }
      default:
        throw new UnsupportedOperationError(
          `Unsupported filter operation ${condition.operation}`,
        );
    }
    return filterCondition;
  }
  throw new UnsupportedOperationError(`Unsupported dataCube filter`, filter);
}

export function buildExecutableQueryFromSnapshot(
  snapshot: DataCubeQuerySnapshot,
): V1_ValueSpecification {
  const sourceQuery = V1_deserializeValueSpecification(
    snapshot.sourceQuery,
    [],
  );
  const sequence: V1_AppliedFunction[] = [];

  // --------------------------------- LEAF EXTEND ---------------------------------
  // TODO: @akphi - implement this

  // --------------------------------- FILTER ---------------------------------
  // TODO: @akphi - implement this

  // --------------------------------- GROUP BY FILTER ---------------------------------
  if (snapshot.groupByFilter) {
    const filter = snapshot.groupByFilter;
    const filterValueSpec = processFilterQuery(filter);
    const filterLambda = new V1_Lambda();
    const defaultVariable = new V1_Variable();
    defaultVariable.name = DEFAULT_LAMBDA_VARIABLE_NAME;
    filterLambda.body = [filterValueSpec];

    filterLambda.parameters = [defaultVariable];
    const filterFunc = new V1_AppliedFunction();
    filterFunc.function = extractElementNameFromPath(
      DATA_CUBE_FUNCTIONS.FILTER,
    );
    filterFunc.parameters.push(filterLambda);
    sequence.push(filterFunc);
  }

  // --------------------------------- RENAME ---------------------------------
  // TODO: @akphi - implement this

  // --------------------------------- GROUP BY ---------------------------------
  // TODO: @akphi - implement this
  if (snapshot.groupByColumns.length) {
    const groupByInstance = new V1_ClassInstance();
    groupByInstance.type = V1_ClassInstanceType.COL_SPEC_ARRAY;
    const groupByColSpecArray = new V1_ColSpecArray();
    const aggregationColSpecArray = new V1_ColSpecArray();
    const aggregationInstance = new V1_ClassInstance();
    aggregationInstance.type = V1_ClassInstanceType.COL_SPEC_ARRAY;

    if (
      snapshot.groupByExpandedKeys.length !== snapshot.groupByColumns.length
    ) {
      const groupKeys = snapshot.groupByExpandedKeys;
      for (let index = 0; index <= groupKeys.length; index++) {
        const currentGroupByColumn = snapshot.groupByColumns[index];
        const columnSpec = new V1_ColSpec();
        columnSpec.name = guaranteeNonNullable(currentGroupByColumn).name;
        groupByColSpecArray.colSpecs.push(columnSpec);
      }

      // Temporary. Remove it later when we support empty aggregations
      if (snapshot.groupByAggColumns.length === 0) {
        const column = guaranteeNonNullable(snapshot.groupByColumns[0]);
        const colSpec = getAggregationColSpec(
          column.name,
          DATA_CUBE_AGGREGATE_FUNCTION.COUNT,
          PRIMITIVE_TYPE.STRING,
          DATA_CUBE_AGGREGATE_FUNCTION.COUNT,
        );
        aggregationColSpecArray.colSpecs.push(colSpec);
      }
    }

    if (
      snapshot.groupByExpandedKeys.length === 0 ||
      snapshot.groupByExpandedKeys.length !== snapshot.groupByColumns.length
    ) {
      snapshot.groupByAggColumns.forEach((agg) => {
        const colSpec = getAggregationColSpec(agg.name, agg.function, agg.type);
        aggregationColSpecArray.colSpecs.push(colSpec);
      });
    }

    groupByInstance.value = groupByColSpecArray;
    aggregationInstance.value = aggregationColSpecArray;

    if (
      groupByColSpecArray.colSpecs.length !== 0 ||
      aggregationColSpecArray.colSpecs.length !== 0
    ) {
      const groupBy = new V1_AppliedFunction();
      groupBy.function = extractElementNameFromPath(
        DATA_CUBE_FUNCTIONS.GROUP_BY,
      );
      groupBy.parameters = [groupByInstance, aggregationInstance];
      sequence.push(groupBy);
    }
  }

  // --------------------------------- SELECT ---------------------------------
  // TODO: @akphi - implement this

  // --------------------------------- PIVOT ---------------------------------
  // TODO: @akphi - implement this

  // --------------------------------- CAST ---------------------------------
  // TODO: @akphi - implement this

  // --------------------------------- GROUP EXTEND ---------------------------------
  if (snapshot.groupByExpandedKeys.length !== snapshot.groupByColumns.length) {
    const extendFunc = new V1_AppliedFunction();
    extendFunc.function = extractElementNameFromPath(
      DATA_CUBE_FUNCTIONS.EXTEND,
    );
    const classInstance = new V1_ClassInstance();
    classInstance.type = V1_ClassInstanceType.COL_SPEC_ARRAY;
    const colSpecArray = new V1_ColSpecArray();
    classInstance.value = colSpecArray;
    snapshot.columns.forEach((col) => {
      if (!snapshot.groupByColumns.find((c) => c.name === col.name)) {
        const colSpec = new V1_ColSpec();
        const lambda = new V1_Lambda();
        const defaultVariable = new V1_Variable();
        defaultVariable.name = DEFAULT_LAMBDA_VARIABLE_NAME;
        lambda.parameters.push(defaultVariable);
        const variableValue = new V1_CString();
        variableValue.value = '';
        lambda.body.push(variableValue);
        colSpec.function1 = lambda;
        colSpec.name = col.name;
        colSpecArray.colSpecs.push(colSpec);
      }
    });
    extendFunc.parameters.push(classInstance);

    sequence.push(extendFunc);
  }

  // --------------------------------- SORT ---------------------------------

  if (snapshot.sortColumns.length) {
    const sort = new V1_AppliedFunction();
    sort.function = extractElementNameFromPath(DATA_CUBE_FUNCTIONS.SORT);
    const sortInfos = new V1_Collection();
    sortInfos.multiplicity = new V1_Multiplicity(
      snapshot.sortColumns.length,
      snapshot.sortColumns.length,
    );
    snapshot.sortColumns.forEach((sortCol) => {
      if (
        snapshot.groupByColumns.length ===
          snapshot.groupByExpandedKeys.length ||
        snapshot.groupByColumns.map((col) => col.name).indexOf(sortCol.name) ===
          snapshot.groupByExpandedKeys.length
      ) {
        const sortInfo = new V1_AppliedFunction();
        sortInfo.function = extractElementNameFromPath(
          sortCol.direction === DATA_CUBE_COLUMN_SORT_DIRECTION.ASCENDING
            ? DATA_CUBE_FUNCTIONS.ASC
            : DATA_CUBE_FUNCTIONS.DESC,
        );
        sortInfo.parameters.push(createColSpec(sortCol.name));
        sortInfos.values.push(sortInfo);
      }
    });
    sort.parameters.push(sortInfos);
    if (sortInfos.values.length) {
      sequence.push(sort);
    }
  }

  // --------------------------------- LIMIT ---------------------------------
  // TODO: @akphi - implement this

  // --------------------------------- FROM ---------------------------------

  const fromFunc = new V1_AppliedFunction();
  fromFunc.function = extractElementNameFromPath(DATA_CUBE_FUNCTIONS.FROM);
  const runtimePtr = new V1_PackageableElementPtr();
  runtimePtr.fullPath = snapshot.runtime;
  fromFunc.parameters.push(runtimePtr);
  sequence.push(fromFunc);

  // --------------------------------- FINALIZE ---------------------------------

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

// export async function buildPersistentQueryFromSnapshot(
//   snapshot: DataCubeQuerySnapshot,
// ) {
//   return new DataCubeQuery(
//     snapshot.name,
//     snapshot.sourceQuery,
//     snapshot.configuration,
//   );
// }

// name!: string;
// query!: string;
// partialQuery!: string;
// source!: DataCubeQuerySource;
// configuration!: DataCubeConfiguration;

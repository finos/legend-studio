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
  V1_Collection,
  V1_Lambda,
  type V1_PrimitiveValueSpecification,
  type V1_ValueSpecification,
  V1_Variable,
  PRIMITIVE_TYPE,
  V1_ClassInstanceType,
} from '@finos/legend-graph';
import {
  TDSFilter,
  TDSFilterCondition,
  type TDSGroupby,
  type TDSRequest,
  type TDSSort,
  TDS_FILTER_GROUP,
  TDS_FILTER_OPERATION,
  TDS_AGGREGATION_FUNCTION,
} from './TDSRequest.js';
import {
  UnsupportedOperationError,
  guaranteeIsBoolean,
  guaranteeIsNumber,
  guaranteeIsString,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { DEFAULT_VARIABLE_NAME, QUERY_FUNCTION } from '../../Const.js';

const getPrimitiveValueSpecification = (
  type: PRIMITIVE_TYPE,
  column: unknown,
): V1_PrimitiveValueSpecification => {
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
        `Unsupported tds column type ${type}`,
      );
  }
};

const updateParentFunction = (
  expressions: V1_ValueSpecification[],
  functionName: string,
  child: V1_ValueSpecification[],
): void => {
  let newExpressions: V1_ValueSpecification[] = [
    guaranteeNonNullable(expressions[0]),
  ];
  newExpressions = newExpressions.concat(child);
  const childFunc = new V1_AppliedFunction();
  childFunc.function = functionName;
  childFunc.parameters = newExpressions;
  expressions[0] = childFunc;
};

const processFilterOperations = (
  expressions: V1_ValueSpecification[],
  filters: TDSFilter[],
): void => {
  if (filters.length === 0) {
    return;
  }
  const filterLambda = new V1_Lambda();
  filters.forEach((filterValue) => {
    const conditions = filterValue.conditions;
    const groupCondition = filterValue.groupOperation;
    const defaultVariable = new V1_Variable();
    defaultVariable.name = DEFAULT_VARIABLE_NAME;
    const conditionExpressions: V1_ValueSpecification[] = [];
    conditions.forEach((condition) => {
      const filterCondition = new V1_AppliedFunction();
      const property = new V1_AppliedProperty();
      property.property = filterValue.column;
      property.class = filterValue.columnType;
      property.parameters = [defaultVariable];

      switch (condition.operation) {
        case TDS_FILTER_OPERATION.EQUALS:
        case TDS_FILTER_OPERATION.GREATER_THAN:
        case TDS_FILTER_OPERATION.GREATER_THAN_OR_EQUAL:
        case TDS_FILTER_OPERATION.LESS_THAN:
        case TDS_FILTER_OPERATION.LESS_THAN_OR_EQUAL:
        case TDS_FILTER_OPERATION.CONTAINS:
        case TDS_FILTER_OPERATION.ENDS_WITH:
        case TDS_FILTER_OPERATION.STARTS_WITH: {
          filterCondition.function = condition.operation;
          filterCondition.parameters.push(property);
          filterCondition.parameters.push(
            getPrimitiveValueSpecification(
              filterValue.columnType,
              condition.value,
            ),
          );
          break;
        }
        case TDS_FILTER_OPERATION.BLANK: {
          filterCondition.function = condition.operation;
          filterCondition.parameters.push(property);
          break;
        }
        case TDS_FILTER_OPERATION.NOT_EQUAL: {
          filterCondition.function = QUERY_FUNCTION.NOT;

          const filterConditionFunc = new V1_AppliedFunction();
          filterConditionFunc.function = TDS_FILTER_OPERATION.EQUALS;
          filterConditionFunc.parameters.push(property);
          filterConditionFunc.parameters.push(
            getPrimitiveValueSpecification(
              filterValue.columnType,
              condition.value,
            ),
          );

          filterCondition.parameters.push(filterConditionFunc);
          break;
        }
        case TDS_FILTER_OPERATION.NOT_BLANK: {
          filterCondition.function = QUERY_FUNCTION.NOT;

          const filterConditionFunc = new V1_AppliedFunction();
          filterConditionFunc.function = TDS_FILTER_OPERATION.BLANK;
          filterConditionFunc.parameters.push(property);
          filterConditionFunc.parameters.push(
            getPrimitiveValueSpecification(
              filterValue.columnType,
              condition.value,
            ),
          );

          filterCondition.parameters.push(filterConditionFunc);
          break;
        }
        case TDS_FILTER_OPERATION.NOT_CONTAINS: {
          filterCondition.function = QUERY_FUNCTION.NOT;

          const filterConditionFunc = new V1_AppliedFunction();
          filterConditionFunc.function = TDS_FILTER_OPERATION.CONTAINS;
          filterConditionFunc.parameters.push(property);
          filterConditionFunc.parameters.push(
            getPrimitiveValueSpecification(
              filterValue.columnType,
              condition.value,
            ),
          );

          filterCondition.parameters.push(filterConditionFunc);
          break;
        }
        default:
          throw new UnsupportedOperationError(
            `Unsupported filter operation ${condition.operation}`,
          );
      }
      conditionExpressions.push(filterCondition);
    });
    if (conditionExpressions.length > 1) {
      const groupFunc = new V1_AppliedFunction();
      groupFunc.function = groupCondition;
      groupFunc.parameters = conditionExpressions;
      filterLambda.body.push(groupFunc);
    } else {
      filterLambda.body = filterLambda.body.concat(conditionExpressions);
    }

    if (filterLambda.body.length > 1) {
      const andFunc = new V1_AppliedFunction();
      andFunc.function = TDS_FILTER_GROUP.AND;
      andFunc.parameters = filterLambda.body;
      filterLambda.body = [andFunc];
    }
    filterLambda.parameters = [defaultVariable];
  });
  updateParentFunction(expressions, QUERY_FUNCTION.FILTER, [filterLambda]);
};

const getAggregationColSpec = (
  column: string,
  functionName: TDS_AGGREGATION_FUNCTION,
  columnType: PRIMITIVE_TYPE,
  // Temporary. Remove it when we support groupBy with empty aggregations
  columnName?: string,
): V1_ColSpec => {
  const colSpec = new V1_ColSpec();
  const aggLambda = new V1_Lambda();
  const property = new V1_AppliedProperty();
  property.property = column;
  property.class = columnType;
  const defaultVariable = new V1_Variable();
  defaultVariable.name = DEFAULT_VARIABLE_NAME;
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
};

const processGroupByOperations = (
  expressions: V1_ValueSpecification[],
  groupByOperation: TDSGroupby,
  columns: string[],
): void => {
  if (!groupByOperation.columns.length) {
    return;
  }
  const groupByInstance = new V1_ClassInstance();
  groupByInstance.type = V1_ClassInstanceType.COL_SPEC_ARRAY;
  const groupByColSpecArray = new V1_ColSpecArray();
  const aggregationColSpecArray = new V1_ColSpecArray();
  const aggregationInstance = new V1_ClassInstance();
  aggregationInstance.type = V1_ClassInstanceType.COL_SPEC_ARRAY;

  if (groupByOperation.groupKeys.length !== groupByOperation.columns.length) {
    const groupKeys = groupByOperation.groupKeys;
    const currentGroupByColumn = groupByOperation.columns[groupKeys.length];
    const columnSpec = new V1_ColSpec();
    columnSpec.name = guaranteeNonNullable(currentGroupByColumn);
    groupByColSpecArray.colSpecs.push(columnSpec);

    // Temporary. Remove it later when we support empty aggregations
    if (groupByOperation.aggregations.length === 0) {
      const column = guaranteeNonNullable(groupByOperation.columns[0]);
      const colSpec = getAggregationColSpec(
        column,
        TDS_AGGREGATION_FUNCTION.COUNT,
        PRIMITIVE_TYPE.STRING,
        TDS_AGGREGATION_FUNCTION.COUNT,
      );
      aggregationColSpecArray.colSpecs.push(colSpec);
    }
  }

  // Projecting the columns when there is an aggregation because that would end up projecting just the aggregation column
  if (
    groupByOperation.groupKeys.length === groupByOperation.columns.length &&
    groupByOperation.aggregations.length > 0
  ) {
    const aggColumns = groupByOperation.aggregations.map((agg) => agg.column);
    columns.forEach((column) => {
      if (!aggColumns.includes(column)) {
        const colSpec = new V1_ColSpec();
        colSpec.name = column;
        groupByColSpecArray.colSpecs.push(colSpec);
      }
    });
  }

  groupByOperation.aggregations.forEach((agg) => {
    const colSpec = getAggregationColSpec(
      agg.column,
      agg.function,
      agg.columnType,
    );
    aggregationColSpecArray.colSpecs.push(colSpec);
  });

  groupByInstance.value = groupByColSpecArray;
  aggregationInstance.value = aggregationColSpecArray;

  if (
    groupByColSpecArray.colSpecs.length !== 0 ||
    aggregationColSpecArray.colSpecs.length !== 0
  ) {
    updateParentFunction(expressions, QUERY_FUNCTION.GROUPBY, [
      groupByInstance,
      aggregationInstance,
    ]);
  }
};

const processSortOperations = (
  expressions: V1_ValueSpecification[],
  sortOperations: TDSSort[],
  groupBy: TDSGroupby,
): void => {
  if (sortOperations.length === 0) {
    return;
  }
  const sortCollection = new V1_Collection();
  sortOperations.forEach((sortValue) => {
    if (
      groupBy.columns.length === groupBy.groupKeys.length ||
      groupBy.columns.indexOf(sortValue.column) === groupBy.groupKeys.length
    ) {
      const sortFunc = new V1_AppliedFunction();
      sortFunc.function = sortValue.order;
      const instance = new V1_ClassInstance();
      instance.type = V1_ClassInstanceType.COL_SPEC;
      const value = new V1_ColSpec();
      value.name = sortValue.column;
      instance.value = value;
      sortFunc.parameters.push(instance);
      sortCollection.values.push(sortFunc);
    }
  });
  updateParentFunction(expressions, QUERY_FUNCTION.SORT, [sortCollection]);
};

const updateExpressionWithSlice = (
  expressions: V1_ValueSpecification[],
  start: number | undefined,
  end: number | undefined,
): void => {
  if (start === undefined || end === undefined) {
    return;
  }
  const startValue = new V1_CInteger();
  startValue.value = start;
  const endValue = new V1_CInteger();
  endValue.value = end;
  const funcBody = expressions[0];
  let currentExpression: V1_ValueSpecification | undefined = funcBody;
  while (currentExpression instanceof V1_AppliedFunction) {
    if (currentExpression.function === QUERY_FUNCTION.FROM) {
      if (
        currentExpression.parameters[0] instanceof V1_AppliedFunction &&
        currentExpression.parameters[0].function === QUERY_FUNCTION.SLICE
      ) {
        currentExpression.parameters[0].parameters = [
          guaranteeNonNullable(currentExpression.parameters[0].parameters[0]),
          startValue,
          endValue,
        ];
        break;
      }
      const sliceFunction = new V1_AppliedFunction();
      sliceFunction.function = QUERY_FUNCTION.SLICE;
      sliceFunction.parameters = [
        guaranteeNonNullable(currentExpression.parameters[0]),
        startValue,
        endValue,
      ];
      currentExpression.parameters[0] = sliceFunction;
      break;
    }
    currentExpression = currentExpression.parameters[0];
  }
};

export const buildLambdaExpressions = (
  funcBody: V1_ValueSpecification,
  request: TDSRequest,
  isPaginationEnabled: boolean,
): V1_Lambda => {
  const expressions = [funcBody];
  if (isPaginationEnabled) {
    updateExpressionWithSlice(expressions, request.startRow, request.endRow);
  }
  const groupBy = request.groupBy;
  for (let index = 0; index < groupBy.groupKeys.length; index++) {
    const groupFilter = new TDSFilter(
      guaranteeNonNullable(groupBy.columns.at(index)),
      PRIMITIVE_TYPE.STRING,
      [
        new TDSFilterCondition(
          TDS_FILTER_OPERATION.EQUALS,
          groupBy.groupKeys.at(index),
        ),
      ],
      TDS_FILTER_GROUP.AND,
    );
    request.filter.push(groupFilter);
  }
  processFilterOperations(expressions, request.filter);
  processGroupByOperations(expressions, request.groupBy, request.columns);
  processSortOperations(expressions, request.sort, request.groupBy);
  const lambda = new V1_Lambda();
  lambda.body = expressions;
  return lambda;
};

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
  type ValueSpecification,
  SimpleFunctionExpression,
  extractElementNameFromPath,
  matchFunctionName,
  AbstractPropertyExpression,
  PrimitiveInstanceValue,
  GenericType,
  GenericTypeExplicitReference,
  PrimitiveType,
  PRIMITIVE_TYPE,
  VariableExpression,
  type INTERNAL__UnknownValueSpecification,
} from '@finos/legend-graph';
import {
  guaranteeType,
  assertTrue,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import type { QueryBuilderAggregateColumnState } from '../QueryBuilderAggregationState.js';
import { type QueryBuilderAggregateCalendarFunction } from '../QueryBuilderAggregateCalendarFunction.js';
import { QUERY_BUILDER_CALENDAR_TYPE } from '../../../../../graph-manager/QueryBuilderConst.js';

export const buildCalendarFunctionExpression = (
  calendarFunctionFullPath: string,
  dateColumn: AbstractPropertyExpression | undefined,
  calendarType: QUERY_BUILDER_CALENDAR_TYPE,
  endDate: PrimitiveInstanceValue,
  targetColumn:
    | AbstractPropertyExpression
    | INTERNAL__UnknownValueSpecification,
): ValueSpecification => {
  const expression = new SimpleFunctionExpression(
    extractElementNameFromPath(calendarFunctionFullPath),
  );
  if (dateColumn) {
    expression.parametersValues.push(dateColumn);
  } else {
    throw new UnsupportedOperationError(
      `Please specify date column for calendar function for column`,
    );
  }
  const calendarTypeParameter = new PrimitiveInstanceValue(
    GenericTypeExplicitReference.create(new GenericType(PrimitiveType.STRING)),
  );
  calendarTypeParameter.values = [calendarType];
  expression.parametersValues.push(calendarTypeParameter);
  expression.parametersValues.push(endDate);
  expression.parametersValues.push(targetColumn);
  return expression;
};

export const updateAggregateColumnState = (
  expression: SimpleFunctionExpression,
  calendarFunctionFullPath: string,
  calendarFunction: QueryBuilderAggregateCalendarFunction,
  aggregateColumnState: QueryBuilderAggregateColumnState,
): void => {
  if (matchFunctionName(expression.functionName, calendarFunctionFullPath)) {
    assertTrue(
      expression.parametersValues.length === 4,
      `Can't process ${extractElementNameFromPath(
        calendarFunctionFullPath,
      )}() expression: ${extractElementNameFromPath(
        calendarFunctionFullPath,
      )}() expects four arguments`,
    );

    const dateColumn = guaranteeType(
      expression.parametersValues[0],
      AbstractPropertyExpression,
      `Can't process ${extractElementNameFromPath(
        calendarFunctionFullPath,
      )}() expression: only support ${extractElementNameFromPath(
        calendarFunctionFullPath,
      )}() with first parameter as property expression`,
    );
    assertTrue(
      dateColumn.func.value.genericType.value.rawType.name ===
        PRIMITIVE_TYPE.STRICTDATE ||
        dateColumn.func.value.genericType.value.rawType.name ===
          PRIMITIVE_TYPE.DATE,

      `Can't process ${extractElementNameFromPath(
        calendarFunctionFullPath,
      )}() expression: only support ${extractElementNameFromPath(
        calendarFunctionFullPath,
      )}() with first parameter as property expression of type StrictDate`,
    );
    const lambdaParameterName = guaranteeType(
      dateColumn.parametersValues[0],
      VariableExpression,
    ).name;
    calendarFunction.setLambdaParameterName(lambdaParameterName);

    const calendarTypeParameter = guaranteeType(
      expression.parametersValues[1],
      PrimitiveInstanceValue,
      `Can't process ${extractElementNameFromPath(
        calendarFunctionFullPath,
      )}() expression: only support ${extractElementNameFromPath(
        calendarFunctionFullPath,
      )}() with second parameter as PrimitiveInstancevalue`,
    );
    assertTrue(
      Object.values(QUERY_BUILDER_CALENDAR_TYPE).find(
        (val) => val === calendarTypeParameter.values[0],
      ) !== undefined,
      `Can't process ${extractElementNameFromPath(
        calendarFunctionFullPath,
      )}() expression: only support ${extractElementNameFromPath(
        calendarFunctionFullPath,
      )}() calendar types NY and LDN`,
    );

    const endDate = guaranteeType(
      expression.parametersValues[2],
      PrimitiveInstanceValue,
      `Can't process ${extractElementNameFromPath(
        calendarFunctionFullPath,
      )}() expression: only support ${extractElementNameFromPath(
        calendarFunctionFullPath,
      )}() with third parameter as PrimitiveInstancevalue`,
    );
    assertTrue(
      endDate.genericType.value.rawType.name === PRIMITIVE_TYPE.STRICTDATE ||
        dateColumn.func.value.genericType.value.rawType.name ===
          PRIMITIVE_TYPE.DATE,

      `Can't process ${extractElementNameFromPath(
        calendarFunctionFullPath,
      )}() expression: only support ${extractElementNameFromPath(
        calendarFunctionFullPath,
      )}() with third parameter of type StrictDate`,
    );

    calendarFunction.calendarType = calendarTypeParameter
      .values[0] as QUERY_BUILDER_CALENDAR_TYPE;
    calendarFunction.endDate = endDate;
    calendarFunction.dateColumn = dateColumn;
    assertTrue(
      calendarFunction.isCompatibleWithColumn(
        aggregateColumnState.projectionColumnState,
      ),
      `Can't process ${extractElementNameFromPath(
        calendarFunctionFullPath,
      )}() expression: property is not compatible with calendar function`,
    );
    aggregateColumnState.setHideCalendarColumnState(false);
    aggregateColumnState.setCalendarFunction(calendarFunction);
  }
};

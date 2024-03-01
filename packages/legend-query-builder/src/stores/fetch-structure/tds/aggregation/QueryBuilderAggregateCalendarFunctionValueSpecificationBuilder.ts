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
  ValueSpecification,
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
  DerivedProperty,
} from '@finos/legend-graph';
import {
  guaranteeType,
  assertTrue,
  UnsupportedOperationError,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import type { QueryBuilderAggregateColumnState } from './QueryBuilderAggregationState.js';
import { type QueryBuilderAggregateCalendarFunction } from './QueryBuilderAggregateCalendarFunction.js';
import { QUERY_BUILDER_CALENDAR_TYPE } from '../../../../graph-manager/QueryBuilderConst.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../../graph/QueryBuilderMetaModelConst.js';

export const buildCalendarFunctionExpression = (
  calendarFunctionFullPath: string,
  dateColumn: AbstractPropertyExpression | undefined,
  calendarType: QUERY_BUILDER_CALENDAR_TYPE,
  endDate: ValueSpecification,
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
    let currentPropertyExpression: ValueSpecification = dateColumn;
    while (currentPropertyExpression instanceof AbstractPropertyExpression) {
      const propertyExpression = currentPropertyExpression;
      currentPropertyExpression = guaranteeNonNullable(
        currentPropertyExpression.parametersValues[0],
      );
      // here we just do a simple check to ensure that if we encounter derived properties
      // the number of parameters and arguments provided match
      if (propertyExpression.func.value instanceof DerivedProperty) {
        assertTrue(
          (Array.isArray(propertyExpression.func.value.parameters)
            ? propertyExpression.func.value.parameters.length
            : 0) ===
            propertyExpression.parametersValues.length - 1,
          `Can't process property expression: derived property '${propertyExpression.func.value.name}' expects number of provided arguments to match number of parameters`,
        );
      }
      // Take care of chains of subtype (a pattern that is not useful, but we want to support and rectify)
      // $x.employees->subType(@Person)->subType(@Staff)
      while (
        currentPropertyExpression instanceof SimpleFunctionExpression &&
        matchFunctionName(
          currentPropertyExpression.functionName,
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.SUBTYPE,
        )
      ) {
        currentPropertyExpression = guaranteeNonNullable(
          currentPropertyExpression.parametersValues[0],
        );
      }
    }
    const lambdaParameterName = guaranteeType(
      currentPropertyExpression,
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
      ValueSpecification,
      `Can't process ${extractElementNameFromPath(
        calendarFunctionFullPath,
      )}() expression: only support ${extractElementNameFromPath(
        calendarFunctionFullPath,
      )}() with third parameter as ValueSpecification`,
    );
    assertTrue(
      endDate.genericType?.value.rawType.name === PRIMITIVE_TYPE.STRICTDATE ||
        endDate.genericType?.value.rawType.name === PRIMITIVE_TYPE.DATE ||
        dateColumn.func.value.genericType.value.rawType.name ===
          PRIMITIVE_TYPE.DATE,

      `Can't process ${extractElementNameFromPath(
        calendarFunctionFullPath,
      )}() expression: only support ${extractElementNameFromPath(
        calendarFunctionFullPath,
      )}() with third parameter of type Date`,
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

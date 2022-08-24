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
  type Type,
  type ValueSpecification,
  type FunctionExpression,
  AbstractPropertyExpression,
  PRIMITIVE_TYPE,
  SUPPORTED_FUNCTIONS,
  buildPrimitiveInstanceValue,
} from '@finos/legend-graph';
import {
  guaranteeNonNullable,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../../../QueryBuilder_Const.js';
import {
  getNonCollectionValueSpecificationType,
  isTypeCompatibleWithConditionValueType,
} from '../../../../QueryBuilderOperatorsHelper.js';
import { QueryBuilderPostFilterOperator } from '../QueryBuilderPostFilterOperator.js';
import { buildPostFilterConditionState } from '../QueryBuilderPostFilterValueSpecificationProcessor.js';
import type {
  PostFilterConditionState,
  QueryBuilderPostFilterState,
} from '../QueryBuilderPostFilterState.js';
import { generateDefaultValueForPrimitiveType } from '../../../../QueryBuilderValueSpecificationBuilderHelper.js';
import { buildPostFilterConditionExpression } from './QueryBuilderPostFilterOperatorHelper.js';

export class QueryBuilderPostFilterOperator_GreaterThan extends QueryBuilderPostFilterOperator {
  getLabel(): string {
    return '>';
  }

  isCompatibleWithType(type: Type): boolean {
    return (
      [
        PRIMITIVE_TYPE.NUMBER,
        PRIMITIVE_TYPE.INTEGER,
        PRIMITIVE_TYPE.DECIMAL,
        PRIMITIVE_TYPE.FLOAT,
        PRIMITIVE_TYPE.DATE,
        PRIMITIVE_TYPE.STRICTDATE,
        PRIMITIVE_TYPE.DATETIME,
      ] as string[]
    ).includes(type.path);
  }

  isCompatibleWithConditionValue(
    postFilterConditionState: PostFilterConditionState,
  ): boolean {
    return isTypeCompatibleWithConditionValueType(
      postFilterConditionState.value
        ? getNonCollectionValueSpecificationType(postFilterConditionState.value)
        : undefined,
      guaranteeNonNullable(
        postFilterConditionState.columnState.getReturnType(),
      ),
    );
  }

  getDefaultFilterConditionValue(
    postFilterConditionState: PostFilterConditionState,
  ): ValueSpecification {
    const propertyType = postFilterConditionState.columnState.getReturnType();
    switch (propertyType?.path) {
      case PRIMITIVE_TYPE.NUMBER:
      case PRIMITIVE_TYPE.DECIMAL:
      case PRIMITIVE_TYPE.FLOAT:
      case PRIMITIVE_TYPE.INTEGER:
      case PRIMITIVE_TYPE.STRICTDATE:
      case PRIMITIVE_TYPE.DATETIME: {
        return buildPrimitiveInstanceValue(
          postFilterConditionState.postFilterState.projectionState
            .queryBuilderState.graphManagerState.graph,
          propertyType.path,
          generateDefaultValueForPrimitiveType(propertyType.path),
        );
      }
      case PRIMITIVE_TYPE.DATE: {
        return buildPrimitiveInstanceValue(
          postFilterConditionState.postFilterState.projectionState
            .queryBuilderState.graphManagerState.graph,
          PRIMITIVE_TYPE.STRICTDATE,
          generateDefaultValueForPrimitiveType(propertyType.path),
        );
      }
      default:
        throw new UnsupportedOperationError(
          `Can't get default value for post-filter operator '${this.getLabel()}' when the LHS property is of type '${
            propertyType?.path
          }'`,
        );
    }
  }

  buildPostFilterConditionExpression(
    postFilterConditionState: PostFilterConditionState,
  ): ValueSpecification | undefined {
    return buildPostFilterConditionExpression(
      postFilterConditionState,
      this,
      postFilterConditionState.columnState.getReturnType()?.path ===
        PRIMITIVE_TYPE.DATETIME &&
        postFilterConditionState.value?.genericType?.value.rawType.path !==
          PRIMITIVE_TYPE.DATETIME
        ? SUPPORTED_FUNCTIONS.IS_AFTER_DAY
        : QUERY_BUILDER_SUPPORTED_FUNCTIONS.GREATER_THAN,
    );
  }

  buildPostFilterConditionState(
    postFilterState: QueryBuilderPostFilterState,
    expression: FunctionExpression,
  ): PostFilterConditionState | undefined {
    return buildPostFilterConditionState(
      postFilterState,
      expression,
      expression.parametersValues[0] instanceof AbstractPropertyExpression &&
        expression.parametersValues[0].func.genericType.value.rawType.path ===
          PRIMITIVE_TYPE.DATETIME &&
        expression.parametersValues[1]?.genericType?.value.rawType.path !==
          PRIMITIVE_TYPE.DATETIME
        ? SUPPORTED_FUNCTIONS.IS_AFTER_DAY
        : QUERY_BUILDER_SUPPORTED_FUNCTIONS.GREATER_THAN,
      this,
    );
  }
}

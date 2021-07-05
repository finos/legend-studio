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

import type {
  ValueSpecification,
  SimpleFunctionExpression,
  VariableExpression,
} from '@finos/legend-studio';
import { matchFunctionName } from '@finos/legend-studio';
import { PRIMITIVE_TYPE } from '@finos/legend-studio';
import { SUPPORTED_FUNCTIONS } from '../../QueryBuilder_Const';
import type { QueryBuilderAggregateColumnState } from '../QueryBuilderAggregationState';
import { QueryBuilderAggregateOperator } from '../QueryBuilderAggregationState';
import type { QueryBuilderProjectionColumnState } from '../QueryBuilderProjectionState';
import {
  buildAggregateColumnState,
  buildAggregateExpression,
} from './QueryBuilderAggregateOperatorHelper';

export class QueryBuilderAggregateOperator_Min extends QueryBuilderAggregateOperator {
  getLabel(projectionColumnState: QueryBuilderProjectionColumnState): string {
    return 'min';
  }

  isCompatibleWithColumn(
    projectionColumnState: QueryBuilderProjectionColumnState,
  ): boolean {
    const propertyType =
      projectionColumnState.propertyEditorState.propertyExpression.func
        .genericType.value.rawType;
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
    ).includes(propertyType.path);
  }

  buildAggregateExpression(
    aggregateColumnState: QueryBuilderAggregateColumnState,
  ): ValueSpecification {
    const propertyType =
      aggregateColumnState.projectionColumnState.propertyEditorState
        .propertyExpression.func.genericType.value.rawType;
    return buildAggregateExpression(
      aggregateColumnState,
      (
        [
          PRIMITIVE_TYPE.DATE,
          PRIMITIVE_TYPE.STRICTDATE,
          PRIMITIVE_TYPE.DATETIME,
        ] as string[]
      ).includes(propertyType.path)
        ? SUPPORTED_FUNCTIONS.DATE_MIN
        : SUPPORTED_FUNCTIONS.MIN,
    );
  }

  buildAggregateColumnState(
    expression: SimpleFunctionExpression,
    lambdaParam: VariableExpression,
    projectionColumnState: QueryBuilderProjectionColumnState,
  ): QueryBuilderAggregateColumnState | undefined {
    const propertyType =
      projectionColumnState.propertyEditorState.propertyExpression.func
        .genericType.value.rawType;
    switch (propertyType.path) {
      case PRIMITIVE_TYPE.NUMBER:
      case PRIMITIVE_TYPE.INTEGER:
      case PRIMITIVE_TYPE.DECIMAL:
      case PRIMITIVE_TYPE.FLOAT: {
        if (
          !matchFunctionName(expression.functionName, SUPPORTED_FUNCTIONS.MIN)
        ) {
          return undefined;
        }
        return buildAggregateColumnState(
          projectionColumnState,
          lambdaParam,
          expression,
          SUPPORTED_FUNCTIONS.MIN,
          this,
        );
      }
      case PRIMITIVE_TYPE.DATE:
      case PRIMITIVE_TYPE.STRICTDATE:
      case PRIMITIVE_TYPE.DATETIME: {
        if (
          !matchFunctionName(
            expression.functionName,
            SUPPORTED_FUNCTIONS.DATE_MIN,
          )
        ) {
          return undefined;
        }
        return buildAggregateColumnState(
          projectionColumnState,
          lambdaParam,
          expression,
          SUPPORTED_FUNCTIONS.DATE_MIN,
          this,
        );
      }
      default:
        return undefined;
    }
  }
}

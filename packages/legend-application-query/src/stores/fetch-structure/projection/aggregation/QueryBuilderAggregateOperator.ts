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

import { uuid, guaranteeNonNullable } from '@finos/legend-shared';
import type {
  AbstractPropertyExpression,
  PureModel,
  SimpleFunctionExpression,
  Type,
  ValueSpecification,
  VariableExpression,
} from '@finos/legend-graph';
import {
  QueryBuilderSimpleProjectionColumnState,
  type QueryBuilderProjectionColumnState,
} from '../QueryBuilderProjectionState.js';
import type { QueryBuilderAggregateColumnState } from './QueryBuilderAggregationState.js';

export abstract class QueryBuilderAggregateOperator {
  readonly uuid = uuid();

  abstract getLabel(
    projectionColumnState: QueryBuilderProjectionColumnState,
  ): string;

  abstract isCompatibleWithColumn(
    projectionColumnState: QueryBuilderProjectionColumnState,
  ): boolean;

  abstract buildAggregateExpression(
    propertyExpression: AbstractPropertyExpression | undefined,
    variableName: string,
    graph: PureModel,
  ): ValueSpecification;

  buildAggregateExpressionFromState(
    aggregateColumnState: QueryBuilderAggregateColumnState,
  ): ValueSpecification {
    return this.buildAggregateExpression(
      aggregateColumnState.projectionColumnState instanceof
        QueryBuilderSimpleProjectionColumnState
        ? aggregateColumnState.projectionColumnState.propertyExpressionState
            .propertyExpression
        : undefined,
      aggregateColumnState.lambdaParameterName,
      aggregateColumnState.aggregationState.projectionState.queryBuilderState
        .graphManagerState.graph,
    );
  }

  abstract buildAggregateColumnState(
    expression: SimpleFunctionExpression,
    lambdaParam: VariableExpression,
    projectionColumnState: QueryBuilderProjectionColumnState,
  ): QueryBuilderAggregateColumnState | undefined;

  /**
   * Returns the expected return type of the operator.
   * defaults to using the return type of the projection column state which is being aggregated.
   */
  getReturnType(aggregateColumnState: QueryBuilderAggregateColumnState): Type {
    return guaranteeNonNullable(
      aggregateColumnState.projectionColumnState.getReturnType(),
    );
  }
}

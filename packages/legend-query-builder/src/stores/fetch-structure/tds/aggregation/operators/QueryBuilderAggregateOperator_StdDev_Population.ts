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
  PRIMITIVE_TYPE,
  type ValueSpecification,
  type SimpleFunctionExpression,
  type VariableExpression,
  type AbstractPropertyExpression,
  type PureModel,
} from '@finos/legend-graph';
import type { QueryBuilderAggregateColumnState } from '../QueryBuilderAggregationState.js';
import { QueryBuilderAggregateOperator } from '../QueryBuilderAggregateOperator.js';
import {
  type QueryBuilderProjectionColumnState,
  QueryBuilderSimpleProjectionColumnState,
} from '../../projection/QueryBuilderProjectionColumnState.js';
import {
  buildAggregateColumnState,
  buildAggregateExpression,
} from './QueryBuilderAggregateOperatorValueSpecificationBuilder.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../../../graphManager/QueryBuilderSupportedFunctions.js';
import { type Hashable, hashArray } from '@finos/legend-shared';
import { QUERY_BUILDER_HASH_STRUCTURE } from '../../../../../graphManager/QueryBuilderHashUtils.js';

export class QueryBuilderAggregateOperator_StdDev_Population
  extends QueryBuilderAggregateOperator
  implements Hashable
{
  getLabel(projectionColumnState: QueryBuilderProjectionColumnState): string {
    return 'std dev (population)';
  }

  isCompatibleWithColumn(
    projectionColumnState: QueryBuilderProjectionColumnState,
  ): boolean {
    if (
      projectionColumnState instanceof QueryBuilderSimpleProjectionColumnState
    ) {
      const propertyType =
        projectionColumnState.propertyExpressionState.propertyExpression.func
          .value.genericType.value.rawType;
      return (
        [
          PRIMITIVE_TYPE.NUMBER,
          PRIMITIVE_TYPE.INTEGER,
          PRIMITIVE_TYPE.DECIMAL,
          PRIMITIVE_TYPE.FLOAT,
        ] as string[]
      ).includes(propertyType.path);
    }
    return true;
  }

  buildAggregateExpression(
    propertyExpression: AbstractPropertyExpression | undefined,
    variableName: string,
    graph: PureModel,
  ): ValueSpecification {
    return buildAggregateExpression(
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.STD_DEV_POPULATION,
      variableName,
      graph,
    );
  }

  buildAggregateColumnState(
    expression: SimpleFunctionExpression,
    lambdaParam: VariableExpression,
    projectionColumnState: QueryBuilderProjectionColumnState,
  ): QueryBuilderAggregateColumnState | undefined {
    return buildAggregateColumnState(
      projectionColumnState,
      lambdaParam,
      expression,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.STD_DEV_POPULATION,
      this,
    );
  }

  override getReturnType(
    aggregateColumnState: QueryBuilderAggregateColumnState,
  ): Type {
    const graph =
      aggregateColumnState.projectionColumnState.tdsState.queryBuilderState
        .graphManagerState.graph;
    return graph.getType(PRIMITIVE_TYPE.NUMBER);
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_HASH_STRUCTURE.AGGREGATE_OPERATOR_STD_DEV_POPULATION,
    ]);
  }
}

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
  type AbstractPropertyExpression,
  type PureModel,
  type ValueSpecification,
  SimpleFunctionExpression,
  VariableExpression,
  extractElementNameFromPath,
  matchFunctionName,
  PRIMITIVE_TYPE,
  type Type,
  Enumeration,
  Multiplicity,
  PrimitiveType,
} from '@finos/legend-graph';
import {
  assertTrue,
  guaranteeType,
  type Hashable,
  hashArray,
} from '@finos/legend-shared';
import { QueryBuilderAggregateColumnState } from '../QueryBuilderAggregationState.js';
import { QueryBuilderAggregateOperator } from '../QueryBuilderAggregateOperator.js';
import {
  type QueryBuilderProjectionColumnState,
  QueryBuilderSimpleProjectionColumnState,
} from '../../projection/QueryBuilderProjectionColumnState.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../../../graph/QueryBuilderMetaModelConst.js';
import { QUERY_BUILDER_STATE_HASH_STRUCTURE } from '../../../../QueryBuilderStateHashUtils.js';

export class QueryBuilderAggregateOperator_DistinctCount
  extends QueryBuilderAggregateOperator
  implements Hashable
{
  getLabel(projectionColumnState: QueryBuilderProjectionColumnState): string {
    return 'distinct count';
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
        (
          [
            PRIMITIVE_TYPE.STRING,
            PRIMITIVE_TYPE.BOOLEAN,
            PRIMITIVE_TYPE.NUMBER,
            PRIMITIVE_TYPE.INTEGER,
            PRIMITIVE_TYPE.DECIMAL,
            PRIMITIVE_TYPE.FLOAT,
            PRIMITIVE_TYPE.DATE,
            PRIMITIVE_TYPE.STRICTDATE,
            PRIMITIVE_TYPE.DATETIME,
          ] as string[]
        ).includes(propertyType.path) || propertyType instanceof Enumeration
      );
    }
    return true;
  }

  buildAggregateExpression(
    propertyExpression: AbstractPropertyExpression | undefined,
    variableName: string,
    graph: PureModel,
  ): ValueSpecification {
    const distinctExpression = new SimpleFunctionExpression(
      extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.DISTINCT),
    );
    distinctExpression.parametersValues.push(
      new VariableExpression(variableName, Multiplicity.ONE),
    );
    const distinctCountExpression = new SimpleFunctionExpression(
      extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.COUNT),
    );
    distinctCountExpression.parametersValues.push(distinctExpression);
    return distinctCountExpression;
  }

  buildAggregateColumnState(
    expression: SimpleFunctionExpression,
    lambdaParam: VariableExpression,
    projectionColumnState: QueryBuilderProjectionColumnState,
  ): QueryBuilderAggregateColumnState | undefined {
    if (
      matchFunctionName(
        expression.functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.COUNT,
      )
    ) {
      const aggregateColumnState = new QueryBuilderAggregateColumnState(
        projectionColumnState.tdsState.aggregationState,
        projectionColumnState,
        this,
      );
      aggregateColumnState.setLambdaParameterName(lambdaParam.name);

      // process count expression
      assertTrue(
        expression.parametersValues.length === 1,
        `Can't process count() expression: count() expects no argument`,
      );

      // distinct expression
      const distinctExpression = guaranteeType(
        expression.parametersValues[0],
        SimpleFunctionExpression,
        `Can't process '${this.getLabel(
          projectionColumnState,
        )}' aggregate lambda: only support count() immediately following an expression`,
      );
      assertTrue(
        matchFunctionName(
          distinctExpression.functionName,
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.DISTINCT,
        ),
        `Can't process '${this.getLabel(
          projectionColumnState,
        )}' aggregate lambda: only support count() immediately following distinct() expression`,
      );
      assertTrue(
        distinctExpression.parametersValues.length === 1,
        `Can't process distinct() expression: distinct() expects no argument`,
      );

      // variable
      const variableExpression = guaranteeType(
        distinctExpression.parametersValues[0],
        VariableExpression,
        `Can't process distinct() expression: only support distinct() immediately following a variable expression`,
      );
      assertTrue(
        aggregateColumnState.lambdaParameterName === variableExpression.name,
        `Can't process distinct() expression: expects variable used in lambda body '${variableExpression.name}' to match lambda parameter '${aggregateColumnState.lambdaParameterName}'`,
      );

      // operator
      assertTrue(
        this.isCompatibleWithColumn(aggregateColumnState.projectionColumnState),
        `Can't process disc expression: property is not compatible with operator`,
      );
      aggregateColumnState.setOperator(this);

      return aggregateColumnState;
    }

    return undefined;
  }

  override getReturnType(
    aggregateColumnState: QueryBuilderAggregateColumnState,
  ): Type {
    return PrimitiveType.INTEGER;
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.AGGREGATE_OPERATOR_DISTINCT_COUNT,
    ]);
  }
}

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
  type Type,
  matchFunctionName,
  SimpleFunctionExpression,
  VariableExpression,
  TYPICAL_MULTIPLICITY_TYPE,
  extractElementNameFromPath,
  PrimitiveInstanceValue,
  GenericTypeExplicitReference,
  GenericType,
  PRIMITIVE_TYPE,
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
} from '../../QueryBuilderProjectionColumnState.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../../../graphManager/QueryBuilderSupportedFunctions.js';
import { QUERY_BUILDER_HASH_STRUCTURE } from '../../../../../graphManager/QueryBuilderHashUtils.js';

export class QueryBuilderAggregateOperator_JoinString
  extends QueryBuilderAggregateOperator
  implements Hashable
{
  getLabel(projectionColumnState: QueryBuilderProjectionColumnState): string {
    return 'join';
  }

  isCompatibleWithColumn(
    projectionColumnState: QueryBuilderProjectionColumnState,
  ): boolean {
    if (
      projectionColumnState instanceof QueryBuilderSimpleProjectionColumnState
    ) {
      const propertyType =
        projectionColumnState.propertyExpressionState.propertyExpression.func
          .genericType.value.rawType;
      // NOTE: Engine does not support Enumerations at the moment.
      return PRIMITIVE_TYPE.STRING === propertyType.path;
    }
    return true;
  }

  buildAggregateExpression(
    propertyExpression: AbstractPropertyExpression | undefined,
    variableName: string,
    graph: PureModel,
  ): ValueSpecification {
    const multiplicityOne = graph.getTypicalMultiplicity(
      TYPICAL_MULTIPLICITY_TYPE.ONE,
    );
    const expression = new SimpleFunctionExpression(
      extractElementNameFromPath(
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.JOIN_STRINGS,
      ),
      multiplicityOne,
    );
    const delimiter = new PrimitiveInstanceValue(
      GenericTypeExplicitReference.create(
        new GenericType(graph.getPrimitiveType(PRIMITIVE_TYPE.STRING)),
      ),
      multiplicityOne,
    );
    delimiter.values = [';'];
    expression.parametersValues.push(
      new VariableExpression(variableName, multiplicityOne),
      delimiter,
    );
    return expression;
  }

  buildAggregateColumnState(
    expression: SimpleFunctionExpression,
    lambdaParam: VariableExpression,
    projectionColumnState: QueryBuilderProjectionColumnState,
  ): QueryBuilderAggregateColumnState | undefined {
    if (
      matchFunctionName(
        expression.functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.JOIN_STRINGS,
      )
    ) {
      const aggregateColumnState = new QueryBuilderAggregateColumnState(
        projectionColumnState.projectionState.aggregationState,
        projectionColumnState,
        this,
      );
      aggregateColumnState.setLambdaParameterName(lambdaParam.name);

      assertTrue(
        expression.parametersValues.length === 2,
        `Can't process joinStrings() expression: joinStrings() expects 1 argument`,
      );

      // variable
      const variableExpression = guaranteeType(
        expression.parametersValues[0],
        VariableExpression,
        `Can't process joinStrings() expression: only support joinStrings() immediately following a variable expression`,
      );
      assertTrue(
        aggregateColumnState.lambdaParameterName === variableExpression.name,
        `Can't process joinStrings() expression: expects variable used in lambda body '${variableExpression.name}' to match lambda parameter '${aggregateColumnState.lambdaParameterName}'`,
      );

      // delimiter
      const delimiter = guaranteeType(
        expression.parametersValues[1],
        PrimitiveInstanceValue,
        `Can't process joinStrings() expression: joinStrings() expects arugment #1 to be a primitive instance value`,
      );
      assertTrue(
        delimiter.values.length === 1 && delimiter.values[0] === ';',
        `Can't process joinStrings() expression: only support ';' as delimiter`,
      );

      // operator
      assertTrue(
        this.isCompatibleWithColumn(aggregateColumnState.projectionColumnState),
        `Can't process joinStrings() expression: property is not compatible with operator`,
      );
      aggregateColumnState.setOperator(this);

      return aggregateColumnState;
    }

    return undefined;
  }

  override getReturnType(
    aggregateColumnState: QueryBuilderAggregateColumnState,
  ): Type {
    const graph =
      aggregateColumnState.aggregationState.projectionState.queryBuilderState
        .graphManagerState.graph;
    return graph.getType(PRIMITIVE_TYPE.STRING);
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_HASH_STRUCTURE.AGGREGATE_OPERATOR_JOIN_STRING,
    ]);
  }
}

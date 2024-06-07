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
  matchFunctionName,
  PRIMITIVE_TYPE,
  type ValueSpecification,
  SimpleFunctionExpression,
  VariableExpression,
  type PureModel,
  type AbstractPropertyExpression,
  GenericType,
  GenericTypeExplicitReference,
  Multiplicity,
  PrimitiveInstanceValue,
  PrimitiveType,
  extractElementNameFromPath,
} from '@finos/legend-graph';
import { QueryBuilderAggregateColumnState } from '../QueryBuilderAggregationState.js';
import { QueryBuilderAggregateOperator } from '../QueryBuilderAggregateOperator.js';
import {
  type QueryBuilderProjectionColumnState,
  QueryBuilderSimpleProjectionColumnState,
} from '../../projection/QueryBuilderProjectionColumnState.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../../../graph/QueryBuilderMetaModelConst.js';
import {
  type Hashable,
  hashArray,
  assertTrue,
  guaranteeType,
} from '@finos/legend-shared';
import { QUERY_BUILDER_STATE_HASH_STRUCTURE } from '../../../../QueryBuilderStateHashUtils.js';

export class QueryBuilderAggregateOperator_Percentile
  extends QueryBuilderAggregateOperator
  implements Hashable
{
  percentile = 0;
  acending: boolean | undefined = undefined;
  continuous: boolean | undefined = undefined;

  getLabel(projectionColumnState: QueryBuilderProjectionColumnState): string {
    return 'percentile';
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
    const expression = new SimpleFunctionExpression(
      extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.PERCENTILE),
    );
    const percentile = new PrimitiveInstanceValue(
      GenericTypeExplicitReference.create(
        new GenericType(PrimitiveType.NUMBER),
      ),
    );
    percentile.values = [this.percentile];
    if (
      this.acending === undefined ||
      this.continuous === undefined ||
      (this.acending && this.continuous)
    ) {
      expression.parametersValues.push(
        new VariableExpression(variableName, Multiplicity.ONE),
        percentile,
      );
    } else {
      const acending = new PrimitiveInstanceValue(
        GenericTypeExplicitReference.create(
          new GenericType(PrimitiveType.BOOLEAN),
        ),
      );
      acending.values = [this.acending];
      const continuous = new PrimitiveInstanceValue(
        GenericTypeExplicitReference.create(
          new GenericType(PrimitiveType.BOOLEAN),
        ),
      );
      continuous.values = [this.continuous];
      expression.parametersValues.push(
        new VariableExpression(variableName, Multiplicity.ONE),
        percentile,
        acending,
        continuous,
      );
    }
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
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.PERCENTILE,
      )
    ) {
      const aggregateColumnState = new QueryBuilderAggregateColumnState(
        projectionColumnState.tdsState.aggregationState,
        projectionColumnState,
        this,
      );
      aggregateColumnState.setLambdaParameterName(lambdaParam.name);

      assertTrue(
        [2, 4].includes(expression.parametersValues.length),
        `Can't process percentile() expression: percentile() expects 2 or 4 argument`,
      );

      // variable
      const variableExpression = guaranteeType(
        expression.parametersValues[0],
        VariableExpression,
        `Can't process percentile() expression: only support percentile() immediately following a variable expression`,
      );
      assertTrue(
        aggregateColumnState.lambdaParameterName === variableExpression.name,
        `Can't process percentile() expression: expects variable used in lambda body '${variableExpression.name}' to match lambda parameter '${aggregateColumnState.lambdaParameterName}'`,
      );
      const percentile = guaranteeType(
        expression.parametersValues[1],
        PrimitiveInstanceValue,
        `Can't process percentile() expression: percentile() expects arugment #2 to be a primitive instance value`,
      );
      this.percentile = percentile.values[0] as number;

      if (expression.parametersValues.length === 4) {
        const acending = guaranteeType(
          expression.parametersValues[2],
          PrimitiveInstanceValue,
          `Can't process percentile() expression: percentile() expects arugment #3 to be a primitive instance value`,
        );
        this.acending = acending.values[0] as boolean;
        const continuous = guaranteeType(
          expression.parametersValues[3],
          PrimitiveInstanceValue,
          `Can't process percentile() expression: percentile() expects arugment #4 to be a primitive instance value`,
        );
        this.continuous = continuous.values[0] as boolean;
      }
      // operator
      assertTrue(
        this.isCompatibleWithColumn(aggregateColumnState.projectionColumnState),
        `Can't process percentile() expression: property is not compatible with operator`,
      );
      aggregateColumnState.setOperator(this);
      return aggregateColumnState;
    }

    return undefined;
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.AGGREGATE_OPERATOR_PERCENTILE,
    ]);
  }
}

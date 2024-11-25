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
  PRIMITIVE_TYPE,
  type ValueSpecification,
  type SimpleFunctionExpression,
  type VariableExpression,
  type PureModel,
  type AbstractPropertyExpression,
  matchFunctionName,
} from '@finos/legend-graph';
import { QueryBuilderAggregateColumnState } from '../QueryBuilderAggregationState.js';
import { QueryBuilderAggregateOperator } from '../QueryBuilderAggregateOperator.js';
import {
  type QueryBuilderProjectionColumnState,
  QueryBuilderSimpleProjectionColumnState,
} from '../../projection/QueryBuilderProjectionColumnState.js';
import { buildAggregateExpression } from './QueryBuilderAggregateOperatorValueSpecificationBuilder.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../../../graph/QueryBuilderMetaModelConst.js';
import { type Hashable, hashArray, guaranteeType } from '@finos/legend-shared';
import { QUERY_BUILDER_STATE_HASH_STRUCTURE } from '../../../../QueryBuilderStateHashUtils.js';
import { action, makeObservable, observable } from 'mobx';

export class QueryBuilderAggregateOperator_Wavg
  extends QueryBuilderAggregateOperator
  implements Hashable
{
  weight: AbstractPropertyExpression | undefined;

  constructor() {
    super();
    makeObservable(this, {
      weight: observable,
      setWeight: action,
    });
  }

  setWeight(val: AbstractPropertyExpression | undefined) {
    this.weight = val;
  }

  getLabel(projectionColumnState?: QueryBuilderProjectionColumnState): string {
    return 'wavg';
  }

  getName(projectionColumnState: QueryBuilderProjectionColumnState): string {
    return projectionColumnState.columnName;
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
    return false;
  }

  buildAggregateExpression(
    propertyExpression: AbstractPropertyExpression | undefined,
    variableName: string,
    graph: PureModel,
  ): ValueSpecification {
    return buildAggregateExpression(
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.WAVG,
      variableName,
      graph,
    );
  }

  buildAggregateColumnState(
    expression: SimpleFunctionExpression,
    lambdaParam: VariableExpression,
    projectionColumnState: QueryBuilderProjectionColumnState,
  ): QueryBuilderAggregateColumnState | undefined {
    if (
      matchFunctionName(
        expression.functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.WAVG,
      )
    ) {
      const aggregateColumnState = new QueryBuilderAggregateColumnState(
        projectionColumnState.tdsState.aggregationState,
        projectionColumnState,
        new QueryBuilderAggregateOperator_Wavg(),
      );

      const currentOperator = guaranteeType(
        aggregateColumnState.operator,
        QueryBuilderAggregateOperator_Wavg,
      );

      aggregateColumnState.setLambdaParameterName(lambdaParam.name);

      aggregateColumnState.setOperator(currentOperator);
      return aggregateColumnState;
    }
    return undefined;
  }

  override get getOperator(): QueryBuilderAggregateOperator {
    return new QueryBuilderAggregateOperator_Wavg();
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.AGGREGATE_OPERATOR_WAVG,
    ]);
  }
}

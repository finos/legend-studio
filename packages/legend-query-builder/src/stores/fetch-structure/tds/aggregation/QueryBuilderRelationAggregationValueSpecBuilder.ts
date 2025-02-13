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
  ColSpecArray,
  type ValueSpecification,
  extractElementNameFromPath,
  SimpleFunctionExpression,
  ColSpecArrayInstance,
  Multiplicity,
  ColSpec,
  GenericType,
  GenericTypeExplicitReference,
  Relation,
  RelationColumn,
  RelationType,
  LambdaFunctionInstanceValue,
  AbstractPropertyExpression,
  PropertyExplicitReference,
  Property,
  VariableExpression,
} from '@finos/legend-graph';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../../graph/QueryBuilderMetaModelConst.js';
import type { QueryBuilderTDSState } from '../QueryBuilderTDSState.js';
import { buildGenericLambdaFunctionInstanceValue } from '../../../QueryBuilderValueSpecificationHelper.js';
import { type LambdaFunctionBuilderOption } from '../../../QueryBuilderValueSpecificationBuilderHelper.js';
import {
  guaranteeNonNullable,
  guaranteeType,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { DEFAULT_LAMBDA_VARIABLE_NAME } from '@finos/legend-data-cube';

export const buildRelationAggregation = (
  precedingExpression: ValueSpecification,
  tdsState: QueryBuilderTDSState,
  options?: LambdaFunctionBuilderOption,
): SimpleFunctionExpression => {
  const projectFunction = guaranteeType(
    precedingExpression,
    SimpleFunctionExpression,
  );
  if (
    projectFunction.functionName !==
    extractElementNameFromPath(
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.RELATION_PROJECT,
    )
  ) {
    throw new UnsupportedOperationError(
      `Can't build relation groupBy() expression: previous expression must be project() column expression`,
    );
  }
  const groupByFunction = new SimpleFunctionExpression(
    extractElementNameFromPath(
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.RELATION_GROUP_BY,
    ),
  );
  const queryBuilderState = tdsState.queryBuilderState;

  const groupByCols = new ColSpecArrayInstance(Multiplicity.ONE, undefined);
  const aggregationCols = new ColSpecArrayInstance(Multiplicity.ONE, undefined);

  const groupByColSpecArray = new ColSpecArray();
  groupByCols.values = [groupByColSpecArray];

  const aggregationColSpecArray = new ColSpecArray();
  aggregationCols.values = [aggregationColSpecArray];

  const relationType = new RelationType(RelationType.ID);

  // Add non-aggregated columns to groupByCols
  tdsState.projectionColumns
    .filter(
      (projectionColumnState) =>
        !tdsState.aggregationState.columns.some(
          (aggregationColumnState) =>
            aggregationColumnState.projectionColumnState ===
            projectionColumnState,
        ),
    )
    .forEach((projectionColumnState) => {
      // Create and add column to groupByColSpecArray
      const colSpec = new ColSpec();
      groupByColSpecArray.colSpecs.push(colSpec);
      colSpec.name = projectionColumnState.columnName;

      // Add column return type to relationType
      const returnType = guaranteeNonNullable(
        projectionColumnState.getColumnType(),
        `Can't create value spec for projection column ${projectionColumnState.columnName}`,
      );
      relationType.columns.push(
        new RelationColumn(projectionColumnState.columnName, returnType),
      );
    });

  // Add aggregated columns to aggregationCols
  tdsState.aggregationState.columns.forEach((aggregationColumnState) => {
    // Create and add column to aggregationColSpecArray
    const colSpec = new ColSpec();
    aggregationColSpecArray.colSpecs.push(colSpec);
    colSpec.name = aggregationColumnState.columnName;

    // Aggregation projection (function1)
    const projectedColSpec = guaranteeNonNullable(
      guaranteeNonNullable(
        (projectFunction.parametersValues[1] as ColSpecArrayInstance).values[0],
        'Could not find ColSpec array in project() function first parameter',
      ).colSpecs.find(
        (_colSpec) => _colSpec.name === aggregationColumnState.columnName,
      ),
      `Could not find projected column matching matching aggregation column '${aggregationColumnState.columnName}'`,
    );
    const projectedPropertyExpression = guaranteeType(
      guaranteeType(projectedColSpec.function1, LambdaFunctionInstanceValue)
        .values[0]?.expressionSequence[0],
      AbstractPropertyExpression,
    );
    const projectedProperty = guaranteeType(
      projectedPropertyExpression.func.value,
      Property,
    );
    const newPropertyExpression = new AbstractPropertyExpression('');
    newPropertyExpression.func = PropertyExplicitReference.create(
      new Property(
        projectedColSpec.name,
        projectedProperty.multiplicity,
        projectedProperty.genericType,
        projectedProperty._OWNER,
      ),
    );
    newPropertyExpression.parametersValues = [
      new VariableExpression(DEFAULT_LAMBDA_VARIABLE_NAME, Multiplicity.ONE),
    ];
    const columnLambda = buildGenericLambdaFunctionInstanceValue(
      DEFAULT_LAMBDA_VARIABLE_NAME,
      [newPropertyExpression],
      queryBuilderState.graphManagerState.graph,
    );
    colSpec.function1 = columnLambda;

    // Aggregation operation (function2)
    const aggregateLambda = buildGenericLambdaFunctionInstanceValue(
      aggregationColumnState.lambdaParameterName,
      [
        aggregationColumnState.operator.buildAggregateExpressionFromState(
          aggregationColumnState,
        ),
      ],
      aggregationColumnState.aggregationState.tdsState.queryBuilderState
        .graphManagerState.graph,
    );
    colSpec.function2 = aggregateLambda;

    // Add column return type to relationType
    const returnType = guaranteeNonNullable(
      aggregationColumnState.getColumnType(),
      `Can't create value spec for aggregation column ${aggregationColumnState.columnName}`,
    );
    relationType.columns.push(
      new RelationColumn(aggregationColumnState.columnName, returnType),
    );
  });

  groupByFunction.parametersValues = [
    precedingExpression,
    groupByCols,
    aggregationCols,
  ];
  const relationGenericType = new GenericType(Relation.INSTANCE);
  const relationTypeGenericType = new GenericType(relationType);
  relationGenericType.typeArguments = [
    GenericTypeExplicitReference.create(relationTypeGenericType),
  ];
  groupByFunction.genericType =
    GenericTypeExplicitReference.create(relationGenericType);
  return groupByFunction;
};

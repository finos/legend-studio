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
import {
  guaranteeNonNullable,
  guaranteeType,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { DEFAULT_LAMBDA_VARIABLE_NAME } from '@finos/legend-data-cube';

export const buildRelationAggregation = (
  precedingExpression: ValueSpecification,
  tdsState: QueryBuilderTDSState,
): SimpleFunctionExpression => {
  // Verify that preceding expression is a relation project
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

  // Build groupBy() expression
  const groupByFunction = new SimpleFunctionExpression(
    extractElementNameFromPath(
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.RELATION_GROUP_BY,
    ),
  );
  const queryBuilderState = tdsState.queryBuilderState;

  // Build normal (grouped) columns
  const groupByCols = new ColSpecArrayInstance(Multiplicity.ONE, undefined);
  const groupByColSpecArray = new ColSpecArray();
  groupByCols.values = [groupByColSpecArray];

  // Build aggregation columns
  const aggregationCols = new ColSpecArrayInstance(Multiplicity.ONE, undefined);
  const aggregationColSpecArray = new ColSpecArray();
  aggregationCols.values = [aggregationColSpecArray];

  // Build relation return type
  const relationType = new RelationType(RelationType.ID);

  // Add normal (non-aggregated) columns to groupByCols
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
      colSpec.name = projectionColumnState.columnName;
      groupByColSpecArray.colSpecs.push(colSpec);

      // Add column return type to relationType
      const returnType = guaranteeNonNullable(
        projectionColumnState.getColumnType(),
        `Can't create value spec for projection column ${projectionColumnState.columnName}. Missing type.`,
      );
      relationType.columns.push(
        new RelationColumn(
          projectionColumnState.columnName,
          GenericTypeExplicitReference.create(new GenericType(returnType)),
        ),
      );
    });

  // Add aggregation columns to aggregationCols
  tdsState.aggregationState.columns.forEach((aggregationColumnState) => {
    // Create and add column to aggregationColSpecArray
    const colSpec = new ColSpec();
    colSpec.name = aggregationColumnState.columnName;
    aggregationColSpecArray.colSpecs.push(colSpec);

    // Build map function (function1)
    // First, get the ColSpec from the preceding projection so we can get the name of the projected column.
    const projectionColSpec = guaranteeNonNullable(
      guaranteeNonNullable(
        (projectFunction.parametersValues[1] as ColSpecArrayInstance).values[0],
        'Could not find ColSpec array in project() function first parameter',
      ).colSpecs.find(
        (_colSpec) => _colSpec.name === aggregationColumnState.columnName,
      ),
      `Could not find projected column matching aggregation column '${aggregationColumnState.columnName}'`,
    );
    const projectedPropertyExpression = guaranteeType(
      guaranteeType(projectionColSpec.function1, LambdaFunctionInstanceValue)
        .values[0]?.expressionSequence[0],
      AbstractPropertyExpression,
    );
    const projectedProperty = guaranteeType(
      projectedPropertyExpression.func.value,
      Property,
    );
    // Second, build a new AbstractPropertyExpression for our map function
    const newPropertyExpression = new AbstractPropertyExpression('');
    newPropertyExpression.func = PropertyExplicitReference.create(
      new Property(
        projectionColSpec.name,
        projectedProperty.multiplicity,
        projectedProperty.genericType,
        projectedProperty._OWNER,
      ),
    );
    newPropertyExpression.parametersValues = [
      new VariableExpression(DEFAULT_LAMBDA_VARIABLE_NAME, Multiplicity.ONE),
    ];
    const mapLambda = buildGenericLambdaFunctionInstanceValue(
      DEFAULT_LAMBDA_VARIABLE_NAME,
      [newPropertyExpression],
      queryBuilderState.graphManagerState.graph,
    );
    colSpec.function1 = mapLambda;

    // Reduce function (function2)
    const reduceLambda = buildGenericLambdaFunctionInstanceValue(
      aggregationColumnState.lambdaParameterName,
      [
        aggregationColumnState.operator.buildAggregateExpressionFromState(
          aggregationColumnState,
        ),
      ],
      aggregationColumnState.aggregationState.tdsState.queryBuilderState
        .graphManagerState.graph,
    );
    colSpec.function2 = reduceLambda;

    // Add column return type to relationType
    const returnType = guaranteeNonNullable(
      aggregationColumnState.getColumnType(),
      `Can't create value spec for aggregation column ${aggregationColumnState.columnName}. Missing type.`,
    );
    relationType.columns.push(
      new RelationColumn(
        aggregationColumnState.columnName,
        GenericTypeExplicitReference.create(new GenericType(returnType)),
      ),
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

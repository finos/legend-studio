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
  type LambdaFunction,
  CollectionInstanceValue,
  extractElementNameFromPath,
  GenericType,
  GenericTypeExplicitReference,
  Multiplicity,
  PrimitiveInstanceValue,
  PRIMITIVE_TYPE,
  SimpleFunctionExpression,
  TYPICAL_MULTIPLICITY_TYPE,
  type ValueSpecification,
  INTERNAL__UnknownValueSpecification,
  V1_serializeRawValueSpecification,
  V1_transformRawLambda,
  V1_GraphTransformerContextBuilder,
  matchFunctionName,
} from '@finos/legend-graph';
import {
  guaranteeNonNullable,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../graphManager/QueryBuilderSupportedFunctions.js';
import { buildPropertyExpressionChain } from '../../QueryBuilderValueSpecificationBuilderHelper.js';
import { buildGenericLambdaFunctionInstanceValue } from '../../QueryBuilderValueSpecificationHelper.js';
import { appendPostFilter } from './post-filter/QueryBuilderPostFilterValueSpecificationBuilder.js';
import {
  QueryBuilderDerivationProjectionColumnState,
  QueryBuilderSimpleProjectionColumnState,
} from './QueryBuilderProjectionColumnState.js';
import type { QueryBuilderProjectionState } from './QueryBuilderProjectionState.js';
import {
  COLUMN_SORT_TYPE,
  type QueryResultSetModifierState,
  type SortColumnState,
} from './QueryResultSetModifierState.js';

const buildSortExpression = (
  sortColumnState: SortColumnState,
): SimpleFunctionExpression => {
  const multiplicityOne =
    sortColumnState.columnState.projectionState.queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
      TYPICAL_MULTIPLICITY_TYPE.ONE,
    );
  const sortColumnFunction = new SimpleFunctionExpression(
    extractElementNameFromPath(
      sortColumnState.sortType === COLUMN_SORT_TYPE.ASC
        ? QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_ASC
        : QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_DESC,
    ),
    multiplicityOne,
  );
  const sortColumnName = new PrimitiveInstanceValue(
    GenericTypeExplicitReference.create(
      new GenericType(
        sortColumnState.columnState.projectionState.queryBuilderState.graphManagerState.graph.getPrimitiveType(
          PRIMITIVE_TYPE.STRING,
        ),
      ),
    ),
    multiplicityOne,
  );
  sortColumnName.values = [sortColumnState.columnState.columnName];
  sortColumnFunction.parametersValues[0] = sortColumnName;
  return sortColumnFunction;
};

const appendResultSetModifier = (
  resultModifierState: QueryResultSetModifierState,
  lambdaFunction: LambdaFunction,
  options?:
    | {
        overridingLimit?: number | undefined;
      }
    | undefined,
): LambdaFunction => {
  const multiplicityOne =
    resultModifierState.projectionState.queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
      TYPICAL_MULTIPLICITY_TYPE.ONE,
    );
  if (lambdaFunction.expressionSequence.length === 1) {
    const func = lambdaFunction.expressionSequence[0];
    if (func instanceof SimpleFunctionExpression) {
      if (
        matchFunctionName(func.functionName, [
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_PROJECT,
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_GROUP_BY,
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_FILTER,
        ])
      ) {
        let currentExpression = func;

        // build distinct()
        if (resultModifierState.distinct) {
          const distinctFunction = new SimpleFunctionExpression(
            extractElementNameFromPath(
              QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_DISTINCT,
            ),
            multiplicityOne,
          );
          distinctFunction.parametersValues[0] = currentExpression;
          currentExpression = distinctFunction;
        }

        // build sort()
        if (resultModifierState.sortColumns.length) {
          const sortFunction = new SimpleFunctionExpression(
            extractElementNameFromPath(
              QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_SORT,
            ),
            multiplicityOne,
          );
          const multiplicity = new Multiplicity(
            resultModifierState.sortColumns.length,
            resultModifierState.sortColumns.length,
          );
          const collection = new CollectionInstanceValue(
            multiplicity,
            undefined,
          );
          collection.values =
            resultModifierState.sortColumns.map(buildSortExpression);
          sortFunction.parametersValues[0] = currentExpression;
          sortFunction.parametersValues[1] = collection;
          currentExpression = sortFunction;
        }

        // build take()
        if (resultModifierState.limit || options?.overridingLimit) {
          const limit = new PrimitiveInstanceValue(
            GenericTypeExplicitReference.create(
              new GenericType(
                resultModifierState.projectionState.queryBuilderState.graphManagerState.graph.getPrimitiveType(
                  PRIMITIVE_TYPE.INTEGER,
                ),
              ),
            ),
            multiplicityOne,
          );
          limit.values = [
            Math.min(
              resultModifierState.limit ?? Number.MAX_SAFE_INTEGER,
              options?.overridingLimit ?? Number.MAX_SAFE_INTEGER,
            ),
          ];
          const takeFunction = new SimpleFunctionExpression(
            extractElementNameFromPath(
              QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_TAKE,
            ),
            multiplicityOne,
          );
          takeFunction.parametersValues[0] = currentExpression;
          takeFunction.parametersValues[1] = limit;
          currentExpression = takeFunction;
        }
        lambdaFunction.expressionSequence[0] = currentExpression;
        return lambdaFunction;
      }
    }
  }
  return lambdaFunction;
};

export const appendProjection = (
  projectionState: QueryBuilderProjectionState,
  lambdaFunction: LambdaFunction,
  options?: {
    /**
     * Set queryBuilderState to `true` when we construct query for execution within the app.
     * queryBuilderState will make the lambda function building process overrides several query values, such as the row limit.
     */
    isBuildingExecutionQuery?: boolean | undefined;
    keepSourceInformation?: boolean | undefined;
  },
): void => {
  const queryBuilderState = projectionState.queryBuilderState;
  const precedingExpression = guaranteeNonNullable(
    lambdaFunction.expressionSequence[0],
    `Can't build projection expression: preceding expression is not defined`,
  );
  const multiplicityOne =
    queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
      TYPICAL_MULTIPLICITY_TYPE.ONE,
    );
  const typeString = queryBuilderState.graphManagerState.graph.getPrimitiveType(
    PRIMITIVE_TYPE.STRING,
  );

  // build projection
  if (projectionState.aggregationState.columns.length) {
    // aggregation
    const groupByFunction = new SimpleFunctionExpression(
      extractElementNameFromPath(
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_GROUP_BY,
      ),
      multiplicityOne,
    );

    const colLambdas = new CollectionInstanceValue(
      new Multiplicity(
        projectionState.columns.length -
          projectionState.aggregationState.columns.length,
        projectionState.columns.length -
          projectionState.aggregationState.columns.length,
      ),
    );
    const aggregateLambdas = new CollectionInstanceValue(
      new Multiplicity(
        projectionState.aggregationState.columns.length,
        projectionState.aggregationState.columns.length,
      ),
    );
    const colAliases = new CollectionInstanceValue(
      new Multiplicity(
        projectionState.columns.length,
        projectionState.columns.length,
      ),
    );
    projectionState.columns.forEach((projectionColumnState) => {
      // column alias
      const colAlias = new PrimitiveInstanceValue(
        GenericTypeExplicitReference.create(new GenericType(typeString)),
        multiplicityOne,
      );
      colAlias.values.push(projectionColumnState.columnName);
      colAliases.values.push(colAlias);

      const aggregateColumnState =
        projectionState.aggregationState.columns.find(
          (column) => column.projectionColumnState === projectionColumnState,
        );

      // column projection
      let columnLambda: ValueSpecification;
      if (
        projectionColumnState instanceof QueryBuilderSimpleProjectionColumnState
      ) {
        columnLambda = buildGenericLambdaFunctionInstanceValue(
          projectionColumnState.lambdaParameterName,
          [
            buildPropertyExpressionChain(
              projectionColumnState.propertyExpressionState.propertyExpression,
              projectionColumnState.propertyExpressionState.queryBuilderState,
              true,
            ),
          ],
          queryBuilderState.graphManagerState.graph,
        );
      } else if (
        projectionColumnState instanceof
        QueryBuilderDerivationProjectionColumnState
      ) {
        columnLambda = new INTERNAL__UnknownValueSpecification(
          V1_serializeRawValueSpecification(
            V1_transformRawLambda(
              projectionColumnState.lambda,
              new V1_GraphTransformerContextBuilder(
                // TODO?: do we need to include the plugins here?
                [],
              )
                .withKeepSourceInformationFlag(
                  Boolean(options?.keepSourceInformation),
                )
                .build(),
            ),
          ),
        );
      } else {
        throw new UnsupportedOperationError(
          `Can't build project() column expression: unsupported projection column state`,
          projectionColumnState,
        );
      }

      // column aggregation
      if (aggregateColumnState) {
        const aggregateFunctionExpression = new SimpleFunctionExpression(
          extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_AGG),
          multiplicityOne,
        );
        const aggregateLambda = buildGenericLambdaFunctionInstanceValue(
          aggregateColumnState.lambdaParameterName,
          [
            aggregateColumnState.operator.buildAggregateExpressionFromState(
              aggregateColumnState,
            ),
          ],
          aggregateColumnState.aggregationState.projectionState
            .queryBuilderState.graphManagerState.graph,
        );
        aggregateFunctionExpression.parametersValues = [
          columnLambda,
          aggregateLambda,
        ];
        aggregateLambdas.values.push(aggregateFunctionExpression);
      } else {
        colLambdas.values.push(columnLambda);
      }
    });
    groupByFunction.parametersValues = [
      precedingExpression,
      colLambdas,
      aggregateLambdas,
      colAliases,
    ];
    lambdaFunction.expressionSequence[0] = groupByFunction;
  } else if (projectionState.columns.length) {
    // projection
    const projectFunction = new SimpleFunctionExpression(
      extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_PROJECT),
      multiplicityOne,
    );
    const colLambdas = new CollectionInstanceValue(
      new Multiplicity(
        projectionState.columns.length,
        projectionState.columns.length,
      ),
    );
    const colAliases = new CollectionInstanceValue(
      new Multiplicity(
        projectionState.columns.length,
        projectionState.columns.length,
      ),
    );
    projectionState.columns.forEach((projectionColumnState) => {
      // column alias
      const colAlias = new PrimitiveInstanceValue(
        GenericTypeExplicitReference.create(new GenericType(typeString)),
        multiplicityOne,
      );
      colAlias.values.push(projectionColumnState.columnName);
      colAliases.values.push(colAlias);

      // column projection
      let columnLambda: ValueSpecification;
      if (
        projectionColumnState instanceof QueryBuilderSimpleProjectionColumnState
      ) {
        columnLambda = buildGenericLambdaFunctionInstanceValue(
          projectionColumnState.lambdaParameterName,
          [
            buildPropertyExpressionChain(
              projectionColumnState.propertyExpressionState.propertyExpression,
              projectionColumnState.propertyExpressionState.queryBuilderState,
            ),
          ],
          queryBuilderState.graphManagerState.graph,
        );
      } else if (
        projectionColumnState instanceof
        QueryBuilderDerivationProjectionColumnState
      ) {
        columnLambda = new INTERNAL__UnknownValueSpecification(
          V1_serializeRawValueSpecification(
            V1_transformRawLambda(
              projectionColumnState.lambda,
              new V1_GraphTransformerContextBuilder(
                // TODO?: do we need to include the plugins here?
                [],
              )
                .withKeepSourceInformationFlag(
                  Boolean(options?.keepSourceInformation),
                )
                .build(),
            ),
          ),
        );
      } else {
        throw new UnsupportedOperationError(
          `Can't build project() column expression: unsupported projection column state`,
          projectionColumnState,
        );
      }
      colLambdas.values.push(columnLambda);
    });
    projectFunction.parametersValues = [
      precedingExpression,
      colLambdas,
      colAliases,
    ];
    lambdaFunction.expressionSequence[0] = projectFunction;
  }

  // build post-filter
  appendPostFilter(projectionState.postFilterState, lambdaFunction);

  // build result set modifiers
  appendResultSetModifier(
    projectionState.resultSetModifierState,
    lambdaFunction,
    {
      overridingLimit: options?.isBuildingExecutionQuery
        ? queryBuilderState.resultState.previewLimit
        : undefined,
    },
  );
};

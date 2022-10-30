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
  PrimitiveInstanceValue,
  PRIMITIVE_TYPE,
  SimpleFunctionExpression,
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
import {
  QueryBuilderDerivationProjectionColumnState,
  QueryBuilderSimpleProjectionColumnState,
} from './QueryBuilderProjectionColumnState.js';
import type { QueryBuilderTDSState } from '../QueryBuilderTDSState.js';
import {
  COLUMN_SORT_TYPE,
  type QueryResultSetModifierState,
  type SortColumnState,
} from '../QueryResultSetModifierState.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../../graphManager/QueryBuilderSupportedFunctions.js';
import { buildGenericLambdaFunctionInstanceValue } from '../../../QueryBuilderValueSpecificationHelper.js';
import { buildPropertyExpressionChain } from '../../../QueryBuilderValueSpecificationBuilderHelper.js';
import { appendOlapGroupByState } from '../olapGroupBy/QueryBuilderOlapGroupByValueSpecificationBuilder.js';
import { appendPostFilter } from '../post-filter/QueryBuilderPostFilterValueSpecificationBuilder.js';

const buildSortExpression = (
  sortColumnState: SortColumnState,
): SimpleFunctionExpression => {
  const sortColumnFunction = new SimpleFunctionExpression(
    extractElementNameFromPath(
      sortColumnState.sortType === COLUMN_SORT_TYPE.ASC
        ? QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_ASC
        : QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_DESC,
    ),
  );
  const sortColumnName = new PrimitiveInstanceValue(
    GenericTypeExplicitReference.create(
      new GenericType(
        sortColumnState.columnState.tdsState.queryBuilderState.graphManagerState.graph.getPrimitiveType(
          PRIMITIVE_TYPE.STRING,
        ),
      ),
    ),
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
          );
          const multiplicity =
            resultModifierState.tdsState.queryBuilderState.graphManagerState.graph.getMultiplicity(
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
                resultModifierState.tdsState.queryBuilderState.graphManagerState.graph.getPrimitiveType(
                  PRIMITIVE_TYPE.INTEGER,
                ),
              ),
            ),
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
  tdsState: QueryBuilderTDSState,
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
  const queryBuilderState = tdsState.queryBuilderState;
  const precedingExpression = guaranteeNonNullable(
    lambdaFunction.expressionSequence[0],
    `Can't build projection expression: preceding expression is not defined`,
  );
  const typeString = queryBuilderState.graphManagerState.graph.getPrimitiveType(
    PRIMITIVE_TYPE.STRING,
  );

  // build projection
  if (tdsState.aggregationState.columns.length) {
    // aggregation
    const groupByFunction = new SimpleFunctionExpression(
      extractElementNameFromPath(
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_GROUP_BY,
      ),
    );

    const colLambdas = new CollectionInstanceValue(
      queryBuilderState.graphManagerState.graph.getMultiplicity(
        tdsState.projectionColumns.length -
          tdsState.aggregationState.columns.length,
        tdsState.projectionColumns.length -
          tdsState.aggregationState.columns.length,
      ),
    );
    const aggregateLambdas = new CollectionInstanceValue(
      queryBuilderState.graphManagerState.graph.getMultiplicity(
        tdsState.aggregationState.columns.length,
        tdsState.aggregationState.columns.length,
      ),
    );
    const colAliases = new CollectionInstanceValue(
      queryBuilderState.graphManagerState.graph.getMultiplicity(
        tdsState.projectionColumns.length,
        tdsState.projectionColumns.length,
      ),
    );
    tdsState.projectionColumns.forEach((projectionColumnState) => {
      // column alias
      const colAlias = new PrimitiveInstanceValue(
        GenericTypeExplicitReference.create(new GenericType(typeString)),
      );
      colAlias.values.push(projectionColumnState.columnName);
      colAliases.values.push(colAlias);

      const aggregateColumnState = tdsState.aggregationState.columns.find(
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
        );
        const aggregateLambda = buildGenericLambdaFunctionInstanceValue(
          aggregateColumnState.lambdaParameterName,
          [
            aggregateColumnState.operator.buildAggregateExpressionFromState(
              aggregateColumnState,
            ),
          ],
          aggregateColumnState.aggregationState.tdsState.queryBuilderState
            .graphManagerState.graph,
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
  } else if (tdsState.projectionColumns.length) {
    // projection
    const projectFunction = new SimpleFunctionExpression(
      extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_PROJECT),
    );
    const colLambdas = new CollectionInstanceValue(
      queryBuilderState.graphManagerState.graph.getMultiplicity(
        tdsState.projectionColumns.length,
        tdsState.projectionColumns.length,
      ),
    );
    const colAliases = new CollectionInstanceValue(
      queryBuilderState.graphManagerState.graph.getMultiplicity(
        tdsState.projectionColumns.length,
        tdsState.projectionColumns.length,
      ),
    );
    tdsState.projectionColumns.forEach((projectionColumnState) => {
      // column alias
      const colAlias = new PrimitiveInstanceValue(
        GenericTypeExplicitReference.create(new GenericType(typeString)),
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

  // build olapGroupBy
  appendOlapGroupByState(tdsState.olapGroupByState, lambdaFunction);

  // build post-filter
  appendPostFilter(tdsState.postFilterState, lambdaFunction);

  // build result set modifiers
  appendResultSetModifier(tdsState.resultSetModifierState, lambdaFunction, {
    overridingLimit: options?.isBuildingExecutionQuery
      ? queryBuilderState.resultState.previewLimit
      : undefined,
  });
};

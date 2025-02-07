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
  type ValueSpecification,
  CollectionInstanceValue,
  extractElementNameFromPath,
  GenericType,
  GenericTypeExplicitReference,
  PrimitiveInstanceValue,
  SimpleFunctionExpression,
  INTERNAL__UnknownValueSpecification,
  V1_serializeRawValueSpecification,
  V1_transformRawLambda,
  V1_GraphTransformerContextBuilder,
  PrimitiveType,
  LambdaFunctionInstanceValue,
} from '@finos/legend-graph';
import {
  at,
  guaranteeNonNullable,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import {
  type QueryBuilderProjectionColumnState,
  QueryBuilderDerivationProjectionColumnState,
  QueryBuilderSimpleProjectionColumnState,
} from './QueryBuilderProjectionColumnState.js';
import type { QueryBuilderTDSState } from '../QueryBuilderTDSState.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../../graph/QueryBuilderMetaModelConst.js';
import { buildGenericLambdaFunctionInstanceValue } from '../../../QueryBuilderValueSpecificationHelper.js';
import {
  buildPropertyExpressionChain,
  type LambdaFunctionBuilderOption,
} from '../../../QueryBuilderValueSpecificationBuilderHelper.js';
import { appendOLAPGroupByState } from '../window/QueryBuilderWindowValueSpecificationBuilder.js';
import { appendPostFilter } from '../post-filter/QueryBuilderPostFilterValueSpecificationBuilder.js';
import { buildRelationProjection } from './QueryBuilderRelationProjectValueSpecBuilder.js';
import { QueryBuilderAggregateOperator_Wavg } from '../aggregation/operators/QueryBuilderAggregateOperator_Wavg.js';
import { appendResultSetModifier } from '../result-modifier/ResultModifierValueSpecificationBuilder.js';
import { buildRelationAggregation } from '../aggregation/QueryBuilderRelationAggregationValueSpecBuilder.js';

const buildProjectColFunc = (
  tdsState: QueryBuilderTDSState,
  projectionColumnState: QueryBuilderProjectionColumnState,
  options?: LambdaFunctionBuilderOption,
): SimpleFunctionExpression => {
  const colFunc = new SimpleFunctionExpression(
    extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_COL),
  );
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
          projectionColumnState.lambdaParameterName,
          options,
        ),
      ],
      tdsState.queryBuilderState.graphManagerState.graph,
    );
  } else if (
    projectionColumnState instanceof QueryBuilderDerivationProjectionColumnState
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
  const colAlias = new PrimitiveInstanceValue(
    GenericTypeExplicitReference.create(new GenericType(PrimitiveType.STRING)),
  );
  colAlias.values.push(projectionColumnState.columnName);
  colFunc.parametersValues = [columnLambda, colAlias];
  return colFunc;
};

export const appendProjection = (
  tdsState: QueryBuilderTDSState,
  lambdaFunction: LambdaFunction,
  options?: LambdaFunctionBuilderOption,
): void => {
  const queryBuilderState = tdsState.queryBuilderState;
  const precedingExpression = guaranteeNonNullable(
    lambdaFunction.expressionSequence[0],
    `Can't build projection expression: preceding expression is not defined`,
  );
  // build projection
  if (
    tdsState.aggregationState.columns.length &&
    !tdsState.queryBuilderState.isFetchStructureTyped
  ) {
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
        GenericTypeExplicitReference.create(
          new GenericType(PrimitiveType.STRING),
        ),
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
              projectionColumnState.lambdaParameterName,
              options,
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
        if (
          aggregateColumnState.operator instanceof
          QueryBuilderAggregateOperator_Wavg
        ) {
          aggregateColumnState.setLambdaParameterName('y');
        }
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
        let aggregateCalendarLambda;
        const aggregateCalendarLambdaState =
          aggregateColumnState.calendarFunction?.buildCalendarFunctionExpressionFromState(
            aggregateColumnState,
            columnLambda,
          );
        if (
          queryBuilderState.isCalendarEnabled &&
          aggregateCalendarLambdaState instanceof SimpleFunctionExpression
        ) {
          aggregateCalendarLambda = buildGenericLambdaFunctionInstanceValue(
            guaranteeNonNullable(aggregateColumnState.calendarFunction)
              .lambdaParameterName,
            [aggregateCalendarLambdaState],
            aggregateColumnState.aggregationState.tdsState.queryBuilderState
              .graphManagerState.graph,
          );
        }
        //TODO support wavg on non SimpleProjectionColumnStates as well
        if (
          aggregateColumnState.operator instanceof
            QueryBuilderAggregateOperator_Wavg &&
          aggregateColumnState.operator.weight &&
          aggregateColumnState.projectionColumnState instanceof
            QueryBuilderSimpleProjectionColumnState &&
          columnLambda instanceof LambdaFunctionInstanceValue
        ) {
          //build row mapper
          const wavgRowMapper = new SimpleFunctionExpression(
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.WAVG_ROW_MAPPER,
          );
          //add params
          const quantity =
            aggregateColumnState.projectionColumnState.propertyExpressionState
              .propertyExpression;
          const weight = aggregateColumnState.operator.weight;
          wavgRowMapper.parametersValues = [quantity, weight];
          if (
            aggregateCalendarLambda &&
            aggregateCalendarLambda instanceof LambdaFunctionInstanceValue
          ) {
            at(aggregateCalendarLambda.values, 0).expressionSequence[0] =
              wavgRowMapper;
          } else if (columnLambda instanceof LambdaFunctionInstanceValue) {
            at(columnLambda.values, 0).expressionSequence[0] = wavgRowMapper;
          }
        }
        aggregateFunctionExpression.parametersValues = [
          aggregateCalendarLambda ?? columnLambda,
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
    if (!tdsState.queryBuilderState.isFetchStructureTyped) {
      // projection
      const projectFunction = new SimpleFunctionExpression(
        extractElementNameFromPath(
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_PROJECT,
        ),
      );
      if (tdsState.useColFunc) {
        const colFuncCollection = new CollectionInstanceValue(
          queryBuilderState.graphManagerState.graph.getMultiplicity(
            tdsState.projectionColumns.length,
            tdsState.projectionColumns.length,
          ),
        );
        tdsState.projectionColumns.forEach((projectionColumnState) => {
          colFuncCollection.values.push(
            buildProjectColFunc(tdsState, projectionColumnState, options),
          );
        });
        projectFunction.parametersValues = [
          precedingExpression,
          colFuncCollection,
        ];
      } else {
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
            GenericTypeExplicitReference.create(
              new GenericType(PrimitiveType.STRING),
            ),
          );
          colAlias.values.push(projectionColumnState.columnName);
          colAliases.values.push(colAlias);

          // column projection
          let columnLambda: ValueSpecification;
          if (
            projectionColumnState instanceof
            QueryBuilderSimpleProjectionColumnState
          ) {
            columnLambda = buildGenericLambdaFunctionInstanceValue(
              projectionColumnState.lambdaParameterName,
              [
                buildPropertyExpressionChain(
                  projectionColumnState.propertyExpressionState
                    .propertyExpression,
                  projectionColumnState.propertyExpressionState
                    .queryBuilderState,
                  projectionColumnState.lambdaParameterName,
                  options,
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
      }
      lambdaFunction.expressionSequence[0] = projectFunction;
    } else {
      const projectFunction = buildRelationProjection(
        precedingExpression,
        tdsState,
        options,
      );
      const aggregationFunction = tdsState.aggregationState.columns.length
        ? buildRelationAggregation(projectFunction, tdsState, options)
        : null;
      lambdaFunction.expressionSequence[0] =
        aggregationFunction ?? projectFunction;
    }
  }
  // build olapGroupBy
  appendOLAPGroupByState(tdsState.windowState, lambdaFunction);

  // build post-filter
  appendPostFilter(tdsState.postFilterState, lambdaFunction);

  // build result set modifiers
  appendResultSetModifier(
    tdsState.resultSetModifierState,
    lambdaFunction,
    tdsState.queryBuilderState.isFetchStructureTyped,
    {
      overridingLimit:
        options?.isBuildingExecutionQuery && !options.isExportingResult
          ? queryBuilderState.resultState.previewLimit
          : undefined,
      withDataOverflowCheck:
        options?.isBuildingExecutionQuery && !options.isExportingResult
          ? options.withDataOverflowCheck
          : undefined,
    },
  );
};

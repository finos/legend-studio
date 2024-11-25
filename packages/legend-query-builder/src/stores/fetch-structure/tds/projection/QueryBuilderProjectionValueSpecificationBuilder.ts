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
  matchFunctionName,
  PrimitiveType,
  LambdaFunctionInstanceValue,
} from '@finos/legend-graph';
import {
  guaranteeNonNullable,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import {
  type QueryBuilderProjectionColumnState,
  QueryBuilderDerivationProjectionColumnState,
  QueryBuilderSimpleProjectionColumnState,
} from './QueryBuilderProjectionColumnState.js';
import type { QueryBuilderTDSState } from '../QueryBuilderTDSState.js';
import {
  type QueryResultSetModifierState,
  type SortColumnState,
} from '../QueryResultSetModifierState.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../../graph/QueryBuilderMetaModelConst.js';
import { buildGenericLambdaFunctionInstanceValue } from '../../../QueryBuilderValueSpecificationHelper.js';
import {
  buildPropertyExpressionChain,
  type LambdaFunctionBuilderOption,
} from '../../../QueryBuilderValueSpecificationBuilderHelper.js';
import { appendOLAPGroupByState } from '../window/QueryBuilderWindowValueSpecificationBuilder.js';
import { appendPostFilter } from '../post-filter/QueryBuilderPostFilterValueSpecificationBuilder.js';
import { buildTDSSortTypeExpression } from '../QueryBuilderTDSHelper.js';
import { buildRelationProjection } from './QueryBuilderRelationProjectValueSpecBuidler.js';
import { QueryBuilderAggregateOperator_Wavg } from '../aggregation/operators/QueryBuilderAggregateOperator_Wavg.js';

const buildSortExpression = (
  sortColumnState: SortColumnState,
): SimpleFunctionExpression =>
  buildTDSSortTypeExpression(
    sortColumnState.sortType,
    sortColumnState.columnState.columnName,
  );

const appendResultSetModifier = (
  resultModifierState: QueryResultSetModifierState,
  lambdaFunction: LambdaFunction,
  options?:
    | {
        overridingLimit?: number | undefined;
        withDataOverflowCheck?: boolean | undefined;
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
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.OLAP_GROUPBY,
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
              new GenericType(PrimitiveType.INTEGER),
            ),
          );
          limit.values = [
            Math.min(
              resultModifierState.limit
                ? options?.withDataOverflowCheck
                  ? resultModifierState.limit + 1
                  : resultModifierState.limit
                : Number.MAX_SAFE_INTEGER,
              options?.overridingLimit
                ? options.withDataOverflowCheck
                  ? options.overridingLimit + 1
                  : options.overridingLimit
                : Number.MAX_SAFE_INTEGER,
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
        // build slice()
        if (resultModifierState.slice) {
          const sliceStart = resultModifierState.slice[0];
          const sliceEnd = resultModifierState.slice[1];
          const startVal = new PrimitiveInstanceValue(
            GenericTypeExplicitReference.create(
              new GenericType(PrimitiveType.INTEGER),
            ),
          );
          const endVal = new PrimitiveInstanceValue(
            GenericTypeExplicitReference.create(
              new GenericType(PrimitiveType.INTEGER),
            ),
          );
          startVal.values = [sliceStart];
          endVal.values = [sliceEnd];
          const sliceFunction = new SimpleFunctionExpression(
            extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.SLICE),
          );
          sliceFunction.parametersValues = [
            currentExpression,
            startVal,
            endVal,
          ];
          currentExpression = sliceFunction;
        }

        lambdaFunction.expressionSequence[0] = currentExpression;
        return lambdaFunction;
      }
    }
  }
  return lambdaFunction;
};

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
            aggregateCalendarLambda.values[0]!.expressionSequence[0] =
              wavgRowMapper;
          } else if (columnLambda instanceof LambdaFunctionInstanceValue) {
            columnLambda.values[0]!.expressionSequence[0] = wavgRowMapper;
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
      lambdaFunction.expressionSequence[0] = projectFunction;
    }
  }
  // build olapGroupBy
  appendOLAPGroupByState(tdsState.windowState, lambdaFunction);

  // build post-filter
  appendPostFilter(tdsState.postFilterState, lambdaFunction);

  // build result set modifiers
  appendResultSetModifier(tdsState.resultSetModifierState, lambdaFunction, {
    overridingLimit:
      options?.isBuildingExecutionQuery && !options.isExportingResult
        ? queryBuilderState.resultState.previewLimit
        : undefined,
    withDataOverflowCheck:
      options?.isBuildingExecutionQuery && !options.isExportingResult
        ? options.withDataOverflowCheck
        : undefined,
  });
};

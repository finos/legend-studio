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
  ColSpec,
  ColSpecArray,
  ColSpecArrayInstance,
  extractElementNameFromPath,
  GenericType,
  GenericTypeExplicitReference,
  Multiplicity,
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
import {
  type QueryBuilderTDSState,
  TDS_PROJECTION_MODE,
} from '../QueryBuilderTDSState.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../../graph/QueryBuilderMetaModelConst.js';
import { buildGenericLambdaFunctionInstanceValue } from '../../../QueryBuilderValueSpecificationHelper.js';
import {
  buildPropertyExpressionChain,
  type LambdaFunctionBuilderOption,
} from '../../../QueryBuilderValueSpecificationBuilderHelper.js';
import { appendWindowFunctionState } from '../window/QueryBuilderWindowValueSpecificationBuilder.js';
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
      [projectionColumnState.lambdaParameterName],
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

const buildProjectionColumnLambda = (
  tdsState: QueryBuilderTDSState,
  projectionColumnState: QueryBuilderProjectionColumnState,
  options?: LambdaFunctionBuilderOption,
): ValueSpecification => {
  if (
    projectionColumnState instanceof QueryBuilderSimpleProjectionColumnState
  ) {
    return buildGenericLambdaFunctionInstanceValue(
      [projectionColumnState.lambdaParameterName],
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
  }
  if (
    projectionColumnState instanceof QueryBuilderDerivationProjectionColumnState
  ) {
    return new INTERNAL__UnknownValueSpecification(
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
  }
  throw new UnsupportedOperationError(
    `Can't build project() column expression: unsupported projection column state`,
    projectionColumnState,
  );
};

/**
 * Standard form: `precedingExpr->project([x|..., x|...], ['a','b'])`
 */
const buildProjectExpression = (
  tdsState: QueryBuilderTDSState,
  precedingExpression: ValueSpecification,
  options?: LambdaFunctionBuilderOption,
): SimpleFunctionExpression => {
  const queryBuilderState = tdsState.queryBuilderState;
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
    const colAlias = new PrimitiveInstanceValue(
      GenericTypeExplicitReference.create(
        new GenericType(PrimitiveType.STRING),
      ),
    );
    colAlias.values.push(projectionColumnState.columnName);
    colAliases.values.push(colAlias);
    colLambdas.values.push(
      buildProjectionColumnLambda(tdsState, projectionColumnState, options),
    );
  });
  projectFunction.parametersValues = [
    precedingExpression,
    colLambdas,
    colAliases,
  ];
  return projectFunction;
};

/**
 * Col-func form: `precedingExpr->project([col(x|..., 'a'), col(x|..., 'b')])`
 */
const buildProjectColExpression = (
  tdsState: QueryBuilderTDSState,
  precedingExpression: ValueSpecification,
  options?: LambdaFunctionBuilderOption,
): SimpleFunctionExpression => {
  const queryBuilderState = tdsState.queryBuilderState;
  const projectFunction = new SimpleFunctionExpression(
    extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_PROJECT),
  );
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
  projectFunction.parametersValues = [precedingExpression, colFuncCollection];
  return projectFunction;
};

/**
 * Relation-style column selection: `precedingExpr->select(~[a, b])`.
 *
 * Only valid when every projection column is a simple reference to an
 * existing relation column (no derivations / no property chains).
 */
const buildSelectExpression = (
  tdsState: QueryBuilderTDSState,
  precedingExpression: ValueSpecification,
): SimpleFunctionExpression => {
  const selectFunction = new SimpleFunctionExpression(
    extractElementNameFromPath(
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.RELATION_SELECT,
    ),
  );
  const colSpecArrayInstance = new ColSpecArrayInstance(
    Multiplicity.ONE,
    undefined,
  );
  const colSpecArray = new ColSpecArray();
  colSpecArrayInstance.values = [colSpecArray];
  tdsState.projectionColumns.forEach((projectionColumnState) => {
    if (
      projectionColumnState instanceof
      QueryBuilderDerivationProjectionColumnState
    ) {
      throw new UnsupportedOperationError(
        `Can't build select(~[...]) expression: derivation column '${projectionColumnState.columnName}' is not supported in SELECT mode`,
      );
    }
    const colSpec = new ColSpec();
    colSpec.name = projectionColumnState.columnName;
    colSpecArray.colSpecs.push(colSpec);
  });
  selectFunction.parametersValues = [precedingExpression, colSpecArrayInstance];
  return selectFunction;
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
          [projectionColumnState.lambdaParameterName],
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
          [aggregateColumnState.lambdaParameterName],
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
            [
              guaranteeNonNullable(aggregateColumnState.calendarFunction)
                .lambdaParameterName,
            ],
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
    switch (tdsState.resolveProjectionMode) {
      case TDS_PROJECTION_MODE.PROJECT: {
        if (queryBuilderState.useRelation) {
          const projectFunction = buildRelationProjection(
            precedingExpression,
            tdsState,
            options,
          );
          const aggregationFunction = tdsState.aggregationState.columns.length
            ? buildRelationAggregation(projectFunction, tdsState)
            : null;
          lambdaFunction.expressionSequence[0] =
            aggregationFunction ?? projectFunction;
        } else {
          lambdaFunction.expressionSequence[0] = buildProjectExpression(
            tdsState,
            precedingExpression,
            options,
          );
        }
        break;
      }
      case TDS_PROJECTION_MODE.PROJECT_COL: {
        if (queryBuilderState.useRelation) {
          throw new UnsupportedOperationError(
            `Can't build projection: '${TDS_PROJECTION_MODE.PROJECT_COL}' mode is not supported with relation queries`,
          );
        }
        lambdaFunction.expressionSequence[0] = buildProjectColExpression(
          tdsState,
          precedingExpression,
          options,
        );
        break;
      }
      case TDS_PROJECTION_MODE.SELECT: {
        if (!queryBuilderState.useRelation) {
          throw new UnsupportedOperationError(
            `Can't build projection: '${TDS_PROJECTION_MODE.SELECT}' mode requires a relation query`,
          );
        }
        lambdaFunction.expressionSequence[0] = buildSelectExpression(
          tdsState,
          precedingExpression,
        );
        break;
      }
      default:
        throw new UnsupportedOperationError(
          `Can't build projection: unsupported projection mode '${tdsState.projectionMode}'`,
        );
    }
  }
  // build olapGroupBy
  appendWindowFunctionState(tdsState.windowState, lambdaFunction);

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

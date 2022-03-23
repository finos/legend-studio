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
  guaranteeNonNullable,
  isNonNullable,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import {
  type ValueSpecification,
  type Class,
  Multiplicity,
  getMilestoneTemporalStereotype,
  INTERNAL__UnknownValueSpecification,
  V1_GraphTransformerContextBuilder,
  V1_serializeRawValueSpecification,
  V1_transformRawLambda,
  extractElementNameFromPath,
  InstanceValue,
  PackageableElementExplicitReference,
  CollectionInstanceValue,
  CORE_PURE_PATH,
  FunctionType,
  GenericType,
  GenericTypeExplicitReference,
  LambdaFunction,
  PrimitiveInstanceValue,
  PRIMITIVE_TYPE,
  RootGraphFetchTreeInstanceValue,
  SimpleFunctionExpression,
  TYPICAL_MULTIPLICITY_TYPE,
  MILESTONING_STEROTYPES,
} from '@finos/legend-graph';
import { isGraphFetchTreeDataEmpty } from './QueryBuilderGraphFetchTreeUtil';
import type { QueryBuilderState } from './QueryBuilderState';
import { SUPPORTED_FUNCTIONS } from '../QueryBuilder_Const';
import { buildFilterExpression } from './QueryBuilderFilterState';
import {
  QueryBuilderDerivationProjectionColumnState,
  QueryBuilderSimpleProjectionColumnState,
} from './QueryBuilderProjectionState';
import { buildGenericLambdaFunctionInstanceValue } from './QueryBuilderValueSpecificationBuilderHelper';

export const buildGetAllFunction = (
  _class: Class,
  multiplicity: Multiplicity,
): SimpleFunctionExpression => {
  const _func = new SimpleFunctionExpression(
    extractElementNameFromPath(SUPPORTED_FUNCTIONS.GET_ALL),
    multiplicity,
  );
  const classInstance = new InstanceValue(
    multiplicity,
    GenericTypeExplicitReference.create(new GenericType(_class)),
  );
  classInstance.values[0] = PackageableElementExplicitReference.create(_class);
  _func.parametersValues.push(classInstance);
  return _func;
};

export const buildParametersLetLambdaFunc = (
  queryBuilderState: QueryBuilderState,
): LambdaFunction => {
  const multiplicityOne =
    queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
      TYPICAL_MULTIPLICITY_TYPE.ONE,
    );
  const typeString = queryBuilderState.graphManagerState.graph.getPrimitiveType(
    PRIMITIVE_TYPE.STRING,
  );
  const typeAny = queryBuilderState.graphManagerState.graph.getType(
    CORE_PURE_PATH.ANY,
  );
  const letlambdaFunction = new LambdaFunction(
    new FunctionType(typeAny, multiplicityOne),
  );
  letlambdaFunction.expressionSequence =
    queryBuilderState.queryParametersState.parameters
      .map((_var) => {
        if (_var.values) {
          const letFunc = new SimpleFunctionExpression(
            extractElementNameFromPath(SUPPORTED_FUNCTIONS.LET),
            multiplicityOne,
          );
          const letVar = new PrimitiveInstanceValue(
            GenericTypeExplicitReference.create(new GenericType(typeString)),
            multiplicityOne,
          );
          letVar.values = [_var.variableName];
          letFunc.parametersValues.push(letVar);
          letFunc.parametersValues.push(_var.values);
          return letFunc;
        }
        return undefined;
      })
      .filter(isNonNullable);
  return letlambdaFunction;
};

export const buildLambdaFunction = (
  queryBuilderState: QueryBuilderState,
  options?: {
    /**
     * Set queryBuilderState to `true` when we construct query for execution within the app.
     * queryBuilderState will make the lambda function building process overrides several query values, such as the row limit.
     */
    isBuildingExecutionQuery?: boolean | undefined;
    keepSourceInformation?: boolean | undefined;
  },
): LambdaFunction => {
  const _class = guaranteeNonNullable(
    queryBuilderState.querySetupState._class,
    'Class is required to build query',
  );
  const multiplicityOne =
    queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
      TYPICAL_MULTIPLICITY_TYPE.ONE,
    );
  const typeString = queryBuilderState.graphManagerState.graph.getPrimitiveType(
    PRIMITIVE_TYPE.STRING,
  );
  const typeAny = queryBuilderState.graphManagerState.graph.getType(
    CORE_PURE_PATH.ANY,
  );
  const lambdaFunction = new LambdaFunction(
    new FunctionType(typeAny, multiplicityOne),
  );

  // build getAll()
  const getAllFunction = buildGetAllFunction(_class, multiplicityOne);
  const stereotype = getMilestoneTemporalStereotype(
    _class,
    queryBuilderState.graphManagerState.graph,
  );
  if (stereotype) {
    switch (stereotype) {
      case MILESTONING_STEROTYPES.BUSINESS_TEMPORAL: {
        getAllFunction.parametersValues.push(
          guaranteeNonNullable(
            queryBuilderState.querySetupState.businessDate,
            `Milestoning class should have a parameter of type 'Date'`,
          ),
        );
        break;
      }
      case MILESTONING_STEROTYPES.PROCESSING_TEMPORAL: {
        getAllFunction.parametersValues.push(
          guaranteeNonNullable(
            queryBuilderState.querySetupState.processingDate,
            `Milestoning class should have a parameter of type 'Date'`,
          ),
        );
        break;
      }
      case MILESTONING_STEROTYPES.BITEMPORAL: {
        getAllFunction.parametersValues.push(
          guaranteeNonNullable(
            queryBuilderState.querySetupState.processingDate,
            `Milestoning class should have a parameter of type 'Date'`,
          ),
        );
        getAllFunction.parametersValues.push(
          guaranteeNonNullable(
            queryBuilderState.querySetupState.businessDate,
            `Milestoning class should have a parameter of type 'Date'`,
          ),
        );
        break;
      }
      default:
    }
  }
  lambdaFunction.expressionSequence[0] = getAllFunction;

  // build filter()
  const filterFunction = buildFilterExpression(
    queryBuilderState.filterState,
    getAllFunction,
  );
  if (filterFunction) {
    lambdaFunction.expressionSequence[0] = filterFunction;
  }

  // build fetch structure
  if (queryBuilderState.fetchStructureState.isProjectionMode()) {
    if (
      queryBuilderState.fetchStructureState.projectionState.aggregationState
        .columns.length
    ) {
      // aggregation

      const groupByFunction = new SimpleFunctionExpression(
        extractElementNameFromPath(SUPPORTED_FUNCTIONS.TDS_GROUP_BY),
        multiplicityOne,
      );

      const colLambdas = new CollectionInstanceValue(
        new Multiplicity(
          queryBuilderState.fetchStructureState.projectionState.columns.length -
            queryBuilderState.fetchStructureState.projectionState
              .aggregationState.columns.length,
          queryBuilderState.fetchStructureState.projectionState.columns.length -
            queryBuilderState.fetchStructureState.projectionState
              .aggregationState.columns.length,
        ),
      );
      const aggregateLambdas = new CollectionInstanceValue(
        new Multiplicity(
          queryBuilderState.fetchStructureState.projectionState.aggregationState.columns.length,
          queryBuilderState.fetchStructureState.projectionState.aggregationState.columns.length,
        ),
      );
      const colAliases = new CollectionInstanceValue(
        new Multiplicity(
          queryBuilderState.fetchStructureState.projectionState.columns.length,
          queryBuilderState.fetchStructureState.projectionState.columns.length,
        ),
      );
      queryBuilderState.fetchStructureState.projectionState.columns.forEach(
        (projectionColumnState) => {
          // column alias
          const colAlias = new PrimitiveInstanceValue(
            GenericTypeExplicitReference.create(new GenericType(typeString)),
            multiplicityOne,
          );
          colAlias.values.push(projectionColumnState.columnName);
          colAliases.values.push(colAlias);

          const aggregateColumnState =
            queryBuilderState.fetchStructureState.projectionState.aggregationState.columns.find(
              (column) =>
                column.projectionColumnState === projectionColumnState,
            );

          // column projection
          let columnLambda: ValueSpecification;
          if (
            projectionColumnState instanceof
            QueryBuilderSimpleProjectionColumnState
          ) {
            columnLambda = buildGenericLambdaFunctionInstanceValue(
              projectionColumnState.lambdaParameterName,
              [
                projectionColumnState.propertyExpressionState
                  .propertyExpression,
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
              extractElementNameFromPath(SUPPORTED_FUNCTIONS.TDS_AGG),
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
        },
      );
      const expression = lambdaFunction.expressionSequence[0];
      groupByFunction.parametersValues = [
        expression,
        colLambdas,
        aggregateLambdas,
        colAliases,
      ];
      lambdaFunction.expressionSequence[0] = groupByFunction;
    } else if (
      queryBuilderState.fetchStructureState.projectionState.columns.length
    ) {
      // projection
      const projectFunction = new SimpleFunctionExpression(
        extractElementNameFromPath(SUPPORTED_FUNCTIONS.TDS_PROJECT),
        multiplicityOne,
      );
      const colLambdas = new CollectionInstanceValue(
        new Multiplicity(
          queryBuilderState.fetchStructureState.projectionState.columns.length,
          queryBuilderState.fetchStructureState.projectionState.columns.length,
        ),
      );
      const colAliases = new CollectionInstanceValue(
        new Multiplicity(
          queryBuilderState.fetchStructureState.projectionState.columns.length,
          queryBuilderState.fetchStructureState.projectionState.columns.length,
        ),
      );
      queryBuilderState.fetchStructureState.projectionState.columns.forEach(
        (projectionColumnState) => {
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
            projectionColumnState instanceof
            QueryBuilderSimpleProjectionColumnState
          ) {
            columnLambda = buildGenericLambdaFunctionInstanceValue(
              projectionColumnState.lambdaParameterName,
              [
                projectionColumnState.propertyExpressionState
                  .propertyExpression,
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
        },
      );
      const expression = lambdaFunction.expressionSequence[0];
      projectFunction.parametersValues = [expression, colLambdas, colAliases];
      lambdaFunction.expressionSequence[0] = projectFunction;
    }
  } else if (
    queryBuilderState.fetchStructureState.isGraphFetchMode() &&
    queryBuilderState.fetchStructureState.graphFetchTreeState.treeData &&
    !isGraphFetchTreeDataEmpty(
      queryBuilderState.fetchStructureState.graphFetchTreeState.treeData,
    )
  ) {
    const graphFetchInstance = new RootGraphFetchTreeInstanceValue(
      multiplicityOne,
    );
    graphFetchInstance.values = [
      queryBuilderState.fetchStructureState.graphFetchTreeState.treeData.tree,
    ];
    const serializeFunction = new SimpleFunctionExpression(
      extractElementNameFromPath(SUPPORTED_FUNCTIONS.SERIALIZE),
      multiplicityOne,
    );
    const graphFetchFunc = new SimpleFunctionExpression(
      queryBuilderState.fetchStructureState.graphFetchTreeState.isChecked
        ? extractElementNameFromPath(SUPPORTED_FUNCTIONS.GRAPH_FETCH_CHECKED)
        : extractElementNameFromPath(SUPPORTED_FUNCTIONS.GRAPH_FETCH),
      multiplicityOne,
    );
    const expression = lambdaFunction.expressionSequence[0];
    graphFetchFunc.parametersValues = [expression, graphFetchInstance];
    serializeFunction.parametersValues = [graphFetchFunc, graphFetchInstance];
    lambdaFunction.expressionSequence[0] = serializeFunction;
  }

  // build result set modifiers
  queryBuilderState.resultSetModifierState.processModifiersOnLambda(
    lambdaFunction,
    {
      overridingLimit: options?.isBuildingExecutionQuery
        ? queryBuilderState.resultState.previewLimit
        : undefined,
    },
  );
  // build parameters
  if (
    !queryBuilderState.mode.isParametersDisabled &&
    queryBuilderState.queryParametersState.parameters.length
  ) {
    // if we are executing:
    // set the parameters to empty
    // add let statements for each parameter
    if (options?.isBuildingExecutionQuery) {
      lambdaFunction.functionType.parameters = [];
      const letsFuncs = buildParametersLetLambdaFunc(queryBuilderState);
      lambdaFunction.expressionSequence = [
        ...letsFuncs.expressionSequence,
        ...lambdaFunction.expressionSequence,
      ];
    } else {
      lambdaFunction.functionType.parameters =
        queryBuilderState.queryParametersState.parameters.map(
          (e) => e.parameter,
        );
    }
  }
  return lambdaFunction;
};

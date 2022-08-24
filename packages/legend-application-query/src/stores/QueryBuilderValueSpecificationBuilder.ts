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
  getNullableFirstElement,
  guaranteeNonNullable,
  guaranteeType,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import {
  type ValueSpecification,
  Class,
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
  MILESTONING_STEREOTYPE,
  AbstractPropertyExpression,
  DerivedProperty,
  INTERNAL__PropagatedValue,
  matchFunctionName,
} from '@finos/legend-graph';
import { isGraphFetchTreeDataEmpty } from './fetch-structure/graph-fetch/QueryBuilderGraphFetchTreeUtil.js';
import type { QueryBuilderState } from './QueryBuilderState.js';
import {
  QueryBuilderDerivationProjectionColumnState,
  QueryBuilderSimpleProjectionColumnState,
} from './fetch-structure/projection/QueryBuilderProjectionState.js';
import { buildGenericLambdaFunctionInstanceValue } from './QueryBuilderValueSpecificationHelper.js';
import { getDerivedPropertyMilestoningSteoreotype } from './QueryBuilderPropertyEditorState.js';
import {
  functionExpression_setParametersValues,
  propertyExpression_setParametersValue,
  buildParametersLetLambdaFunc,
} from '@finos/legend-application';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../QueryBuilder_Const.js';
import { FETCH_STRUCTURE_MODE } from './fetch-structure/QueryBuilderFetchStructureState.js';
import { appendPostFilter } from './fetch-structure/projection/post-filter/QueryBuilderPostFilterValueSpecificationBuilder.js';
import { appendResultSetModifiers } from './fetch-structure/projection/QueryBuilderProjectionValueSpecificationBuilder.js';
import { buildFilterExpression } from './filter/QueryBuilderValueSpecificationBuilder.js';

/**
 * Checks if the provided property expression match the criteria for default
 * date propagation so we know whether we need to fill in values for the parameter
 * or just propgate values from the parent's expression
 *
 * NOTE: this takes date propgation into account. See the table below for all
 * the combination:
 *
 *             | [source] |          |          |          |          |
 * ----------------------------------------------------------------------
 *   [target]  |          |   NONE   |  PR_TMP  |  BI_TMP  |  BU_TMP  |
 * ----------------------------------------------------------------------
 *             |   NONE   |   N.A.   |   PRD    | PRD,BUD  |    BUD   |
 * ----------------------------------------------------------------------
 *             |  PR_TMP  |   N.A.   |    X     | PRD,BUD  |    BUD   |
 * ----------------------------------------------------------------------
 *             |  BI_TMP  |   N.A.   |    X     |    X     |    X     |
 * ----------------------------------------------------------------------
 *             |  BU_TMP  |   N.A.   |   PRD    | PRD,BUD  |    X     |
 * ----------------------------------------------------------------------
 *
 * Annotations:
 *
 * [source]: source temporal type
 * [target]: target temporal type
 *
 * PR_TMP  : processing temporal
 * BI_TMP  : bitemporal
 * BU_TMP  : business temporal
 *
 * X       : no default date propagated
 * PRD     : default processing date is propagated
 * BUD     : default business date is propgated
 */
const isDefaultDatePropagationSupported = (
  currentPropertyExpression: AbstractPropertyExpression,
  queryBuilderState: QueryBuilderState,
  prevPropertyExpression?: AbstractPropertyExpression | undefined,
): boolean => {
  const property = currentPropertyExpression.func;
  const graph = queryBuilderState.graphManagerState.graph;
  // Default date propagation is not supported for current expression when the previous property expression is a derived property.
  if (
    prevPropertyExpression &&
    prevPropertyExpression.func instanceof DerivedProperty &&
    prevPropertyExpression.func._OWNER.derivedProperties.includes(
      prevPropertyExpression.func,
    )
  ) {
    return false;
  }
  // Default date propagation is not supported for current expression when the milestonedParameterValues of
  // the previous property expression doesn't match with the global milestonedParameterValues
  if (
    prevPropertyExpression &&
    prevPropertyExpression.func.genericType.value.rawType instanceof Class
  ) {
    const milestoningStereotype = getMilestoneTemporalStereotype(
      prevPropertyExpression.func.genericType.value.rawType,
      graph,
    );
    if (
      milestoningStereotype &&
      !prevPropertyExpression.parametersValues
        .slice(1)
        .every(
          (parameterValue) =>
            parameterValue instanceof INTERNAL__PropagatedValue,
        )
    ) {
      return false;
    }
  }
  if (property.genericType.value.rawType instanceof Class) {
    // the stereotype of source class of current property expression.
    const sourceStereotype =
      property instanceof DerivedProperty
        ? getDerivedPropertyMilestoningSteoreotype(property, graph)
        : undefined;
    // Default date propagation is always supported if the source is `bitemporal`
    if (sourceStereotype === MILESTONING_STEREOTYPE.BITEMPORAL) {
      return true;
    }
    // the stereotype (if exists) of the generic type of current property expression.
    const targetStereotype = getMilestoneTemporalStereotype(
      property.genericType.value.rawType,
      graph,
    );
    // Default date propagation is supported when stereotype of both source and target matches
    if (sourceStereotype && targetStereotype) {
      return sourceStereotype === targetStereotype;
    }
  }
  return false;
};

export const buildGetAllFunction = (
  _class: Class,
  multiplicity: Multiplicity,
): SimpleFunctionExpression => {
  const _func = new SimpleFunctionExpression(
    extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.GET_ALL),
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

export const buildPropertyExpressionChain = (
  propertyExpression: AbstractPropertyExpression,
  queryBuilderState: QueryBuilderState,
): ValueSpecification => {
  const graph = queryBuilderState.graphManagerState.graph;
  const newPropertyExpression = new AbstractPropertyExpression(
    '',
    graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ONE),
  );
  newPropertyExpression.func = propertyExpression.func;
  newPropertyExpression.parametersValues = propertyExpression.parametersValues;

  let nextExpression: ValueSpecification | undefined;
  let currentExpression: ValueSpecification | undefined = newPropertyExpression;
  while (currentExpression instanceof AbstractPropertyExpression) {
    nextExpression = getNullableFirstElement(
      currentExpression.parametersValues,
    );
    if (nextExpression instanceof AbstractPropertyExpression) {
      const parameterValue = new AbstractPropertyExpression(
        '',
        graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ONE),
      );
      parameterValue.func = nextExpression.func;
      parameterValue.parametersValues = nextExpression.parametersValues;
      nextExpression = parameterValue;
      currentExpression.parametersValues[0] = parameterValue;
    }
    if (currentExpression.func instanceof DerivedProperty) {
      const parameterValues = currentExpression.parametersValues.slice(1);
      parameterValues.forEach((parameterValue, index) => {
        if (parameterValue instanceof INTERNAL__PropagatedValue) {
          // Replace with argumentless derived property expression only when default date propagation is supported
          if (
            isDefaultDatePropagationSupported(
              guaranteeType(currentExpression, AbstractPropertyExpression),
              queryBuilderState,
              nextExpression instanceof AbstractPropertyExpression
                ? nextExpression
                : undefined,
            )
          ) {
            // NOTE: For `bitemporal` property check if the property expression has parameters which are not instance of
            // `INTERNAL_PropagatedValue` then pass the parameters as user explicitly changed values of either of the parameters.
            if (
              (index === 1 &&
                guaranteeType(currentExpression, AbstractPropertyExpression)
                  .parametersValues.length === 3) ||
              (index === 0 &&
                guaranteeType(currentExpression, AbstractPropertyExpression)
                  .parametersValues.length === 3 &&
                !(
                  guaranteeType(currentExpression, AbstractPropertyExpression)
                    .parametersValues[2] instanceof INTERNAL__PropagatedValue
                ))
            ) {
              propertyExpression_setParametersValue(
                guaranteeType(currentExpression, AbstractPropertyExpression),
                index + 1,
                parameterValue.getValue(),
                queryBuilderState.observableContext,
              );
            } else {
              functionExpression_setParametersValues(
                guaranteeType(currentExpression, AbstractPropertyExpression),
                [
                  guaranteeNonNullable(
                    guaranteeType(currentExpression, AbstractPropertyExpression)
                      .parametersValues[0],
                  ),
                ],
                queryBuilderState.observableContext,
              );
            }
          } else {
            propertyExpression_setParametersValue(
              guaranteeType(currentExpression, AbstractPropertyExpression),
              index + 1,
              parameterValue.getValue(),
              queryBuilderState.observableContext,
            );
          }
        }
      });
    }
    currentExpression = nextExpression;
    // Take care of chains of subtype (a pattern that is not useful, but we want to support and rectify)
    // $x.employees->subType(@Person)->subType(@Staff)
    while (
      currentExpression instanceof SimpleFunctionExpression &&
      matchFunctionName(
        currentExpression.functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.SUBTYPE,
      )
    ) {
      currentExpression = getNullableFirstElement(
        currentExpression.parametersValues,
      );
    }
  }
  return newPropertyExpression;
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

  // build milestoning parameter(s) for getAll()
  const milestoningStereotype = getMilestoneTemporalStereotype(
    _class,
    queryBuilderState.graphManagerState.graph,
  );
  if (milestoningStereotype) {
    switch (milestoningStereotype) {
      case MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL: {
        getAllFunction.parametersValues.push(
          guaranteeNonNullable(
            queryBuilderState.querySetupState.businessDate,
            `Milestoning class should have a parameter of type 'Date'`,
          ),
        );
        break;
      }
      case MILESTONING_STEREOTYPE.PROCESSING_TEMPORAL: {
        getAllFunction.parametersValues.push(
          guaranteeNonNullable(
            queryBuilderState.querySetupState.processingDate,
            `Milestoning class should have a parameter of type 'Date'`,
          ),
        );
        break;
      }
      case MILESTONING_STEREOTYPE.BITEMPORAL: {
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
  switch (queryBuilderState.fetchStructureState.fetchStructureMode) {
    case FETCH_STRUCTURE_MODE.PROJECTION: {
      if (
        queryBuilderState.fetchStructureState.projectionState.aggregationState
          .columns.length
      ) {
        // aggregation

        const groupByFunction = new SimpleFunctionExpression(
          extractElementNameFromPath(
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_GROUP_BY,
          ),
          multiplicityOne,
        );

        const colLambdas = new CollectionInstanceValue(
          new Multiplicity(
            queryBuilderState.fetchStructureState.projectionState.columns
              .length -
              queryBuilderState.fetchStructureState.projectionState
                .aggregationState.columns.length,
            queryBuilderState.fetchStructureState.projectionState.columns
              .length -
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
                  buildPropertyExpressionChain(
                    projectionColumnState.propertyExpressionState
                      .propertyExpression,
                    projectionColumnState.propertyExpressionState
                      .queryBuilderState,
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
                extractElementNameFromPath(
                  QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_AGG,
                ),
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
          extractElementNameFromPath(
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_PROJECT,
          ),
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
                  buildPropertyExpressionChain(
                    projectionColumnState.propertyExpressionState
                      .propertyExpression,
                    projectionColumnState.propertyExpressionState
                      .queryBuilderState,
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
          },
        );
        const expression = lambdaFunction.expressionSequence[0];
        projectFunction.parametersValues = [expression, colLambdas, colAliases];
        lambdaFunction.expressionSequence[0] = projectFunction;
      }

      // build post-filter
      appendPostFilter(
        queryBuilderState.fetchStructureState.projectionState.postFilterState,
        lambdaFunction,
      );

      // build result set modifiers
      appendResultSetModifiers(
        queryBuilderState.fetchStructureState.projectionState
          .resultSetModifierState,
        lambdaFunction,
        {
          overridingLimit: options?.isBuildingExecutionQuery
            ? queryBuilderState.resultState.previewLimit
            : undefined,
        },
      );

      break;
    }
    case FETCH_STRUCTURE_MODE.GRAPH_FETCH: {
      // build fetch-structure
      if (
        queryBuilderState.fetchStructureState.graphFetchTreeState.treeData &&
        !isGraphFetchTreeDataEmpty(
          queryBuilderState.fetchStructureState.graphFetchTreeState.treeData,
        )
      ) {
        const graphFetchInstance = new RootGraphFetchTreeInstanceValue(
          multiplicityOne,
        );
        graphFetchInstance.values = [
          queryBuilderState.fetchStructureState.graphFetchTreeState.treeData
            .tree,
        ];
        const serializeFunction = new SimpleFunctionExpression(
          extractElementNameFromPath(
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.SERIALIZE,
          ),
          multiplicityOne,
        );
        const graphFetchFunc = new SimpleFunctionExpression(
          queryBuilderState.fetchStructureState.graphFetchTreeState.isChecked
            ? extractElementNameFromPath(
                QUERY_BUILDER_SUPPORTED_FUNCTIONS.GRAPH_FETCH_CHECKED,
              )
            : extractElementNameFromPath(
                QUERY_BUILDER_SUPPORTED_FUNCTIONS.GRAPH_FETCH,
              ),
          multiplicityOne,
        );
        const expression = lambdaFunction.expressionSequence[0];
        graphFetchFunc.parametersValues = [expression, graphFetchInstance];
        serializeFunction.parametersValues = [
          graphFetchFunc,
          graphFetchInstance,
        ];
        lambdaFunction.expressionSequence[0] = serializeFunction;
      }

      // build result set modifier: i.e. preview limit
      if (options?.isBuildingExecutionQuery) {
        if (lambdaFunction.expressionSequence.length === 1) {
          const func = lambdaFunction.expressionSequence[0];
          if (func instanceof SimpleFunctionExpression) {
            if (
              matchFunctionName(
                func.functionName,
                QUERY_BUILDER_SUPPORTED_FUNCTIONS.SERIALIZE,
              )
            ) {
              // NOTE: we have to separate the handling of `take()` for projection and
              // graph-fetch as the latter use `meta::pure::functions::collection::take()`
              // where the former uses `meta::pure::tds::take()`, therefore the placement
              // in the query are different. Also, note that because of the above distinction,
              // we won't support using `take()` as result set modifier operations for graph-fetch.
              // Result set modifier should only be used for projection for now.
              const limit = new PrimitiveInstanceValue(
                GenericTypeExplicitReference.create(
                  new GenericType(
                    queryBuilderState.graphManagerState.graph.getPrimitiveType(
                      PRIMITIVE_TYPE.INTEGER,
                    ),
                  ),
                ),
                multiplicityOne,
              );
              limit.values = [queryBuilderState.resultState.previewLimit];
              const takeFunction = new SimpleFunctionExpression(
                extractElementNameFromPath(
                  QUERY_BUILDER_SUPPORTED_FUNCTIONS.TAKE,
                ),
                multiplicityOne,
              );

              // NOTE: `take()` does not work on `graphFetch()` or `serialize()` so we will put it
              // right next to `all()`
              const serializeFunction = func;
              const graphFetchFunc = guaranteeType(
                serializeFunction.parametersValues[0],
                SimpleFunctionExpression,
              );
              const getAllFunc = graphFetchFunc
                .parametersValues[0] as ValueSpecification;
              takeFunction.parametersValues[0] = getAllFunc;
              takeFunction.parametersValues[1] = limit;
              graphFetchFunc.parametersValues = [
                takeFunction,
                graphFetchFunc.parametersValues[1] as ValueSpecification,
              ];
            }
          }
        }
      }
      break;
    }
    default:
      break;
  }

  // build parameters
  if (
    !queryBuilderState.mode.isParametersDisabled &&
    queryBuilderState.queryParametersState.parameterStates.length
  ) {
    // NOTE: if we are executing:
    // 1. set the parameters to empty
    // 2. add let statements for each parameter
    if (options?.isBuildingExecutionQuery) {
      lambdaFunction.functionType.parameters = [];
      const letsFuncs = buildParametersLetLambdaFunc(
        queryBuilderState.graphManagerState.graph,
        queryBuilderState.queryParametersState.parameterStates,
      );
      lambdaFunction.expressionSequence = [
        ...letsFuncs.expressionSequence,
        ...lambdaFunction.expressionSequence,
      ];
    } else {
      lambdaFunction.functionType.parameters =
        queryBuilderState.queryParametersState.parameterStates.map(
          (e) => e.parameter,
        );
    }
  }

  return lambdaFunction;
};

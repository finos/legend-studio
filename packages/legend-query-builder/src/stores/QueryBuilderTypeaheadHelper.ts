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
  AbstractPropertyExpression,
  type ExecutionResult,
  type ValueSpecification,
  PrimitiveInstanceValue,
  PRIMITIVE_TYPE,
  TDSExecutionResult,
  type RawLambda,
  DerivedProperty,
  Class,
  SimpleFunctionExpression,
  matchFunctionName,
  PrimitiveType,
  type ObserverContext,
  Multiplicity,
  getMilestoneTemporalStereotype,
  extractElementNameFromPath,
  CollectionInstanceValue,
  GenericTypeExplicitReference,
  GenericType,
  CORE_PURE_PATH,
  FunctionType,
  LambdaFunction,
  PackageableElementExplicitReference,
  PropertyExplicitReference,
  getAllClassDerivedProperties,
  VariableExpression,
  buildRawLambdaFromLambdaFunction,
  type Type,
  INTERNAL__UnknownValueSpecification,
  V1_transformRawLambda,
  V1_GraphTransformerContextBuilder,
  V1_serializeRawValueSpecification,
} from '@finos/legend-graph';
import {
  guaranteeNonNullable,
  guaranteeType,
  isNonNullable,
  isString,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { QueryBuilderPostFilterOperator_StartWith } from './fetch-structure/tds/post-filter/operators/QueryBuilderPostFilterOperator_StartWith.js';
import type { QueryBuilderAggregateColumnState } from './fetch-structure/tds/aggregation/QueryBuilderAggregationState.js';
import {
  QueryBuilderDerivationProjectionColumnState,
  QueryBuilderProjectionColumnState,
  QueryBuilderSimpleProjectionColumnState,
} from './fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';
import type { QueryBuilderState } from './QueryBuilderState.js';
import {
  DEFAULT_TYPEAHEAD_SEARCH_LIMIT,
  DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH,
} from '@finos/legend-application';
import {
  QUERY_BUILDER_PURE_PATH,
  QUERY_BUILDER_SUPPORTED_FUNCTIONS,
  type TDS_COLUMN_GETTER,
} from '../graph/QueryBuilderMetaModelConst.js';
import {
  functionExpression_setParametersValues,
  variableExpression_setName,
} from './shared/ValueSpecificationModifierHelper.js';
import { createSupportedFunctionExpression } from './shared/ValueSpecificationEditorHelper.js';
import { buildGetAllFunction } from './QueryBuilderValueSpecificationBuilder.js';
import { getPropertyChainName } from './QueryBuilderPropertyEditorState.js';
import { buildGenericLambdaFunctionInstanceValue } from './QueryBuilderValueSpecificationHelper.js';
import {
  DEFAULT_LAMBDA_VARIABLE_NAME,
  DEFAULT_POST_FILTER_LAMBDA_VARIABLE_NAME,
} from './QueryBuilderConfig.js';
import type { QueryBuilderAggregateOperator } from './fetch-structure/tds/aggregation/QueryBuilderAggregateOperator.js';
import { getTDSColumnDerivedProperyFromType } from './fetch-structure/tds/QueryBuilderTDSHelper.js';

const buildPropertyExpressionChainWithDefaultMilestoningDates = (
  propertyExpression: AbstractPropertyExpression,
  lambdaParameterName: string,
  observerContext: ObserverContext,
): AbstractPropertyExpression => {
  const newPropertyExpression = new AbstractPropertyExpression('');
  newPropertyExpression.func = propertyExpression.func;
  newPropertyExpression.parametersValues = [
    ...propertyExpression.parametersValues,
  ];

  let nextExpression: ValueSpecification | undefined;
  let currentExpression: ValueSpecification | undefined = newPropertyExpression;
  while (currentExpression instanceof AbstractPropertyExpression) {
    nextExpression = currentExpression.parametersValues[0];
    if (nextExpression instanceof AbstractPropertyExpression) {
      const parameterValue = new AbstractPropertyExpression('');
      parameterValue.func = nextExpression.func;
      parameterValue.parametersValues = [...nextExpression.parametersValues];
      nextExpression = parameterValue;
      currentExpression.parametersValues[0] = parameterValue;
    }
    if (
      currentExpression instanceof AbstractPropertyExpression &&
      currentExpression.func.value.genericType.value.rawType instanceof Class &&
      currentExpression.func.value._OWNER._generatedMilestonedProperties
        .length !== 0 &&
      currentExpression.func.value instanceof DerivedProperty &&
      !currentExpression.func.value._OWNER.derivedProperties.includes(
        currentExpression.func.value,
      )
    ) {
      const parameterValue = createSupportedFunctionExpression(
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.NOW,
        PrimitiveType.DATETIME,
      );
      const parameterValues =
        currentExpression.parametersValues.length === 2
          ? [parameterValue]
          : [parameterValue, parameterValue];
      functionExpression_setParametersValues(
        currentExpression,
        [
          guaranteeNonNullable(currentExpression.parametersValues[0]),
          ...parameterValues,
        ],
        observerContext,
      );
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
      currentExpression = currentExpression.parametersValues[0];
    }
  }

  // Update the root lambda name based on the parent's lambda parameter name.
  if (currentExpression instanceof VariableExpression) {
    variableExpression_setName(currentExpression, lambdaParameterName);
  }
  return newPropertyExpression;
};

const buildRawLambda = (
  queryBuilderState: QueryBuilderState,
  propertyExpression?: AbstractPropertyExpression | undefined,
  aggregationOperator?: QueryBuilderAggregateOperator | undefined,
  colLambda?: ValueSpecification | undefined,
  colType?: Type | undefined,
  colName?: string | undefined,
  value?: ValueSpecification | undefined,
): RawLambda => {
  if (!propertyExpression && !(colLambda && colType && colName)) {
    throw new UnsupportedOperationError(`Can't build typeahead query`);
  }

  const lambdaFunction = new LambdaFunction(
    new FunctionType(
      PackageableElementExplicitReference.create(
        queryBuilderState.graphManagerState.graph.getType(CORE_PURE_PATH.ANY),
      ),
      Multiplicity.ONE,
    ),
  );

  // build getAll function
  const _class = guaranteeNonNullable(queryBuilderState.class);
  const getAllFn = buildGetAllFunction(
    guaranteeNonNullable(queryBuilderState.class),
    Multiplicity.ONE,
  );
  const milestoningStereotype = getMilestoneTemporalStereotype(
    _class,
    queryBuilderState.graphManagerState.graph,
  );
  if (milestoningStereotype) {
    // build milestoning parameter(s) for getAll()
    queryBuilderState.milestoningState
      .getMilestoningImplementation(milestoningStereotype)
      .buildGetAllWithDefaultParameters(getAllFn);
  }
  lambdaFunction.expressionSequence[0] = getAllFn;

  // projection
  const columnName = propertyExpression
    ? getPropertyChainName(propertyExpression, false)
    : colName;
  if (aggregationOperator) {
    const groupByFunction = new SimpleFunctionExpression(
      extractElementNameFromPath(
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_GROUP_BY,
      ),
    );

    const colLambdas = new CollectionInstanceValue(Multiplicity.ZERO);
    const aggregateLambdas = new CollectionInstanceValue(Multiplicity.ONE);
    const colAliases = new CollectionInstanceValue(Multiplicity.ONE);
    const colAlias = new PrimitiveInstanceValue(
      GenericTypeExplicitReference.create(
        new GenericType(PrimitiveType.STRING),
      ),
    );
    colAlias.values.push(columnName);
    colAliases.values.push(colAlias);
    const columnLambda = propertyExpression
      ? buildGenericLambdaFunctionInstanceValue(
          DEFAULT_LAMBDA_VARIABLE_NAME,
          [propertyExpression],
          queryBuilderState.graphManagerState.graph,
        )
      : colLambda;
    const aggregateFunctionExpression = new SimpleFunctionExpression(
      extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_AGG),
    );
    const aggregateLambda = buildGenericLambdaFunctionInstanceValue(
      DEFAULT_LAMBDA_VARIABLE_NAME,
      [
        aggregationOperator.buildAggregateExpression(
          propertyExpression,
          DEFAULT_LAMBDA_VARIABLE_NAME,
          queryBuilderState.graphManagerState.graph,
        ),
      ],
      queryBuilderState.graphManagerState.graph,
    );
    aggregateFunctionExpression.parametersValues = [
      guaranteeNonNullable(columnLambda),
      aggregateLambda,
    ];
    aggregateLambdas.values.push(aggregateFunctionExpression);
    groupByFunction.parametersValues = [
      lambdaFunction.expressionSequence[0],
      colLambdas,
      aggregateLambdas,
      colAliases,
    ];
    lambdaFunction.expressionSequence[0] = groupByFunction;
  } else {
    const projectFunction = new SimpleFunctionExpression(
      extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_PROJECT),
    );
    const colLambdas = new CollectionInstanceValue(Multiplicity.ONE);
    const colAliases = new CollectionInstanceValue(Multiplicity.ONE);
    // column alias
    const colAlias = new PrimitiveInstanceValue(
      GenericTypeExplicitReference.create(
        new GenericType(PrimitiveType.STRING),
      ),
    );
    colAlias.values.push(columnName);
    colAliases.values.push(colAlias);
    const columnLambda = propertyExpression
      ? buildGenericLambdaFunctionInstanceValue(
          DEFAULT_LAMBDA_VARIABLE_NAME,
          [propertyExpression],
          queryBuilderState.graphManagerState.graph,
        )
      : colLambda;
    colLambdas.values.push(guaranteeNonNullable(columnLambda));
    projectFunction.parametersValues = [
      lambdaFunction.expressionSequence[0],
      colLambdas,
      colAliases,
    ];
    lambdaFunction.expressionSequence[0] = projectFunction;
  }

  // append post filter
  const operator = new QueryBuilderPostFilterOperator_StartWith();
  const tdsPropertyExpression = new AbstractPropertyExpression('');
  let tdsDerivedPropertyName: TDS_COLUMN_GETTER;
  const correspondingTDSDerivedProperty = operator.getTDSColumnGetter();
  if (correspondingTDSDerivedProperty) {
    tdsDerivedPropertyName = correspondingTDSDerivedProperty;
  } else {
    const type =
      propertyExpression?.func.value.genericType.value.rawType ?? colType;
    tdsDerivedPropertyName = getTDSColumnDerivedProperyFromType(
      guaranteeNonNullable(type),
    );
  }
  tdsPropertyExpression.func = PropertyExplicitReference.create(
    guaranteeNonNullable(
      getAllClassDerivedProperties(
        queryBuilderState.graphManagerState.graph.getClass(
          QUERY_BUILDER_PURE_PATH.TDS_ROW,
        ),
      ).find((p) => p.name === tdsDerivedPropertyName),
    ),
  );
  const variableName = new VariableExpression(
    DEFAULT_POST_FILTER_LAMBDA_VARIABLE_NAME,
    Multiplicity.ONE,
  );
  const colInstanceValue = new PrimitiveInstanceValue(
    GenericTypeExplicitReference.create(new GenericType(PrimitiveType.STRING)),
  );
  colInstanceValue.values = [columnName];
  tdsPropertyExpression.parametersValues = [variableName, colInstanceValue];

  const postFilterExpression = new SimpleFunctionExpression(
    extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.STARTS_WITH),
  );
  postFilterExpression.parametersValues.push(tdsPropertyExpression);
  if (value) {
    postFilterExpression.parametersValues.push(value);
  }
  const filterLambda = buildGenericLambdaFunctionInstanceValue(
    DEFAULT_POST_FILTER_LAMBDA_VARIABLE_NAME,
    [postFilterExpression],
    queryBuilderState.graphManagerState.graph,
  );

  // build post-filter expression
  const filterExpression = new SimpleFunctionExpression(
    extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_FILTER),
  );
  const projectExpression = guaranteeNonNullable(
    lambdaFunction.expressionSequence[0],
  );
  filterExpression.parametersValues = [projectExpression, filterLambda];
  lambdaFunction.expressionSequence[0] = filterExpression;

  // append distinct and take
  const postFilterExp = lambdaFunction.expressionSequence[0];
  let currentExpression = postFilterExp;
  const distinctFunction = new SimpleFunctionExpression(
    extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_DISTINCT),
  );
  distinctFunction.parametersValues[0] = currentExpression;
  currentExpression = distinctFunction;
  const limit = new PrimitiveInstanceValue(
    GenericTypeExplicitReference.create(new GenericType(PrimitiveType.INTEGER)),
  );
  limit.values = [DEFAULT_TYPEAHEAD_SEARCH_LIMIT];
  const takeFunction = new SimpleFunctionExpression(
    extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_TAKE),
  );
  takeFunction.parametersValues[0] = currentExpression;
  takeFunction.parametersValues[1] = limit;
  currentExpression = takeFunction;
  lambdaFunction.expressionSequence[0] = currentExpression;
  return buildRawLambdaFromLambdaFunction(
    lambdaFunction,
    queryBuilderState.graphManagerState,
  );
};

export const buildPropertyTypeaheadQuery = (
  queryBuilderState: QueryBuilderState,
  propertyExpression: AbstractPropertyExpression,
  value: ValueSpecification | undefined,
): RawLambda => {
  const newPropertyExpression =
    buildPropertyExpressionChainWithDefaultMilestoningDates(
      propertyExpression,
      DEFAULT_LAMBDA_VARIABLE_NAME,
      queryBuilderState.observerContext,
    );

  return buildRawLambda(
    queryBuilderState,
    newPropertyExpression,
    undefined,
    undefined,
    undefined,
    undefined,
    value,
  );
};

export const buildProjectionColumnTypeaheadQuery = (
  queryBuilderState: QueryBuilderState,
  columnState:
    | QueryBuilderProjectionColumnState
    | QueryBuilderAggregateColumnState,
  value: ValueSpecification | undefined,
): RawLambda => {
  let propertyExpression: AbstractPropertyExpression | undefined = undefined;
  let aggregationOperator: QueryBuilderAggregateOperator | undefined =
    undefined;
  let columnLambda: ValueSpecification | undefined = undefined;
  let columnName: string | undefined = undefined;
  let columnType: Type | undefined = undefined;
  let column: QueryBuilderProjectionColumnState;
  if (columnState instanceof QueryBuilderProjectionColumnState) {
    column = columnState;
  } else {
    column = columnState.projectionColumnState;
    aggregationOperator = columnState.operator;
  }
  if (column instanceof QueryBuilderDerivationProjectionColumnState) {
    columnLambda = new INTERNAL__UnknownValueSpecification(
      V1_serializeRawValueSpecification(
        V1_transformRawLambda(
          column.lambda,
          new V1_GraphTransformerContextBuilder(
            // TODO?: do we need to include the plugins here?
            [],
          ).build(),
        ),
      ),
    );
    columnName = column.columnName;
    columnType = column.returnType;
  } else {
    propertyExpression =
      buildPropertyExpressionChainWithDefaultMilestoningDates(
        guaranteeType(column, QueryBuilderSimpleProjectionColumnState)
          .propertyExpressionState.propertyExpression,
        DEFAULT_LAMBDA_VARIABLE_NAME,
        queryBuilderState.observerContext,
      );
  }

  return buildRawLambda(
    queryBuilderState,
    propertyExpression,
    aggregationOperator,
    columnLambda,
    columnType,
    columnName,
    value,
  );
};

export const buildTypeaheadOptions = (result: ExecutionResult): string[] => {
  const tdsResult = guaranteeType(
    result,
    TDSExecutionResult,
    'Typeahead search is only supported for TDS result sets',
  );
  const options: string[] = [];
  tdsResult.result.rows
    .map((r) => r.values[0])
    .filter(isNonNullable)
    .forEach((r) => {
      if (isString(r)) {
        options.push(r);
      }
    });
  return options;
};

export const performTypeahead = (
  val: ValueSpecification | undefined,
): boolean => {
  if (val instanceof PrimitiveInstanceValue) {
    const _type = val.genericType.value.rawType;
    switch (_type.path) {
      case PRIMITIVE_TYPE.STRING: {
        const value = val.values[0] as string;
        return value.length >= DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH;
      }
      default:
        return false;
    }
  }
  return false;
};

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
  assertNonNullable,
  assertTrue,
  assertType,
  guaranteeType,
  returnUndefOnError,
} from '@finos/legend-shared';
import { SUPPORTED_FUNCTIONS } from '../../../../QueryBuilder_Const';
import {
  type V1_GraphBuilderContext,
  type V1_ProcessingContext,
  type V1_ValueSpecification,
  type ValueSpecification,
  extractElementNameFromPath,
  V1_AppliedProperty,
  CollectionInstanceValue,
  Multiplicity,
  INTERNAL__UnknownValueSpecification,
  V1_Variable,
  V1_serializeValueSpecification,
  GenericType,
  GenericTypeExplicitReference,
  SimpleFunctionExpression,
  matchFunctionName,
  InstanceValue,
  V1_AppliedFunction,
  V1_Collection,
  V1_Lambda,
  V1_ValueSpecificationBuilder,
  AbstractPropertyExpression,
  TYPICAL_MULTIPLICITY_TYPE,
  VariableExpression,
} from '@finos/legend-graph';

const buildBaseSimpleFunctionExpression = (
  processedParameters: ValueSpecification[],
  functionName: string,
  compileContext: V1_GraphBuilderContext,
): SimpleFunctionExpression => {
  const expression = new SimpleFunctionExpression(
    functionName,
    compileContext.graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ONE),
  );
  const func = returnUndefOnError(() =>
    compileContext.resolveFunction(functionName),
  );
  expression.func = func;
  if (func) {
    const val = func.value;
    expression.genericType = GenericTypeExplicitReference.create(
      new GenericType(val.returnType.value),
    );
    expression.multiplicity = val.returnMultiplicity;
  }
  expression.parametersValues = processedParameters;
  return expression;
};

/**
 * NOTE: this is a catch-all builder for all functions we support in query builder
 * This is extremely basic and will fail for any functions that needs proper
 * type-inferencing of the return and the parameters.
 */
export const V1_buildGenericFunctionExpression = (
  functionName: string,
  parameters: V1_ValueSpecification[],
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): [SimpleFunctionExpression, ValueSpecification[]] => {
  const processedParams = parameters.map((parameter) =>
    parameter.accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationBuilder(
        compileContext,
        processingContext,
        openVariables,
      ),
    ),
  );
  return [
    buildBaseSimpleFunctionExpression(
      processedParams,
      functionName,
      compileContext,
    ),
    processedParams,
  ];
};

const buildProjectionColumnLambda = (
  valueSpecification: V1_ValueSpecification,
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): ValueSpecification => {
  assertType(
    valueSpecification,
    V1_Lambda,
    `Can't build projection column: only support lambda`,
  );

  // lambda parameter
  assertTrue(
    valueSpecification.parameters.length === 1,
    `Can't build projection column: only support lambda with 1 parameter`,
  );
  const columnLambdaParameter = guaranteeType(
    valueSpecification.parameters[0],
    V1_Variable,
    `Can't build projection column: only support lambda with 1 parameter`,
  );

  // lambda body
  assertTrue(
    valueSpecification.body.length === 1,
    `Can't build projection column: only support lambda body with 1 expression`,
  );
  let currentPropertyExpression: V1_ValueSpecification = valueSpecification
    .body[0] as V1_ValueSpecification;
  assertType(
    currentPropertyExpression,
    V1_AppliedProperty,
    `Can't build projection column: only support lambda body as property expression`,
  );
  while (currentPropertyExpression instanceof V1_AppliedProperty) {
    assertTrue(
      currentPropertyExpression.parameters.length >= 1,
      `Can't build projection column: only support lambda body as property expression`,
    );
    currentPropertyExpression = currentPropertyExpression
      .parameters[0] as V1_ValueSpecification;
  }

  // check lambda variable and parameter match
  assertType(
    currentPropertyExpression,
    V1_Variable,
    `Can't build projection column: only support lambda body as property expression`,
  );
  assertTrue(
    columnLambdaParameter.name === currentPropertyExpression.name,
    `Can't build column lambda: expects variable used in lambda body '${currentPropertyExpression.name}' to match lambda parameter '${columnLambdaParameter.name}'`,
  );
  return valueSpecification.accept_ValueSpecificationVisitor(
    new V1_ValueSpecificationBuilder(
      compileContext,
      processingContext,
      openVariables,
    ),
  );
};

const buildAggregationExpression = (
  valueSpecification: V1_ValueSpecification,
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): ValueSpecification => {
  assertType(
    valueSpecification,
    V1_AppliedFunction,
    `Can't build aggregation: only support function`,
  );
  assertTrue(
    matchFunctionName(valueSpecification.function, SUPPORTED_FUNCTIONS.TDS_AGG),
    `Can't build aggregation: only support agg()`,
  );

  assertTrue(
    valueSpecification.parameters.length === 2,
    `Can't build agg() expression: agg() expects 2 arguments`,
  );

  // column lambda
  const columnLambda = guaranteeType(
    valueSpecification.parameters[0],
    V1_Lambda,
    `Can't build agg() expression: agg() expects argument #1 as a lambda`,
  );
  const processedColumnLambda =
    returnUndefOnError(() =>
      buildProjectionColumnLambda(
        columnLambda,
        openVariables,
        compileContext,
        processingContext,
      ),
    ) ??
    new INTERNAL__UnknownValueSpecification(
      V1_serializeValueSpecification(columnLambda),
    );

  // aggregate lambda
  const aggregateLambda = guaranteeType(
    valueSpecification.parameters[1],
    V1_Lambda,
  );
  const processedAggregateLambda =
    aggregateLambda.accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationBuilder(
        compileContext,
        processingContext,
        openVariables,
      ),
    );

  return buildBaseSimpleFunctionExpression(
    [processedColumnLambda, processedAggregateLambda],
    extractElementNameFromPath(SUPPORTED_FUNCTIONS.TDS_AGG),
    compileContext,
  );
};

export const V1_buildGetAllFunctionExpression = (
  functionName: string,
  parameters: V1_ValueSpecification[],
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): [SimpleFunctionExpression, ValueSpecification[]] => {
  const [expression, processedParams] = V1_buildGenericFunctionExpression(
    functionName,
    parameters,
    openVariables,
    compileContext,
    processingContext,
  );
  const precedingExpression = expression.parametersValues[0];

  assertType(
    precedingExpression,
    InstanceValue,
    `Can't build getAll() expression: only support getAll() immediately following a class`,
  );
  expression.genericType = precedingExpression.genericType;
  expression.multiplicity = precedingExpression.multiplicity;
  return [expression, processedParams];
};

export const V1_buildExistsFunctionExpression = (
  functionName: string,
  parameters: V1_ValueSpecification[],
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): [SimpleFunctionExpression, ValueSpecification[]] => {
  assertTrue(
    parameters.length === 2,
    `Can't build exists() expression: exists() expects 1 argument`,
  );

  const precedingExpression = (
    parameters[0] as V1_ValueSpecification
  ).accept_ValueSpecificationVisitor(
    new V1_ValueSpecificationBuilder(
      compileContext,
      processingContext,
      openVariables,
    ),
  );
  precedingExpression.genericType = guaranteeType(
    precedingExpression,
    AbstractPropertyExpression,
  ).func.genericType;
  const lambda = parameters[1];
  if (lambda instanceof V1_Lambda) {
    lambda.parameters.forEach((variable): void => {
      if (variable.name && !variable.class) {
        const variableExpression = new VariableExpression(
          variable.name,
          compileContext.graph.getTypicalMultiplicity(
            TYPICAL_MULTIPLICITY_TYPE.ONE,
          ),
        );
        variableExpression.genericType = precedingExpression.genericType;
        processingContext.addInferredVariables(
          variable.name,
          variableExpression,
        );
      }
    });
  }
  const processedParameters = [
    precedingExpression,
    (parameters[1] as V1_ValueSpecification).accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationBuilder(
        compileContext,
        processingContext,
        openVariables,
      ),
    ),
  ];
  const expression = buildBaseSimpleFunctionExpression(
    processedParameters,
    functionName,
    compileContext,
  );
  return [expression, processedParameters];
};

export const V1_buildFilterFunctionExpression = (
  functionName: string,
  parameters: V1_ValueSpecification[],
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): [SimpleFunctionExpression, ValueSpecification[]] => {
  assertTrue(
    parameters.length === 2,
    `Can't build filter() expression: filter() expects 1 argument`,
  );

  const precedingExpression = (
    parameters[0] as V1_ValueSpecification
  ).accept_ValueSpecificationVisitor(
    new V1_ValueSpecificationBuilder(
      compileContext,
      processingContext,
      openVariables,
    ),
  );
  if (precedingExpression.genericType) {
    const lambda = parameters[1];
    if (lambda instanceof V1_Lambda) {
      lambda.parameters.forEach((variable): void => {
        if (variable.name && !variable.class) {
          const variableExpression = new VariableExpression(
            variable.name,
            precedingExpression.multiplicity,
          );
          variableExpression.genericType = precedingExpression.genericType;
          processingContext.addInferredVariables(
            variable.name,
            variableExpression,
          );
        }
      });
    }
  }
  const processedParams = [
    precedingExpression,
    (parameters[1] as V1_ValueSpecification).accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationBuilder(
        compileContext,
        processingContext,
        openVariables,
      ),
    ),
  ];
  const expression = buildBaseSimpleFunctionExpression(
    processedParams,
    functionName,
    compileContext,
  );

  // return type of filter() is the same as that of the function precedes it
  expression.genericType = precedingExpression.genericType;
  expression.multiplicity = precedingExpression.multiplicity;
  return [expression, processedParams];
};

export const V1_buildProjectFunctionExpression = (
  functionName: string,
  parameters: V1_ValueSpecification[],
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): [SimpleFunctionExpression, ValueSpecification[]] => {
  assertTrue(
    parameters.length === 3,
    `Can't build project() expression: project() expects 2 arguments`,
  );

  let topLevelLambdaParameters: V1_Variable[] = [];
  const precedingExperession = (
    parameters[0] as V1_ValueSpecification
  ).accept_ValueSpecificationVisitor(
    new V1_ValueSpecificationBuilder(
      compileContext,
      processingContext,
      openVariables,
    ),
  );
  assertNonNullable(
    precedingExperession.genericType,
    `Can't build project() expression: preceding expression return type is missing`,
  );

  const columnExpressions = parameters[1];
  assertType(
    columnExpressions,
    V1_Collection,
    `Can't build project() expression: project() expects argument #1 to be a collection`,
  );
  topLevelLambdaParameters = columnExpressions.values
    .filter(
      (value: V1_ValueSpecification): value is V1_Lambda =>
        value instanceof V1_Lambda,
    )
    .map((lambda) => lambda.parameters)
    .flat();

  const variables = new Set<string>();
  // Make sure top-level lambdas have their lambda parameter types set properly
  topLevelLambdaParameters.forEach((variable) => {
    if (!variables.has(variable.name) && !variable.class) {
      const variableExpression = new VariableExpression(
        variable.name,
        precedingExperession.multiplicity,
      );
      variableExpression.genericType = precedingExperession.genericType;
      processingContext.addInferredVariables(variable.name, variableExpression);
    }
  });

  // build column expressions taking into account of derivation
  const processedColumnExpressions = new CollectionInstanceValue(
    new Multiplicity(
      columnExpressions.multiplicity.lowerBound,
      columnExpressions.multiplicity.upperBound,
    ),
  );
  processedColumnExpressions.values = columnExpressions.values.map((value) => {
    try {
      return buildProjectionColumnLambda(
        value,
        openVariables,
        compileContext,
        processingContext,
      );
    } catch {
      return new INTERNAL__UnknownValueSpecification(
        V1_serializeValueSpecification(value),
      );
    }
  });

  const processedParams = [
    precedingExperession,
    processedColumnExpressions,
    (parameters[2] as V1_ValueSpecification).accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationBuilder(
        compileContext,
        processingContext,
        openVariables,
      ),
    ),
  ];
  const expression = buildBaseSimpleFunctionExpression(
    processedParams,
    functionName,
    compileContext,
  );
  return [expression, processedParams];
};

export const V1_buildGroupByFunctionExpression = (
  functionName: string,
  parameters: V1_ValueSpecification[],
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): [SimpleFunctionExpression, ValueSpecification[]] => {
  let topLevelLambdaParameters: V1_Variable[] = [];
  assertTrue(
    parameters.length === 4,
    `Can't build groupBy() expression: groupBy() expects 3 arguments`,
  );

  const precedingExperession = (
    parameters[0] as V1_ValueSpecification
  ).accept_ValueSpecificationVisitor(
    new V1_ValueSpecificationBuilder(
      compileContext,
      processingContext,
      openVariables,
    ),
  );
  assertNonNullable(
    precedingExperession.genericType,
    `Can't build groupBy() expression: preceding expression return type is missing`,
  );

  // normal columns
  const columnExpressions = parameters[1];
  assertType(
    columnExpressions,
    V1_Collection,
    `Can't build groupBy() expression: groupBy() expects argument #1 to be a collection`,
  );
  topLevelLambdaParameters = columnExpressions.values
    .filter(
      (value: V1_ValueSpecification): value is V1_Lambda =>
        value instanceof V1_Lambda,
    )
    .map((lambda) => lambda.parameters)
    .flat();

  // aggregation columns
  const aggregationExpressions = parameters[2];
  assertType(
    aggregationExpressions,
    V1_Collection,
    `Can't build groupBy() expression: groupBy() expects argument #2 to be a collection`,
  );
  topLevelLambdaParameters = topLevelLambdaParameters.concat(
    aggregationExpressions.values
      .filter(
        (value: V1_ValueSpecification): value is V1_AppliedFunction =>
          value instanceof V1_AppliedFunction &&
          matchFunctionName(value.function, SUPPORTED_FUNCTIONS.TDS_AGG),
      )
      .map((value) => value.parameters)
      .flat()
      .filter(
        (value: V1_ValueSpecification): value is V1_Lambda =>
          value instanceof V1_Lambda,
      )
      .map((lambda) => lambda.parameters)
      .flat(),
  );

  // Make sure top-level lambdas have their lambda parameter types set properly
  const variables = new Set<string>();
  topLevelLambdaParameters.forEach((variable) => {
    if (!variables.has(variable.name) && !variable.class) {
      const variableExpression = new VariableExpression(
        variable.name,
        precedingExperession.multiplicity,
      );
      variableExpression.genericType = precedingExperession.genericType;
      processingContext.addInferredVariables(variable.name, variableExpression);
    }
  });

  // build column expressions taking into account of derivation
  const processedColumnExpressions = new CollectionInstanceValue(
    new Multiplicity(
      columnExpressions.multiplicity.lowerBound,
      columnExpressions.multiplicity.upperBound,
    ),
  );
  processedColumnExpressions.values = columnExpressions.values.map((value) => {
    try {
      return buildProjectionColumnLambda(
        value,
        openVariables,
        compileContext,
        processingContext,
      );
    } catch {
      return new INTERNAL__UnknownValueSpecification(
        V1_serializeValueSpecification(value),
      );
    }
  });

  // build aggregation expressions taking into account of derivation
  const processedAggregationExpressions = new CollectionInstanceValue(
    new Multiplicity(
      aggregationExpressions.multiplicity.lowerBound,
      aggregationExpressions.multiplicity.upperBound,
    ),
  );
  processedAggregationExpressions.values = aggregationExpressions.values.map(
    (value) =>
      buildAggregationExpression(
        value,
        openVariables,
        compileContext,
        processingContext,
      ),
  );

  const processedParams = [
    precedingExperession,
    processedColumnExpressions,
    processedAggregationExpressions,
    (parameters[3] as V1_ValueSpecification).accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationBuilder(
        compileContext,
        processingContext,
        openVariables,
      ),
    ),
  ];
  const expression = buildBaseSimpleFunctionExpression(
    processedParams,
    functionName,
    compileContext,
  );
  return [expression, processedParams];
};

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
  filterByType,
  guaranteeNonNullable,
  guaranteeType,
  isNonNullable,
  returnUndefOnError,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import {
  type V1_GraphBuilderContext,
  type V1_ProcessingContext,
  type ValueSpecification,
  type Type,
  type SimpleFunctionExpression,
  V1_ValueSpecification,
  V1_buildBaseSimpleFunctionExpression,
  V1_buildGenericFunctionExpression,
  extractElementNameFromPath,
  V1_AppliedProperty,
  CollectionInstanceValue,
  INTERNAL__UnknownValueSpecification,
  V1_Variable,
  V1_serializeValueSpecification,
  GenericType,
  GenericTypeExplicitReference,
  matchFunctionName,
  InstanceValue,
  V1_AppliedFunction,
  V1_Collection,
  V1_Lambda,
  V1_ValueSpecificationBuilder,
  AbstractPropertyExpression,
  VariableExpression,
  Multiplicity,
  PrimitiveType,
  V1_CString,
  CORE_PURE_PATH,
  FunctionType,
  LambdaFunction,
  LambdaFunctionInstanceValue,
  PackageableElementExplicitReference,
  V1_ClassInstance,
  V1_ColSpecArray,
  ColSpecArrayInstance,
  ColSpecArray,
  ColSpec,
  Relation_RelationType,
  Relation_RelationalColumn,
  getValueSpecificationReturnType,
  Relation_Relation,
} from '@finos/legend-graph';
import {
  QUERY_BUILDER_PURE_PATH,
  QUERY_BUILDER_SUPPORTED_FUNCTIONS,
  QUERY_BUILDER_SUPPORTED_CALENDAR_AGGREGATION_FUNCTIONS,
} from '../../../../graph/QueryBuilderMetaModelConst.js';
import { QUERY_BUILDER_CALENDAR_TYPE } from '../../../QueryBuilderConst.js';

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
    // Take care of chains of subtype (a pattern that is not useful, but we want to support and rectify)
    // $x.employees->subType(@Person)->subType(@Staff)
    while (
      currentPropertyExpression instanceof V1_AppliedFunction &&
      matchFunctionName(
        currentPropertyExpression.function,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.SUBTYPE,
      )
    ) {
      currentPropertyExpression = currentPropertyExpression
        .parameters[0] as V1_ValueSpecification;
    }
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

const buildCalendarFunctionExpression = (
  valueSpecification: V1_ValueSpecification,
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): ValueSpecification => {
  assertType(
    valueSpecification,
    V1_Lambda,
    `Can't build calendar aggregation column: only support lambda`,
  );

  // lambda parameter
  assertTrue(
    valueSpecification.parameters.length === 1,
    `Can't build calendar aggregation column: only support lambda with 1 parameter`,
  );

  // lambda body
  assertTrue(
    valueSpecification.body.length === 1,
    `Can't build calendar aggregation column: only support lambda body with 1 expression`,
  );
  const columnLambdaParameter = guaranteeType(
    valueSpecification.parameters[0],
    V1_Variable,
    `Can't build calendar aggregation column: only support lambda with 1 parameter`,
  );
  const currentPropertyExpression = guaranteeType(
    valueSpecification.body[0],
    V1_AppliedFunction,
    `Can't build calendar aggregation column: only support applied function`,
  );
  assertTrue(
    matchFunctionName(
      currentPropertyExpression.function,
      Object.values(QUERY_BUILDER_SUPPORTED_CALENDAR_AGGREGATION_FUNCTIONS),
    ),
    `Can't build calendar aggregation columnn: unsupported calenddar function`,
  );

  assertTrue(
    currentPropertyExpression.parameters.length === 4,
    `Can't build calendar aggregation column: only support calendar function with four parameters`,
  );
  assertType(
    currentPropertyExpression.parameters[0],
    V1_AppliedProperty,
    `Can't build calendar aggregation column: only support first parameter of calendar function as property expression`,
  );
  const calendarType = guaranteeType(
    currentPropertyExpression.parameters[1],
    V1_CString,
    `Can't build calendar aggregation column: only support second parameter of calendar function as String`,
  );
  assertTrue(
    Object.values(QUERY_BUILDER_CALENDAR_TYPE).find(
      (val) => val === calendarType.value,
    ) !== undefined,
    `Can't build calendar aggregation column: ${calendarType.value} is not a supported calendar type`,
  );
  guaranteeType(
    currentPropertyExpression.parameters[2],
    V1_ValueSpecification,
    `Can't build calendar aggregation column: only support third parameter of calendar function as Date`,
  );
  const dateColumn =
    currentPropertyExpression.parameters[0].accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationBuilder(
        compileContext,
        processingContext,
        openVariables,
      ),
    );
  const calendarTypeValueSpec = guaranteeNonNullable(
    currentPropertyExpression.parameters[1],
  ).accept_ValueSpecificationVisitor(
    new V1_ValueSpecificationBuilder(
      compileContext,
      processingContext,
      openVariables,
    ),
  );
  const endDate = guaranteeNonNullable(
    currentPropertyExpression.parameters[2],
  ).accept_ValueSpecificationVisitor(
    new V1_ValueSpecificationBuilder(
      compileContext,
      processingContext,
      openVariables,
    ),
  );
  const columnLambda = guaranteeNonNullable(
    currentPropertyExpression.parameters[3],
  );
  const targetColumn =
    returnUndefOnError(() =>
      columnLambda.accept_ValueSpecificationVisitor(
        new V1_ValueSpecificationBuilder(
          compileContext,
          processingContext,
          openVariables,
        ),
      ),
    ) ??
    new INTERNAL__UnknownValueSpecification(
      V1_serializeValueSpecification(
        columnLambda,
        compileContext.extensions.plugins,
      ),
    );
  const calendarFunctionExpression = V1_buildBaseSimpleFunctionExpression(
    [dateColumn, calendarTypeValueSpec, endDate, targetColumn],
    currentPropertyExpression.function,
    compileContext,
  );
  const functionInstanceValue = new LambdaFunctionInstanceValue();
  const functionType = new FunctionType(
    PackageableElementExplicitReference.create(
      compileContext.graph.getType(CORE_PURE_PATH.ANY),
    ),
    Multiplicity.ONE,
  );
  functionType.parameters.push(
    new VariableExpression(columnLambdaParameter.name, Multiplicity.ONE),
  );
  const lambdaFunction = new LambdaFunction(functionType);
  lambdaFunction.expressionSequence = [calendarFunctionExpression];
  functionInstanceValue.values.push(lambdaFunction);
  return functionInstanceValue;
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
    matchFunctionName(
      valueSpecification.function,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_AGG,
    ),
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
  let processedColumnLambda;
  if (
    columnLambda.body[0] instanceof V1_AppliedFunction &&
    matchFunctionName(
      columnLambda.body[0].function,
      Object.values(QUERY_BUILDER_SUPPORTED_CALENDAR_AGGREGATION_FUNCTIONS),
    )
  ) {
    processedColumnLambda =
      returnUndefOnError(() =>
        buildCalendarFunctionExpression(
          columnLambda,
          openVariables,
          compileContext,
          processingContext,
        ),
      ) ??
      new INTERNAL__UnknownValueSpecification(
        V1_serializeValueSpecification(
          columnLambda,
          compileContext.extensions.plugins,
        ),
      );
  } else {
    processedColumnLambda =
      returnUndefOnError(() =>
        buildProjectionColumnLambda(
          columnLambda,
          openVariables,
          compileContext,
          processingContext,
        ),
      ) ??
      new INTERNAL__UnknownValueSpecification(
        V1_serializeValueSpecification(
          columnLambda,
          compileContext.extensions.plugins,
        ),
      );
  }

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

  return V1_buildBaseSimpleFunctionExpression(
    [processedColumnLambda, processedAggregateLambda],
    extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_AGG),
    compileContext,
  );
};

export const V1_buildGetAllFunctionExpression = (
  functionName: string,
  parameters: V1_ValueSpecification[],
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): SimpleFunctionExpression => {
  const expression = V1_buildGenericFunctionExpression(
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

  return expression;
};

export const V1_buildGetAllVersionsInRangeFunctionExpression = (
  functionName: string,
  parameters: V1_ValueSpecification[],
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): SimpleFunctionExpression => {
  const expression = V1_buildGenericFunctionExpression(
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
    `Can't build getAllVersionsInRange() expression: only support getAllVersionsInRange() immediately following a class`,
  );
  const parameterValues = expression.parametersValues;
  assertTrue(
    parameterValues.length === 3,
    `Can't build getAllVersionsInRange() expression: only support getAllVersionsRange() with start and end date`,
  );
  expression.genericType = precedingExpression.genericType;
  expression.multiplicity = precedingExpression.multiplicity;

  return expression;
};

export const V1_buildGetAllVersionsFunctionExpression = (
  functionName: string,
  parameters: V1_ValueSpecification[],
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): SimpleFunctionExpression => {
  const expression = V1_buildGenericFunctionExpression(
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
    `Can't build getAllVersions() expression: only support getAllVersions() immediately following a class`,
  );

  const parameterValues = expression.parametersValues;
  assertTrue(
    parameterValues.length === 1,
    `Can't build getAllVersions() expression: only support getAllVersions() with no paremters`,
  );
  expression.genericType = precedingExpression.genericType;
  expression.multiplicity = precedingExpression.multiplicity;

  return expression;
};

export const V1_buildExistsFunctionExpression = (
  functionName: string,
  parameters: V1_ValueSpecification[],
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): SimpleFunctionExpression => {
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
  ).func.value.genericType;
  const lambda = parameters[1];
  if (lambda instanceof V1_Lambda) {
    lambda.parameters.forEach((variable): void => {
      if (variable.name && !variable.class) {
        const variableExpression = new VariableExpression(
          variable.name,
          Multiplicity.ONE,
        );
        variableExpression.genericType = precedingExpression.genericType;
        processingContext.addInferredVariables(
          variable.name,
          variableExpression,
        );
      }
    });
  }

  return V1_buildBaseSimpleFunctionExpression(
    [
      precedingExpression,
      (parameters[1] as V1_ValueSpecification).accept_ValueSpecificationVisitor(
        new V1_ValueSpecificationBuilder(
          compileContext,
          processingContext,
          openVariables,
        ),
      ),
    ],
    functionName,
    compileContext,
  );
};

export const V1_buildFilterFunctionExpression = (
  functionName: string,
  parameters: V1_ValueSpecification[],
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): SimpleFunctionExpression => {
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

  const expression = V1_buildBaseSimpleFunctionExpression(
    [
      precedingExpression,
      (parameters[1] as V1_ValueSpecification).accept_ValueSpecificationVisitor(
        new V1_ValueSpecificationBuilder(
          compileContext,
          processingContext,
          openVariables,
        ),
      ),
    ],
    functionName,
    compileContext,
  );

  // return type of filter() is the same as that of the function precedes it
  expression.genericType = precedingExpression.genericType;
  expression.multiplicity = precedingExpression.multiplicity;

  return expression;
};

const V1_buildTypedProjectFunctionExpression = (
  functionName: string,
  parameters: V1_ValueSpecification[],
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): SimpleFunctionExpression => {
  assertTrue(
    parameters.length === 2,
    `Can't build relation project() expression: project() expects 2 arguments`,
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
    `Can't build relation project() expression: preceding expression return type is missing`,
  );

  const classInstance = parameters[1];
  assertType(
    classInstance,
    V1_ClassInstance,
    `Can't build relation project() expression: project() expects argument #1 to be a ClassInstance`,
  );
  const specArray = guaranteeType(
    classInstance.value,
    V1_ColSpecArray,
    `Can't build relation project() expression: project() expects argument #1 to hold spec array instances value`,
  );

  topLevelLambdaParameters = specArray.colSpecs
    .map((e) => e.function1)
    .filter(isNonNullable)
    .filter(filterByType(V1_Lambda))
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
  const processedExpression = new ColSpecArrayInstance(Multiplicity.ONE);
  const processedColSpecArray = new ColSpecArray();
  processedExpression.values = [processedColSpecArray];
  const relationType = new Relation_RelationType(Relation_RelationType.ID);
  processedColSpecArray.colSpecs = specArray.colSpecs.map((colSpec) => {
    const pColSpec = new ColSpec();
    let lambda: ValueSpecification;
    const _funct = guaranteeType(
      colSpec.function1,
      V1_ValueSpecification,
      `Can't build relation col spec() expression: expects function1 to be a lambda`,
    );
    try {
      lambda = buildProjectionColumnLambda(
        _funct,
        openVariables,
        compileContext,
        processingContext,
      );
    } catch {
      lambda = new INTERNAL__UnknownValueSpecification(
        V1_serializeValueSpecification(
          _funct,
          compileContext.extensions.plugins,
        ),
      );
    }
    pColSpec.function1 = lambda;
    pColSpec.name = colSpec.name;
    const returnType = getValueSpecificationReturnType(lambda);
    if (returnType) {
      relationType.columns.push(
        new Relation_RelationalColumn(colSpec.name, returnType),
      );
    } else {
      throw new UnsupportedOperationError(
        'Unable to get return type for current lambda',
      );
    }
    return pColSpec;
  });

  const expression = V1_buildBaseSimpleFunctionExpression(
    [precedingExperession, processedExpression],
    functionName,
    compileContext,
  );
  const relationGenericType = new GenericType(Relation_Relation.INSTANCE);
  const relationTypeGenericType = new GenericType(relationType);
  relationGenericType.typeArguments = [
    GenericTypeExplicitReference.create(relationTypeGenericType),
  ];
  expression.genericType =
    GenericTypeExplicitReference.create(relationGenericType);
  return expression;
};

const V1_buildColFunctionExpression = (
  valueSpecification: V1_ValueSpecification,
  precedingExperession: ValueSpecification,
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): SimpleFunctionExpression => {
  const appliedFunc = guaranteeType(
    valueSpecification,
    V1_AppliedFunction,
    `Can't build tds col func: only support applied function`,
  );
  assertTrue(
    matchFunctionName(
      appliedFunc.function,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_COL,
    ),
    `Can't build tds col func: unsupported func name ${appliedFunc.function}`,
  );
  assertTrue(
    appliedFunc.parameters.length === 2,
    `Can't build tds col func: only support col function with 2 parameters`,
  );
  const colLambda = guaranteeType(
    appliedFunc.parameters[0],
    V1_Lambda,
    `Can't build tds col func: only support first parameter of col function as Lambda`,
  );
  let lambda: ValueSpecification;
  try {
    colLambda.parameters.forEach((variable): void => {
      if (variable.name && !variable.class) {
        const variableExpression = new VariableExpression(
          variable.name,
          Multiplicity.ONE,
        );
        variableExpression.genericType = precedingExperession.genericType;
        processingContext.addInferredVariables(
          variable.name,
          variableExpression,
        );
      }
    });
    lambda = buildProjectionColumnLambda(
      colLambda,
      openVariables,
      compileContext,
      processingContext,
    );
  } catch {
    lambda = new INTERNAL__UnknownValueSpecification(
      V1_serializeValueSpecification(
        colLambda,
        compileContext.extensions.plugins,
      ),
    );
  }
  guaranteeType(
    appliedFunc.parameters[1],
    V1_CString,
    `Can't build tds col func: only support second parameter of col function as String`,
  );
  const colNameValueSpec = guaranteeNonNullable(
    appliedFunc.parameters[1],
  ).accept_ValueSpecificationVisitor(
    new V1_ValueSpecificationBuilder(
      compileContext,
      processingContext,
      openVariables,
    ),
  );
  const colFunctionExpression = V1_buildBaseSimpleFunctionExpression(
    [lambda, colNameValueSpec],
    appliedFunc.function,
    compileContext,
  );
  return colFunctionExpression;
};

const V1_buildTDSProjectWithColFunctionExpression = (
  functionName: string,
  parameters: V1_ValueSpecification[],
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): SimpleFunctionExpression => {
  assertTrue(
    parameters.length === 2,
    `Can't build tds project() expression: project() expects 2 arguments`,
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
    `Can't build tds project() expression: preceding expression return type is missing`,
  );
  const colFuncExpress = guaranteeNonNullable(
    parameters[1],
    `Can't build tds project() expression: second parameter is missing`,
  );
  let secondProcessedParameter: ValueSpecification;
  if (colFuncExpress instanceof V1_Collection) {
    const processedColExpressions = new CollectionInstanceValue(
      compileContext.graph.getMultiplicity(
        colFuncExpress.multiplicity.lowerBound,
        colFuncExpress.multiplicity.upperBound,
      ),
    );
    processedColExpressions.values = colFuncExpress.values.map((value) =>
      V1_buildColFunctionExpression(
        value,
        precedingExperession,
        openVariables,
        compileContext,
        processingContext,
      ),
    );
    secondProcessedParameter = processedColExpressions;
  } else {
    assertType(
      colFuncExpress,
      V1_AppliedFunction,
      `Can't build project() expression: project() expects argument #2 to be a function`,
    );
    secondProcessedParameter = V1_buildColFunctionExpression(
      colFuncExpress,
      precedingExperession,
      openVariables,
      compileContext,
      processingContext,
    );
  }
  const expression = V1_buildBaseSimpleFunctionExpression(
    [precedingExperession, secondProcessedParameter],
    functionName,
    compileContext,
  );
  expression.genericType = GenericTypeExplicitReference.create(
    new GenericType(
      compileContext.resolveType(QUERY_BUILDER_PURE_PATH.TDS_ROW).value,
    ),
  );
  return expression;
};

export const V1_buildProjectFunctionExpression = (
  functionName: string,
  parameters: V1_ValueSpecification[],
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): SimpleFunctionExpression => {
  if (parameters.length === 2) {
    try {
      return V1_buildTDSProjectWithColFunctionExpression(
        functionName,
        parameters,
        openVariables,
        compileContext,
        processingContext,
      );
    } catch {
      return V1_buildTypedProjectFunctionExpression(
        functionName,
        parameters,
        openVariables,
        compileContext,
        processingContext,
      );
    }
  }
  const length = parameters.length;
  assertTrue(
    length === 3 || length === 2,
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
  if (columnExpressions instanceof V1_Lambda) {
    topLevelLambdaParameters = columnExpressions.parameters;
  } else {
    assertType(
      columnExpressions,
      V1_Collection,
      `Can't build project() expression: project() expects argument #1 to be a collection`,
    );
    topLevelLambdaParameters = columnExpressions.values
      .filter(filterByType(V1_Lambda))
      .map((lambda) => lambda.parameters)
      .flat();
  }

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
    compileContext.graph.getMultiplicity(
      columnExpressions.multiplicity.lowerBound,
      columnExpressions.multiplicity.upperBound,
    ),
  );
  let colExpressionValues: V1_ValueSpecification[] = [];
  if (columnExpressions instanceof V1_Lambda) {
    colExpressionValues = [columnExpressions];
  } else {
    colExpressionValues = columnExpressions.values;
  }
  processedColumnExpressions.values = colExpressionValues.map((value) => {
    try {
      return buildProjectionColumnLambda(
        value,
        openVariables,
        compileContext,
        processingContext,
      );
    } catch {
      return new INTERNAL__UnknownValueSpecification(
        V1_serializeValueSpecification(
          value,
          compileContext.extensions.plugins,
        ),
      );
    }
  });

  const expression = V1_buildBaseSimpleFunctionExpression(
    [
      precedingExperession,
      processedColumnExpressions,
      (parameters[2] as V1_ValueSpecification).accept_ValueSpecificationVisitor(
        new V1_ValueSpecificationBuilder(
          compileContext,
          processingContext,
          openVariables,
        ),
      ),
    ],
    functionName,
    compileContext,
  );
  expression.genericType = GenericTypeExplicitReference.create(
    new GenericType(
      compileContext.resolveType(QUERY_BUILDER_PURE_PATH.TDS_ROW).value,
    ),
  );

  return expression;
};

export const V1_buildGroupByFunctionExpression = (
  functionName: string,
  parameters: V1_ValueSpecification[],
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): SimpleFunctionExpression => {
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
    .filter(filterByType(V1_Lambda))
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
          matchFunctionName(
            value.function,
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_AGG,
          ),
      )
      .map((value) => value.parameters)
      .flat()
      .filter(filterByType(V1_Lambda))
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
    compileContext.graph.getMultiplicity(
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
        V1_serializeValueSpecification(
          value,
          compileContext.extensions.plugins,
        ),
      );
    }
  });

  // build aggregation expressions taking into account of derivation
  const processedAggregationExpressions = new CollectionInstanceValue(
    compileContext.graph.getMultiplicity(
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

  const expression = V1_buildBaseSimpleFunctionExpression(
    [
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
    ],
    functionName,
    compileContext,
  );
  expression.genericType = GenericTypeExplicitReference.create(
    new GenericType(
      compileContext.resolveType(QUERY_BUILDER_PURE_PATH.TDS_ROW).value,
    ),
  );

  return expression;
};

export const V1_buildWatermarkFunctionExpression = (
  functionName: string,
  parameters: V1_ValueSpecification[],
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): SimpleFunctionExpression | undefined => {
  assertTrue(
    parameters.length === 2,
    `Can't build forWatermark() expression: forWatermark() expects 1 argument`,
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
  assertNonNullable(
    precedingExpression.genericType,
    `Can't build forWatermark() expression: preceding expression return type is missing`,
  );

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

  const watermarkValueParam = guaranteeNonNullable(
    (parameters[1] as V1_ValueSpecification).accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationBuilder(
        compileContext,
        processingContext,
        openVariables,
      ),
    ),
  );
  const watermarkValueParamType =
    watermarkValueParam.genericType?.value.rawType;
  assertTrue(
    PrimitiveType.STRING === watermarkValueParamType,
    "Can't build forWatermark() expression: parameter is expected to be a string",
  );

  const expression = V1_buildBaseSimpleFunctionExpression(
    [precedingExpression, watermarkValueParam],
    functionName,
    compileContext,
  );

  expression.genericType = precedingExpression.genericType;
  expression.multiplicity = precedingExpression.multiplicity;

  return expression;
};

export const V1_buildOLAPGroupByFunctionExpression = (
  functionName: string,
  parameters: V1_ValueSpecification[],
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): SimpleFunctionExpression | undefined => {
  const processedParams: ValueSpecification[] = [];
  assertTrue(
    parameters.length === 5 || parameters.length === 4,
    `Can't build olapGroupBy() expression: olapGroupBy() expects 4 or 5 arguments`,
  );
  let paramIndex = 0;
  const containsSortByExpression = parameters.length === 5;

  // preceding expression
  const precedingExperession = (
    parameters[paramIndex] as V1_ValueSpecification
  ).accept_ValueSpecificationVisitor(
    new V1_ValueSpecificationBuilder(
      compileContext,
      processingContext,
      openVariables,
    ),
  );
  assertNonNullable(
    precedingExperession.genericType,
    `Can't build olapGroupBy() expression: preceding expression return type is missing`,
  );
  processedParams.push(precedingExperession);
  paramIndex++;

  // partition (window) columns
  const columns = (
    parameters[paramIndex] as V1_ValueSpecification
  ).accept_ValueSpecificationVisitor(
    new V1_ValueSpecificationBuilder(
      compileContext,
      processingContext,
      openVariables,
    ),
  );
  processedParams.push(columns);
  paramIndex++;

  // OLAP sortBy
  if (containsSortByExpression) {
    const sortBy = (
      parameters[paramIndex] as V1_ValueSpecification
    ).accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationBuilder(
        compileContext,
        processingContext,
        openVariables,
      ),
    );
    processedParams.push(sortBy);
    paramIndex++;
  }

  // OLAP agg operation
  const olapOperatorExp = parameters[paramIndex];
  let olapOperationLambda: V1_Lambda;
  if (olapOperatorExp instanceof V1_AppliedFunction) {
    olapOperationLambda = guaranteeType(
      olapOperatorExp.parameters[1],
      V1_Lambda,
      `Can't build olapGroupBy() expression: olap operation function expects argument ${
        paramIndex + 1
      } to be a lambda`,
    );
  } else {
    olapOperationLambda = guaranteeType(
      olapOperatorExp,
      V1_Lambda,
      `Can't build olapGroupBy() expression: olapGroupBy() expects argument ${
        paramIndex + 1
      } to be a lambda`,
    );
  }
  const olapOperationParameters = olapOperationLambda.parameters;
  const variables = new Set<string>();
  olapOperationParameters.forEach((variable) => {
    if (!variables.has(variable.name) && !variable.class) {
      const variableExpression = new VariableExpression(
        variable.name,
        precedingExperession.multiplicity,
      );
      variableExpression.genericType = precedingExperession.genericType;
      processingContext.addInferredVariables(variable.name, variableExpression);
    }
  });
  const olapOperation = (
    olapOperatorExp as V1_ValueSpecification
  ).accept_ValueSpecificationVisitor(
    new V1_ValueSpecificationBuilder(
      compileContext,
      processingContext,
      openVariables,
    ),
  );
  processedParams.push(olapOperation);
  paramIndex++;

  // OLAP column name
  const olapColumnName = (
    parameters[paramIndex] as V1_ValueSpecification
  ).accept_ValueSpecificationVisitor(
    new V1_ValueSpecificationBuilder(
      compileContext,
      processingContext,
      openVariables,
    ),
  );
  processedParams.push(olapColumnName);
  paramIndex++;

  // build final expression
  const expression = V1_buildBaseSimpleFunctionExpression(
    processedParams,
    functionName,
    compileContext,
  );
  expression.genericType = GenericTypeExplicitReference.create(
    new GenericType(
      compileContext.resolveType(QUERY_BUILDER_PURE_PATH.TDS_ROW).value,
    ),
  );

  return expression;
};

export const V1_buildSubTypePropertyExpressionTypeInference = (
  inferredVariable: SimpleFunctionExpression,
): Type | undefined =>
  inferredVariable.parametersValues.filter(
    (param) => param instanceof InstanceValue,
  )[0]?.genericType?.value.rawType;

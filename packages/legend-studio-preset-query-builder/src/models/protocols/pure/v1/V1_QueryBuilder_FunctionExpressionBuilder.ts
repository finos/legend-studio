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

import type {
  V1_GraphBuilderContext,
  V1_ProcessingContext,
  V1_ValueSpecification,
  V1_Variable,
  ValueSpecification,
} from '@finos/legend-studio';
import {
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
} from '@finos/legend-studio';
import {
  assertType,
  guaranteeType,
  returnUndefOnError,
  UnsupportedOperationError,
} from '@finos/legend-studio-shared';
import { SUPPORTED_FUNCTIONS } from '../../../../QueryBuilder_Constants';

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
 * type-inferencing of the return and the parameters (i.e. function-matching).
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
  const paramOne = expression.parametersValues[0];
  if (paramOne instanceof InstanceValue) {
    expression.genericType = paramOne.genericType;
    expression.multiplicity = paramOne.multiplicity;
  }
  return [expression, processedParams];
};

export const V1_buildExistsFunctionExpression = (
  functionName: string,
  parameters: V1_ValueSpecification[],
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): [SimpleFunctionExpression, ValueSpecification[]] => {
  if (parameters.length === 2) {
    const precedingExpression = parameters[0].accept_ValueSpecificationVisitor(
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
      parameters[1].accept_ValueSpecificationVisitor(
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
  }
  throw new UnsupportedOperationError(`Can't build 'exists()' expression`);
};

export const V1_buildFilterFunctionExpression = (
  functionName: string,
  parameters: V1_ValueSpecification[],
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): [SimpleFunctionExpression, ValueSpecification[]] => {
  if (parameters.length === 2) {
    const precedingExpression = parameters[0].accept_ValueSpecificationVisitor(
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
      parameters[1].accept_ValueSpecificationVisitor(
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
  }
  throw new UnsupportedOperationError(`Can't build 'filter()' expression`);
};

export const V1_buildProjectFunctionExpression = (
  functionName: string,
  parameters: V1_ValueSpecification[],
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): [SimpleFunctionExpression, ValueSpecification[]] => {
  let variablesFromTopLevelLambdas: V1_Variable[] = [];
  if (parameters.length === 2 || parameters.length === 3) {
    const precedingExperession = parameters[0].accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationBuilder(
        compileContext,
        processingContext,
        openVariables,
      ),
    );
    if (precedingExperession.genericType) {
      const columnExpressions = parameters[1];
      if (
        // NOTE: this is to support the form `col(lambda, 'alias')`
        parameters.length === 2 &&
        columnExpressions instanceof V1_Collection
      ) {
        variablesFromTopLevelLambdas = columnExpressions.values
          .filter(
            (value: V1_ValueSpecification): value is V1_AppliedFunction =>
              value instanceof V1_AppliedFunction &&
              matchFunctionName(value.function, SUPPORTED_FUNCTIONS.TDS_COL),
          )
          .map((value) => value.parameters)
          .flat()
          .filter(
            (value: V1_ValueSpecification): value is V1_Lambda =>
              value instanceof V1_Lambda,
          )
          .map((lambda) => lambda.parameters)
          .flat();
      } else if (
        parameters.length === 3 &&
        columnExpressions instanceof V1_Collection
      ) {
        // This is for the case where there's a third parameter as the column names for project()
        // Here, each column expression is just a simple lambda with property expression
        variablesFromTopLevelLambdas = columnExpressions.values
          .filter(
            (value: V1_ValueSpecification): value is V1_Lambda =>
              value instanceof V1_Lambda,
          )
          .map((lambda) => lambda.parameters)
          .flat();
      }
      const variables = new Set<string>();
      variablesFromTopLevelLambdas.forEach((variable) => {
        if (!variables.has(variable.name) && !variable.class) {
          const variableExpression = new VariableExpression(
            variable.name,
            precedingExperession.multiplicity,
          );
          variableExpression.genericType = precedingExperession.genericType;
          processingContext.addInferredVariables(
            variable.name,
            variableExpression,
          );
        }
      });
      const processedParams = [
        precedingExperession,
        ...parameters
          .slice(1)
          .map((parameter) =>
            parameter.accept_ValueSpecificationVisitor(
              new V1_ValueSpecificationBuilder(
                compileContext,
                processingContext,
                openVariables,
              ),
            ),
          ),
      ];
      const expression = buildBaseSimpleFunctionExpression(
        processedParams,
        functionName,
        compileContext,
      );
      return [expression, processedParams];
    }
  }
  throw new UnsupportedOperationError(`Can't build 'project()' expression`);
};

export const V1_buildGroupByFunctionExpression = (
  functionName: string,
  parameters: V1_ValueSpecification[],
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): [SimpleFunctionExpression, ValueSpecification[]] => {
  let variablesFromTopLevelLambdas: V1_Variable[] = [];
  if (parameters.length === 4) {
    const precedingExperession = parameters[0].accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationBuilder(
        compileContext,
        processingContext,
        openVariables,
      ),
    );
    if (precedingExperession.genericType) {
      // normal columns
      const columnExpressions = parameters[1];
      assertType(
        columnExpressions,
        V1_Collection,
        `Can't build 'groupBy()' expression. First parameter must be a collection.`,
      );
      variablesFromTopLevelLambdas = columnExpressions.values
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
        `Can't build 'groupBy()' expression. Second parameter must be a collection.`,
      );
      variablesFromTopLevelLambdas = aggregationExpressions.values
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
        .flat();

      const variables = new Set<string>();
      variablesFromTopLevelLambdas.forEach((variable) => {
        if (!variables.has(variable.name) && !variable.class) {
          const variableExpression = new VariableExpression(
            variable.name,
            precedingExperession.multiplicity,
          );
          variableExpression.genericType = precedingExperession.genericType;
          processingContext.addInferredVariables(
            variable.name,
            variableExpression,
          );
        }
      });
      const processedParams = [
        precedingExperession,
        ...parameters
          .slice(1)
          .map((parameter) =>
            parameter.accept_ValueSpecificationVisitor(
              new V1_ValueSpecificationBuilder(
                compileContext,
                processingContext,
                openVariables,
              ),
            ),
          ),
      ];
      const expression = buildBaseSimpleFunctionExpression(
        processedParams,
        functionName,
        compileContext,
      );
      return [expression, processedParams];
    }
  }
  throw new UnsupportedOperationError(`Can't build 'groupBy()' expression`);
};

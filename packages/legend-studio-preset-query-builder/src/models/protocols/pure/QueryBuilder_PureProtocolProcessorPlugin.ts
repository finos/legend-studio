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
  PluginManager,
  SimpleFunctionExpression,
  V1_GraphBuilderContext,
  V1_ProcessingContext,
  V1_SimpleFunctionExpressionBuilder,
  V1_ValueSpecification,
  V1_Variable,
  ValueSpecification,
} from '@finos/legend-studio';
import { InstanceValue } from '@finos/legend-studio';
import {
  V1_AppliedFunction,
  V1_buildSimpleFunctionExpression,
  V1_Collection,
  V1_Lambda,
  V1_ValueSpecificationBuilder,
} from '@finos/legend-studio';
import {
  AbstractPropertyExpression,
  SUPPORTED_FUNCTIONS,
  TYPICAL_MULTIPLICITY_TYPE,
  VariableExpression,
} from '@finos/legend-studio';
import { PureProtocolProcessorPlugin } from '@finos/legend-studio';
import { guaranteeType } from '@finos/legend-studio-shared';
import packageJson from '../../../../package.json';

const buildGetAllFunctionExpression = (
  functionName: string,
  parameters: V1_ValueSpecification[],
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): [SimpleFunctionExpression, ValueSpecification[]] => {
  const processedParams = parameters.map((p) =>
    p.accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationBuilder(
        compileContext,
        processingContext,
        openVariables,
      ),
    ),
  );
  const getAllFunctionExpression = V1_buildSimpleFunctionExpression(
    processedParams,
    functionName,
    compileContext,
  );
  const first = getAllFunctionExpression.parametersValues[0];
  if (first instanceof InstanceValue) {
    getAllFunctionExpression.genericType = first.genericType;
    getAllFunctionExpression.multiplicity = first.multiplicity;
  }
  return [getAllFunctionExpression, processedParams];
};

const buildExistsFunctionExpression = (
  functionName: string,
  parameters: V1_ValueSpecification[],
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): [SimpleFunctionExpression, ValueSpecification[]] => {
  if (parameters.length === 2) {
    const processedValue = parameters[0].accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationBuilder(
        compileContext,
        processingContext,
        openVariables,
      ),
    );
    processedValue.genericType = guaranteeType(
      processedValue,
      AbstractPropertyExpression,
    ).func.genericType;
    const lambda = parameters[1];
    if (lambda instanceof V1_Lambda) {
      lambda.parameters.forEach((p): void => {
        if (p.name && !p.class) {
          const _var = new VariableExpression(
            p.name,
            compileContext.graph.getTypicalMultiplicity(
              TYPICAL_MULTIPLICITY_TYPE.ONE,
            ),
          );
          _var.genericType = processedValue.genericType;
          processingContext.addInferredVariables(p.name, _var);
        }
      });
    }
    const _processed = [
      processedValue,
      parameters[1].accept_ValueSpecificationVisitor(
        new V1_ValueSpecificationBuilder(
          compileContext,
          processingContext,
          openVariables,
        ),
      ),
    ];
    const _simpleFunction = V1_buildSimpleFunctionExpression(
      _processed,
      functionName,
      compileContext,
    );
    return [_simpleFunction, _processed];
  }
  const processed = parameters.map((p) =>
    p.accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationBuilder(
        compileContext,
        processingContext,
        openVariables,
      ),
    ),
  );
  const simpleFunction = V1_buildSimpleFunctionExpression(
    processed,
    functionName,
    compileContext,
  );
  return [simpleFunction, processed];
};

const buildFilterFunctionExpression = (
  functionName: string,
  parameters: V1_ValueSpecification[],
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): [SimpleFunctionExpression, ValueSpecification[]] => {
  if (parameters.length === 2) {
    const processedValue = parameters[0].accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationBuilder(
        compileContext,
        processingContext,
        openVariables,
      ),
    );
    if (processedValue.genericType) {
      const func = parameters[1];
      if (func instanceof V1_Lambda) {
        func.parameters.forEach((p): void => {
          if (p.name && !p.class) {
            const _var = new VariableExpression(
              p.name,
              processedValue.multiplicity,
            );
            _var.genericType = processedValue.genericType;
            processingContext.addInferredVariables(p.name, _var);
          }
        });
      }
    }
    const _processed = [
      processedValue,
      parameters[1].accept_ValueSpecificationVisitor(
        new V1_ValueSpecificationBuilder(
          compileContext,
          processingContext,
          openVariables,
        ),
      ),
    ];
    const _simpleFunction = V1_buildSimpleFunctionExpression(
      _processed,
      functionName,
      compileContext,
    );
    // return type of filtered is of type of param 0 - filter_T_MANY__Function_1__T_MANY_
    _simpleFunction.genericType = processedValue.genericType;
    _simpleFunction.multiplicity = processedValue.multiplicity;
    return [_simpleFunction, _processed];
  }
  const processed = parameters.map((p) =>
    p.accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationBuilder(
        compileContext,
        processingContext,
        openVariables,
      ),
    ),
  );
  const simpleFunction = V1_buildSimpleFunctionExpression(
    processed,
    functionName,
    compileContext,
  );
  return [simpleFunction, processed];
};

const buildProjectFunctionExpression = (
  functionName: string,
  parameters: V1_ValueSpecification[],
  openVariables: string[],
  compileContext: V1_GraphBuilderContext,
  processingContext: V1_ProcessingContext,
): [SimpleFunctionExpression, ValueSpecification[]] => {
  let lambdasVariables: V1_Variable[] = [];
  if (parameters.length === 2 || parameters.length === 3) {
    const processedValue = parameters[0].accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationBuilder(
        compileContext,
        processingContext,
        openVariables,
      ),
    );
    const func = parameters[1];
    if (processedValue.genericType) {
      if (parameters.length === 2 && func instanceof V1_Collection) {
        lambdasVariables = func.values
          .filter(
            (v: V1_ValueSpecification): v is V1_AppliedFunction =>
              v instanceof V1_AppliedFunction &&
              v.function === SUPPORTED_FUNCTIONS.TDS_COL,
          )
          .map((v) => v.parameters)
          .flat()
          .filter(
            (v: V1_ValueSpecification): v is V1_Lambda =>
              v instanceof V1_Lambda,
          )
          .map((l) => l.parameters)
          .flat();
      } else if (parameters.length === 3 && func instanceof V1_Collection) {
        lambdasVariables = func.values
          .filter(
            (v: V1_ValueSpecification): v is V1_Lambda =>
              v instanceof V1_Lambda,
          )
          .map((l) => l.parameters)
          .flat();
      }
      const variables = new Set<string>();
      lambdasVariables.forEach((v) => {
        if (!variables.has(v.name) && !v.class) {
          const _var = new VariableExpression(
            v.name,
            processedValue.multiplicity,
          );
          _var.genericType = processedValue.genericType;
          processingContext.addInferredVariables(v.name, _var);
        }
      });
      const _processed = [
        processedValue,
        ...parameters
          .slice(1)
          .map((e) =>
            e.accept_ValueSpecificationVisitor(
              new V1_ValueSpecificationBuilder(
                compileContext,
                processingContext,
                openVariables,
              ),
            ),
          ),
      ];
      const _simpleFunction = V1_buildSimpleFunctionExpression(
        _processed,
        functionName,
        compileContext,
      );
      return [_simpleFunction, _processed];
    }
  }
  const processed = parameters.map((p) =>
    p.accept_ValueSpecificationVisitor(
      new V1_ValueSpecificationBuilder(
        compileContext,
        processingContext,
        openVariables,
      ),
    ),
  );
  const simpleFunction = V1_buildSimpleFunctionExpression(
    processed,
    functionName,
    compileContext,
  );
  return [simpleFunction, processed];
};

export class QueryBuilder_PureProtocolProcessorPlugin extends PureProtocolProcessorPlugin {
  constructor() {
    super(
      `${packageJson.pluginPrefix}-pure-protocol-processor`,
      packageJson.version,
    );
  }

  install(pluginManager: PluginManager): void {
    pluginManager.registerPureProtocolProcessorPlugin(this);
  }

  override V1_getExtraSimpleFunctionExpressionBuilders(): V1_SimpleFunctionExpressionBuilder[] {
    return [
      (
        functionName: string,
        parameters: V1_ValueSpecification[],
        openVariables: string[],
        compileContext: V1_GraphBuilderContext,
        processingContext: V1_ProcessingContext,
      ): [SimpleFunctionExpression, ValueSpecification[]] | undefined => {
        switch (functionName) {
          case SUPPORTED_FUNCTIONS.GET_ALL: {
            return buildGetAllFunctionExpression(
              functionName,
              parameters,
              openVariables,
              compileContext,
              processingContext,
            );
          }
          case SUPPORTED_FUNCTIONS.FILTER: {
            return buildFilterFunctionExpression(
              functionName,
              parameters,
              openVariables,
              compileContext,
              processingContext,
            );
          }
          case SUPPORTED_FUNCTIONS.EXISTS: {
            return buildExistsFunctionExpression(
              functionName,
              parameters,
              openVariables,
              compileContext,
              processingContext,
            );
          }
          case SUPPORTED_FUNCTIONS.TDS_PROJECT: {
            return buildProjectFunctionExpression(
              functionName,
              parameters,
              openVariables,
              compileContext,
              processingContext,
            );
          }
          default:
            return undefined;
        }
      },
    ];
  }
}

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

import packageJson from '../../../../package.json';
import { SUPPORTED_FUNCTIONS } from '../../../QueryBuilder_Const';
import {
  V1_buildExistsFunctionExpression,
  V1_buildFilterFunctionExpression,
  V1_buildGenericFunctionExpression,
  V1_buildGetAllFunctionExpression,
  V1_buildGroupByFunctionExpression,
  V1_buildProjectFunctionExpression,
} from './v1/V1_QueryBuilder_FunctionExpressionBuilder';
import type {
  V1_GraphBuilderContext,
  V1_ProcessingContext,
  V1_FunctionExpressionBuilder,
  V1_ValueSpecification,
  ValueSpecification,
  SimpleFunctionExpression,
  GraphPluginManager,
} from '@finos/legend-graph';
import {
  PureProtocolProcessorPlugin,
  matchFunctionName,
} from '@finos/legend-graph';

export class QueryBuilder_PureProtocolProcessorPlugin extends PureProtocolProcessorPlugin {
  constructor() {
    super(
      packageJson.extensions.pureProtocolProcessorPlugin,
      packageJson.version,
    );
  }

  install(pluginManager: GraphPluginManager): void {
    pluginManager.registerPureProtocolProcessorPlugin(this);
  }

  override V1_getExtraFunctionExpressionBuilders(): V1_FunctionExpressionBuilder[] {
    return [
      (
        functionName: string,
        parameters: V1_ValueSpecification[],
        openVariables: string[],
        compileContext: V1_GraphBuilderContext,
        processingContext: V1_ProcessingContext,
      ): [SimpleFunctionExpression, ValueSpecification[]] | undefined => {
        if (matchFunctionName(functionName, SUPPORTED_FUNCTIONS.GET_ALL)) {
          return V1_buildGetAllFunctionExpression(
            functionName,
            parameters,
            openVariables,
            compileContext,
            processingContext,
          );
        } else if (
          matchFunctionName(functionName, SUPPORTED_FUNCTIONS.FILTER)
        ) {
          return V1_buildFilterFunctionExpression(
            functionName,
            parameters,
            openVariables,
            compileContext,
            processingContext,
          );
        } else if (
          matchFunctionName(functionName, SUPPORTED_FUNCTIONS.EXISTS)
        ) {
          return V1_buildExistsFunctionExpression(
            functionName,
            parameters,
            openVariables,
            compileContext,
            processingContext,
          );
        } else if (
          matchFunctionName(functionName, SUPPORTED_FUNCTIONS.TDS_PROJECT)
        ) {
          return V1_buildProjectFunctionExpression(
            functionName,
            parameters,
            openVariables,
            compileContext,
            processingContext,
          );
        } else if (
          matchFunctionName(functionName, SUPPORTED_FUNCTIONS.TDS_GROUP_BY)
        ) {
          return V1_buildGroupByFunctionExpression(
            functionName,
            parameters,
            openVariables,
            compileContext,
            processingContext,
          );
        } else if (
          Object.values(SUPPORTED_FUNCTIONS).some((fn) =>
            matchFunctionName(functionName, fn),
          )
        ) {
          // NOTE: this is a catch-all builder that is only meant for basic function expression
          // such as and(), or(), etc. It will fail when type-inferencing/function-matching is required
          // such as for project(), filter(), getAll(), etc.
          return V1_buildGenericFunctionExpression(
            functionName,
            parameters,
            openVariables,
            compileContext,
            processingContext,
          );
        }
        return undefined;
      },
    ];
  }
}

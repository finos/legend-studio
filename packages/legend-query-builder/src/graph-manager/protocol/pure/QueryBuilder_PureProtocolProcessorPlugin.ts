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

import packageJson from '../../../../package.json' with { type: 'json' };
import {
  V1_buildExistsFunctionExpression,
  V1_buildFilterFunctionExpression,
  V1_buildGetAllFunctionExpression,
  V1_buildGetAllVersionsFunctionExpression,
  V1_buildGetAllVersionsInRangeFunctionExpression,
  V1_buildGroupByFunctionExpression,
  V1_buildOLAPGroupByFunctionExpression,
  V1_buildProjectFunctionExpression,
  V1_buildSubTypePropertyExpressionTypeInference,
  V1_buildWatermarkFunctionExpression,
} from './v1/V1_QueryValueSpecificationBuilderHelper.js';
import {
  type V1_GraphBuilderContext,
  type V1_ProcessingContext,
  type V1_FunctionExpressionBuilder,
  type V1_ValueSpecification,
  type ValueSpecification,
  type Type,
  type V1_PropertyExpressionTypeInferrer,
  PureProtocolProcessorPlugin,
  matchFunctionName,
  SimpleFunctionExpression,
  extractElementNameFromPath,
  V1_buildGenericFunctionExpression,
  GenericType,
  GenericTypeExplicitReference,
  PrimitiveType,
} from '@finos/legend-graph';
import {
  QUERY_BUILDER_SUPPORTED_CALENDAR_AGGREGATION_FUNCTIONS,
  QUERY_BUILDER_SUPPORTED_FUNCTIONS,
  QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS,
} from '../../../graph/QueryBuilderMetaModelConst.js';

export class QueryBuilder_PureProtocolProcessorPlugin extends PureProtocolProcessorPlugin {
  constructor() {
    super(
      packageJson.extensions.pureProtocolProcessorPlugin,
      packageJson.version,
    );
  }

  override V1_getExtraFunctionExpressionBuilders(): V1_FunctionExpressionBuilder[] {
    return [
      (
        functionName: string,
        parameters: V1_ValueSpecification[],
        openVariables: string[],
        compileContext: V1_GraphBuilderContext,
        processingContext: V1_ProcessingContext,
      ): SimpleFunctionExpression | undefined => {
        if (
          matchFunctionName(
            functionName,
            QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL,
          )
        ) {
          return V1_buildGetAllFunctionExpression(
            functionName,
            parameters,
            openVariables,
            compileContext,
            processingContext,
          );
        } else if (
          matchFunctionName(
            functionName,
            QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL_VERSIONS_IN_RANGE,
          )
        ) {
          return V1_buildGetAllVersionsInRangeFunctionExpression(
            functionName,
            parameters,
            openVariables,
            compileContext,
            processingContext,
          );
        } else if (
          matchFunctionName(
            functionName,
            QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL_VERSIONS,
          )
        ) {
          return V1_buildGetAllVersionsFunctionExpression(
            functionName,
            parameters,
            openVariables,
            compileContext,
            processingContext,
          );
        } else if (
          matchFunctionName(functionName, [
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.FILTER,
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_FILTER,
          ])
        ) {
          return V1_buildFilterFunctionExpression(
            functionName,
            parameters,
            openVariables,
            compileContext,
            processingContext,
          );
        } else if (
          matchFunctionName(
            functionName,
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.EXISTS,
          )
        ) {
          return V1_buildExistsFunctionExpression(
            functionName,
            parameters,
            openVariables,
            compileContext,
            processingContext,
          );
        } else if (
          matchFunctionName(
            functionName,
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.WATERMARK,
          )
        ) {
          return V1_buildWatermarkFunctionExpression(
            functionName,
            parameters,
            openVariables,
            compileContext,
            processingContext,
          );
        } else if (
          matchFunctionName(functionName, [
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_PROJECT,
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.RELATION_PROJECT,
          ])
        ) {
          return V1_buildProjectFunctionExpression(
            functionName,
            parameters,
            openVariables,
            compileContext,
            processingContext,
          );
        } else if (
          matchFunctionName(
            functionName,
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_GROUP_BY,
          )
        ) {
          return V1_buildGroupByFunctionExpression(
            functionName,
            parameters,
            openVariables,
            compileContext,
            processingContext,
          );
        } else if (
          matchFunctionName(
            functionName,
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.OLAP_GROUPBY,
          )
        ) {
          return V1_buildOLAPGroupByFunctionExpression(
            functionName,
            parameters,
            openVariables,
            compileContext,
            processingContext,
          );
        } else if (
          matchFunctionName(functionName, [
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.TODAY,
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_QUARTER,
          ])
        ) {
          const expression = V1_buildGenericFunctionExpression(
            functionName,
            parameters,
            openVariables,
            compileContext,
            processingContext,
          );
          expression.genericType = GenericTypeExplicitReference.create(
            new GenericType(PrimitiveType.STRICTDATE),
          );
          return expression;
        } else if (
          matchFunctionName(functionName, QUERY_BUILDER_SUPPORTED_FUNCTIONS.NOW)
        ) {
          const expression = V1_buildGenericFunctionExpression(
            functionName,
            parameters,
            openVariables,
            compileContext,
            processingContext,
          );
          expression.genericType = GenericTypeExplicitReference.create(
            new GenericType(PrimitiveType.DATETIME),
          );
          return expression;
        } else if (
          matchFunctionName(functionName, [
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_THIS_YEAR,
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_YEAR,
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_THIS_MONTH,
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_MONTH,
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.FIRST_DAY_OF_WEEK,
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.PREVIOUS_DAY_OF_WEEK,
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.ADJUST,
          ])
        ) {
          const expression = V1_buildGenericFunctionExpression(
            functionName,
            parameters,
            openVariables,
            compileContext,
            processingContext,
          );
          expression.genericType = GenericTypeExplicitReference.create(
            new GenericType(PrimitiveType.DATE),
          );
          return expression;
        } else if (
          matchFunctionName(
            functionName,
            Object.values(QUERY_BUILDER_SUPPORTED_FUNCTIONS),
          ) ||
          matchFunctionName(
            functionName,
            Object.values(
              QUERY_BUILDER_SUPPORTED_CALENDAR_AGGREGATION_FUNCTIONS,
            ),
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

  override V1_getExtraPropertyExpressionTypeInferrers(): V1_PropertyExpressionTypeInferrer[] {
    return [
      (inferredVariable: ValueSpecification | undefined): Type | undefined => {
        let inferredType: Type | undefined =
          inferredVariable?.genericType?.value.rawType;
        if (
          inferredVariable instanceof SimpleFunctionExpression &&
          matchFunctionName(
            inferredVariable.functionName,
            extractElementNameFromPath(
              QUERY_BUILDER_SUPPORTED_FUNCTIONS.SUBTYPE,
            ),
          )
        ) {
          inferredType =
            V1_buildSubTypePropertyExpressionTypeInference(inferredVariable);
        }
        return inferredType;
      },
    ];
  }
}

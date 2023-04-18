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
  SimpleFunctionExpression,
  extractElementNameFromPath,
  type LambdaFunction,
} from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../graph/QueryBuilderMetaModelConst.js';
import type { QueryBuilderWatermarkState } from './QueryBuilderWatermarkState.js';

export const buildWatermarkExpression = (
  watermarkState: QueryBuilderWatermarkState,
  lambdaFunction: LambdaFunction,
): void => {
  if (!watermarkState.value) {
    return;
  }
  const currentExpression = guaranteeNonNullable(
    lambdaFunction.expressionSequence[0],
  );

  // main filter expression
  const watermarkExpression = new SimpleFunctionExpression(
    extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.WATERMARK),
  );

  // param [0]
  watermarkExpression.parametersValues.push(currentExpression);

  // param [1]
  watermarkExpression.parametersValues.push(watermarkState.value);

  // replace watermark as main expression
  lambdaFunction.expressionSequence[0] = watermarkExpression;
};

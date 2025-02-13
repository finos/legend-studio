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
  type Type,
  matchFunctionName,
  PrimitiveType,
} from '@finos/legend-graph';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../graph/QueryBuilderMetaModelConst.js';

export const getNumericAggregateOperatorReturnType = (
  aggregateOperator: string,
): Type | undefined => {
  if (
    matchFunctionName(aggregateOperator, [
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.AVERAGE,
    ])
  ) {
    return PrimitiveType.FLOAT;
  } else if (
    matchFunctionName(aggregateOperator, [
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.COUNT,
    ])
  ) {
    return PrimitiveType.INTEGER;
  } else if (
    matchFunctionName(aggregateOperator, [
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.JOIN_STRINGS,
    ])
  ) {
    return PrimitiveType.STRING;
  } else if (
    matchFunctionName(aggregateOperator, [
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.STD_DEV_POPULATION,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.STD_DEV_SAMPLE,
    ])
  ) {
    return PrimitiveType.NUMBER;
  }
  return undefined;
};

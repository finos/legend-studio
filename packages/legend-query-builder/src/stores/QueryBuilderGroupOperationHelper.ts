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

import { matchFunctionName } from '@finos/legend-graph';
import { UnsupportedOperationError } from '@finos/legend-shared';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../graph/QueryBuilderMetaModelConst.js';

export enum QUERY_BUILDER_GROUP_OPERATION {
  AND = 'and',
  OR = 'or',
}

export const fromGroupOperation = (
  operation: QUERY_BUILDER_GROUP_OPERATION,
): string => {
  switch (operation) {
    case QUERY_BUILDER_GROUP_OPERATION.AND:
      return QUERY_BUILDER_SUPPORTED_FUNCTIONS.AND;
    case QUERY_BUILDER_GROUP_OPERATION.OR:
      return QUERY_BUILDER_SUPPORTED_FUNCTIONS.OR;
    default:
      throw new UnsupportedOperationError(
        `Can't derive function name from group operation '${operation}'`,
      );
  }
};

export const toGroupOperation = (
  functionName: string,
): QUERY_BUILDER_GROUP_OPERATION => {
  if (matchFunctionName(functionName, QUERY_BUILDER_SUPPORTED_FUNCTIONS.AND)) {
    return QUERY_BUILDER_GROUP_OPERATION.AND;
  } else if (
    matchFunctionName(functionName, QUERY_BUILDER_SUPPORTED_FUNCTIONS.OR)
  ) {
    return QUERY_BUILDER_GROUP_OPERATION.OR;
  }
  throw new UnsupportedOperationError(
    `Can't derive group operation from function name '${functionName}'`,
  );
};

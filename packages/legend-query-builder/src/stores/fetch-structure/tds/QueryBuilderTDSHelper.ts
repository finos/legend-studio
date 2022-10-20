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
  extractElementNameFromPath,
  matchFunctionName,
} from '@finos/legend-graph';
import {
  guaranteeNonNullable,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../graphManager/QueryBuilderSupportedFunctions.js';
import type { QueryBuilderTDSState } from './QueryBuilderTDSState.js';
import type { QueryBuilderTDSColumnState } from './QueryBuilderTdsColumnState.js';
import { COLUMN_SORT_TYPE } from './QueryResultSetModifierState.js';

export const findTDSColumnState = (
  projectionState: QueryBuilderTDSState,
  columnName: string,
): QueryBuilderTDSColumnState | undefined =>
  projectionState.tdsColumns.find((c) => c.columnName === columnName);

export const getTDSColumnState = (
  projectionState: QueryBuilderTDSState,
  columnName: string,
): QueryBuilderTDSColumnState =>
  guaranteeNonNullable(
    findTDSColumnState(projectionState, columnName),
    `Column ${columnName} not found in TDS`,
  );

export const getTDSColSortTypeFromFunctionName = (
  functionName: string,
): COLUMN_SORT_TYPE => {
  if (
    matchFunctionName(functionName, QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_ASC)
  ) {
    return COLUMN_SORT_TYPE.ASC;
  } else if (
    matchFunctionName(functionName, QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_DESC)
  ) {
    return COLUMN_SORT_TYPE.DESC;
  }
  throw new UnsupportedOperationError(
    `Unsupported TDS sort function: ${functionName}`,
  );
};

export const getFunctionNameFromTDSSortColumn = (
  columnSortType: COLUMN_SORT_TYPE,
): string => {
  switch (columnSortType) {
    case COLUMN_SORT_TYPE.ASC:
      return extractElementNameFromPath(
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_ASC,
      );
    case COLUMN_SORT_TYPE.DESC:
      return extractElementNameFromPath(
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_DESC,
      );
    default:
      throw new UnsupportedOperationError(
        `Unsupported column sort type ${columnSortType}`,
      );
  }
};

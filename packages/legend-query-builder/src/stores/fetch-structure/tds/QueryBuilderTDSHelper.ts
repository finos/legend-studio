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
  Enumeration,
  PRIMITIVE_TYPE,
  SimpleFunctionExpression,
  createPrimitiveInstance_String,
  extractElementNameFromPath,
  matchFunctionName,
} from '@finos/legend-graph';
import {
  guaranteeNonNullable,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import {
  COLUMN_SORT_TYPE,
  QUERY_BUILDER_SUPPORTED_FUNCTIONS,
  TDS_COLUMN_GETTER,
} from '../../../graph/QueryBuilderMetaModelConst.js';
import type { QueryBuilderTDSState } from './QueryBuilderTDSState.js';
import type { QueryBuilderTDSColumnState } from './QueryBuilderTDSColumnState.js';

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

export const buildTDSSortTypeExpression = (
  sortType: COLUMN_SORT_TYPE,
  column: string,
): SimpleFunctionExpression => {
  const sortColumnFunction = new SimpleFunctionExpression(
    extractElementNameFromPath(
      sortType === COLUMN_SORT_TYPE.ASC
        ? QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_ASC
        : QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_DESC,
    ),
  );
  const sortColumnName = createPrimitiveInstance_String(column);
  sortColumnFunction.parametersValues[0] = sortColumnName;
  return sortColumnFunction;
};

export const getTDSColumnDerivedProperyFromType = (
  type: Type,
): TDS_COLUMN_GETTER => {
  if (type instanceof Enumeration) {
    return TDS_COLUMN_GETTER.GET_ENUM;
  }
  switch (type.path) {
    case PRIMITIVE_TYPE.STRING:
      return TDS_COLUMN_GETTER.GET_STRING;
    case PRIMITIVE_TYPE.NUMBER:
      return TDS_COLUMN_GETTER.GET_NUMBER;
    case PRIMITIVE_TYPE.INTEGER:
      return TDS_COLUMN_GETTER.GET_INTEGER;
    case PRIMITIVE_TYPE.FLOAT:
      return TDS_COLUMN_GETTER.GET_FLOAT;
    case PRIMITIVE_TYPE.DECIMAL:
      return TDS_COLUMN_GETTER.GET_DECIMAL;
    case PRIMITIVE_TYPE.DATE:
      return TDS_COLUMN_GETTER.GET_DATE;
    case PRIMITIVE_TYPE.DATETIME:
      return TDS_COLUMN_GETTER.GET_DATETIME;
    case PRIMITIVE_TYPE.STRICTDATE:
      return TDS_COLUMN_GETTER.GET_STRICTDATE;
    case PRIMITIVE_TYPE.BOOLEAN:
      return TDS_COLUMN_GETTER.GET_BOOLEAN;
    default:
      throw new UnsupportedOperationError(
        `Can't find TDS column derived property name for type: '${type.path}'`,
      );
  }
};

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
  TDS_AGGREGATION_FUNCTION,
  TDS_FILTER_OPERATION,
  TDS_SORT_ORDER,
} from './TDSRequest.js';
import {
  type TDSExecutionResult,
  type TabularDataSet,
  PRIMITIVE_TYPE,
} from '@finos/legend-graph';
import { isBoolean } from '@finos/legend-shared';

export type TDSResultCellDataType =
  | string
  | number
  | boolean
  | null
  | undefined;

export interface TDSRowDataType {
  [key: string]: TDSResultCellDataType;
}

export const getTDSSortOrder = (sortOrder: string): TDS_SORT_ORDER => {
  switch (sortOrder) {
    case 'asc':
      return TDS_SORT_ORDER.ASCENDING;
    case 'desc':
      return TDS_SORT_ORDER.DESCENDING;
    default:
      throw new Error(`Unsupported tds sort order ${sortOrder}`);
  }
};

export const getAggregationFunction = (
  aggFunc: string,
): TDS_AGGREGATION_FUNCTION => {
  switch (aggFunc) {
    case 'sum':
      return TDS_AGGREGATION_FUNCTION.SUM;
    case 'min':
      return TDS_AGGREGATION_FUNCTION.MIN;
    case 'max':
      return TDS_AGGREGATION_FUNCTION.MAX;
    case 'count':
      return TDS_AGGREGATION_FUNCTION.COUNT;
    default:
      throw new Error(`Unsupported aggregation function ${aggFunc}`);
  }
};

export const getTDSFilterOperation = (
  filterOperation: string,
): TDS_FILTER_OPERATION => {
  switch (filterOperation) {
    case 'equals':
      return TDS_FILTER_OPERATION.EQUALS;
    case 'notEqual':
      return TDS_FILTER_OPERATION.NOT_EQUAL;
    case 'greaterThan':
      return TDS_FILTER_OPERATION.GREATER_THAN;
    case 'greaterThanOrEqual':
      return TDS_FILTER_OPERATION.GREATER_THAN_OR_EQUAL;
    case 'lessThan':
      return TDS_FILTER_OPERATION.LESS_THAN;
    case 'lessThanOrEqual':
      return TDS_FILTER_OPERATION.LESS_THAN_OR_EQUAL;
    case 'blank':
      return TDS_FILTER_OPERATION.BLANK;
    case 'notBlank':
      return TDS_FILTER_OPERATION.NOT_BLANK;
    case 'contains':
      return TDS_FILTER_OPERATION.CONTAINS;
    case 'notContains':
      return TDS_FILTER_OPERATION.NOT_CONTAINS;
    case 'startsWith':
      return TDS_FILTER_OPERATION.STARTS_WITH;
    case 'endsWith':
      return TDS_FILTER_OPERATION.ENDS_WITH;
    default:
      throw new Error(`Unsupported filter operation ${filterOperation}`);
  }
};

export const getFilterColumnType = (type: string): PRIMITIVE_TYPE => {
  switch (type) {
    case 'text':
      return PRIMITIVE_TYPE.STRING;
    case 'number':
      return PRIMITIVE_TYPE.NUMBER;
    case 'boolean':
      return PRIMITIVE_TYPE.BOOLEAN;
    case 'date':
      return PRIMITIVE_TYPE.DATE;
    default:
      throw new Error(`Unsupported filter type ${type}`);
  }
};

export const getAggregationTDSColumnCustomizations = (
  isAgGridLicenseEnabled: boolean,
  result: TDSExecutionResult,
  columnName: string,
): object => {
  if (!isAgGridLicenseEnabled) {
    return {};
  }
  const columnType = result.builder.columns.find(
    (col) => col.name === columnName,
  )?.type;
  switch (columnType) {
    case PRIMITIVE_TYPE.STRING:
      return {
        filter: 'agTextColumnFilter',
        allowedAggFuncs: ['count'],
      };
    case PRIMITIVE_TYPE.DATE:
    case PRIMITIVE_TYPE.DATETIME:
    case PRIMITIVE_TYPE.STRICTDATE:
      return {
        filter: 'agDateColumnFilter',
        allowedAggFuncs: ['count'],
      };
    case PRIMITIVE_TYPE.DECIMAL:
    case PRIMITIVE_TYPE.INTEGER:
    case PRIMITIVE_TYPE.FLOAT:
      return {
        filter: 'agNumberColumnFilter',
        allowedAggFuncs: ['count', 'sum', 'max', 'min', 'avg'],
      };
    default:
      return {
        allowedAggFuncs: ['count'],
      };
  }
};

export const getDefaultColumnDefintions = (
  isAgGridLicenseEnabled: boolean,
): object => {
  if (isAgGridLicenseEnabled) {
    return {
      minWidth: 50,
      sortable: true,
      flex: 1,
      resizable: true,
      enableRowGroup: true,
      allowedAggFuncs: ['count', 'sum', 'max', 'min', 'avg'],
      enableValue: true,
      menuTabs: ['filterMenuTab', 'generalMenuTab', 'columnsMenuTab'],
    };
  } else {
    return {
      minWidth: 50,
      sortable: true,
      flex: 1,
      resizable: true,
      menuTabs: ['filterMenuTab', 'generalMenuTab', 'columnsMenuTab'],
    };
  }
};

export const getTDSRowData = (tds: TabularDataSet): TDSRowDataType[] =>
  tds.rows.map((_row, rowIdx) => {
    const row: TDSRowDataType = {};
    const cols = tds.columns;
    _row.values.forEach((value, colIdx) => {
      // `ag-grid` shows `false` value as empty string so we have
      // call `.toString()` to avoid this behavior.
      row[cols[colIdx] as string] = isBoolean(value) ? String(value) : value;
    });
    row.rowNumber = rowIdx;
    return row;
  });

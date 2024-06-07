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
  FilterModel,
  IServerSideDatasource,
  IServerSideGetRowsParams,
} from '@ag-grid-community/core';
import {
  TDSGroupby,
  type TDSFilter,
  TDSAggregation,
  TDSFilterGroup,
  TDSRequest,
  TDSSort,
  TDSFilterCondition,
  TDS_FILTER_GROUP,
  TDSColumn,
} from './TDSRequest.js';
import {
  guaranteeNonNullable,
  type GeneratorFn,
  assertErrorThrown,
  LogEvent,
} from '@finos/legend-shared';
import { LEGEND_REPL_EVENT } from '../../Const.js';
import {
  type TDSRowDataType,
  getTDSRowData,
  getTDSSortOrder,
  getTDSFilterOperation,
  getAggregationFunction,
  getFilterColumnType,
} from './GridUtils.js';
import type { REPLGridClientStore } from '../../stores/REPLGridClientStore.js';
import { flow, flowResult, makeObservable } from 'mobx';
import type { INTERNAL__TDSColumn, PRIMITIVE_TYPE } from '@finos/legend-graph';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createFilterRequest = (model: any): TDSFilter | undefined => {
  if (model.filterType === 'join') {
    const conditions = model.conditions.map((condition: unknown) =>
      createFilterRequest(condition),
    );
    return new TDSFilterGroup(
      conditions,
      model.type === 'OR' ? TDS_FILTER_GROUP.OR : TDS_FILTER_GROUP.AND,
    );
  } else if (model.colId) {
    return new TDSFilterCondition(
      model.colId,
      getFilterColumnType(model.filterType),
      getTDSFilterOperation(model.type),
      model.filter,
    );
  } else {
    return undefined;
  }
};

export class ServerSideDataSource implements IServerSideDatasource {
  executions = 0;
  rowData: TDSRowDataType[] = [];
  columns: INTERNAL__TDSColumn[] = [];
  editorStore?: REPLGridClientStore | undefined;

  constructor(
    rowData?: TDSRowDataType[] | undefined,
    columns?: INTERNAL__TDSColumn[] | undefined,
    editorStore?: REPLGridClientStore | undefined,
  ) {
    makeObservable(this, {
      fetchRows: flow,
    });
    this.rowData = rowData ?? [];
    this.columns = columns ?? [];
    this.editorStore = editorStore;
  }

  *fetchRows(
    params: IServerSideGetRowsParams<unknown, unknown>,
  ): GeneratorFn<void> {
    try {
      if (
        this.executions > 0 ||
        this.editorStore?.dataCubeState.gridState.currentQueryTDSRequest
      ) {
        if (this.editorStore) {
          const request = this.extractRequest(params);
          this.editorStore.dataCubeState.gridState.setLastQueryTDSRequest(
            request,
          );
          if (request) {
            yield flowResult(
              this.editorStore.dataCubeState.getREPLGridServerResult(request),
            );
            const result =
              this.editorStore.dataCubeState.gridState.currentResult;
            const rowData = getTDSRowData(guaranteeNonNullable(result).result);
            params.success({ rowData: rowData });
          } else {
            params.fail();
          }
        }
        this.editorStore?.dataCubeState.gridState.setCurrentQueryTDSRequest(
          undefined,
        );
      } else {
        params.success({ rowData: this.rowData });
      }
      this.executions++;
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore?.applicationStore.notificationService.notifyError(error);
      this.editorStore?.applicationStore.logService.error(
        LogEvent.create(LEGEND_REPL_EVENT.FETCH_TDS_FAILURE),
        error,
      );
    }
  }

  getRows(params: IServerSideGetRowsParams<unknown, unknown>): void {
    this.fetchRows(params);
  }

  extractRequest(
    params: IServerSideGetRowsParams<unknown, unknown>,
  ): TDSRequest | undefined {
    try {
      const request = params.request;
      const startRow = request.startRow;
      const endRow = request.endRow;
      const columns = params.columnApi.getColumns()?.map((c) => c.getColId());
      const sort = request.sortModel.map(
        (i) => new TDSSort(i.colId, getTDSSortOrder(i.sort)),
      );
      const aggregations = request.valueCols.map((v) => {
        const colType = this.columns.find((c) => c.name === v.field)?.type;
        return new TDSAggregation(
          guaranteeNonNullable(v.field),
          colType as PRIMITIVE_TYPE,
          getAggregationFunction(guaranteeNonNullable(v.aggFunc)),
        );
      });
      const groupBy = new TDSGroupby(
        request.rowGroupCols.map((r) => r.id),
        request.groupKeys,
        aggregations,
      );
      let filter: TDSFilterGroup | undefined = undefined;
      const filterModel = request.filterModel as FilterModel | null;
      if (filterModel) {
        const condition = createFilterRequest(filterModel);
        filter =
          condition instanceof TDSFilterCondition
            ? new TDSFilterGroup(
                [condition],
                filterModel.type === 'OR'
                  ? TDS_FILTER_GROUP.OR
                  : TDS_FILTER_GROUP.AND,
              )
            : condition instanceof TDSFilterGroup
              ? condition
              : undefined;
      }
      const tdsRequest = new TDSRequest(
        columns?.map((col) => new TDSColumn(col)) ?? [],
        sort,
        groupBy,
        filter,
        startRow,
        endRow,
      );
      return tdsRequest;
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore?.applicationStore.notificationService.notifyError(error);
      this.editorStore?.applicationStore.logService.error(
        LogEvent.create(LEGEND_REPL_EVENT.BUILD_TDS_EQUEST_FAILURE),
        error,
      );
      return undefined;
    }
  }
}

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

import { action, makeAutoObservable } from 'mobx';
import type { QueryBuilderProjectionColumnState } from './QueryBuilderProjectionState';
import {
  addUniqueEntry,
  deleteEntry,
  guaranteeType,
} from '@finos/legend-shared';
import type { QueryBuilderState } from './QueryBuilderState';
import {
  type LambdaFunction,
  type ValueSpecification,
  extractElementNameFromPath,
  matchFunctionName,
  CollectionInstanceValue,
  GenericType,
  GenericTypeExplicitReference,
  Multiplicity,
  PrimitiveInstanceValue,
  PRIMITIVE_TYPE,
  SimpleFunctionExpression,
  TYPICAL_MULTIPLICITY_TYPE,
} from '@finos/legend-graph';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../QueryBuilder_Const';

export enum COLUMN_SORT_TYPE {
  ASC,
  DESC,
}

export class SortColumnState {
  queryBuilderState: QueryBuilderState;
  columnState: QueryBuilderProjectionColumnState;
  sortType = COLUMN_SORT_TYPE.ASC;

  constructor(
    queryBuilderState: QueryBuilderState,
    columnState: QueryBuilderProjectionColumnState,
  ) {
    makeAutoObservable(this, {
      queryBuilderState: false,
      setColumnState: action,
      setSortType: action,
    });

    this.queryBuilderState = queryBuilderState;
    this.columnState = columnState;
  }

  setColumnState(val: QueryBuilderProjectionColumnState): void {
    this.columnState = val;
  }

  setSortType(val: COLUMN_SORT_TYPE): void {
    this.sortType = val;
  }

  buildFunctionExpression(): SimpleFunctionExpression {
    const multiplicityOne =
      this.queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
        TYPICAL_MULTIPLICITY_TYPE.ONE,
      );
    const sortColumnFunction = new SimpleFunctionExpression(
      extractElementNameFromPath(
        this.sortType === COLUMN_SORT_TYPE.ASC
          ? QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_ASC
          : QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_DESC,
      ),
      multiplicityOne,
    );
    const sortColumnName = new PrimitiveInstanceValue(
      GenericTypeExplicitReference.create(
        new GenericType(
          this.queryBuilderState.graphManagerState.graph.getPrimitiveType(
            PRIMITIVE_TYPE.STRING,
          ),
        ),
      ),
      multiplicityOne,
    );
    sortColumnName.values = [this.columnState.columnName];
    sortColumnFunction.parametersValues[0] = sortColumnName;
    return sortColumnFunction;
  }
}

export class QueryResultSetModifierState {
  queryBuilderState: QueryBuilderState;
  showModal = false;
  limit?: number | undefined;
  distinct = false;
  sortColumns: SortColumnState[] = [];

  constructor(queryBuilderState: QueryBuilderState) {
    makeAutoObservable(this, {
      queryBuilderState: false,
      setShowModal: action,
      setLimit: action,
      toggleDistinct: action,
      deleteSortColumn: action,
      addSortColumn: action,
      updateSortColumns: action,
    });

    this.queryBuilderState = queryBuilderState;
  }

  setShowModal(val: boolean): void {
    this.showModal = val;
  }

  setLimit(val: number | undefined): void {
    this.limit = val === undefined || val <= 0 ? undefined : val;
  }

  toggleDistinct(): void {
    this.distinct = !this.distinct;
  }

  deleteSortColumn(val: SortColumnState): void {
    deleteEntry(this.sortColumns, val);
  }

  addSortColumn(val: SortColumnState): void {
    addUniqueEntry(this.sortColumns, val);
  }

  updateSortColumns(): void {
    this.sortColumns = this.sortColumns.filter((e) =>
      this.queryBuilderState.fetchStructureState.projectionState.columns.includes(
        e.columnState,
      ),
    );
  }

  /**
   * Build result set modifiers into the lambda.
   */
  buildResultSetModifiers(
    lambda: LambdaFunction,
    options?:
      | {
          overridingLimit?: number | undefined;
        }
      | undefined,
  ): LambdaFunction {
    const multiplicityOne =
      this.queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
        TYPICAL_MULTIPLICITY_TYPE.ONE,
      );
    if (lambda.expressionSequence.length === 1) {
      const func = lambda.expressionSequence[0];
      if (func instanceof SimpleFunctionExpression) {
        if (
          matchFunctionName(
            func.functionName,
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_PROJECT,
          ) ||
          matchFunctionName(
            func.functionName,
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_GROUP_BY,
          ) ||
          matchFunctionName(
            func.functionName,
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_FILTER,
          )
        ) {
          let currentExpression = func;

          // build distinct()
          if (this.distinct) {
            const distinctFunction = new SimpleFunctionExpression(
              extractElementNameFromPath(
                QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_DISTINCT,
              ),
              multiplicityOne,
            );
            distinctFunction.parametersValues[0] = currentExpression;
            currentExpression = distinctFunction;
          }

          // build sort()
          if (this.sortColumns.length) {
            const sortFunction = new SimpleFunctionExpression(
              extractElementNameFromPath(
                QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_SORT,
              ),
              multiplicityOne,
            );
            const multiplicity = new Multiplicity(
              this.sortColumns.length,
              this.sortColumns.length,
            );
            const collection = new CollectionInstanceValue(
              multiplicity,
              undefined,
            );
            collection.values = this.sortColumns.map((sortColumm) =>
              sortColumm.buildFunctionExpression(),
            );
            sortFunction.parametersValues[0] = currentExpression;
            sortFunction.parametersValues[1] = collection;
            currentExpression = sortFunction;
          }

          // build take()
          if (this.limit || options?.overridingLimit) {
            const limit = new PrimitiveInstanceValue(
              GenericTypeExplicitReference.create(
                new GenericType(
                  this.queryBuilderState.graphManagerState.graph.getPrimitiveType(
                    PRIMITIVE_TYPE.INTEGER,
                  ),
                ),
              ),
              multiplicityOne,
            );
            limit.values = [
              Math.min(
                this.limit ?? Number.MAX_SAFE_INTEGER,
                options?.overridingLimit ?? Number.MAX_SAFE_INTEGER,
              ),
            ];
            const takeFunction = new SimpleFunctionExpression(
              extractElementNameFromPath(
                QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_TAKE,
              ),
              multiplicityOne,
            );

            takeFunction.parametersValues[0] = currentExpression;
            takeFunction.parametersValues[1] = limit;
            currentExpression = takeFunction;
          }

          lambda.expressionSequence[0] = currentExpression;
          return lambda;
        } else if (
          matchFunctionName(
            func.functionName,
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.SERIALIZE,
          )
        ) {
          // NOTE: we have to separate the handling of `take()` for projection and
          // graph-fetch as the latter use `meta::pure::functions::collection::take()`
          // where the former uses `meta::pure::tds::take()`, therefore the placement
          // in the query are different. Also, note that because of the above distinction,
          // we won't support using `take()` as result set modifier operations for graph-fetch.
          // Result set modifier should only be used for projection for now.
          if (options?.overridingLimit) {
            const limit = new PrimitiveInstanceValue(
              GenericTypeExplicitReference.create(
                new GenericType(
                  this.queryBuilderState.graphManagerState.graph.getPrimitiveType(
                    PRIMITIVE_TYPE.INTEGER,
                  ),
                ),
              ),
              multiplicityOne,
            );
            limit.values = [options.overridingLimit];
            const takeFunction = new SimpleFunctionExpression(
              extractElementNameFromPath(
                QUERY_BUILDER_SUPPORTED_FUNCTIONS.TAKE,
              ),
              multiplicityOne,
            );

            // NOTE: `take()` does not work on `graphFetch()` or `serialize()` so we will put it
            // right next to `all()`
            const serializeFunction = func;
            const graphFetchFunc = guaranteeType(
              serializeFunction.parametersValues[0],
              SimpleFunctionExpression,
            );
            const getAllFunc = graphFetchFunc
              .parametersValues[0] as ValueSpecification;
            takeFunction.parametersValues[0] = getAllFunc;
            takeFunction.parametersValues[1] = limit;
            graphFetchFunc.parametersValues = [
              takeFunction,
              graphFetchFunc.parametersValues[1] as ValueSpecification,
            ];
            return lambda;
          }
          return lambda;
        }
      }
    }
    return lambda;
  }
}

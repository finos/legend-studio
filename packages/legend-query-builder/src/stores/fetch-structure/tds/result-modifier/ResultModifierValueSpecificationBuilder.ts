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
  type GraphManagerState,
  type LambdaFunction,
  type ValueSpecification,
  ColSpec,
  ColSpecInstanceValue,
  CollectionInstanceValue,
  GenericType,
  GenericTypeExplicitReference,
  Multiplicity,
  PrimitiveInstanceValue,
  PrimitiveType,
  SimpleFunctionExpression,
  createPrimitiveInstance_String,
  extractElementNameFromPath,
  matchFunctionName,
} from '@finos/legend-graph';
import {
  COLUMN_SORT_TYPE,
  QUERY_BUILDER_SUPPORTED_FUNCTIONS,
} from '../../../../graph/QueryBuilderMetaModelConst.js';
import type {
  QueryResultSetModifierState,
  SortColumnState,
} from '../QueryResultSetModifierState.js';
import { guaranteeNonNullable } from '@finos/legend-shared';

export type ResultModifierValueSpecOptions = {
  overridingLimit?: number | undefined;
  withDataOverflowCheck?: boolean | undefined;
};

export abstract class ResultModifierValueSpecificationBuilder {
  _currentResultModifierFunc: SimpleFunctionExpression | undefined;
  readonly graphManagerState: GraphManagerState;
  options: ResultModifierValueSpecOptions | undefined;

  distinct = false;
  sortColumns: SortColumnState[] | undefined;
  limit?: number | undefined;
  slice: [number, number] | undefined;

  constructor(graphManagerState: GraphManagerState) {
    this.graphManagerState = graphManagerState;
  }

  get currentExpression(): SimpleFunctionExpression {
    return guaranteeNonNullable(
      this._currentResultModifierFunc,
      `Current expression needs to be defined to build result modifier`,
    );
  }
  // function
  abstract get distinctFunctionName(): string;
  abstract get sortFunctionName(): string;
  abstract get limitFunctionName(): string;
  abstract get sliceFunctionName(): string;
  abstract get ascFunctionname(): string;
  abstract get descFunctionName(): string;

  get supportedResultModifiersFunctions(): string[] {
    return [
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_PROJECT,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_GROUP_BY,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_FILTER,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.OLAP_GROUPBY,
    ];
  }
  getSortTypeFunctionName(sortType: COLUMN_SORT_TYPE): string {
    return sortType === COLUMN_SORT_TYPE.ASC
      ? this.ascFunctionname
      : this.descFunctionName;
  }

  // builders
  setCurrentResultModifierFunction(val: SimpleFunctionExpression): void {
    this._currentResultModifierFunc = val;
  }

  withOptions(
    options: ResultModifierValueSpecOptions | undefined,
  ): ResultModifierValueSpecificationBuilder {
    this.options = options;
    return this;
  }

  withDistinct(distinct: boolean): ResultModifierValueSpecificationBuilder {
    this.distinct = distinct;
    return this;
  }

  withSortColumns(
    sortCols: SortColumnState[] | undefined,
  ): ResultModifierValueSpecificationBuilder {
    if (sortCols?.length) {
      this.sortColumns = sortCols;
    }
    return this;
  }

  withLimit(
    limit: number | undefined,
  ): ResultModifierValueSpecificationBuilder {
    this.limit = limit;
    return this;
  }

  withSlice(
    slice: [number, number] | undefined,
  ): ResultModifierValueSpecificationBuilder {
    this.slice = slice;
    return this;
  }

  // builder
  buildDistinctFunction(): void {
    const distinctFunction = new SimpleFunctionExpression(
      extractElementNameFromPath(this.distinctFunctionName),
    );
    distinctFunction.parametersValues[0] = this.currentExpression;
    this.setCurrentResultModifierFunction(distinctFunction);
  }

  buildSortFunction(sortColumns: SortColumnState[]): void {
    const sortFunction = new SimpleFunctionExpression(
      extractElementNameFromPath(this.sortFunctionName),
    );
    const multiplicity = this.graphManagerState.graph.getMultiplicity(
      sortColumns.length,
      sortColumns.length,
    );
    const collection = new CollectionInstanceValue(multiplicity, undefined);
    collection.values = sortColumns.map((e) => this.buildSortExpression(e));
    sortFunction.parametersValues[0] = this.currentExpression;
    sortFunction.parametersValues[1] = collection;
    this.setCurrentResultModifierFunction(sortFunction);
  }

  buildSortExpression(
    sortColumnState: SortColumnState,
  ): SimpleFunctionExpression {
    const sortColumnFunction = new SimpleFunctionExpression(
      extractElementNameFromPath(
        this.getSortTypeFunctionName(sortColumnState.sortType),
      ),
    );
    sortColumnFunction.parametersValues[0] = this.buildColumnValueSpec(
      sortColumnState.columnState.columnName,
    );
    return sortColumnFunction;
  }

  abstract buildColumnValueSpec(colName: string): ValueSpecification;

  buildLimitFunction(limit?: number | undefined) {
    const limitPrimitiveInstanceVal = new PrimitiveInstanceValue(
      GenericTypeExplicitReference.create(
        new GenericType(PrimitiveType.INTEGER),
      ),
    );
    limitPrimitiveInstanceVal.values = [
      Math.min(
        limit
          ? this.options?.withDataOverflowCheck
            ? limit + 1
            : limit
          : Number.MAX_SAFE_INTEGER,
        this.options?.overridingLimit
          ? this.options.withDataOverflowCheck
            ? this.options.overridingLimit + 1
            : this.options.overridingLimit
          : Number.MAX_SAFE_INTEGER,
      ),
    ];
    const takeFunction = new SimpleFunctionExpression(
      extractElementNameFromPath(this.limitFunctionName),
    );
    takeFunction.parametersValues[0] = this.currentExpression;
    takeFunction.parametersValues[1] = limitPrimitiveInstanceVal;
    this.setCurrentResultModifierFunction(takeFunction);
  }

  buildSliceFunction(slice: [number, number]): void {
    const sliceStart = slice[0];
    const sliceEnd = slice[1];
    const startVal = new PrimitiveInstanceValue(
      GenericTypeExplicitReference.create(
        new GenericType(PrimitiveType.INTEGER),
      ),
    );
    const endVal = new PrimitiveInstanceValue(
      GenericTypeExplicitReference.create(
        new GenericType(PrimitiveType.INTEGER),
      ),
    );
    startVal.values = [sliceStart];
    endVal.values = [sliceEnd];
    const sliceFunction = new SimpleFunctionExpression(
      extractElementNameFromPath(this.sliceFunctionName),
    );
    sliceFunction.parametersValues = [this.currentExpression, startVal, endVal];
    this.setCurrentResultModifierFunction(sliceFunction);
  }

  build(lambdaFunction: LambdaFunction): LambdaFunction {
    if (lambdaFunction.expressionSequence.length === 1) {
      const func = lambdaFunction.expressionSequence[0];
      if (func instanceof SimpleFunctionExpression) {
        if (
          matchFunctionName(
            func.functionName,
            this.supportedResultModifiersFunctions,
          )
        ) {
          this._currentResultModifierFunc = func;

          // build distinct()
          if (this.distinct) {
            this.buildDistinctFunction();
          }

          // build sort()
          if (this.sortColumns) {
            this.buildSortFunction(this.sortColumns);
          }

          // build take()
          if (this.limit || this.options?.overridingLimit) {
            this.buildLimitFunction(this.limit);
          }
          // build slice()
          if (this.slice) {
            this.buildSliceFunction(this.slice);
          }

          lambdaFunction.expressionSequence[0] = this.currentExpression;
          return lambdaFunction;
        }
      }
    }
    return lambdaFunction;
  }
}

export class TDSResultModifierValueSpecificationBuilder extends ResultModifierValueSpecificationBuilder {
  override get limitFunctionName(): string {
    return QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_TAKE;
  }
  override get sliceFunctionName(): string {
    return QUERY_BUILDER_SUPPORTED_FUNCTIONS.SLICE;
  }
  override get sortFunctionName(): string {
    return QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_SORT;
  }

  override get distinctFunctionName(): string {
    return QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_DISTINCT;
  }

  override get ascFunctionname(): string {
    return QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_ASC;
  }
  override get descFunctionName(): string {
    return QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_DESC;
  }

  override buildColumnValueSpec(columnName: string): ValueSpecification {
    return createPrimitiveInstance_String(columnName);
  }
}

export class TypedResultModifierValueSpecificationBuilder extends ResultModifierValueSpecificationBuilder {
  override get limitFunctionName(): string {
    return QUERY_BUILDER_SUPPORTED_FUNCTIONS.RELATION_LIMIT;
  }
  override get sliceFunctionName(): string {
    return QUERY_BUILDER_SUPPORTED_FUNCTIONS.RELATION_SLICE;
  }
  override get ascFunctionname(): string {
    return QUERY_BUILDER_SUPPORTED_FUNCTIONS.RELATION_ASC;
  }
  override get descFunctionName(): string {
    return QUERY_BUILDER_SUPPORTED_FUNCTIONS.RELATION_DESC;
  }
  override get sortFunctionName(): string {
    return QUERY_BUILDER_SUPPORTED_FUNCTIONS.RELATION_SORT;
  }
  override get distinctFunctionName(): string {
    return QUERY_BUILDER_SUPPORTED_FUNCTIONS.RELATION_DISTINCT;
  }

  override buildColumnValueSpec(columnName: string): ValueSpecification {
    const colSpec = new ColSpecInstanceValue(Multiplicity.ONE, undefined);
    const value = new ColSpec();
    value.name = columnName;
    colSpec.values = [value];
    return colSpec;
  }
}

export const appendResultSetModifier = (
  resultModifierState: QueryResultSetModifierState,
  lambdaFunction: LambdaFunction,
  isTyped: boolean,
  options?: ResultModifierValueSpecOptions | undefined,
): LambdaFunction => {
  const builder = isTyped
    ? new TypedResultModifierValueSpecificationBuilder(
        resultModifierState.tdsState.queryBuilderState.graphManagerState,
      )
    : new TDSResultModifierValueSpecificationBuilder(
        resultModifierState.tdsState.queryBuilderState.graphManagerState,
      );
  return builder
    .withOptions(options)
    .withDistinct(resultModifierState.distinct)
    .withSortColumns(resultModifierState.sortColumns)
    .withLimit(resultModifierState.limit)
    .withSlice(resultModifierState.slice)
    .build(lambdaFunction);
};

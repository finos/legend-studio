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

import type { PRIMITIVE_TYPE } from '@finos/legend-graph';
import { SerializationFactory, usingModelSchema } from '@finos/legend-shared';
import { observable, makeObservable, action } from 'mobx';
import { createModelSchema, list, optional, primitive } from 'serializr';

export enum TDS_FILTER_OPERATION {
  EQUALS = 'equal',
  NOT_EQUAL = 'notEqual',
  GREATER_THAN = 'greaterThan',
  GREATER_THAN_OR_EQUAL = 'greaterThanOrEqual',
  LESS_THAN = 'lessThan',
  LESS_THAN_OR_EQUAL = 'lessThanOrEqual',
  BLANK = 'isEmpty',
  NOT_BLANK = 'isNotEmpty',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'notContains',
  STARTS_WITH = 'startsWith',
  ENDS_WITH = 'endsWith',
}

export enum TDS_FILTER_GROUP {
  AND = 'and',
  OR = 'or',
}

export enum TDS_AGGREGATION_FUNCTION {
  SUM = 'sum',
  MIN = 'min',
  MAX = 'max',
  COUNT = 'count',
  AVG = 'avg',
  FIRST = 'first',
  LAST = 'last',
}

export enum TDS_SORT_ORDER {
  ASCENDING = 'ascending',
  DESCENDING = 'descending',
}

export enum FILTER_TYPE {
  TEXT = 'text',
  NUMBER = 'number',
}

export class TDSFilterCondition {
  operation!: TDS_FILTER_OPERATION;
  value!: unknown;

  constructor(operation: TDS_FILTER_OPERATION, value: unknown) {
    this.operation = operation;
    this.value = value;
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(TDSFilterCondition, {
      operation: primitive(),
      value: primitive(),
    }),
  );
}

export class TDSFilter {
  column!: string;
  columnType!: PRIMITIVE_TYPE;
  conditions!: TDSFilterCondition[];
  groupOperation!: TDS_FILTER_GROUP;

  constructor(
    column: string,
    columnType: PRIMITIVE_TYPE,
    conditions: TDSFilterCondition[],
    groupOperation: TDS_FILTER_GROUP,
  ) {
    this.column = column;
    this.columnType = columnType;
    this.conditions = conditions;
    this.groupOperation = groupOperation;
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(TDSFilter, {
      column: primitive(),
      columnType: primitive(),
      conditions: list(
        usingModelSchema(TDSFilterCondition.serialization.schema),
      ),
      groupOperation: primitive(),
    }),
  );
}

export class TDSSort {
  column!: string;
  order!: TDS_SORT_ORDER;

  constructor(column: string, order: TDS_SORT_ORDER) {
    makeObservable(this, {
      column: observable,
      order: observable,
      setOrder: action,
    });
    this.column = column;
    this.order = order;
  }

  setOrder(val: TDS_SORT_ORDER): void {
    this.order = val;
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(TDSSort, {
      column: primitive(),
      order: primitive(),
    }),
  );
}

export class TDSAggregation {
  column!: string;
  columnType!: PRIMITIVE_TYPE;
  function!: TDS_AGGREGATION_FUNCTION;

  constructor(
    column: string,
    columnType: PRIMITIVE_TYPE,
    _function: TDS_AGGREGATION_FUNCTION,
  ) {
    this.column = column;
    this.columnType = columnType;
    this.function = _function;
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(TDSAggregation, {
      column: primitive(),
      columnType: primitive(),
      function: primitive(),
    }),
  );
}

export class TDSGroupby {
  columns!: string[];
  groupKeys!: string[];
  aggregations!: TDSAggregation[];

  constructor(
    columns: string[],
    groupKeys: string[],
    aggregations: TDSAggregation[],
  ) {
    this.columns = columns;
    this.groupKeys = groupKeys;
    this.aggregations = aggregations;
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(TDSGroupby, {
      columns: list(primitive()),
      groupKeys: list(primitive()),
      aggregations: list(usingModelSchema(TDSAggregation.serialization.schema)),
    }),
  );
}

export class TDSColumn {
  name!: string;

  constructor(name: string) {
    this.name = name;
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(TDSColumn, {
      name: primitive(),
    }),
  );
}

export class TDSRequest {
  startRow?: number | undefined;
  endRow?: number | undefined;
  columns!: TDSColumn[];
  filter!: TDSFilter[];
  sort!: TDSSort[];
  groupBy!: TDSGroupby;

  constructor(
    columns: TDSColumn[],
    filter: TDSFilter[],
    sort: TDSSort[],
    groupBy: TDSGroupby,
    startRow?: number | undefined,
    endRow?: number | undefined,
  ) {
    this.startRow = startRow;
    this.endRow = endRow;
    this.columns = columns;
    this.filter = filter;
    this.sort = sort;
    this.groupBy = groupBy;
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(TDSRequest, {
      startRow: optional(primitive()),
      endRow: optional(primitive()),
      columns: list(usingModelSchema(TDSColumn.serialization.schema)),
      filter: list(usingModelSchema(TDSFilter.serialization.schema)),
      sort: list(usingModelSchema(TDSSort.serialization.schema)),
      groupBy: usingModelSchema(TDSGroupby.serialization.schema),
    }),
  );
}

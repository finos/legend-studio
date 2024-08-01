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

import { guaranteeNonNullable, isString, uuid } from '@finos/legend-shared';

// Core
export enum BuilderType {
  CLASS_BUILDER = 'classBuilder',
  TDS_BUILDER = 'tdsBuilder',
  JSON_BUILDER = 'json',
}

export enum ExecutionActivityType {
  RELATIONAL = 'relational',
  RELATIONAL_EXECUTION_ACTIVITY = 'RelationalExecutionActivity',
  AGGREGATION_AWARE_ACTIVITY = 'aggregationAware',
}

// TODO: Refactor to use external format (https://github.com/finos/legend-studio/issues/732)
export enum EXECUTION_SERIALIZATION_FORMAT {
  CSV = 'CSV',
}

export class ResultBuilder {
  _type: BuilderType;

  constructor(type: BuilderType) {
    this._type = type;
  }
}

// ------------------------------------------ Execution Activities -----------------------------------------------

export abstract class ExecutionActivities {}

export class RelationalExecutionActivities extends ExecutionActivities {
  sql!: string;
  comment?: string | undefined;

  constructor(sql: string) {
    super();
    this.sql = sql;
  }
}

export class AggregationAwareActivities extends ExecutionActivities {
  rewrittenQuery!: string;
}

export class UnknownExecutionActivities extends ExecutionActivities {
  values!: object;

  constructor(content: object) {
    super();
    this.values = content;
  }
}

export abstract class ExecutionResult {
  builder!: ResultBuilder;
  activities: ExecutionActivities[] | undefined;
}

export type ExecutionResultWithMetadata = {
  executionResult: ExecutionResult;
  executionTraceId?: string;
};

// ------------------------------------------ Model -----------------------------------------------
export class JsonBuilder {
  _type = BuilderType.JSON_BUILDER;
}

export class JsonExecutionResult extends ExecutionResult {
  values!: object;
}

export class RawExecutionResult extends ExecutionResult {
  value!: string | number | boolean | null;

  constructor(content: string | number | boolean | null) {
    super();
    this.value = content;
  }
}

// ------------------------------------------ TDS -----------------------------------------------

/**
 * TODO?: maybe we converge to use TDSColumn
 *
 * Since here, we're building out the result builder config, we don't need
 * to fully resolve all the references, hence we have this simplified version of TDSColumn
 */
export class INTERNAL__TDSColumn {
  name!: string;
  type?: string | undefined;
  relationalType?: string | undefined;
  doc?: string | undefined;
}

export class TDSBuilder extends ResultBuilder {
  columns: INTERNAL__TDSColumn[] = [];

  constructor() {
    super(BuilderType.TDS_BUILDER);
  }
}

export class TDSRow {
  values: (string | number | boolean | null)[] = [];
}

export class TabularDataSet {
  columns: string[] = [];
  rows: TDSRow[] = [];
}

export class TDSExecutionResult extends ExecutionResult {
  readonly _UUID = uuid();
  override builder = new TDSBuilder();
  result = new TabularDataSet();
}

export class ClassBuilder extends ResultBuilder {
  override _type = BuilderType.CLASS_BUILDER;
}

export class ClassExecutionResult extends ExecutionResult {
  override builder = new ClassBuilder(BuilderType.CLASS_BUILDER);
  objects!: object;
}

export const getTDSRowRankByColumnInAsc = (
  a: TDSRow,
  b: TDSRow,
  colIndex: number,
): number => {
  const a1 = a.values[colIndex];
  const b1 = b.values[colIndex];
  if (a1 === null || a1 === undefined) {
    return -1;
  }
  if (b1 === null || b1 === undefined) {
    return 1;
  }
  if (isString(a1) && isString(b1)) {
    return a1.localeCompare(b1);
  } else {
    return Number(guaranteeNonNullable(a1)) - Number(guaranteeNonNullable(b1));
  }
};

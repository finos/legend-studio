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

import { uuid } from '@finos/legend-shared';

// Core
export enum BuilderType {
  CLASS_BUILDER = 'classBuilder',
  TDS_BUILDER = 'tdsBuilder',
  JSON_BUILDER = 'json',
}

enum ExecutionActivityType {
  REALTIONAL = 'relational',
}

export class ResultBuilder {
  _type: BuilderType;

  constructor(type: BuilderType) {
    this._type = type;
  }
}

export abstract class ExecutionActivity {
  _type: ExecutionActivityType;

  constructor(type: ExecutionActivityType) {
    this._type = type;
  }
}

export abstract class ExecutionResult {
  builder!: ResultBuilder;
  activities?: ExecutionActivity[] | undefined;
  values!: object;
}

// Model
export class JsonBuilder {
  _type = BuilderType.JSON_BUILDER;
}

export class JsonExecutionResult extends ExecutionResult {
  getResultObject(): object {
    return this.values;
  }
}

// TDS
export class RelationalExecutionActivity extends ExecutionActivity {
  sql!: string;

  constructor() {
    super(ExecutionActivityType.REALTIONAL);
  }
}
export class TDSColumn {
  name!: string;
  type?: string | undefined;
  relationalType?: string | undefined;
  doc?: string | undefined;
}

export class TdsBuilder extends ResultBuilder {
  columns: TDSColumn[] = [];

  constructor() {
    super(BuilderType.TDS_BUILDER);
  }
}

export class TdsRow {
  values: (string | number)[] = [];
}

export class TabularDataSet {
  columns: string[] = [];
  rows: TdsRow[] = [];
}

export class TdsExecutionResult extends ExecutionResult {
  uuid = uuid();
  override builder = new TdsBuilder();
  override activities: RelationalExecutionActivity[] = [];
  result = new TabularDataSet();
}

export class ClassBuilder extends ResultBuilder {
  override _type = BuilderType.CLASS_BUILDER;
}

export class ClassExecutionResult extends ExecutionResult {
  override builder = new ClassBuilder(BuilderType.CLASS_BUILDER);
  override activities: RelationalExecutionActivity[] = [];
}

export class INTERNAL__UnknownExecutionResult extends ExecutionResult {
  content: object;

  constructor(content: object) {
    super();
    this.content = content;
  }
}

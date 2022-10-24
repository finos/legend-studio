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

export abstract class ExecutionResult {
  builder!: ResultBuilder;
  activities: object | undefined;
}

// Model
export class JsonBuilder {
  _type = BuilderType.JSON_BUILDER;
}

export class JsonExecutionResult extends ExecutionResult {
  values!: object;
}

export class RawExecutionResult extends ExecutionResult {
  value!: string;

  constructor(content: string) {
    super();
    this.value = content;
  }
}

// TDS
export class TDSColumn {
  name!: string;
  type?: string | undefined;
  relationalType?: string | undefined;
  doc?: string | undefined;
}

export class TDSBuilder extends ResultBuilder {
  columns: TDSColumn[] = [];

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

export class INTERNAL__UnknownExecutionResult extends ExecutionResult {
  content: object;

  constructor(content: object) {
    super();
    this.content = content;
  }
}

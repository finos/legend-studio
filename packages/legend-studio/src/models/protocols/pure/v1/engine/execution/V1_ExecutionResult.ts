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

import { createModelSchema, list, primitive, raw } from 'serializr';
import type { PlainObject } from '@finos/legend-studio-shared';
import {
  SerializationFactory,
  usingModelSchema,
} from '@finos/legend-studio-shared';
import {
  TdsRow,
  OtherExecutionResult,
  ClassExecutionResult,
  JsonExecutionResult,
  RelationalExecutionActivity,
  TdsExecutionResult,
  TdsBuilder,
  TDSColumn,
  BuilderType,
} from '../../../../../metamodels/pure/action/execution/ExecutionResult';
import type { ExecutionResult } from '../../../../../metamodels/pure/action/execution/ExecutionResult';

// ------------------------------------------------------------------------------------------------------------------
//   TODO: when we move these models out into ../models. We should have serialization and building logic separated
//   out of the protocol models.
// ------------------------------------------------------------------------------------------------------------------

export class V1_ResultBuilder {
  _type!: string; // to be removed when we handle this the same way as other protocol models

  static readonly builderSerialization = new SerializationFactory(
    createModelSchema(V1_ResultBuilder, {
      _type: primitive(),
    }),
  );
}

export abstract class V1_ExecutionActivity {
  _type!: string; // to be removed when we handle this the same way as other protocol models
}

export abstract class V1_ExecutionResult {
  _type!: string; // to be removed when we handle this the same way as other protocol models
  builder!: V1_ResultBuilder;
  activities?: V1_ExecutionActivity[];

  abstract build(): ExecutionResult;
}

// JSON
export class V1_JsonExecutionResult extends V1_ExecutionResult {
  values!: object;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_JsonExecutionResult, {
      _type: primitive(),
      builder: usingModelSchema(V1_ResultBuilder.builderSerialization.schema),
      values: raw(),
    }),
  );

  build(): JsonExecutionResult {
    const result = new JsonExecutionResult(this.values);
    return result;
  }
}

// V1_RelationalExecutionActivity
export class V1_RelationalExecutionActivity extends V1_ExecutionActivity {
  sql!: string;
  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_RelationalExecutionActivity, {
      _type: primitive(),
      sql: primitive(),
    }),
  );

  build(): RelationalExecutionActivity {
    const result = new RelationalExecutionActivity();
    result.sql = this.sql;
    return result;
  }
}

// TDS
export class V1_TDSColumn {
  name!: string;
  type!: string;
  relationalType!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_TDSColumn, {
      name: primitive(),
      type: primitive(),
      relationalType: primitive(),
    }),
  );

  build(): TDSColumn {
    return new TDSColumn(this.name, this.type, this.relationalType);
  }
}

export class V1_TdsBuilder extends V1_ResultBuilder {
  columns: V1_TDSColumn[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_TdsBuilder, {
      _type: primitive(),
      columns: list(usingModelSchema(V1_TDSColumn.serialization.schema)),
    }),
  );

  build(): TdsBuilder {
    const result = new TdsBuilder();
    result.columns = this.columns.map((e) => e.build());
    return result;
  }
}

export class V1_TdsExecutionResult extends V1_ExecutionResult {
  declare builder: V1_TdsBuilder;
  declare activities: V1_RelationalExecutionActivity[];
  result!: object;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_TdsExecutionResult, {
      _type: primitive(),
      builder: usingModelSchema(V1_TdsBuilder.serialization.schema),
      activities: list(
        usingModelSchema(V1_RelationalExecutionActivity.serialization.schema),
      ),
      result: raw(),
    }),
  );

  build(): TdsExecutionResult {
    const tdsExecutionResult = new TdsExecutionResult(this.result);
    tdsExecutionResult.builder = this.builder.build();
    tdsExecutionResult.activities = this.activities.map((e) => e.build());
    tdsExecutionResult.result.columns = (
      this.result as {
        columns: string[];
      }
    ).columns;
    tdsExecutionResult.result.rows = (
      this.result as {
        rows: { values: (string | number)[] }[];
      }
    ).rows.map((r) => {
      const val = new TdsRow();
      val.values = r.values;
      return val;
    });
    return tdsExecutionResult;
  }
}

// Class
export class V1_ClassExecutionResult extends V1_ExecutionResult {
  activities: V1_RelationalExecutionActivity[] = [];
  objects!: object;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_ClassExecutionResult, {
      _type: primitive(),
      builder: usingModelSchema(V1_ResultBuilder.builderSerialization.schema),
      activities: list(
        usingModelSchema(V1_RelationalExecutionActivity.serialization.schema),
      ),
      objects: raw(),
    }),
  );

  build(): ClassExecutionResult {
    const result = new ClassExecutionResult(this.objects);
    result.activities = this.activities.map((e) => e.build());
    return result;
  }
}

// Other
class V1_OtherExecutionResult extends V1_ExecutionResult {
  values: object;
  constructor(values: object) {
    super();
    this.values = values;
  }

  build(): OtherExecutionResult {
    return new OtherExecutionResult(this.values);
  }
}

export const V1_serializeExecutionResult = (
  value: PlainObject<V1_ExecutionResult>,
): V1_ExecutionResult => {
  switch ((value.builder as PlainObject<V1_ResultBuilder>)._type) {
    case BuilderType.CLASS_BUILDER:
      return V1_ClassExecutionResult.serialization.fromJson(value);
    case BuilderType.TDS_BUILDER:
      return V1_TdsExecutionResult.serialization.fromJson(value);
    case BuilderType.JSON_BUILDER:
      return V1_JsonExecutionResult.serialization.fromJson(value);
    default:
      return new V1_OtherExecutionResult(value as object);
  }
};

export type V1_ExecutionPlan = object;

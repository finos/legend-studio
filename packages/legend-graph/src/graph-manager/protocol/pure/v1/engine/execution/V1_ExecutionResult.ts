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
  createModelSchema,
  custom,
  list,
  optional,
  primitive,
  raw,
  SKIP,
} from 'serializr';
import {
  type PlainObject,
  SerializationFactory,
  usingModelSchema,
  isString,
} from '@finos/legend-shared';
import {
  BuilderType,
  ExecutionActivityType,
} from '../../../../../../graph-manager/action/execution/ExecutionResult.js';

export class V1_ResultBuilder {
  static readonly builderSerialization = new SerializationFactory(
    createModelSchema(V1_ResultBuilder, {
      _type: primitive(),
    }),
  );
}

export abstract class V1_ExecutionActivities {}

export class V1_RelationalExecutionActivities extends V1_ExecutionActivities {
  sql!: string;
  comment?: string | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_RelationalExecutionActivities, {
      sql: primitive(),
      comment: optional(primitive()),
    }),
  );
}

export class V1_AggregationAwareActivities extends V1_ExecutionActivities {
  rewrittenQuery!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_AggregationAwareActivities, {
      rewrittenQuery: primitive(),
    }),
  );
}
export abstract class V1_ExecutionResult {
  builder!: V1_ResultBuilder;
  activities: V1_ExecutionActivities[] | undefined;
}

export class V1_UnknownExecutionActivity extends V1_ExecutionActivities {
  content: object;

  constructor(content: object) {
    super();
    this.content = content;
  }
}

export class V1_JsonExecutionResult extends V1_ExecutionResult {
  values!: object;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_JsonExecutionResult, {
      _type: primitive(),
      builder: usingModelSchema(V1_ResultBuilder.builderSerialization.schema),
      values: raw(),
    }),
  );
}

/**
 * TODO?: maybe we converge to use V1_TDSColumn
 *
 * Since here, we're building out the result builder config, we don't need
 * to fully resolve all the references, hence we have this simplified version of V1_TDSColumn
 */
export class V1_INTERNAL__TDSColumn {
  name!: string;
  doc?: string | undefined;
  type?: string | undefined;
  relationalType?: string | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_INTERNAL__TDSColumn, {
      name: primitive(),
      doc: optional(primitive()),
      type: optional(primitive()),
      relationalType: optional(primitive()),
    }),
  );
}

export class V1_TDSBuilder extends V1_ResultBuilder {
  columns: V1_INTERNAL__TDSColumn[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_TDSBuilder, {
      _type: primitive(),
      columns: list(
        usingModelSchema(V1_INTERNAL__TDSColumn.serialization.schema),
      ),
    }),
  );
}

function V1_serializeExecutionActivities(
  value: PlainObject<V1_ExecutionActivities>,
): V1_ExecutionActivities {
  switch (value._type) {
    case ExecutionActivityType.RELATIONAL:
      return V1_RelationalExecutionActivities.serialization.fromJson(value);
    case ExecutionActivityType.RELATIONAL_EXECUTION_ACTIVITY:
      return V1_RelationalExecutionActivities.serialization.fromJson(value);
    case ExecutionActivityType.AGGREGATION_AWARE_ACTIVITY:
      return V1_AggregationAwareActivities.serialization.fromJson(value);
    default:
      return new V1_UnknownExecutionActivity(value);
  }
}

export class V1_TDSExecutionResult extends V1_ExecutionResult {
  declare builder: V1_TDSBuilder;
  result!: object;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_TDSExecutionResult, {
      builder: usingModelSchema(V1_TDSBuilder.serialization.schema),
      activities: list(custom(() => SKIP, V1_serializeExecutionActivities)),
      result: raw(),
    }),
  );
}

export class V1_ClassExecutionResult extends V1_ExecutionResult {
  objects!: object;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_ClassExecutionResult, {
      builder: usingModelSchema(V1_ResultBuilder.builderSerialization.schema),
      activities: list(custom(() => SKIP, V1_serializeExecutionActivities)),
      objects: raw(),
    }),
  );
}

export class V1_RawExecutionResult extends V1_ExecutionResult {
  value: string;

  constructor(value: string) {
    super();
    this.value = value;
  }
}

export class V1_INTERNAL__UnknownExecutionResult extends V1_ExecutionResult {
  content: object;

  constructor(content: object) {
    super();
    this.content = content;
  }
}

export const V1_serializeExecutionResult = (
  value: PlainObject<V1_ExecutionResult> | string,
): V1_ExecutionResult => {
  if (isString(value)) {
    return new V1_RawExecutionResult(value);
  }
  switch ((value.builder as PlainObject<V1_ResultBuilder>)._type) {
    case BuilderType.CLASS_BUILDER:
      return V1_ClassExecutionResult.serialization.fromJson(value);
    case BuilderType.TDS_BUILDER:
      return V1_TDSExecutionResult.serialization.fromJson(value);
    case BuilderType.JSON_BUILDER:
      return V1_JsonExecutionResult.serialization.fromJson(value);
    default:
      return new V1_INTERNAL__UnknownExecutionResult(value);
  }
};

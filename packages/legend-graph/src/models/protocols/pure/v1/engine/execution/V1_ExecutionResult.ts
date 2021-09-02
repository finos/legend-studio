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

import { createModelSchema, list, optional, primitive, raw } from 'serializr';
import type { PlainObject } from '@finos/legend-shared';
import { SerializationFactory, usingModelSchema } from '@finos/legend-shared';
import { BuilderType } from '../../../../../../graphManager/action/execution/ExecutionResult';

export class V1_ResultBuilder {
  static readonly builderSerialization = new SerializationFactory(
    createModelSchema(V1_ResultBuilder, {
      _type: primitive(),
    }),
  );
}

export abstract class V1_ExecutionResult {
  builder!: V1_ResultBuilder;
  activities: object | undefined;
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

export class V1_TDSColumn {
  name!: string;
  doc?: string | undefined;
  type?: string | undefined;
  relationalType?: string | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_TDSColumn, {
      name: primitive(),
      doc: optional(primitive()),
      type: optional(primitive()),
      relationalType: optional(primitive()),
    }),
  );
}

export class V1_TdsBuilder extends V1_ResultBuilder {
  columns: V1_TDSColumn[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_TdsBuilder, {
      _type: primitive(),
      columns: list(usingModelSchema(V1_TDSColumn.serialization.schema)),
    }),
  );
}

export class V1_TdsExecutionResult extends V1_ExecutionResult {
  declare builder: V1_TdsBuilder;
  result!: object;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_TdsExecutionResult, {
      _type: primitive(),
      builder: usingModelSchema(V1_TdsBuilder.serialization.schema),
      activities: raw(),
      result: raw(),
    }),
  );
}

export class V1_ClassExecutionResult extends V1_ExecutionResult {
  objects!: object;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_ClassExecutionResult, {
      _type: primitive(),
      builder: usingModelSchema(V1_ResultBuilder.builderSerialization.schema),
      activities: raw(),
      objects: raw(),
    }),
  );
}

export class V1_INTERNAL__UnknownExecutionResult extends V1_ExecutionResult {
  content: object;

  constructor(content: object) {
    super();
    this.content = content;
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
      return new V1_INTERNAL__UnknownExecutionResult(value);
  }
};

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
  primitive,
  custom,
  list,
  optional,
} from 'serializr';
import {
  SerializationFactory,
  usingModelSchema,
} from '@finos/legend-studio-shared';
import type { V1_Connection } from '../../model/packageableElements/connection/V1_Connection';
import {
  V1_serializeConnectionValue,
  V1_deserializeConnectionValue,
} from '../../transformation/pureProtocol/serializationHelpers/V1_ConnectionSerializationHelper';

export class V1_StorePattern {
  schemaPattern!: string;
  tablePattern!: string;
  escapeSchemaPattern?: boolean;
  escapeTablePattern?: boolean;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_StorePattern, {
      schemaPattern: primitive(),
      tablePattern: primitive(),
      escapeSchemaPattern: optional(primitive()),
      escapeTablePattern: optional(primitive()),
    }),
  );
}

export class V1_GenerateStoreInput {
  clientVersion = 'v1_16_0'; // FIXME: maybe not hard code it like this?
  connection!: V1_Connection;
  targetPackage!: string;
  targetName!: string;
  maxTables?: number;
  enrichTables?: boolean;
  enrichPrimaryKeys?: boolean;
  enrichColumns?: boolean;
  patterns: V1_StorePattern[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_GenerateStoreInput, {
      clientVersion: primitive(),
      connection: custom(
        (val) => V1_serializeConnectionValue(val, false),
        (val) => V1_deserializeConnectionValue(val, false),
      ),
      targetPackage: primitive(),
      targetName: primitive(),
      maxTables: optional(primitive()),
      enrichTables: optional(primitive()),
      enrichPrimaryKeys: optional(primitive()),
      enrichColumns: optional(primitive()),
      patterns: list(usingModelSchema(V1_StorePattern.serialization.schema)),
    }),
  );
}

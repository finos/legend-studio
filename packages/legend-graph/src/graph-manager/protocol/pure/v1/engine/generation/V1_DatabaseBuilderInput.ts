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
  serialize,
  type ModelSchema,
} from 'serializr';
import {
  SerializationFactory,
  usingModelSchema,
  type PlainObject,
} from '@finos/legend-shared';
import {
  V1_serializeConnectionValue,
  V1_deserializeConnectionValue,
} from '../../transformation/pureProtocol/serializationHelpers/V1_ConnectionSerializationHelper.js';
import type { V1_RelationalDatabaseConnection } from '../../model/packageableElements/store/relational/connection/V1_RelationalDatabaseConnection.js';
import type { PureProtocolProcessorPlugin } from '../../../PureProtocolProcessorPlugin.js';

export class V1_DatabasePattern {
  schemaPattern!: string;
  tablePattern!: string;
  functionPattern!: string;
  escapeSchemaPattern?: boolean | undefined;
  escapeTablePattern?: boolean | undefined;
  escapeFunctionPattern?: boolean | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DatabasePattern, {
      schemaPattern: primitive(),
      tablePattern: primitive(),
      functionPattern: primitive(),
      escapeSchemaPattern: optional(primitive()),
      escapeTablePattern: optional(primitive()),
      escapeFunctionPattern: optional(primitive()),
    }),
  );
}

export class V1_DatabaseBuilderConfig {
  maxTables?: number | undefined;
  enrichTables?: boolean | undefined;
  enrichTableFunctions?: boolean | undefined;
  enrichPrimaryKeys?: boolean | undefined;
  enrichColumns?: boolean | undefined;
  patterns: V1_DatabasePattern[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DatabaseBuilderConfig, {
      maxTables: primitive(),
      enrichTables: primitive(),
      enrichTableFunctions: primitive(),
      enrichPrimaryKeys: primitive(),
      enrichColumns: primitive(),
      patterns: list(usingModelSchema(V1_DatabasePattern.serialization.schema)),
    }),
  );
}

export class V1_TargetDatabase {
  package!: string;
  name!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_TargetDatabase, {
      name: primitive(),
      package: primitive(),
    }),
  );
}

export class V1_DatabaseBuilderInput {
  connection!: V1_RelationalDatabaseConnection;
  config!: V1_DatabaseBuilderConfig;
  targetDatabase!: V1_TargetDatabase;
}

const createDatabaseBuilderInputModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_DatabaseBuilderInput> =>
  createModelSchema(V1_DatabaseBuilderInput, {
    config: usingModelSchema(V1_DatabaseBuilderConfig.serialization.schema),
    connection: custom(
      (val) => V1_serializeConnectionValue(val, false, plugins),
      (val) => V1_deserializeConnectionValue(val, false, plugins),
    ),
    targetDatabase: usingModelSchema(V1_TargetDatabase.serialization.schema),
  });

export const V1_serializeDatabaseBuilderInput = (
  value: V1_DatabaseBuilderInput,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_DatabaseBuilderInput> =>
  serialize(createDatabaseBuilderInputModelSchema(plugins), value);

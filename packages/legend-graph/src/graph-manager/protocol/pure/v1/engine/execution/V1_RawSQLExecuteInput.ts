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
  serialize,
  type ModelSchema,
} from 'serializr';
import { type PlainObject } from '@finos/legend-shared';
import {
  V1_serializeConnectionValue,
  V1_deserializeConnectionValue,
} from '../../transformation/pureProtocol/serializationHelpers/V1_ConnectionSerializationHelper.js';
import type { V1_RelationalDatabaseConnection } from '../../model/packageableElements/store/relational/connection/V1_RelationalDatabaseConnection.js';
import type { PureProtocolProcessorPlugin } from '../../../PureProtocolProcessorPlugin.js';

export class V1_RawSQLExecuteInput {
  connection!: V1_RelationalDatabaseConnection;
  sql!: string;
}

const createRawSQLExecuteInpuModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_RawSQLExecuteInput> =>
  createModelSchema(V1_RawSQLExecuteInput, {
    connection: custom(
      (val) => V1_serializeConnectionValue(val, false, plugins),
      (val) => V1_deserializeConnectionValue(val, false, plugins),
    ),
    sql: primitive(),
  });

export const V1_serializeRawSQLExecuteInput = (
  value: V1_RawSQLExecuteInput,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_RawSQLExecuteInput> =>
  serialize(createRawSQLExecuteInpuModelSchema(plugins), value);

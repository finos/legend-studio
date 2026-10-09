/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import axios, { type AxiosResponse } from 'axios';
import {
  ContentType,
  HttpHeader,
  type PlainObject,
} from '@finos/legend-shared';
import { ENGINE_TEST_SUPPORT_API_URL } from '@finos/legend-graph/test';

// Engine calls for the engine tests of direct connections (PLAN §6.8), as
// plain JSON: the connection must reach the engine exactly as it is saved,
// which legend-graph's connection serializers don't do (they drop a DuckDB
// connection's setup SQL)

/**
 * Reads a database through a connection: the engine introspects it and
 * returns a model holding one Database, `{_type: 'data', elements}`
 */
export const CUBE_ENGINE_TEST__schemaExploration = async (
  input: object,
): Promise<PlainObject> =>
  (
    await axios.post<unknown, AxiosResponse<PlainObject>>(
      `${ENGINE_TEST_SUPPORT_API_URL}/pure/v1/utilities/database/schemaExploration`,
      input,
      {
        headers: { [HttpHeader.CONTENT_TYPE]: ContentType.APPLICATION_JSON },
      },
    )
  ).data;

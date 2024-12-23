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

import type { DataCubeColumn } from './DataCubeColumn.js';
import {
  SerializationFactory,
  usingConstantValueSchema,
  type PlainObject,
} from '@finos/legend-shared';
import { DataCubeSource } from './DataCubeSource.js';
import { createModelSchema, list, primitive, raw } from 'serializr';

export class AdhocQueryDataCubeSource extends DataCubeSource {
  runtime!: string;
  model!: PlainObject;
}

export const ADHOC_QUERY_DATA_CUBE_SOURCE = 'adhocQuery';

export class RawAdhocQueryDataCubeSource {
  query!: string;
  runtime!: string;
  columns: DataCubeColumn[] = [];
  model!: PlainObject;

  static readonly serialization = new SerializationFactory(
    createModelSchema(RawAdhocQueryDataCubeSource, {
      _type: usingConstantValueSchema(ADHOC_QUERY_DATA_CUBE_SOURCE),
      columns: list(raw()),
      model: raw(),
      query: primitive(),
      runtime: primitive(),
    }),
  );
}

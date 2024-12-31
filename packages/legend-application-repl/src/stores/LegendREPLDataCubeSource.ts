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

import { DataCubeSource, type DataCubeColumn } from '@finos/legend-data-cube';
import {
  SerializationFactory,
  usingConstantValueSchema,
  type PlainObject,
} from '@finos/legend-shared';
import { createModelSchema, list, optional, primitive, raw } from 'serializr';

export class LegendREPLDataCubeSource extends DataCubeSource {
  runtime!: string;

  mapping?: string | undefined;
  timestamp!: number;
  model?: PlainObject | undefined;
  isLocal!: boolean;
  isPersistenceSupported!: boolean;
}

export const REPL_DATA_CUBE_SOURCE_TYPE = 'repl';

export class RawLegendREPLDataCubeSource {
  query!: string;
  runtime!: string;
  model?: PlainObject | undefined;

  mapping?: string | undefined;
  timestamp!: number;
  isLocal!: boolean;
  isPersistenceSupported!: boolean;
  columns: DataCubeColumn[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(RawLegendREPLDataCubeSource, {
      _type: usingConstantValueSchema(REPL_DATA_CUBE_SOURCE_TYPE),
      columns: list(raw()),
      isLocal: primitive(),
      isPersistenceSupported: primitive(),
      mapping: optional(primitive()),
      model: optional(raw()),
      query: primitive(),
      runtime: primitive(),
      timestamp: primitive(),
    }),
  );
}

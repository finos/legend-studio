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
  SerializationFactory,
  usingConstantValueSchema,
  type PlainObject,
} from '@finos/legend-shared';
import { DataCubeSource } from './DataCubeSource.js';
import { createModelSchema, optional, primitive, raw } from 'serializr';
import type { V1_PureModelContext } from '@finos/legend-graph';

export class AdhocQueryDataCubeSource extends DataCubeSource {
  runtime!: string;
  mapping?: string;
  model!: PlainObject<V1_PureModelContext>;
}

export class UserDefinedFunctionDataCubeSource extends DataCubeSource {
  functionPath!: string;
  runtime!: string;
  model!: PlainObject<V1_PureModelContext>;
}

export const ADHOC_QUERY_DATA_CUBE_SOURCE_TYPE = 'adhocQuery';
export const ADHOC_FUNCTION_DATA_CUBE_SOURCE_TYPE = 'userDefinedFunction';

export class RawAdhocQueryDataCubeSource {
  query!: string;
  runtime!: string;
  mapping?: string;
  model!: PlainObject<V1_PureModelContext>;

  static readonly serialization = new SerializationFactory(
    createModelSchema(RawAdhocQueryDataCubeSource, {
      _type: usingConstantValueSchema(ADHOC_QUERY_DATA_CUBE_SOURCE_TYPE),
      model: raw(),
      query: primitive(),
      runtime: primitive(),
      mapping: optional(primitive()),
    }),
  );
}

export class RawUserDefinedFunctionDataCubeSource {
  runtime?: string;
  model!: PlainObject;
  functionPath!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(RawUserDefinedFunctionDataCubeSource, {
      _type: usingConstantValueSchema(ADHOC_FUNCTION_DATA_CUBE_SOURCE_TYPE),
      model: raw(),
      runtime: optional(primitive()),
      functionPath: primitive(),
    }),
  );
}

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

import { DataCubeSource } from '@finos/legend-data-cube';
import {
  V1_pureModelContextDataPropSchema,
  type V1_PureModelContextData,
} from '@finos/legend-graph';
import {
  SerializationFactory,
  usingConstantValueSchema,
  type PlainObject,
} from '@finos/legend-shared';
import { createModelSchema, primitive } from 'serializr';

export const CSV_FILE_QUERY_DATA_CUBE_SOURCE_TYPE = 'csvFile';

export class CSVFileDataCubeSource extends DataCubeSource {
  model!: PlainObject<V1_PureModelContextData>;
  runtime!: string;
  db!: string;
  schema!: string;
  table!: string;
  count!: number;
  fileName!: string;
}

export class RawCSVFileQueryDataCubeSource {
  model!: PlainObject<V1_PureModelContextData>;
  runtime!: string;
  db!: string;
  schema!: string;
  table!: string;
  count!: number;
  fileName!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(RawCSVFileQueryDataCubeSource, {
      _type: usingConstantValueSchema(CSV_FILE_QUERY_DATA_CUBE_SOURCE_TYPE),
      model: V1_pureModelContextDataPropSchema,
      runtime: primitive(),
      db: primitive(),
      schema: primitive(),
      table: primitive(),
      count: primitive(),
      fileName: primitive(),
    }),
  );
}

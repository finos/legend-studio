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
  SerializationFactory,
  usingConstantValueSchema,
  type PlainObject,
} from '@finos/legend-shared';
import { createModelSchema, primitive } from 'serializr';

export const LOCAL_FILE_QUERY_DATA_CUBE_SOURCE_TYPE = 'localFile';

export enum LocalFileDataCubeSourceFormat {
  CSV = 'csv',
  // TODO: arrow/parquet/excel, etc.
}

export class LocalFileDataCubeSource extends DataCubeSource {
  model!: PlainObject;
  runtime!: string;
  db!: string;
  schema!: string;
  table!: string;
  count!: number;
  fileName!: string;
  fileFormat!: LocalFileDataCubeSourceFormat;
}

export class RawLocalFileQueryDataCubeSource {
  fileName!: string;
  fileFormat!: LocalFileDataCubeSourceFormat;
  dbReference!: string;
  count!: number;

  static readonly serialization = new SerializationFactory(
    createModelSchema(RawLocalFileQueryDataCubeSource, {
      _type: usingConstantValueSchema(LOCAL_FILE_QUERY_DATA_CUBE_SOURCE_TYPE),
      fileFormat: primitive(),
      fileName: primitive(),
      count: primitive(),
      dbReference: primitive(),
    }),
  );
}

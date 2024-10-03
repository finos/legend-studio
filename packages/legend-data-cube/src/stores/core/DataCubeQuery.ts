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
  UnsupportedOperationError,
  usingConstantValueSchema,
  usingModelSchema,
  type PlainObject,
} from '@finos/legend-shared';
import {
  createModelSchema,
  custom,
  deserialize,
  list,
  optional,
  primitive,
  raw,
  serialize,
} from 'serializr';

export abstract class DataCubeQuerySource {
  columns: DataCubeQueryColumn[] = [];
  query!: string;
  runtime!: string;
  mapping?: string | undefined;
}

export class DataCubeQueryColumn {
  name!: string;
  type!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(DataCubeQueryColumn, {
      name: primitive(),
      type: primitive(),
    }),
  );
}

enum DataCubeQuerySourceType {
  REPL_EXECUTED_QUERY = 'REPLExecutedQuery',
}

export class DataCubeQuerySourceREPLExecutedQuery extends DataCubeQuerySource {
  static readonly serialization = new SerializationFactory(
    createModelSchema(DataCubeQuerySourceREPLExecutedQuery, {
      _type: usingConstantValueSchema(
        DataCubeQuerySourceType.REPL_EXECUTED_QUERY,
      ),
      columns: list(usingModelSchema(DataCubeQueryColumn.serialization.schema)),
      mapping: optional(primitive()),
      query: primitive(),
      runtime: primitive(),
    }),
  );
}

function deserializeQuerySource(
  json: PlainObject<DataCubeQuerySource>,
): DataCubeQuerySource {
  switch (json._type) {
    case DataCubeQuerySourceType.REPL_EXECUTED_QUERY:
      return deserialize(
        DataCubeQuerySourceREPLExecutedQuery.serialization.schema,
        json,
      );
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize data cube query source of type '${json._type}'`,
      );
  }
}

function serializeQuerySource(
  object: DataCubeQuerySource,
): PlainObject<DataCubeQuerySource> {
  if (object instanceof DataCubeQuerySourceREPLExecutedQuery) {
    return serialize(
      DataCubeQuerySourceREPLExecutedQuery.serialization.schema,
      object,
    );
  }
  throw new UnsupportedOperationError(
    `Can't serialize data cube query source`,
    object,
  );
}

export class DataCubeQuery {
  name!: string;
  query!: string;
  partialQuery!: string;
  source!: DataCubeQuerySource;
  configuration?: PlainObject | undefined;

  constructor(
    name: string,
    query: string,
    configuration?: PlainObject | undefined,
  ) {
    this.name = name;
    this.query = query;
    this.configuration = configuration;
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(DataCubeQuery, {
      /** TODO: @datacube roundtrip - populate this once we know the shape better */
      configuration: raw(),
      name: primitive(),
      partialQuery: primitive(),
      query: primitive(),
      source: custom(serializeQuerySource, deserializeQuerySource),
    }),
  );
}

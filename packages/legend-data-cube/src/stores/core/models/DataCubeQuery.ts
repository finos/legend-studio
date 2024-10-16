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
  usingModelSchema,
  type PlainObject,
} from '@finos/legend-shared';
import { createModelSchema, primitive } from 'serializr';
import { DataCubeConfiguration } from './DataCubeConfiguration.js';

export class DataCubeQuery {
  query!: string;
  configuration?: PlainObject | undefined;

  constructor(configuration?: PlainObject | undefined) {
    this.configuration = configuration;
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(DataCubeQuery, {
      configuration: usingModelSchema(
        DataCubeConfiguration.serialization.schema,
      ),
      query: primitive(),
    }),
  );
}

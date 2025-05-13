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
import { createModelSchema, optional, primitive, raw } from 'serializr';
import { DataCubeConfiguration } from './DataCubeConfiguration.js';
import { DataCubeDimensionalTree } from '../../view/grid/DataCubeGridDimensionalTree.js';

export class DataCubeSpecificationOptions {
  autoEnableCache?: boolean | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(DataCubeSpecificationOptions, {
      autoEnableCache: optional(primitive()),
    }),
  );
}

export class DataCubeSpecification {
  query!: string;
  configuration?: DataCubeConfiguration | undefined;
  source!: PlainObject;
  options?: DataCubeSpecificationOptions | undefined;
  dimensionalTree?: DataCubeDimensionalTree | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(DataCubeSpecification, {
      configuration: usingModelSchema(
        DataCubeConfiguration.serialization.schema,
      ),
      options: optional(
        usingModelSchema(DataCubeSpecificationOptions.serialization.schema),
      ),
      query: primitive(),
      source: raw(),
      dimensionalTree: optional(
        usingModelSchema(DataCubeDimensionalTree.serialization.schema),
      ),
    }),
  );
}

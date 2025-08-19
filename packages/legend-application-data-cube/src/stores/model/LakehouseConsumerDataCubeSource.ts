/**
 * Copyright (c) 2025-present, Goldman Sachs
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
import type { V1_PureModelContextComposite } from '@finos/legend-graph';
import { VersionedProjectData } from '@finos/legend-server-depot';
import {
  SerializationFactory,
  usingConstantValueSchema,
  usingModelSchema,
  type PlainObject,
} from '@finos/legend-shared';
import { createModelSchema, list, primitive } from 'serializr';

export const LAKEHOUSE_CONSUMER_DATA_CUBE_SOURCE_TYPE = 'lakehouseConsumer';

export class LakehouseConsumerDataCubeSource extends DataCubeSource {
  model!: PlainObject<V1_PureModelContextComposite>;
  runtime!: string;
}

export class RawLakehouseConsumerDataCubeSource {
  dpCoordinates!: VersionedProjectData;
  warehouse!: string;
  environment!: string;
  paths!: string[];

  static readonly serialization = new SerializationFactory(
    createModelSchema(RawLakehouseConsumerDataCubeSource, {
      _type: usingConstantValueSchema(LAKEHOUSE_CONSUMER_DATA_CUBE_SOURCE_TYPE),
      dpCoordinates: usingModelSchema(
        VersionedProjectData.serialization.schema,
      ),
      warehouse: primitive(),
      environment: primitive(),
      paths: list(primitive()),
    }),
  );
}

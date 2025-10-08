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
import {
  V1_DataProductOriginType,
  type V1_PureModelContextData,
} from '@finos/legend-graph';
import { VersionedProjectData } from '@finos/legend-server-depot';
import {
  optionalCustom,
  optionalCustomUsingModelSchema,
  SerializationFactory,
  UnsupportedOperationError,
  usingConstantValueSchema,
  usingModelSchema,
  type PlainObject,
} from '@finos/legend-shared';
import {
  createModelSchema,
  deserialize,
  list,
  primitive,
  serialize,
} from 'serializr';

export const LAKEHOUSE_CONSUMER_DATA_CUBE_SOURCE_TYPE = 'lakehouseConsumer';

export class LakehouseConsumerDataCubeSource extends DataCubeSource {
  model!: PlainObject<V1_PureModelContextData>;
  dpCoordinates?: VersionedProjectData;
  runtime!: string;
  warehouse!: string;
  environment!: string;
  paths!: string[];
}

export abstract class RawLakehouseOrigin {}

export class RawLakehouseAdhocOrigin extends RawLakehouseOrigin {
  static readonly serialization = new SerializationFactory(
    createModelSchema(RawLakehouseAdhocOrigin, {
      _type: usingConstantValueSchema(
        V1_DataProductOriginType.AD_HOC_DEPLOYMENT,
      ),
    }),
  );
}

export class RawLakehouseSdlcOrigin extends RawLakehouseOrigin {
  dpCoordinates!: VersionedProjectData;

  static readonly serialization = new SerializationFactory(
    createModelSchema(RawLakehouseSdlcOrigin, {
      _type: usingConstantValueSchema(V1_DataProductOriginType.SDLC_DEPLOYMENT),
      dpCoordinates: usingModelSchema(
        VersionedProjectData.serialization.schema,
      ),
    }),
  );
}

export class RawLakehouseConsumerDataCubeSource {
  dpCoordinates?: VersionedProjectData;
  warehouse!: string;
  environment!: string;
  paths!: string[];
  origin?: RawLakehouseOrigin;

  static readonly serialization = new SerializationFactory(
    createModelSchema(RawLakehouseConsumerDataCubeSource, {
      _type: usingConstantValueSchema(LAKEHOUSE_CONSUMER_DATA_CUBE_SOURCE_TYPE),
      dpCoordinates: optionalCustomUsingModelSchema(
        VersionedProjectData.serialization.schema,
      ),
      warehouse: primitive(),
      environment: primitive(),
      paths: list(primitive()),
      origin: optionalCustom(
        (value) => {
          if (value instanceof RawLakehouseAdhocOrigin) {
            return serialize(
              RawLakehouseAdhocOrigin.serialization.schema,
              value,
            );
          } else if (value instanceof RawLakehouseSdlcOrigin) {
            return serialize(
              RawLakehouseSdlcOrigin.serialization.schema,
              value,
            );
          } else {
            throw new Error(
              `Can't serialize RawLakehouseOrigin: no compatible serialization schema available from the provided value`,
            );
          }
        },
        (jsonValue) => {
          switch (jsonValue._type) {
            case V1_DataProductOriginType.AD_HOC_DEPLOYMENT:
              return deserialize(
                RawLakehouseAdhocOrigin.serialization.schema,
                jsonValue,
              );
            case V1_DataProductOriginType.SDLC_DEPLOYMENT:
              return deserialize(
                RawLakehouseSdlcOrigin.serialization.schema,
                jsonValue,
              );
            default:
              throw new UnsupportedOperationError(
                `Can't deserialize RawLakehouseOrigin: no compatible deserialization schema for type '${jsonValue._type}'`,
              );
          }
        },
      ),
    }),
  );
}

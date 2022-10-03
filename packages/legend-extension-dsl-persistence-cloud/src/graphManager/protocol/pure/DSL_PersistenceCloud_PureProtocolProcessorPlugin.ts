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

import packageJson from '../../../../package.json';
import { AwsGluePersistencePlatform } from '../../../graph/metamodel/pure/model/packageableElements/persistence/cloud/DSL_PersistenceCloud_AwsGluePersistencePlatform.js';
import { V1_AwsGluePersistencePlatform } from './v1/model/packageableElements/persistence/cloud/V1_DSL_PersistenceCloud_AwsGluePersistencePlatform.js';
import {
  V1_AWS_GLUE_PERSISTENCE_PLATFORM_PROTOCOL_TYPE,
  V1_awsGluePersistencePlatformModelSchema,
} from './v1/transformation/pureProtocol/V1_DSL_PersistenceCloud_ProtocolHellper.js';
import type {
  DSL_Persistence_PureProtocolProcessorPlugin_Extension,
  PersistencePlatform,
  V1_PersistencePlatform,
  V1_PersistencePlatformBuilder,
  V1_PersistencePlatformProtocolDeserializer,
  V1_PersistencePlatformProtocolSerializer,
  V1_PersistencePlatformTransformer,
} from '@finos/legend-extension-dsl-persistence';
import {
  PureProtocolProcessorPlugin,
  type V1_GraphBuilderContext,
  type V1_GraphTransformerContext,
} from '@finos/legend-graph';
import type { PlainObject } from '@finos/legend-shared';
import { deserialize, serialize } from 'serializr';

export class DSL_PersistenceCloud_PureProtocolProcessorPlugin
  extends PureProtocolProcessorPlugin
  implements DSL_Persistence_PureProtocolProcessorPlugin_Extension
{
  constructor() {
    super(
      packageJson.extensions.pureProtocolProcessorPlugin,
      packageJson.version,
    );
  }

  V1_getExtraPersistencePlatformBuilders?(): V1_PersistencePlatformBuilder[] {
    return [
      (
        protocol: V1_PersistencePlatform,
        context: V1_GraphBuilderContext,
      ): PersistencePlatform | undefined => {
        if (protocol instanceof V1_AwsGluePersistencePlatform) {
          const platform = new AwsGluePersistencePlatform();
          platform.dataProcessingUnits = protocol.dataProcessingUnits;
          return platform;
        }
        return undefined;
      },
    ];
  }

  V1_getExtraPersistencePlatformTransformers?(): V1_PersistencePlatformTransformer[] {
    return [
      (
        metamodel: PersistencePlatform,
        context: V1_GraphTransformerContext,
      ): V1_PersistencePlatform | undefined => {
        if (metamodel instanceof AwsGluePersistencePlatform) {
          const protocol = new V1_AwsGluePersistencePlatform();
          protocol.dataProcessingUnits = metamodel.dataProcessingUnits;
          return protocol;
        }
        return undefined;
      },
    ];
  }

  V1_getExtraPersistencePlatformProtocolSerializers?(): V1_PersistencePlatformProtocolSerializer[] {
    return [
      (
        protocol: V1_PersistencePlatform,
      ): PlainObject<V1_PersistencePlatform> | undefined => {
        if (protocol instanceof V1_AwsGluePersistencePlatform) {
          return serialize(V1_awsGluePersistencePlatformModelSchema, protocol);
        }
        return undefined;
      },
    ];
  }

  V1_getExtraPersistencePlatformProtocolDeserializers?(): V1_PersistencePlatformProtocolDeserializer[] {
    return [
      (
        json: PlainObject<V1_PersistencePlatform>,
      ): V1_PersistencePlatform | undefined => {
        if (json._type === V1_AWS_GLUE_PERSISTENCE_PLATFORM_PROTOCOL_TYPE) {
          return deserialize(V1_awsGluePersistencePlatformModelSchema, json);
        }
        return undefined;
      },
    ];
  }
}

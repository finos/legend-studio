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

import type { V1_PersistencePlatform } from './v1/model/packageableElements/persistence/V1_DSLPersistence_PersistencePlatform.js';
import type { PersistencePlatform } from '../../metamodels/pure/model/packageableElements/persistence/DSLPersistence_PersistencePlatform.js';
import type {
  PureProtocolProcessorPlugin,
  V1_GraphBuilderContext,
  V1_GraphTransformerContext,
} from '@finos/legend-graph';
import type { PlainObject } from '@finos/legend-shared';

// types: persistence platform

export type V1_PersistencePlatformBuilder = (
  protocol: V1_PersistencePlatform,
  context: V1_GraphBuilderContext,
) => PersistencePlatform | undefined;

export type V1_PersistencePlatformTransformer = (
  metamodel: PersistencePlatform,
  context: V1_GraphTransformerContext,
) => V1_PersistencePlatform | undefined;

export type V1_PersistencePlatformProtocolSerializer = (
  protocol: PersistencePlatform,
) => PlainObject<V1_PersistencePlatform> | undefined;

export type V1_PersistencePlatformProtocolDeserializer = (
  json: PlainObject<V1_PersistencePlatform>,
) => V1_PersistencePlatform | undefined;

export interface DSLPersistence_PureProtocolProcessorPlugin_Extension
  extends PureProtocolProcessorPlugin {
  // extension hooks: persistence platform

  V1_getExtraPersistencePlatformBuilders?(): V1_PersistencePlatformBuilder[];

  V1_getExtraPersistencePlatformTransformers?(): V1_PersistencePlatformTransformer[];

  V1_getExtraPersistencePlatformProtocolSerializers?(): V1_PersistencePlatformProtocolSerializer[];

  V1_getExtraPersistencePlatformProtocolDeserializers?(): V1_PersistencePlatformProtocolDeserializer[];
}

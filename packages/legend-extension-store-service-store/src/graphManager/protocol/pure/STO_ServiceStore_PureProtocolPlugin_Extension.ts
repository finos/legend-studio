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

import type { PlainObject } from '@finos/legend-shared';
import type { V1_SecurityScheme } from './v1/model/packageableElements/store/serviceStore/model/V1_STO_ServiceStore_SecurityScheme.js';
import type { SecurityScheme } from '../../../graph/metamodel/pure/model/packageableElements/store/serviceStore/model/STO_ServiceStore_SecurityScheme.js';
import type {
  V1_GraphBuilderContext,
  V1_GraphTransformerContext,
  PureProtocolProcessorPlugin,
} from '@finos/legend-graph';

export type V1_SecuritySchemeBuilder = (
  connection: V1_SecurityScheme,
  context: V1_GraphBuilderContext,
) => SecurityScheme | undefined;

export type V1_SecuritySchemeTransformer = (
  metamodel: SecurityScheme,
  context: V1_GraphTransformerContext,
) => V1_SecurityScheme | undefined;

export type V1_SecuritySchemeProtocolSerializer = (
  connection: V1_SecurityScheme,
) => PlainObject<V1_SecurityScheme> | undefined;

export type V1_SecuritySchemeProtocolDeserializer = (
  json: PlainObject<V1_SecurityScheme>,
) => V1_SecurityScheme | undefined;

export interface STO_ServiceStore_PureProtocolPlugin_Extension
  extends PureProtocolProcessorPlugin {
  V1_getExtraSecuritySchemeBuilders?(): V1_SecuritySchemeBuilder[];

  V1_getExtraSecuritySchemeTransformers?(): V1_SecuritySchemeTransformer[];

  V1_getExtraSecuritySchemeProtocolSerializers?(): V1_SecuritySchemeProtocolSerializer[];

  V1_getExtraSecuritySchemeProtocolDeserializers?(): V1_SecuritySchemeProtocolDeserializer[];
}

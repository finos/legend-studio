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
import type { EmbeddedData } from '../../../../graph/metamodel/pure/data/EmbeddedData.js';
import type { PureProtocolProcessorPlugin } from '../PureProtocolProcessorPlugin.js';
import type { V1_EmbeddedData } from '../v1/model/data/V1_EmbeddedData.js';
import type { V1_GraphTransformerContext } from '../v1/transformation/pureGraph/from/V1_GraphTransformerContext.js';
import type { V1_GraphBuilderContext } from '../v1/transformation/pureGraph/to/V1_GraphBuilderContext.js';

export type V1_EmbeddedDataBuilder = (
  protocol: V1_EmbeddedData,
  context: V1_GraphBuilderContext,
) => EmbeddedData | undefined;

export type V1_EmbeddedDataTransformer = (
  metamodel: EmbeddedData,
  context: V1_GraphTransformerContext,
) => V1_EmbeddedData | undefined;

export type V1_EmbeddedDataProtocolSerializer = (
  protocol: V1_EmbeddedData,
) => PlainObject<V1_EmbeddedData> | undefined;

export type V1_EmbeddedDataProtocolDeserializer = (
  json: PlainObject<V1_EmbeddedData>,
) => V1_EmbeddedData | undefined;

export interface DSL_Data_PureProtocolProcessorPlugin_Extension
  extends PureProtocolProcessorPlugin {
  V1_getExtraEmbeddedDataBuilders?(): V1_EmbeddedDataBuilder[];

  V1_getExtraEmbeddedDataTransformers?(): V1_EmbeddedDataTransformer[];

  V1_getExtraEmbeddedDataProtocolSerializers?(): V1_EmbeddedDataProtocolSerializer[];

  V1_getExtraEmbeddedDataProtocolDeserializers?(): V1_EmbeddedDataProtocolDeserializer[];
}

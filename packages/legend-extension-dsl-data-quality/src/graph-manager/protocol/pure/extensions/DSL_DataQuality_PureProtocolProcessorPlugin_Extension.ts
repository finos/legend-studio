/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import type {
  PureProtocolProcessorPlugin,
  V1_GraphBuilderContext,
  V1_GraphTransformerContext,
} from '@finos/legend-graph';
import type { PlainObject } from '@finos/legend-shared';
import type { DataQualityPersistenceStrategy } from '../../../../graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.js';
import type { V1_DataQualityPersistenceStrategy } from '../v1/V1_DataQualityValidationConfiguration.js';

export type V1_DataQualityPersistenceStrategyProtocolSerializer = (
  protocol: V1_DataQualityPersistenceStrategy,
) => PlainObject<V1_DataQualityPersistenceStrategy> | undefined;

export type V1_DataQualityPersistenceStrategyProtocolDeserializer = (
  json: PlainObject<V1_DataQualityPersistenceStrategy>,
) => V1_DataQualityPersistenceStrategy | undefined;

export type V1_DataQualityPersistenceStrategyBuilder = (
  protocol: V1_DataQualityPersistenceStrategy,
  context: V1_GraphBuilderContext,
) => DataQualityPersistenceStrategy | undefined;

export type V1_DataQualityPersistenceStrategyTransformer = (
  metamodel: DataQualityPersistenceStrategy,
  context: V1_GraphTransformerContext,
) => V1_DataQualityPersistenceStrategy | undefined;

export interface DSL_DataQuality_PureProtocolProcessorPlugin_Extension
  extends PureProtocolProcessorPlugin {
  V1_getExtraDataQualityPersistenceStrategyProtocolSerializers?(): V1_DataQualityPersistenceStrategyProtocolSerializer[];

  V1_getExtraDataQualityPersistenceStrategyProtocolDeserializers?(): V1_DataQualityPersistenceStrategyProtocolDeserializer[];

  V1_getExtraDataQualityPersistenceStrategyBuilders?(): V1_DataQualityPersistenceStrategyBuilder[];

  V1_getExtraDataQualityPersistenceStrategyTransformers?(): V1_DataQualityPersistenceStrategyTransformer[];
}

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
import type { AuthenticationStrategy } from '../../../../graph/metamodel/pure/packageableElements/store/relational/connection/AuthenticationStrategy.js';
import type { DatasourceSpecification } from '../../../../graph/metamodel/pure/packageableElements/store/relational/connection/DatasourceSpecification.js';
import type { PostProcessor } from '../../../../graph/metamodel/pure/packageableElements/store/relational/connection/postprocessor/PostProcessor.js';
import type { Milestoning } from '../../../../graph/metamodel/pure/packageableElements/store/relational/model/milestoning/Milestoning.js';
import type { PureProtocolProcessorPlugin } from '../PureProtocolProcessorPlugin.js';
import type { V1_PostProcessor } from '../v1/model/packageableElements/store/relational/connection/postprocessor/V1_PostProcessor.js';
import type { V1_AuthenticationStrategy } from '../v1/model/packageableElements/store/relational/connection/V1_AuthenticationStrategy.js';
import type { V1_DatasourceSpecification } from '../v1/model/packageableElements/store/relational/connection/V1_DatasourceSpecification.js';
import type { V1_Milestoning } from '../v1/model/packageableElements/store/relational/model/milestoning/V1_Milestoning.js';
import type { V1_GraphTransformerContext } from '../v1/transformation/pureGraph/from/V1_GraphTransformerContext.js';
import type { V1_GraphBuilderContext } from '../v1/transformation/pureGraph/to/V1_GraphBuilderContext.js';

// milestoning

export type V1_MilestoningBuilder = (
  protocol: V1_Milestoning,
  context: V1_GraphBuilderContext,
) => Milestoning | undefined;

export type V1_MilestoningTransformer = (
  metamodel: Milestoning,
  context: V1_GraphTransformerContext,
) => V1_Milestoning | undefined;

export type V1_MilestoningProtocolSerializer = (
  protocol: V1_Milestoning,
) => PlainObject<V1_Milestoning> | undefined;

export type V1_MilestoningProtocolDeserializer = (
  json: PlainObject<V1_Milestoning>,
) => V1_Milestoning | undefined;

// connection post-processor

export type V1_ConnectionPostProcessorBuilder = (
  protocol: V1_PostProcessor,
  context: V1_GraphBuilderContext,
) => PostProcessor | undefined;

export type V1_ConnectionPostProcessorTransformer = (
  metamodel: PostProcessor,
  context: V1_GraphTransformerContext,
) => V1_PostProcessor | undefined;

export type V1_ConnectionPostProcessorProtocolSerializer = (
  protocol: V1_PostProcessor,
) => PlainObject<V1_PostProcessor> | undefined;

export type V1_ConnectionPostProcessorProtocolDeserializer = (
  json: PlainObject<V1_PostProcessor>,
) => V1_PostProcessor | undefined;

// connection datasource specification

export type V1_ConnectionDatasourceSpecificationBuilder = (
  protocol: V1_DatasourceSpecification,
  context: V1_GraphBuilderContext,
) => DatasourceSpecification | undefined;

export type V1_ConnectionDatasourceSpecificationTransformer = (
  metamodel: DatasourceSpecification,
  context: V1_GraphTransformerContext,
) => V1_DatasourceSpecification | undefined;

export type V1_ConnectionDatasourceSpecificationProtocolSerializer = (
  protocol: V1_DatasourceSpecification,
) => PlainObject<V1_DatasourceSpecification> | undefined;

export type V1_ConnectionDatasourceSpecificationProtocolDeserializer = (
  json: PlainObject<V1_DatasourceSpecification>,
) => V1_DatasourceSpecification | undefined;

// connection authentication strategy

export type V1_ConnectionAuthenticationStrategyBuilder = (
  protocol: V1_AuthenticationStrategy,
  context: V1_GraphBuilderContext,
) => AuthenticationStrategy | undefined;

export type V1_ConnectionAuthenticationStrategyTransformer = (
  metamodel: AuthenticationStrategy,
  context: V1_GraphTransformerContext,
) => V1_AuthenticationStrategy | undefined;

export type V1_ConnectionAuthenticationStrategyProtocolSerializer = (
  protocol: V1_AuthenticationStrategy,
) => PlainObject<V1_AuthenticationStrategy> | undefined;

export type V1_ConnectionAuthenticationStrategyProtocolDeserializer = (
  json: PlainObject<V1_AuthenticationStrategy>,
) => V1_AuthenticationStrategy | undefined;

export interface STO_Relational_PureProtocolProcessorPlugin_Extension
  extends PureProtocolProcessorPlugin {
  // milestoning

  V1_getExtraMilestoningBuilders?(): V1_MilestoningBuilder[];

  V1_getExtraMilestoningTransformers?(): V1_MilestoningTransformer[];

  V1_getExtraMilestoningProtocolSerializers?(): V1_MilestoningProtocolSerializer[];

  V1_getExtraMilestoningProtocolDeserializers?(): V1_MilestoningProtocolDeserializer[];

  // connection post-processor

  V1_getExtraConnectionPostProcessorBuilders?(): V1_ConnectionPostProcessorBuilder[];

  V1_getExtraConnectionPostProcessorTransformers?(): V1_ConnectionPostProcessorTransformer[];

  V1_getExtraConnectionPostProcessorProtocolSerializers?(): V1_ConnectionPostProcessorProtocolSerializer[];

  V1_getExtraConnectionPostProcessorProtocolDeserializers?(): V1_ConnectionPostProcessorProtocolDeserializer[];

  // connection datasource specification

  V1_getExtraConnectionDatasourceSpecificationBuilders?(): V1_ConnectionDatasourceSpecificationBuilder[];

  V1_getExtraConnectionDatasourceSpecificationTransformers?(): V1_ConnectionDatasourceSpecificationTransformer[];

  V1_getExtraConnectionDatasourceSpecificationProtocolSerializers?(): V1_ConnectionDatasourceSpecificationProtocolSerializer[];

  V1_getExtraConnectionDatasourceSpecificationProtocolDeserializers?(): V1_ConnectionDatasourceSpecificationProtocolDeserializer[];

  // connection authentication strategy

  V1_getExtraConnectionAuthenticationStrategyBuilders?(): V1_ConnectionAuthenticationStrategyBuilder[];

  V1_getExtraConnectionAuthenticationStrategyTransformers?(): V1_ConnectionAuthenticationStrategyTransformer[];

  V1_getExtraConnectionAuthenticationStrategyProtocolSerializers?(): V1_ConnectionAuthenticationStrategyProtocolSerializer[];

  V1_getExtraConnectionAuthenticationStrategyProtocolDeserializers?(): V1_ConnectionAuthenticationStrategyProtocolDeserializer[];
}

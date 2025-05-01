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

import type { PureProtocolProcessorPlugin } from '../PureProtocolProcessorPlugin.js';
import type { PostDeploymentProperties } from '../../../../graph/metamodel/pure/functionActivator/PostDeploymentProperties.js';
import type { V1_PostDeploymentProperties } from '../v1/engine/functionActivator/V1_PostDeploymentProperties.js';
import type { PlainObject } from '@finos/legend-shared';
import type { V1_GraphTransformerContext } from '../v1/transformation/pureGraph/from/V1_GraphTransformerContext.js';
import type { V1_GraphBuilderContext } from '../v1/transformation/pureGraph/to/V1_GraphBuilderContext.js';

export type V1_PostDeploymentPropertiesBuilder = (
  protocol: V1_PostDeploymentProperties,
  context: V1_GraphBuilderContext,
) => PostDeploymentProperties | undefined;

export type V1_PostDeploymentPropertiesSerializer = (
  protocol: V1_PostDeploymentProperties,
) => PlainObject<V1_PostDeploymentProperties> | undefined;

export type V1_PostDeploymentPropertiesDeserializer = (
  json: PlainObject<V1_PostDeploymentProperties>,
) => V1_PostDeploymentProperties | undefined;

export type V1_PostDeploymentPropertiesTransformer = (
  metamodel: PostDeploymentProperties,
  context: V1_GraphTransformerContext,
) => V1_PostDeploymentProperties | undefined;

export interface DSL_FunctionActivator_PureProtocolProcessorPlugin_Extension
  extends PureProtocolProcessorPlugin {
  V1_getExtraPostDeploymentPropertiesBuilders?(): V1_PostDeploymentPropertiesBuilder[];
  V1_getExtraPostDeploymentPropertiesTransformers?(): V1_PostDeploymentPropertiesTransformer[];
  V1_getPostDeploymentPropertiesSerializers?(): V1_PostDeploymentPropertiesSerializer[];
  V1_getPostDeploymentPropertiesDeserializers?(): V1_PostDeploymentPropertiesDeserializer[];
}

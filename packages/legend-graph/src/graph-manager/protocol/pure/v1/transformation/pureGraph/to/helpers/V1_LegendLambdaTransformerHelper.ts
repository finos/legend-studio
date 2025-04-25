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

import { PostDeploymentAction } from '../../../../../../../../graph/metamodel/pure/functionActivator/PostDeploymentAction.js';
import {
  type PostDeploymentProperties,
  INTERNAL__UnknownPostDeploymentProperties,
} from '../../../../../../../../graph/metamodel/pure/functionActivator/PostDeploymentProperties.js';
import type { FunctionActivator } from '../../../../../../../../graph/metamodel/pure/packageableElements/function/FunctionActivator.js';
import type { DSL_FunctionActivator_PureProtocolProcessorPlugin_Extension } from '../../../../../extensions/DSL_FunctionActivator_PureProtocolProcessorPlugin_Extension.js';
import {
  type V1_PostDeploymentProperties,
  V1_INTERNAL__UnknownPostDeploymentProperties,
} from '../../../../engine/functionActivator/V1_PostDeploymentProperties.js';
import type { V1_FunctionActivator } from '../../../../model/packageableElements/function/V1_FunctionActivator.js';
import type { V1_GraphTransformerContext } from '../../from/V1_GraphTransformerContext.js';

export const V1_transformPostDeploymentProperties = (
  metamodel: PostDeploymentProperties,
  context: V1_GraphTransformerContext,
): V1_PostDeploymentProperties => {
  if (metamodel instanceof INTERNAL__UnknownPostDeploymentProperties) {
    const protocol = new V1_INTERNAL__UnknownPostDeploymentProperties();
    protocol.content = metamodel.content;
    return protocol;
  }
  const extraPostDeploymentActionTransformers = context.plugins.flatMap(
    (plugin: DSL_FunctionActivator_PureProtocolProcessorPlugin_Extension) =>
      plugin.V1_getExtraPostDeploymentPropertiesTransformers?.() ?? [],
  );
  for (const transformer of extraPostDeploymentActionTransformers) {
    const protocol = transformer(metamodel, context);
    if (protocol) {
      return protocol;
    }
  }
  return new V1_INTERNAL__UnknownPostDeploymentProperties();
};

export const V1_transformFunctionActivatorActions = (
  protocol: V1_FunctionActivator,
  metamodel: FunctionActivator,
  context: V1_GraphTransformerContext,
): void => {
  metamodel.actions = protocol.actions.map((value) => {
    const val = new PostDeploymentAction();
    val.automated = value.automated;
    if (value.properties) {
      val.properties = V1_transformPostDeploymentProperties(
        value.properties,
        context,
      );
    }
    return val;
  });
};

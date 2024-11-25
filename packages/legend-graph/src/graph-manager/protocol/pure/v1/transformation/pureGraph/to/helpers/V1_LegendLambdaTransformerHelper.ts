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

import type { PostDeploymentAction } from '../../../../../../../../graph/metamodel/pure/functionActivator/PostDeploymentAction.js';
import {
  INTERNAL__UnknownPostDeploymentProperties,
  type PostDeploymentProperties,
} from '../../../../../../../../graph/metamodel/pure/functionActivator/PostDeploymentProperties.js';
import type { FunctionActivator } from '../../../../../../../../graph/metamodel/pure/packageableElements/function/FunctionActivator.js';
import { V1_PostDeploymentAction } from '../../../../engine/functionActivator/V1_PostDeploymentAction.js';
import {
  V1_INTERNAL__UnknownPostDeploymentProperties,
  V1_PostDeploymentProperties,
} from '../../../../engine/functionActivator/V1_PostDeploymentProperties.js';
import type { V1_FunctionActivator } from '../../../../model/packageableElements/function/V1_FunctionActivator.js';

export const V1_transformPostDeploymentProperties = (
  protocol: PostDeploymentProperties,
): V1_PostDeploymentProperties => {
  if (protocol instanceof INTERNAL__UnknownPostDeploymentProperties) {
    const metamodel = new V1_INTERNAL__UnknownPostDeploymentProperties();
    metamodel.content = protocol.content;
    return metamodel;
  }
  return new V1_PostDeploymentProperties();
};

export const V1_tansformPostDeploymentActions = (
  metamodel: PostDeploymentAction,
): V1_PostDeploymentAction => {
  const protocol = new V1_PostDeploymentAction();
  protocol.automated = metamodel.automated;
  if (metamodel.properties) {
    protocol.properties = V1_transformPostDeploymentProperties(
      metamodel.properties,
    );
  }
  return protocol;
};

export const V1_transformFunctionActivatorActions = (
  protocol: V1_FunctionActivator,
  metamodel: FunctionActivator,
): void => {
  protocol.actions = metamodel.actions.map(V1_tansformPostDeploymentActions);
};

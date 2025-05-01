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

import type { PostDeploymentProperties } from '../../graph/metamodel/pure/functionActivator/PostDeploymentProperties.js';
import type { PureGraphManagerPlugin } from '../PureGraphManagerPlugin.js';

export type FunctionActivatorObserver = (
  postDeploymentProperties: PostDeploymentProperties,
) => PostDeploymentProperties | undefined;

export interface DSL_FunctionActivator_PureGraphManager_Extension
  extends PureGraphManagerPlugin {
  getExtraFunctionActivatorPostDeploymentPropertiesObservers?(): FunctionActivatorObserver[];
}

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

import type { ModelGenerationSpecification } from '../../../../graph/metamodel/pure/packageableElements/generationSpecification/ModelGenerationSpecification.js';
import type { PureProtocolProcessorPlugin } from '../PureProtocolProcessorPlugin.js';
import type { V1_RemoteEngine } from '../v1/engine/V1_RemoteEngine.js';
import type { V1_PureModelContextData } from '../v1/model/context/V1_PureModelContextData.js';

export type V1_ModelGenerator = (
  generationElement: ModelGenerationSpecification,
  model: V1_PureModelContextData,
  engine: V1_RemoteEngine,
) => Promise<V1_PureModelContextData | undefined>;

export interface DSL_Generation_PureProtocolProcessorPlugin_Extension
  extends PureProtocolProcessorPlugin {
  /**
   * Get the list of generators for model generation specification.
   */
  V1_getExtraModelGenerators?(): V1_ModelGenerator[];
}

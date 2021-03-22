/**
 * Copyright Goldman Sachs
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

import type { PackageableElement } from '../../metamodels/pure/model/packageableElements/PackageableElement';
import type { PureProtocolProcessorPlugin } from './PureProtocolProcessorPlugin';
import type { V1_Engine } from './v1/engine/V1_Engine';
import type { V1_PureModelContextData } from './v1/model/context/V1_PureModelContextData';

export type V1_ModelGenerator = (
  generationElement: PackageableElement,
  model: V1_PureModelContextData,
  engine: V1_Engine,
) => Promise<V1_PureModelContextData | undefined>;

export interface DSLGenerationSpecification_PureProtocolProcessorPlugin_Extension
  extends PureProtocolProcessorPlugin {
  V1_getExtraModelGenerators?(): V1_ModelGenerator[];
}

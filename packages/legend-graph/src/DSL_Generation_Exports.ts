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

// metamodels
export { ModelGenerationSpecification } from './graph/metamodel/pure/packageableElements/generationSpecification/ModelGenerationSpecification.js';
export {
  GenerationSpecification,
  GenerationTreeNode,
} from './graph/metamodel/pure/packageableElements/generationSpecification/GenerationSpecification.js';
export { FileGenerationSpecification } from './graph/metamodel/pure/packageableElements/fileGeneration/FileGenerationSpecification.js';
export { ConfigurationProperty } from './graph/metamodel/pure/packageableElements/fileGeneration/ConfigurationProperty.js';

// protocols
export * from './graphManager/protocol/pure/DSL_Generation_PureProtocolProcessorPlugin_Extension.js';
export { V1_ModelGenerationSpecification } from './graphManager/protocol/pure/v1/model/packageableElements/generationSpecification/V1_ModelGenerationSpecification.js';

export { V1_GenerationInput } from './graphManager/protocol/pure/v1/engine/generation/V1_GenerationInput.js';
export { V1_GenerationOutput } from './graphManager/protocol/pure/v1/engine/generation/V1_GenerationOutput.js';

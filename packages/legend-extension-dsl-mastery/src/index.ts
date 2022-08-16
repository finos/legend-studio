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

export * from './DSLMastery_Extension.js';
export { DSLMastery_LegendStudioApplicationPlugin } from './components/studio/DSLMastery_LegendStudioApplicationPlugin.js';

// ---------- PACKAGEABLE ELEMENT ----------

// metamodels
export { MasterRecordDefinition } from './graph/metamodel/pure/model/packageableElements/mastery/DSLMastery_MasterRecordDefinition.js';

// v1 protocols
export { V1_MasterRecordDefinition } from './graphManager/protocol/pure/v1/model/packageableElements/mastery/V1_DSLMastery_MasterRecordDefinition.js';

// ---------- TRANSFORMATION ----------

export { V1_transformMasterRecordDefinition } from './graphManager/protocol/pure/v1/transformation/pureGraph/from/V1_MasteryTransformer.js';
export { V1_buildMasterRecordDefinition } from './graphManager/protocol/pure/v1/transformation/pureGraph/to/V1_MasteryBuilder.js';

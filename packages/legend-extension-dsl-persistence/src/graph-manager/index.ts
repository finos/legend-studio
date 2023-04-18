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

export * from './DSL_Persistence_GraphManagerPreset.js';

// ---------- PACKAGEABLE ELEMENT ----------

// metamodels
export { Persistence } from '../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_Persistence.js';
export { PersistenceTest } from '../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_PersistenceTest.js';
export { PersistenceContext } from '../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_PersistenceContext.js';
export { PersistencePlatform } from '../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_PersistencePlatform.js';
export { Trigger } from '../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_Trigger.js';

// v1 protocols
export { V1_Persistence } from './protocol/pure/v1/model/packageableElements/persistence/V1_DSL_Persistence_Persistence.js';
export { V1_PersistenceContext } from './protocol/pure/v1/model/packageableElements/persistence/V1_DSL_Persistence_PersistenceContext.js';
export { V1_PersistencePlatform } from './protocol/pure/v1/model/packageableElements/persistence/V1_DSL_Persistence_PersistencePlatform.js';
export { V1_Trigger } from './protocol/pure/v1/model/packageableElements/persistence/V1_DSL_Persistence_Trigger.js';

// ---------- TRANSFORMATION ----------

// extension
export * from './protocol/pure/DSL_Persistence_PureProtocolProcessorPlugin_Extension.js';

// builders
export { V1_buildPersistence } from './protocol/pure/v1/transformation/pureGraph/to/V1_DSL_Persistence_BuilderHelper.js';
export { V1_buildPersistenceContext } from './protocol/pure/v1/transformation/pureGraph/to/V1_DSL_Persistence_ContextBuilder.js';

// transformers
export { V1_transformPersistence } from './protocol/pure/v1/transformation/pureGraph/from/V1_DSL_Persistence_TransformerHelper.js';
export { V1_transformPersistenceContext } from './protocol/pure/v1/transformation/pureGraph/from/V1_DSL_Persistence_ContextTransformer.js';

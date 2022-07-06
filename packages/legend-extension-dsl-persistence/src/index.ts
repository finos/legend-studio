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

export * from './DSLPersistence_Extension.js';
export { DSLPersistence_LegendStudioPlugin } from './components/studio/DSLPersistence_LegendStudioPlugin.js';

// ---------- PACKAGEABLE ELEMENT ----------

// metamodels
export { Persistence } from './models/metamodels/pure/model/packageableElements/persistence/DSLPersistence_Persistence.js';
export { PersistenceContext } from './models/metamodels/pure/model/packageableElements/persistence/DSLPersistence_PersistenceContext.js';

// v1 protocols
export { V1_Persistence } from './models/protocols/pure/v1/model/packageableElements/persistence/V1_DSLPersistence_Persistence.js';
export { V1_PersistenceContext } from './models/protocols/pure/v1/model/packageableElements/persistence/V1_DSLPersistence_PersistenceContext.js';

// ---------- TRANSFORMATION ----------

export * from './models/protocols/pure/DSLPersistence_PureProtocolProcessorPlugin_Extension.js';

export { V1_transformPersistence } from './models/protocols/pure/v1/transformation/pureGraph/from/V1_PersistenceTransformer.js';
export { V1_buildPersistence } from './models/protocols/pure/v1/transformation/pureGraph/to/V1_PersistenceBuilder.js';

export { V1_transformPersistenceContext } from './models/protocols/pure/v1/transformation/pureGraph/from/V1_PersistenceContextTransformer.js';
export { V1_buildPersistenceContext } from './models/protocols/pure/v1/transformation/pureGraph/to/V1_PersistenceContextBuilder.js';

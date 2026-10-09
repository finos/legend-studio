/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import {
  CONCAT_DEFINITION,
  createNodeRegistry,
  NodeRegistry,
} from '../nodes/NodeRegistry.js';

/**
 * Every registered node type, and Concat, which is registered with the
 * builder's editor in M4.10 (PLAN §11.5): until then, tests of Concat's
 * emission, saved spec and inference pass this registry
 */
export const TEST__registryWithConcat = (): NodeRegistry => {
  const registry = createNodeRegistry();
  return registry.get(CONCAT_DEFINITION.type)
    ? registry
    : new NodeRegistry([
        ...registry.sources,
        ...registry.transforms,
        CONCAT_DEFINITION,
      ]);
};

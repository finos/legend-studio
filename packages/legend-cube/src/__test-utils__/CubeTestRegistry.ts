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
  createNodeRegistry,
  type NodeRegistry,
  PIVOT_DEFINITION,
} from '../nodes/NodeRegistry.js';

/** Cube's registry with Pivot, which the default registry leaves out until its editor exists (PLAN §11.12, M6c.4) */
export const TEST__registryWithPivot = (): NodeRegistry => {
  const registry = createNodeRegistry();
  registry.register(PIVOT_DEFINITION);
  return registry;
};

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

import type { Schema } from '../schema/Schema.js';
import type { EmitRole, Origin } from './CubeIR.js';

/** What a node's emitter knows besides its own settings: the schemas Cube inferred around it */
export interface EmitContext {
  /** The node's input schemas, in port order */
  readonly inputSchemas: readonly Schema[];
  /** The node's own output schema */
  readonly schema: Schema;
}

/** The origin of an IR node emitted for a query node */
export const originOf = (nodeId: string, role: EmitRole): Origin => ({
  nodeId,
  role,
});

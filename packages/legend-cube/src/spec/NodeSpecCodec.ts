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

import type { QueryNode } from '../graph/QueryNode.js';
import type { JsonObject } from '../utils/Json.js';

/**
 * How the saved spec stores a type of node (PLAN §10.3): the node's own
 * fields, written after `kind`, `id` and `inputs`, which the codec handles.
 */
export interface NodeSpecCodec<N extends QueryNode = QueryNode> {
  /** The node's own keys, in the order they are written */
  readonly keys: readonly string[];
  /** The node's own fields, in the order of `keys`, leaving out absent ones */
  encode(node: N): JsonObject;
  /**
   * The node with this id from its own fields: `json` holds only `keys`, and
   * `rest` the node's unknown keys. Throws a `CubeSpecDecodeError` for a
   * malformed field, and `UnreadableContent` for a value this version can't
   * read, which keeps the node as an Unknown node.
   */
  decode(id: string, json: JsonObject, path: string, rest: JsonObject): N;
}

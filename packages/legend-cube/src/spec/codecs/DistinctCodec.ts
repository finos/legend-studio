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

import { Distinct } from '../../nodes/transforms/Distinct.js';
import { EMPTY_JSON_OBJECT } from '../../utils/Json.js';
import type { NodeSpecCodec } from '../NodeSpecCodec.js';

/**
 * A distinct: no field of its own. A field that would change its rows, such
 * as a list of columns, needs a new kind or a format version, since an older
 * reader would keep it in the node's rest and ignore it (PLAN §11.4).
 */
export const DISTINCT_CODEC: NodeSpecCodec<Distinct> = {
  keys: [],
  encode: () => EMPTY_JSON_OBJECT,
  decode: (id, json, path, rest) => new Distinct(id, rest),
};

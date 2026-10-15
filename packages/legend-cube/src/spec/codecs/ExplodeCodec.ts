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

import { Explode } from '../../nodes/transforms/Explode.js';
import type { NodeSpecCodec } from '../NodeSpecCodec.js';
import { readString, readStringList } from '../SpecReader.js';

/**
 * An Explode Array (PLAN §11.20): its column, its path of keys and its new
 * column's name, always written, exactly as held (`''` and empty keys
 * included, for validation to report)
 */
export const EXPLODE_CODEC: NodeSpecCodec<Explode> = {
  keys: ['column', 'path', 'name'],
  encode: (node) => ({
    column: node.column,
    path: [...node.path],
    name: node.name,
  }),
  decode: (id, json, path, rest) =>
    new Explode(
      id,
      readString(json, 'column', path, true),
      readStringList(json, 'path', path),
      readString(json, 'name', path, true),
      rest,
    ),
};

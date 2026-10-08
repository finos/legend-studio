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

import { Drop } from '../../nodes/transforms/Drop.js';
import { EMPTY_JSON_OBJECT } from '../../utils/Json.js';
import type { NodeSpecCodec } from '../NodeSpecCodec.js';
import { readOptionalFiniteNumber } from '../SpecReader.js';

/**
 * A drop: its size, a JSON number. The size is written whenever the node has
 * one, the default 10 included, and left out only when the user cleared it,
 * so a cleared size reads back cleared (PLAN §11.4). Any finite number is
 * read; validation reports one that isn't a positive whole number.
 */
export const DROP_CODEC: NodeSpecCodec<Drop> = {
  keys: ['size'],
  encode: (node) =>
    node.size === undefined ? EMPTY_JSON_OBJECT : { size: node.size },
  decode: (id, json, path, rest) =>
    new Drop(id, readOptionalFiniteNumber(json, 'size', path), rest),
};

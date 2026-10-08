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

import { Slice } from '../../nodes/transforms/Slice.js';
import type { JsonObject } from '../../utils/Json.js';
import type { NodeSpecCodec } from '../NodeSpecCodec.js';
import { readOptionalFiniteNumber } from '../SpecReader.js';

/**
 * A slice: its `start` and `stop`, JSON numbers counting rows from 0, the
 * range `[start, stop)` (D5; that meaning is part of the format). Each is
 * written whenever set, defaults included, and left out only when the user
 * cleared it (PLAN §11.4). Any finite number is read; validation reports the
 * rest.
 */
export const SLICE_CODEC: NodeSpecCodec<Slice> = {
  keys: ['start', 'stop'],
  encode: (node) => {
    const json: Record<string, number> = {};
    if (node.start !== undefined) {
      json.start = node.start;
    }
    if (node.stop !== undefined) {
      json.stop = node.stop;
    }
    return json as JsonObject;
  },
  decode: (id, json, path, rest) =>
    new Slice(
      id,
      readOptionalFiniteNumber(json, 'start', path),
      readOptionalFiniteNumber(json, 'stop', path),
      rest,
    ),
};

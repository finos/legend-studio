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

import { Concat } from '../../nodes/transforms/Concat.js';
import type { NodeSpecCodec } from '../NodeSpecCodec.js';
import { fail, pathTo, UnreadableContent } from '../SpecReader.js';

/**
 * A concat: its two inputs, and `widenTypes`, always written, `false`
 * included (PLAN §11.5). A value other than true or false, which a later
 * version could write (e.g. a kind of conversion), could change the rows, so
 * it keeps the node as an Unknown node.
 */
export const CONCAT_CODEC: NodeSpecCodec<Concat> = {
  keys: ['widenTypes'],
  encode: (node) => ({ widenTypes: node.widenTypes }),
  decode: (id, json, path, rest) => {
    const { widenTypes } = json;
    if (widenTypes === undefined) {
      return fail(pathTo(path, 'widenTypes'), 'is required');
    }
    if (typeof widenTypes !== 'boolean') {
      throw new UnreadableContent(
        `A concat's widenTypes is a value this version doesn't know`,
      );
    }
    return new Concat(id, widenTypes, rest);
  },
};

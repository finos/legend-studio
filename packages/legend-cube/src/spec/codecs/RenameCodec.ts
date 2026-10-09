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

import { Rename } from '../../nodes/transforms/Rename.js';
import type { NodeSpecCodec } from '../NodeSpecCodec.js';
import {
  hasOnlyKeys,
  pathTo,
  readItems,
  readString,
  UnreadableContent,
} from '../SpecReader.js';

const MAPPING_KEYS = ['from', 'to'];

/**
 * A rename: its mappings, always written (empty included), each `{from, to}`
 * so no column name becomes an object key (PLAN §10.3). Names are kept
 * exactly, untrimmed, for validation to judge. A key on a mapping that this
 * version doesn't know could change the rows, so it keeps the node as an
 * Unknown node, once every known field has been read (PLAN §11.4).
 */
export const RENAME_CODEC: NodeSpecCodec<Rename> = {
  keys: ['mappings'],
  encode: (node) => ({
    mappings: node.mappings.map(({ from, to }) => ({ from, to })),
  }),
  decode: (id, json, path, rest) => {
    const at = pathTo(path, 'mappings');
    const items = readItems(json, 'mappings', path);
    const mappings = items.map((item, index) => ({
      from: readString(item, 'from', pathTo(at, index), true),
      to: readString(item, 'to', pathTo(at, index), true),
    }));
    if (!items.every((item) => hasOnlyKeys(item, MAPPING_KEYS))) {
      throw new UnreadableContent(
        `A rename mapping has a key this version doesn't know`,
      );
    }
    return new Rename(id, mappings, rest);
  },
};

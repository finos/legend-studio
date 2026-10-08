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
  isSortDirection,
  Sort,
  type SortDirection,
} from '../../nodes/transforms/Sort.js';
import type { NodeSpecCodec } from '../NodeSpecCodec.js';
import {
  hasOnlyKeys,
  pathTo,
  readItems,
  readString,
  UnreadableContent,
} from '../SpecReader.js';

const SORT_KEYS = ['column', 'direction'];

/**
 * A sort: its keys, always written (empty included), each
 * `{column, direction}`, most significant first. A column is kept exactly,
 * `''` included, for validation to judge; an empty direction is malformed, as
 * an empty join type is. A direction or a key on an entry that this version
 * doesn't know could change the rows, so it keeps the node as an Unknown
 * node, once every entry has been read (PLAN §11.4).
 */
export const SORT_CODEC: NodeSpecCodec<Sort> = {
  keys: ['sorts'],
  encode: (node) => ({
    sorts: node.sorts.map(({ column, direction }) => ({ column, direction })),
  }),
  decode: (id, json, path, rest) => {
    const at = pathTo(path, 'sorts');
    const items = readItems(json, 'sorts', path);
    const entries = items.map((item, index) => ({
      column: readString(item, 'column', pathTo(at, index), true),
      direction: readString(item, 'direction', pathTo(at, index)),
    }));
    const unknown = entries.find(
      ({ direction }) => !isSortDirection(direction),
    );
    if (unknown) {
      throw new UnreadableContent(
        `Unknown sort direction "${unknown.direction}"`,
      );
    }
    if (!items.every((item) => hasOnlyKeys(item, SORT_KEYS))) {
      throw new UnreadableContent(
        `A sort entry has a key this version doesn't know`,
      );
    }
    return new Sort(
      id,
      entries.map(({ column, direction }) => ({
        column,
        // every direction is known, checked above
        direction: direction as SortDirection,
      })),
      rest,
    );
  },
};

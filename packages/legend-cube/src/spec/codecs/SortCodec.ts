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
  type ColumnDirection,
  isSortDirection,
  Sort,
} from '../../nodes/transforms/Sort.js';
import type { JsonObject } from '../../utils/Json.js';
import type { NodeSpecCodec } from '../NodeSpecCodec.js';
import {
  hasOnlyKeys,
  pathTo,
  type ReadEntries,
  readItems,
  readString,
  UnreadableContent,
} from '../SpecReader.js';

const SORT_KEYS = ['column', 'direction'];

/**
 * The sort keys under `key`, each `{column, direction}`, most significant
 * first. A column is kept exactly, `''` included, for validation to judge; an
 * empty direction is malformed, as an empty join type is. A direction or an
 * entry key this version doesn't know could change the rows, so it makes the
 * node unreadable, once every entry has been read (PLAN §11.4). Shared by the
 * nodes that sort (Sort, Partition).
 */
export const readSortKeys = (
  json: JsonObject,
  key: string,
  path: string,
): ReadEntries<ColumnDirection> => {
  const at = pathTo(path, key);
  const items = readItems(json, key, path);
  const entries = items.map((item, index) => ({
    column: readString(item, 'column', pathTo(at, index), true),
    direction: readString(item, 'direction', pathTo(at, index)),
  }));
  const unknown = entries.find(({ direction }) => !isSortDirection(direction));
  return {
    // every direction is known unless `unreadable` says otherwise
    entries: entries as ColumnDirection[],
    unreadable: unknown
      ? `Unknown sort direction "${unknown.direction}"`
      : items.every((item) => hasOnlyKeys(item, SORT_KEYS))
        ? undefined
        : `A sort entry has a key this version doesn't know`,
  };
};

/** The JSON of sort keys, each `{column, direction}` */
export const encodeSortKeys = (
  sorts: readonly ColumnDirection[],
): JsonObject[] =>
  sorts.map(({ column, direction }) => ({ column, direction }));

/**
 * A sort: its keys, always written (empty included), read by `readSortKeys`
 */
export const SORT_CODEC: NodeSpecCodec<Sort> = {
  keys: ['sorts'],
  encode: (node) => ({ sorts: encodeSortKeys(node.sorts) }),
  decode: (id, json, path, rest) => {
    const { entries, unreadable } = readSortKeys(json, 'sorts', path);
    if (unreadable) {
      throw new UnreadableContent(unreadable);
    }
    return new Sort(id, entries, rest);
  },
};

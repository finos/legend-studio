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

import { Partition } from '../../nodes/transforms/Partition.js';
import type { NodeSpecCodec } from '../NodeSpecCodec.js';
import { readStringList, UnreadableContent } from '../SpecReader.js';
import {
  encodeColumnAggregations,
  readColumnAggregations,
} from './GroupCodec.js';
import { encodeSortKeys, readSortKeys } from './SortCodec.js';

/**
 * A partition (PLAN §11.6): its partition columns, its sort keys, read as a
 * Sort's, and its window functions, read as a Group's aggregations with the
 * window's functions, all three always written (empty included). Cube's own
 * shape, never the spec's V1 `operations`. Every entry is read before an
 * entry this version can't read makes the node an Unknown node.
 */
export const PARTITION_CODEC: NodeSpecCodec<Partition> = {
  keys: ['columns', 'sorts', 'aggregations'],
  encode: (node) => ({
    columns: [...node.columns],
    sorts: encodeSortKeys(node.sorts),
    aggregations: encodeColumnAggregations(node.aggregations),
  }),
  decode: (id, json, path, rest) => {
    const columns = readStringList(json, 'columns', path);
    const sorts = readSortKeys(json, 'sorts', path);
    const aggregations = readColumnAggregations(json, 'aggregations', path, {
      kind: 'window',
      sorted: sorts.entries.length > 0,
    });
    const unreadable = sorts.unreadable ?? aggregations.unreadable;
    if (unreadable) {
      throw new UnreadableContent(unreadable);
    }
    return new Partition(
      id,
      columns,
      sorts.entries,
      aggregations.entries,
      rest,
    );
  },
};

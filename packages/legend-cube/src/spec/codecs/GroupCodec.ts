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

import { getAggregationAutoName } from '../../nodes/transforms/Aggregation.js';
import { Group } from '../../nodes/transforms/Group.js';
import type { JsonObject } from '../../utils/Json.js';
import type { NodeSpecCodec } from '../NodeSpecCodec.js';
import {
  hasOnlyKeys,
  pathTo,
  readItems,
  readOptionalString,
  readString,
  readStringList,
  UnreadableContent,
} from '../SpecReader.js';

const AGGREGATION_KEYS = ['column', 'function', 'name'];

/**
 * A group: its keys and its aggregations, both always written (empty
 * included), each aggregation `{column, function, name}`, the column left out
 * for Count rows (PLAN §11.5). Texts are kept exactly, `''` included, for
 * validation to judge: an unknown, empty or window-only function is held, not
 * dropped (Q4), since an invalid group can't run. A name left out is read as
 * the auto-name (Q3), or `''` when there is none, and written back. A key on an
 * aggregation that this version doesn't know could change the rows, so it
 * keeps the node as an Unknown node, once every entry has been read.
 */
export const GROUP_CODEC: NodeSpecCodec<Group> = {
  keys: ['columns', 'aggregations'],
  encode: (node) => ({
    columns: [...node.columns],
    aggregations: node.aggregations.map(
      ({ column, function: fn, name }): JsonObject =>
        column === undefined
          ? { function: fn, name }
          : { column, function: fn, name },
    ),
  }),
  decode: (id, json, path, rest) => {
    const columns = readStringList(json, 'columns', path);
    const at = pathTo(path, 'aggregations');
    const items = readItems(json, 'aggregations', path);
    const aggregations = items.map((item, index) => {
      const itemPath = pathTo(at, index);
      const column = readOptionalString(item, 'column', itemPath, true);
      const fn = readString(item, 'function', itemPath, true);
      const name = readOptionalString(item, 'name', itemPath, true);
      return {
        column,
        function: fn,
        name: name ?? getAggregationAutoName(fn, column) ?? '',
      };
    });
    if (!items.every((item) => hasOnlyKeys(item, AGGREGATION_KEYS))) {
      throw new UnreadableContent(
        `An aggregation has a key this version doesn't know`,
      );
    }
    return new Group(id, columns, aggregations, rest);
  },
};

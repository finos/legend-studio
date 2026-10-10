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
  type AggregationUse,
  type ColumnAggregation,
  getAggregationAutoName,
  GROUP_AGGREGATION_USE,
} from '../../nodes/transforms/Aggregation.js';
import { Group } from '../../nodes/transforms/Group.js';
import type { JsonObject } from '../../utils/Json.js';
import type { NodeSpecCodec } from '../NodeSpecCodec.js';
import {
  hasOnlyKeys,
  pathTo,
  type ReadEntries,
  readItems,
  readOptionalString,
  readString,
  readStringList,
  UnreadableContent,
} from '../SpecReader.js';

const AGGREGATION_KEYS = ['column', 'function', 'name'];

/**
 * The aggregations under `key`, each `{column, function, name}`, the column
 * left out for a function that takes none (PLAN §11.5). Texts are kept
 * exactly, `''` included, for validation to judge: an unknown, empty or
 * misplaced function is held, not dropped (Q4), since an invalid node can't
 * run. A name left out is read as the auto-name for the use (Q3), or `''`
 * when there is none, and written back. An entry key this version doesn't
 * know could change the rows, so it makes the node unreadable, once every
 * entry has been read. Shared by the nodes that aggregate (Group, Partition).
 */
export const readColumnAggregations = (
  json: JsonObject,
  key: string,
  path: string,
  use: AggregationUse,
): ReadEntries<ColumnAggregation> => {
  const at = pathTo(path, key);
  const items = readItems(json, key, path);
  const entries = items.map((item, index) => {
    const itemPath = pathTo(at, index);
    const column = readOptionalString(item, 'column', itemPath, true);
    const fn = readString(item, 'function', itemPath, true);
    const name = readOptionalString(item, 'name', itemPath, true);
    return {
      column,
      function: fn,
      name: name ?? getAggregationAutoName(fn, column, use) ?? '',
    };
  });
  return {
    entries,
    unreadable: items.every((item) => hasOnlyKeys(item, AGGREGATION_KEYS))
      ? undefined
      : `An aggregation has a key this version doesn't know`,
  };
};

/** The JSON of aggregations, the column left out for a function that takes none */
export const encodeColumnAggregations = (
  aggregations: readonly ColumnAggregation[],
): JsonObject[] =>
  aggregations.map(
    ({ column, function: fn, name }): JsonObject =>
      column === undefined
        ? { function: fn, name }
        : { column, function: fn, name },
  );

/**
 * A group: its keys and its aggregations, both always written (empty
 * included), the aggregations read by `readColumnAggregations` as a Group's
 */
export const GROUP_CODEC: NodeSpecCodec<Group> = {
  keys: ['columns', 'aggregations'],
  encode: (node) => ({
    columns: [...node.columns],
    aggregations: encodeColumnAggregations(node.aggregations),
  }),
  decode: (id, json, path, rest) => {
    const columns = readStringList(json, 'columns', path);
    const { entries, unreadable } = readColumnAggregations(
      json,
      'aggregations',
      path,
      GROUP_AGGREGATION_USE,
    );
    if (unreadable) {
      throw new UnreadableContent(unreadable);
    }
    return new Group(id, columns, entries, rest);
  },
};

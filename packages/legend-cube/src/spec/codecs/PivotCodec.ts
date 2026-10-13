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

import { Pivot } from '../../nodes/transforms/Pivot.js';
import type { JsonObject } from '../../utils/Json.js';
import {
  isLiteralValue,
  type LiteralValue,
} from '../../values/LiteralValue.js';
import type { NodeSpecCodec } from '../NodeSpecCodec.js';
import {
  hasOnlyKeys,
  pathTo,
  readItems,
  readObject,
  readOptionalString,
  readString,
  readStringList,
  UnreadableContent,
} from '../SpecReader.js';

const VALUE_KEYS = ['kind', 'value'];
const AGGREGATION_KEYS = ['column', 'function'];

/**
 * A pivot (PLAN §11.12): its row columns, its pivot column (`''` until picked),
 * its values as typed literals `{kind, value}`, in order, and its aggregation
 * `{column, function}`, the column left out for Count rows. Texts are kept as
 * saved, `''` included, for validation to judge. A value that isn't a literal
 * this version reads, or a key it doesn't know, could change the rows, so it
 * makes the node unreadable.
 */
export const PIVOT_CODEC: NodeSpecCodec<Pivot> = {
  keys: ['rows', 'column', 'values', 'aggregation'],
  encode: (node) => ({
    rows: [...node.rows],
    column: node.column,
    values: node.values.map(({ kind, value }) => ({ kind, value })),
    aggregation: {
      ...(node.aggregation.column === undefined
        ? {}
        : { column: node.aggregation.column }),
      function: node.aggregation.function,
    },
  }),
  decode: (id, json, path, rest) => {
    const rows = readStringList(json, 'rows', path);
    const column = readString(json, 'column', path, true);
    const values = readItems(json, 'values', path).map((item): LiteralValue => {
      if (!hasOnlyKeys(item, VALUE_KEYS) || !isLiteralValue(item)) {
        throw new UnreadableContent(
          `A pivot value isn't a literal this version reads`,
        );
      }
      return item;
    });
    const at = pathTo(path, 'aggregation');
    const aggregation: JsonObject = readObject(json.aggregation, at);
    if (!hasOnlyKeys(aggregation, AGGREGATION_KEYS)) {
      throw new UnreadableContent(
        `A pivot's aggregation has a key this version doesn't know`,
      );
    }
    return new Pivot(
      id,
      rows,
      column,
      values,
      {
        function: readString(aggregation, 'function', at, true),
        column: readOptionalString(aggregation, 'column', at, true),
      },
      rest,
    );
  },
};

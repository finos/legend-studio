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

import { isJoinType, Join } from '../../nodes/transforms/Join.js';
import type { NodeSpecCodec } from '../NodeSpecCodec.js';
import {
  readString,
  readStringList,
  UnreadableContent,
} from '../SpecReader.js';

/**
 * A join: its type, always written (`LEFT_OUTER` included), and its key
 * columns paired by position, kept exactly as they are, even when they are
 * empty or don't pair up (validation reports that).
 */
export const JOIN_CODEC: NodeSpecCodec<Join> = {
  keys: ['joinType', 'leftColumns', 'rightColumns'],
  encode: (node) => ({
    joinType: node.joinType,
    leftColumns: [...node.leftColumns],
    rightColumns: [...node.rightColumns],
  }),
  decode: (id, json, path, rest) => {
    const joinType = readString(json, 'joinType', path);
    const leftColumns = readStringList(json, 'leftColumns', path);
    const rightColumns = readStringList(json, 'rightColumns', path);
    if (!isJoinType(joinType)) {
      throw new UnreadableContent(`Unknown join type "${joinType}"`);
    }
    return new Join(id, { joinType, leftColumns, rightColumns }, rest);
  },
};

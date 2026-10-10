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
  Extend,
  type ExtendColumn,
  type ExtendTyping,
  UNTYPED,
} from '../../nodes/transforms/Extend.js';
import type { JsonObject } from '../../utils/Json.js';
import type { NodeSpecCodec } from '../NodeSpecCodec.js';
import {
  fail,
  hasOnlyKeys,
  pathTo,
  readArray,
  readItems,
  readObject,
  readString,
  UnreadableContent,
} from '../SpecReader.js';
import { decodeSavedType, encodeSavedType } from './SchemaSnapshotCodec.js';

const COLUMN_KEYS = ['name', 'code', 'lambda'];
const TYPED_KEYS = ['signature', 'types'];

/** The last typing, saved only when the engine typed the columns: a failure is typed again on load */
const encodeTyping = (typing: ExtendTyping): JsonObject | undefined =>
  typing.kind === 'typed'
    ? {
        signature: typing.signature,
        types: typing.types.map(encodeSavedType),
      }
    : undefined;

/** The saved typing, or nothing yet when it doesn't give a type per column, so the editor types it again */
const decodeTyping = (
  json: JsonObject,
  path: string,
  columnCount: number,
): ExtendTyping => {
  if (json.typed === undefined) {
    return UNTYPED;
  }
  const at = pathTo(path, 'typed');
  const typed = readObject(json.typed, at);
  if (!hasOnlyKeys(typed, TYPED_KEYS)) {
    throw new UnreadableContent(
      `An extend's typing has a key this version doesn't know`,
    );
  }
  const signature = readString(typed, 'signature', at);
  const typesPath = pathTo(at, 'types');
  const types = readArray(
    typed.types ?? fail(typesPath, 'is required'),
    typesPath,
  ).map((type, index) => decodeSavedType(type, pathTo(typesPath, index)));
  return types.length === columnCount
    ? { kind: 'typed', signature, types }
    : UNTYPED;
};

/**
 * An extend (PLAN §11.7): its columns, each `{name, code, lambda}`, the
 * lambda left out until the code is checked, and the last typing the engine
 * gave, `typed: {signature, types}`, so a loaded cube has its schema at once;
 * it is typed again on load. Every column is read before one with a key this
 * version doesn't know makes the node an Unknown node.
 */
export const EXTEND_CODEC: NodeSpecCodec<Extend> = {
  keys: ['columns', 'typed'],
  encode: (node) => {
    const typed = encodeTyping(node.typing);
    return {
      columns: node.columns.map(
        ({ name, code, lambda }): JsonObject =>
          lambda === undefined ? { name, code } : { name, code, lambda },
      ),
      ...(typed ? { typed } : {}),
    };
  },
  decode: (id, json, path, rest) => {
    const at = pathTo(path, 'columns');
    const items = readItems(json, 'columns', path);
    const columns = items.map((item, index): ExtendColumn => {
      const itemPath = pathTo(at, index);
      return {
        name: readString(item, 'name', itemPath, true),
        code: readString(item, 'code', itemPath, true),
        lambda:
          item.lambda === undefined
            ? undefined
            : readObject(item.lambda, pathTo(itemPath, 'lambda')),
      };
    });
    if (!items.every((item) => hasOnlyKeys(item, COLUMN_KEYS))) {
      throw new UnreadableContent(
        `An extend's column has a key this version doesn't know`,
      );
    }
    return new Extend(
      id,
      columns,
      decodeTyping(json, path, columns.length),
      rest,
    );
  },
};

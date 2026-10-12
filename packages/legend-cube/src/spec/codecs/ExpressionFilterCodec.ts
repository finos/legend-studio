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
  type ExpressionCheck,
  ExpressionFilter,
  UNCHECKED,
} from '../../nodes/transforms/ExpressionFilter.js';
import type { JsonObject } from '../../utils/Json.js';
import type { NodeSpecCodec } from '../NodeSpecCodec.js';
import {
  hasOnlyKeys,
  pathTo,
  readObject,
  readString,
  UnreadableContent,
} from '../SpecReader.js';

const CHECKED_KEYS = ['signature'];

/** The last check, saved only when the engine checked the condition: a failure is checked again on load */
const encodeCheck = (check: ExpressionCheck): JsonObject | undefined =>
  check.kind === 'checked' ? { signature: check.signature } : undefined;

const decodeCheck = (json: JsonObject, path: string): ExpressionCheck => {
  if (json.checked === undefined) {
    return UNCHECKED;
  }
  const at = pathTo(path, 'checked');
  const checked = readObject(json.checked, at);
  if (!hasOnlyKeys(checked, CHECKED_KEYS)) {
    throw new UnreadableContent(
      `A filter by expression's check has a key this version doesn't know`,
    );
  }
  return { kind: 'checked', signature: readString(checked, 'signature', at) };
};

/**
 * A filter by expression (PLAN §11.11): its condition's text as typed,
 * `code`, the engine's JSON for it, `lambda`, left out until the text is
 * checked, and the last check, `checked: {signature}`, so a loaded cube is
 * valid at once; it is checked again on load.
 */
export const EXPRESSION_FILTER_CODEC: NodeSpecCodec<ExpressionFilter> = {
  keys: ['code', 'lambda', 'checked'],
  encode: (node) => {
    const checked = encodeCheck(node.check);
    return {
      code: node.code,
      ...(node.lambda === undefined ? {} : { lambda: node.lambda }),
      ...(checked ? { checked } : {}),
    };
  },
  decode: (id, json, path, rest) =>
    new ExpressionFilter(
      id,
      readString(json, 'code', path, true),
      json.lambda === undefined
        ? undefined
        : readObject(json.lambda, pathTo(path, 'lambda')),
      decodeCheck(json, path),
      rest,
    ),
};

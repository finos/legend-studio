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
  isPlainObject,
  isString,
  type PlainObject,
} from '@finos/legend-shared';

// Legend AI writes structured content as a fenced JSON block, an "envelope":
// `{ "dataType": "html", "title": "...", "htmlContent": "<table>..." }` for
// every table. These read it.

/**
 * The first complete JSON value at the start of *text*, for a block with
 * trailing prose after its JSON; undefined when it never closes (still
 * streaming).
 */
const leadingJsonValue = (text: string): string | undefined => {
  const trimmed = text.trimStart();
  if (trimmed[0] !== '{' && trimmed[0] !== '[') {
    return undefined;
  }
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
    } else if (char === '{' || char === '[') {
      depth++;
    } else if (char === '}' || char === ']') {
      depth--;
      if (depth === 0) {
        return trimmed.slice(0, i + 1);
      }
    }
  }
  return undefined;
};

/** A fenced block's body as an envelope: only an untagged or `json` block that parses to an object. */
export const parseLegendAIEnvelope = (
  lang: string | undefined,
  body: string,
): PlainObject | undefined => {
  if (lang !== undefined && lang !== '' && lang !== 'json') {
    return undefined;
  }
  const parse = (text: string | undefined): unknown => {
    if (text === undefined) {
      return undefined;
    }
    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  };
  const parsed = parse(body) ?? parse(leadingJsonValue(body));
  return isPlainObject(parsed) ? parsed : undefined;
};

/** An HTML envelope's title and content. */
export const extractLegendAIHtmlBlock = (
  envelope: PlainObject | undefined,
): { title: string | undefined; htmlContent: string } | undefined =>
  envelope?.dataType === 'html' && isString(envelope.htmlContent)
    ? {
        title: isString(envelope.title) ? envelope.title : undefined,
        htmlContent: envelope.htmlContent,
      }
    : undefined;

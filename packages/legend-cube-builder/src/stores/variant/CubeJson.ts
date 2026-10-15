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

// A Variant cell's JSON document (PLAN §11.20), as the engine sends it: its
// compact text. Read here with each number kept as written, so `1` and `1.0`
// stay apart and an id past 2^53 keeps its digits, and each object's keys in
// the order written (a JS object would put keys that look like integers first).

/** A JSON value, numbers kept as written and keys in their order */
export type CubeJsonNode =
  | {
      readonly kind: 'object';
      readonly entries: readonly (readonly [string, CubeJsonNode])[];
    }
  | { readonly kind: 'array'; readonly items: readonly CubeJsonNode[] }
  | { readonly kind: 'number'; readonly text: string }
  | { readonly kind: 'string'; readonly value: string }
  | { readonly kind: 'boolean'; readonly value: boolean }
  | { readonly kind: 'null' };

const WHITESPACE = new Set([' ', '\t', '\n', '\r']);
const NUMBER = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/uy;

/** A JSON document; throws a `SyntaxError` on text that isn't one */
export const parseCubeJson = (text: string): CubeJsonNode => {
  let at = 0;
  const fail = (what: string): never => {
    throw new SyntaxError(`${what} at ${at} in JSON`);
  };
  const skipWhitespace = (): void => {
    while (at < text.length && WHITESPACE.has(text.charAt(at))) {
      at += 1;
    }
  };
  const readString = (): string => {
    const start = at;
    at += 1;
    while (at < text.length && text.charAt(at) !== '"') {
      at += text.charAt(at) === '\\' ? 2 : 1;
    }
    if (at >= text.length) {
      fail('An unterminated string');
    }
    at += 1;
    // a string loses nothing through JSON.parse: only numbers do
    return JSON.parse(text.slice(start, at)) as string;
  };
  const readValue = (): CubeJsonNode => {
    skipWhitespace();
    const char = text.charAt(at);
    if (char === '{') {
      at += 1;
      const entries: (readonly [string, CubeJsonNode])[] = [];
      skipWhitespace();
      if (text.charAt(at) === '}') {
        at += 1;
        return { kind: 'object', entries };
      }
      for (;;) {
        skipWhitespace();
        if (text.charAt(at) !== '"') {
          fail('A key expected');
        }
        const key = readString();
        skipWhitespace();
        if (text.charAt(at) !== ':') {
          fail('":" expected');
        }
        at += 1;
        entries.push([key, readValue()]);
        skipWhitespace();
        if (text.charAt(at) === ',') {
          at += 1;
        } else if (text.charAt(at) === '}') {
          at += 1;
          return { kind: 'object', entries };
        } else {
          fail('"," or "}" expected');
        }
      }
    }
    if (char === '[') {
      at += 1;
      const items: CubeJsonNode[] = [];
      skipWhitespace();
      if (text.charAt(at) === ']') {
        at += 1;
        return { kind: 'array', items };
      }
      for (;;) {
        items.push(readValue());
        skipWhitespace();
        if (text.charAt(at) === ',') {
          at += 1;
        } else if (text.charAt(at) === ']') {
          at += 1;
          return { kind: 'array', items };
        } else {
          fail('"," or "]" expected');
        }
      }
    }
    if (char === '"') {
      return { kind: 'string', value: readString() };
    }
    for (const [word, node] of [
      ['true', { kind: 'boolean', value: true }],
      ['false', { kind: 'boolean', value: false }],
      ['null', { kind: 'null' }],
    ] as const) {
      if (text.startsWith(word, at)) {
        at += word.length;
        return node;
      }
    }
    NUMBER.lastIndex = at;
    const number = NUMBER.exec(text);
    if (!number) {
      return fail('A value expected');
    }
    at += number[0].length;
    return { kind: 'number', text: number[0] };
  };
  const value = readValue();
  skipWhitespace();
  if (at < text.length) {
    fail('Text after the value');
  }
  return value;
};

/** The document, or `undefined` for text that isn't JSON */
export const readCubeJson = (text: string): CubeJsonNode | undefined => {
  try {
    return parseCubeJson(text);
  } catch {
    return undefined;
  }
};

/**
 * A key or a string shown bare when it can't be mistaken for anything else:
 * not empty, none of the notation's punctuation or a line break, no space at
 * either end, and not a number, `true`, `false` or `null`; JSON-quoted
 * otherwise
 */
const showText = (text: string): string =>
  text !== '' &&
  !/[,:{}[\]"\n\r\t]/u.test(text) &&
  text === text.trim() &&
  !/^(?:true|false|null|-?\d.*)$/u.test(text)
    ? text
    : JSON.stringify(text);

const showNode = (node: CubeJsonNode): string => {
  switch (node.kind) {
    case 'object':
      return `{${node.entries.map(([key, value]) => `${showText(key)}: ${showNode(value)}`).join(', ')}}`;
    case 'array':
      return `[${node.items.map(showNode).join(', ')}]`;
    case 'string':
      return showText(node.value);
    case 'number':
      return node.text;
    case 'boolean':
      return String(node.value);
    case 'null':
      return 'null';
    default:
      return '';
  }
};

/**
 * A Variant cell on one line, for the eye (PLAN §11.20, as legend-lite's
 * Data Cube shows one): `{name: ann, tier: gold}`, `[a, b]`, numbers as
 * written. Text that isn't JSON is shown as it is; the value itself stays the
 * JSON text, for copying and export.
 */
export const formatCubeJsonLine = (text: string): string => {
  const node = readCubeJson(text);
  return node ? showNode(node) : text;
};

/** The document as JSON, indented two spaces, numbers as written */
export const formatCubeJsonPretty = (node: CubeJsonNode, depth = 0): string => {
  const indent = '  '.repeat(depth + 1);
  const closing = '  '.repeat(depth);
  switch (node.kind) {
    case 'object':
      return node.entries.length === 0
        ? '{}'
        : `{\n${node.entries
            .map(
              ([key, value]) =>
                `${indent}${JSON.stringify(key)}: ${formatCubeJsonPretty(value, depth + 1)}`,
            )
            .join(',\n')}\n${closing}}`;
    case 'array':
      return node.items.length === 0
        ? '[]'
        : `[\n${node.items
            .map((item) => `${indent}${formatCubeJsonPretty(item, depth + 1)}`)
            .join(',\n')}\n${closing}]`;
    case 'string':
      return JSON.stringify(node.value);
    case 'number':
      return node.text;
    case 'boolean':
      return String(node.value);
    case 'null':
      return 'null';
    default:
      return '';
  }
};

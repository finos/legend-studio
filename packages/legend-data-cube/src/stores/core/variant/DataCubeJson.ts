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

export type DataCubeJsonNode =
  | {
      readonly kind: 'object';
      readonly entries: readonly (readonly [string, DataCubeJsonNode])[];
    }
  | { readonly kind: 'array'; readonly items: readonly DataCubeJsonNode[] }
  | { readonly kind: 'number'; readonly text: string }
  | { readonly kind: 'string'; readonly value: string }
  | { readonly kind: 'boolean'; readonly value: boolean }
  | { readonly kind: 'null' };

const WHITESPACE = new Set([' ', '\t', '\n', '\r']);
const NUMBER = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/uy;
const LITERALS: readonly (readonly [string, DataCubeJsonNode])[] = [
  ['true', { kind: 'boolean', value: true }],
  ['false', { kind: 'boolean', value: false }],
  ['null', { kind: 'null' }],
];

export function parseDataCubeJson(text: string): DataCubeJsonNode {
  let at = 0;
  const fail = (what: string): never => {
    throw new SyntaxError(`${what} at position ${at}`);
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
      fail('Unterminated string');
    }
    at += 1;
    return JSON.parse(text.slice(start, at)) as string;
  };
  const readValue = (): DataCubeJsonNode => {
    skipWhitespace();
    const char = text.charAt(at);
    if (char === '{') {
      at += 1;
      const entries: (readonly [string, DataCubeJsonNode])[] = [];
      skipWhitespace();
      if (text.charAt(at) === '}') {
        at += 1;
        return { kind: 'object', entries };
      }
      for (;;) {
        skipWhitespace();
        if (text.charAt(at) !== '"') {
          fail('Expected a key');
        }
        const key = readString();
        skipWhitespace();
        if (text.charAt(at) !== ':') {
          fail(`Expected ':'`);
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
          fail(`Expected ',' or '}'`);
        }
      }
    }
    if (char === '[') {
      at += 1;
      const items: DataCubeJsonNode[] = [];
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
          fail(`Expected ',' or ']'`);
        }
      }
    }
    if (char === '"') {
      return { kind: 'string', value: readString() };
    }
    for (const [word, node] of LITERALS) {
      if (text.startsWith(word, at)) {
        at += word.length;
        return node;
      }
    }
    NUMBER.lastIndex = at;
    const number = NUMBER.exec(text);
    if (!number) {
      return fail('Expected a value');
    }
    at += number[0].length;
    return { kind: 'number', text: number[0] };
  };
  const value = readValue();
  skipWhitespace();
  if (at < text.length) {
    fail('Unexpected text after the value');
  }
  return value;
}

export function readDataCubeJson(text: string): DataCubeJsonNode | undefined {
  try {
    return parseDataCubeJson(text);
  } catch {
    return undefined;
  }
}

export function getDataCubeJsonSyntaxError(text: string): string | undefined {
  try {
    parseDataCubeJson(text);
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

export function isDataCubeJsonDocumentText(text: string): boolean {
  const node = readDataCubeJson(text);
  return node?.kind === 'object' || node?.kind === 'array';
}

const _text = (text: string): string =>
  text !== '' &&
  !/[,:{}[\]"\n\r\t]/u.test(text) &&
  text === text.trim() &&
  !/^(?:true|false|null|-?\d.*)$/u.test(text)
    ? text
    : JSON.stringify(text);

const _line = (node: DataCubeJsonNode): string => {
  switch (node.kind) {
    case 'object':
      return `{${node.entries.map(([key, value]) => `${_text(key)}: ${_line(value)}`).join(', ')}}`;
    case 'array':
      return `[${node.items.map(_line).join(', ')}]`;
    case 'string':
      return _text(node.value);
    case 'number':
      return node.text;
    case 'boolean':
      return String(node.value);
    case 'null':
    default:
      return 'null';
  }
};

export function formatDataCubeJsonLine(text: string): string {
  const node = readDataCubeJson(text);
  return node ? _line(node) : text;
}

export function formatDataCubeJsonPretty(
  node: DataCubeJsonNode,
  depth = 0,
): string {
  const indent = '  '.repeat(depth + 1);
  const closingIndent = '  '.repeat(depth);
  switch (node.kind) {
    case 'object':
      return node.entries.length === 0
        ? '{}'
        : `{\n${node.entries
            .map(
              ([key, value]) =>
                `${indent}${JSON.stringify(key)}: ${formatDataCubeJsonPretty(value, depth + 1)}`,
            )
            .join(',\n')}\n${closingIndent}}`;
    case 'array':
      return node.items.length === 0
        ? '[]'
        : `[\n${node.items
            .map(
              (item) => `${indent}${formatDataCubeJsonPretty(item, depth + 1)}`,
            )
            .join(',\n')}\n${closingIndent}]`;
    case 'string':
      return JSON.stringify(node.value);
    case 'number':
      return node.text;
    case 'boolean':
      return String(node.value);
    case 'null':
    default:
      return 'null';
  }
}

export function formatDataCubeJsonCompact(node: DataCubeJsonNode): string {
  switch (node.kind) {
    case 'object':
      return `{${node.entries.map(([key, value]) => `${JSON.stringify(key)}:${formatDataCubeJsonCompact(value)}`).join(',')}}`;
    case 'array':
      return `[${node.items.map(formatDataCubeJsonCompact).join(',')}]`;
    case 'string':
      return JSON.stringify(node.value);
    case 'number':
      return node.text;
    case 'boolean':
      return String(node.value);
    case 'null':
    default:
      return 'null';
  }
}

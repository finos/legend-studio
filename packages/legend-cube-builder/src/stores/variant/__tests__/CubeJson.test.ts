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

import { describe, expect, test } from '@jest/globals';
import {
  formatCubeJsonLine,
  formatCubeJsonPretty,
  parseCubeJson,
  readCubeJson,
} from '../CubeJson.js';

describe('A Variant cell’s JSON', () => {
  test('Keeps each number as written: 1 and 1.0 apart, and an id past 2^53 whole', () => {
    expect(parseCubeJson('[1, 1.0, 9007199254740993, -2.5e3]')).toEqual({
      kind: 'array',
      items: [
        { kind: 'number', text: '1' },
        { kind: 'number', text: '1.0' },
        { kind: 'number', text: '9007199254740993' },
        { kind: 'number', text: '-2.5e3' },
      ],
    });
  });

  test('Keeps the keys in the order written, those that look like integers too', () => {
    const node = parseCubeJson('{"b": 1, "1": 2, "a": {"z": null, "y": true}}');
    expect(node.kind === 'object' && node.entries.map(([key]) => key)).toEqual([
      'b',
      '1',
      'a',
    ]);
  });

  test('Reads strings with their escapes, and refuses text that is not one document', () => {
    expect(parseCubeJson(' "a\\"b\\u00e9" ')).toEqual({
      kind: 'string',
      value: 'a"bé',
    });
    expect(() => parseCubeJson('{"a": 1,}')).toThrow(SyntaxError);
    expect(() => parseCubeJson('[1] 2')).toThrow(SyntaxError);
    expect(() => parseCubeJson('"open')).toThrow(SyntaxError);
    expect(() => parseCubeJson('01')).toThrow(SyntaxError);
    expect(readCubeJson('not json')).toBeUndefined();
  });

  test('Shows a document on one line: keys and plain strings bare, numbers as written', () => {
    expect(
      formatCubeJsonLine(
        '{"user":{"name":"ann","tier":"gold"},"amount":12.50,"tags":["a","b"],"none":null,"ok":true}',
      ),
    ).toBe(
      '{user: {name: ann, tier: gold}, amount: 12.50, tags: [a, b], none: null, ok: true}',
    );
    expect(formatCubeJsonLine('{"city":"New York","items":[]}')).toBe(
      '{city: New York, items: []}',
    );
  });

  test('Quotes a string that could be taken for something else: empty, a number, a word of JSON, punctuation, or spaces at its ends', () => {
    expect(
      formatCubeJsonLine(
        '["", "12", "true", "null", "a,b", "a:b", "[x]", " lead", "trail ", "line\\nbreak", "-1x"]',
      ),
    ).toBe(
      '["", "12", "true", "null", "a,b", "a:b", "[x]", " lead", "trail ", "line\\nbreak", "-1x"]',
    );
  });

  test('Shows text that is not JSON as it is', () => {
    expect(formatCubeJsonLine('not { json')).toBe('not { json');
  });

  test('Indents a document for copying, numbers as written', () => {
    expect(
      formatCubeJsonPretty(parseCubeJson('{"a":[1,1.0],"b":{},"c":[]}')),
    ).toBe('{\n  "a": [\n    1,\n    1.0\n  ],\n  "b": {},\n  "c": []\n}');
  });
});

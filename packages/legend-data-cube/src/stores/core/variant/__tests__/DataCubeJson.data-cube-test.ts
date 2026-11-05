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

import { unitTest } from '@finos/legend-shared/test';
import { describe, expect, test } from '@jest/globals';
import {
  formatDataCubeJsonCompact,
  formatDataCubeJsonLine,
  formatDataCubeJsonPretty,
  getDataCubeJsonSyntaxError,
  isDataCubeJsonDocumentText,
  parseDataCubeJson,
  readDataCubeJson,
} from '../DataCubeJson.js';

describe(unitTest(`Variant: reading a JSON document`), () => {
  test(`keeps each number as written: 1 and 1.0 apart, and an ID beyond 2^53 whole`, () => {
    expect(parseDataCubeJson('[1, 1.0, 9007199254740993, -2.5e3]')).toEqual({
      kind: 'array',
      items: [
        { kind: 'number', text: '1' },
        { kind: 'number', text: '1.0' },
        { kind: 'number', text: '9007199254740993' },
        { kind: 'number', text: '-2.5e3' },
      ],
    });
  });

  test(`keeps the keys in the order written, including those which look like integers`, () => {
    const node = parseDataCubeJson(
      '{"b": 1, "1": 2, "a": {"z": null, "y": true}}',
    );
    expect(node.kind === 'object' && node.entries.map(([key]) => key)).toEqual([
      'b',
      '1',
      'a',
    ]);
  });

  test(`reads strings with their escapes, and refuses text which is not one document`, () => {
    expect(parseDataCubeJson(' "a\\"b\\u00e9" ')).toEqual({
      kind: 'string',
      value: 'a"bé',
    });
    expect(() => parseDataCubeJson('{"a": 1,}')).toThrow(SyntaxError);
    expect(() => parseDataCubeJson('[1] 2')).toThrow(SyntaxError);
    expect(() => parseDataCubeJson('"open')).toThrow(SyntaxError);
    expect(() => parseDataCubeJson('01')).toThrow(SyntaxError);
    expect(readDataCubeJson('not json')).toBeUndefined();
    expect(getDataCubeJsonSyntaxError('{"a": 1}')).toBeUndefined();
    expect(getDataCubeJsonSyntaxError('{"a": 1')).toBe(
      `Expected ',' or '}' at position 7`,
    );
  });

  test(`recognizes text holding a JSON object or array`, () => {
    expect(isDataCubeJsonDocumentText('{"a":1}')).toBe(true);
    expect(isDataCubeJsonDocumentText('[1, 2]')).toBe(true);
    expect(isDataCubeJsonDocumentText('"text"')).toBe(false);
    expect(isDataCubeJsonDocumentText('12')).toBe(false);
    expect(isDataCubeJsonDocumentText('{not json}')).toBe(false);
  });
});

describe(unitTest(`Variant: formatting a JSON document`), () => {
  test(`shows a document on one line: keys and plain strings bare, numbers as written`, () => {
    expect(
      formatDataCubeJsonLine(
        '{"user":{"name":"ann","tier":"gold"},"amount":12.50,"tags":["a","b"],"none":null,"ok":true}',
      ),
    ).toBe(
      '{user: {name: ann, tier: gold}, amount: 12.50, tags: [a, b], none: null, ok: true}',
    );
    expect(
      formatDataCubeJsonLine('{"kind":"billing","city":"New York","items":[]}'),
    ).toBe('{kind: billing, city: New York, items: []}');
  });

  test(`quotes a string which could be taken for something else: empty, a number, a JSON keyword, punctuation, or spaces at its ends`, () => {
    expect(
      formatDataCubeJsonLine(
        '["", "12", "true", "null", "a,b", "a:b", "[x]", " lead", "trail ", "line\\nbreak", "-1x"]',
      ),
    ).toBe(
      '["", "12", "true", "null", "a,b", "a:b", "[x]", " lead", "trail ", "line\\nbreak", "-1x"]',
    );
    expect(formatDataCubeJsonLine('{"at":"2025-12-18T08:00:00"}')).toBe(
      '{at: "2025-12-18T08:00:00"}',
    );
  });

  test(`shows text which is not JSON as is`, () => {
    expect(formatDataCubeJsonLine('not { json')).toBe('not { json');
  });

  test(`indents a document by two spaces, numbers as written`, () => {
    expect(
      formatDataCubeJsonPretty(
        parseDataCubeJson('{"a":[1,1.0],"b":{},"c":[]}'),
      ),
    ).toBe('{\n  "a": [\n    1,\n    1.0\n  ],\n  "b": {},\n  "c": []\n}');
  });

  test(`compacts a document without losing anything`, () => {
    expect(
      formatDataCubeJsonCompact(
        parseDataCubeJson(
          ' { "a" : [ 1.0 , 9007199254740993 ], "b c" : "x\\"y" , "d": null } ',
        ),
      ),
    ).toBe('{"a":[1.0,9007199254740993],"b c":"x\\"y","d":null}');
  });
});

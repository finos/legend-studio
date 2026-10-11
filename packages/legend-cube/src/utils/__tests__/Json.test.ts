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
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import {
  copyJson,
  EMPTY_JSON_OBJECT,
  hashText,
  isJsonObject,
  type JsonObject,
  type JsonValue,
  pickUnknownKeys,
  stableJsonText,
} from '../Json.js';

/** Whether the value and everything in it is frozen */
const isDeepFrozen = (value: unknown): boolean =>
  typeof value !== 'object' ||
  value === null ||
  (Object.isFrozen(value) && Object.values(value).every(isDeepFrozen));

const hasOwnKey = (value: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

describe(unitTest('JSON objects'), () => {
  test('Are objects that are neither null nor lists', () => {
    [
      {},
      { a: 1 },
      { a: { b: [] } },
      Object.freeze({}),
      EMPTY_JSON_OBJECT,
    ].forEach((value) => expect(isJsonObject(value)).toBe(true));
    [null, undefined, [], [{}], 'x', '', 0, 1, true, false].forEach((value) =>
      expect(isJsonObject(value)).toBe(false),
    );
  });

  test('The shared empty object is empty and frozen', () => {
    expect(EMPTY_JSON_OBJECT).toEqual({});
    expect(Object.keys(EMPTY_JSON_OBJECT)).toEqual([]);
    expect(Object.isFrozen(EMPTY_JSON_OBJECT)).toBe(true);
    expect(() => {
      (EMPTY_JSON_OBJECT as Record<string, JsonValue>).a = 1;
    }).toThrow(TypeError);
    expect(EMPTY_JSON_OBJECT).toEqual({});
  });
});

describe(unitTest('Copying JSON'), () => {
  const saved = (): {
    kind: string;
    rows: { name: string; width: number | null }[];
    options: { nested: { flag: boolean } };
  } => ({
    kind: 'pivot',
    rows: [
      { name: 'SHIP_COUNTRY', width: 120 },
      { name: 'FREIGHT', width: null },
    ],
    options: { nested: { flag: true } },
  });

  test('Gives a deep copy, equal to the value and sharing nothing with it', () => {
    const value = saved();
    const copy = copyJson(value);
    expect(copy).toEqual(saved());
    expect(copy).not.toBe(value);
    expect(copy.rows).not.toBe(value.rows);
    expect(copy.rows[0]).not.toBe(value.rows[0]);
    expect(copy.options.nested).not.toBe(value.options.nested);
    // later changes to the value don't reach the copy
    value.kind = 'other';
    value.rows.push({ name: 'ORDER_ID', width: 1 });
    (value.rows[0] as { width: number | null }).width = 0;
    value.options.nested.flag = false;
    expect(copy).toEqual(saved());
  });

  test('Freezes the copy at every depth, never the value', () => {
    const value = saved();
    const copy = copyJson(value);
    expect(isDeepFrozen(copy)).toBe(true);
    expect(() => {
      copy.kind = 'other';
    }).toThrow(TypeError);
    expect(() => copy.rows.push({ name: 'ORDER_ID', width: 1 })).toThrow(
      TypeError,
    );
    expect(() => {
      (copy.rows[0] as { width: number | null }).width = 0;
    }).toThrow(TypeError);
    expect(() => {
      copy.options.nested.flag = false;
    }).toThrow(TypeError);
    expect(() => {
      delete (copy as Partial<typeof copy>).options;
    }).toThrow(TypeError);
    expect(copy).toEqual(saved());
    // the value stays as it was: not frozen
    expect(Object.isFrozen(value)).toBe(false);
    expect(Object.isFrozen(value.rows)).toBe(false);
    expect(Object.isFrozen(value.options.nested)).toBe(false);
  });

  test('Keeps nulls, key order and values exactly', () => {
    const value: JsonObject = {
      z: null,
      a: [null, 0, -1.5, '', false],
      m: { big: '9007199254740993', text: ' padded ' },
    };
    const copy = copyJson(value);
    expect(copy).toEqual(value);
    expect(Object.keys(copy)).toEqual(['z', 'a', 'm']);
    expect(JSON.stringify(copy)).toBe(JSON.stringify(value));
  });

  test('Gives values that are not objects back as they are', () => {
    const values: JsonValue[] = ['x', '', 0, 1.5, true, false, null];
    values.forEach((value) => expect(copyJson(value)).toBe(value));
    const list = copyJson([1, [2, { a: 3 }]]);
    expect(list).toEqual([1, [2, { a: 3 }]]);
    expect(isDeepFrozen(list)).toBe(true);
  });

  test('Keeps a key named "__proto__" as a key', () => {
    // as JSON.parse reads it: an own key, not the prototype
    const value: JsonObject = { kind: 'x', ['__proto__']: { a: 1 }, z: 2 };
    expect(hasOwnKey(value, '__proto__')).toBe(true);
    const copy = copyJson(value);
    expect(hasOwnKey(copy, '__proto__')).toBe(true);
    expect(JSON.stringify(copy)).toBe('{"kind":"x","__proto__":{"a":1},"z":2}');
  });
});

describe(unitTest('Picking unknown keys'), () => {
  test('Keeps the keys that are not known, in their order', () => {
    const json: JsonObject = {
      kind: 'filter',
      zeta: 1,
      id: 'filter101',
      alpha: [null, { b: 2 }],
      filter: { op: 'and', rules: [] },
      mid: null,
    };
    const rest = pickUnknownKeys(json, ['kind', 'id', 'inputs', 'filter']);
    expect(rest).toEqual({ zeta: 1, alpha: [null, { b: 2 }], mid: null });
    expect(Object.keys(rest)).toEqual(['zeta', 'alpha', 'mid']);
    // the order of the known keys does not matter
    expect(
      Object.keys(pickUnknownKeys(json, ['filter', 'inputs', 'id', 'kind'])),
    ).toEqual(['zeta', 'alpha', 'mid']);
    // with no known keys, every key is unknown
    expect(pickUnknownKeys(json, [])).toEqual(json);
    expect(Object.keys(pickUnknownKeys(json, []))).toEqual(Object.keys(json));
  });

  test('Gives the shared empty object when no key is left', () => {
    expect(pickUnknownKeys({}, [])).toBe(EMPTY_JSON_OBJECT);
    expect(pickUnknownKeys({}, ['kind'])).toBe(EMPTY_JSON_OBJECT);
    expect(
      pickUnknownKeys({ kind: 'join', id: 'join101' }, ['kind', 'id']),
    ).toBe(EMPTY_JSON_OBJECT);
    // a known key set to null is still known
    expect(pickUnknownKeys({ kind: null }, ['kind'])).toBe(EMPTY_JSON_OBJECT);
  });

  test('Gives a frozen copy, and leaves the object as it was', () => {
    const json = {
      kind: 'relational',
      layout: { x: 1, tags: ['a'] },
    };
    const rest = pickUnknownKeys(json, ['kind']) as {
      layout: { x: number; tags: string[] };
    };
    expect(rest).toEqual({ layout: { x: 1, tags: ['a'] } });
    expect(rest.layout).not.toBe(json.layout);
    expect(isDeepFrozen(rest)).toBe(true);
    expect(() => {
      rest.layout.x = 2;
    }).toThrow(TypeError);
    expect(() => rest.layout.tags.push('b')).toThrow(TypeError);
    // later changes to the object don't reach the copy
    json.layout.x = 3;
    json.layout.tags.push('c');
    expect(rest).toEqual({ layout: { x: 1, tags: ['a'] } });
    expect(json).toEqual({
      kind: 'relational',
      layout: { x: 3, tags: ['a', 'c'] },
    });
    expect(Object.isFrozen(json)).toBe(false);
    expect(Object.isFrozen(json.layout)).toBe(false);
  });

  // a saved key named "__proto__" (an own key once parsed) is kept as a key,
  // never set as the prototype (PLAN §10.3, Settled in M1.6)
  test('Keeps an unknown key named "__proto__"', () => {
    const json: JsonObject = { kind: 'x', ['__proto__']: { a: 1 }, z: 2 };
    const rest = pickUnknownKeys(json, ['kind']);
    expect(hasOwnKey(rest, '__proto__')).toBe(true);
    expect(JSON.stringify(rest)).toBe('{"__proto__":{"a":1},"z":2}');
  });
});
describe(unitTest('Stable JSON text and digests'), () => {
  test("Writes every object's keys sorted, at every depth, arrays in their order", () => {
    expect(stableJsonText({ b: 1, a: [{ d: 2, c: 3 }, 'x'] })).toBe(
      '{"a":[{"c":3,"d":2},"x"],"b":1}',
    );
    expect(stableJsonText({ a: 1, b: 2 })).toBe(stableJsonText({ b: 2, a: 1 }));
  });

  test('Digests a text the same way every time, and two texts differently', () => {
    // pinned, so a change to the digest, which saved specs hold, shows
    expect(hashText('')).toBe('bdcb81aee8d83');
    expect(hashText('abc')).toBe('11f9f91ac18c8d');
    expect(hashText('abc')).toBe(hashText('abc'));
    expect(hashText('abc')).not.toBe(hashText('abd'));
    expect(hashText('abc')).toMatch(/^[0-9a-f]{13,14}$/u);
  });
});

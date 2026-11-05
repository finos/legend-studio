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
  TEST__functionCatalogue,
  TEST__h2Results,
} from '../../../__test-utils__/CubeFunctionCatalogueTestUtils.js';
import {
  followsCubeValue,
  getCubeDatabaseLabel,
  getCubeFunctionCallText,
  getCubeFunctionDocumentation,
  getCubeFunctionTestLine,
} from '../CubeFunctionHelp.js';

const TESTED = new Set(['H2', 'DuckDB']);

describe("How the engine's tests of a function went on the cube's database", () => {
  test('Says how many pass, the failing ones listed, a failure not a verdict', () => {
    expect(
      getCubeFunctionTestLine(TEST__h2Results(2, 2), {
        databaseType: 'H2',
        testedDatabases: TESTED,
      }),
    ).toBe("**On H2:** the engine's tests of it pass 2 of 2.");
    const failures = Array.from({ length: 5 }, (_, index) => ({
      test: `test${index}`,
      message: index === 0 ? 'Not *supported* `here`' : '',
    }));
    expect(
      getCubeFunctionTestLine(TEST__h2Results(0, 5, failures), {
        databaseType: 'H2',
        testedDatabases: TESTED,
      }),
    ).toBe(
      [
        "**On H2:** the engine's tests of it pass 0 of 5. A test that fails doesn't mean it can't run there.",
        '- `test0`: Not supported here\n- `test1`\n- `test2`\n- and 2 more',
      ].join('\n\n'),
    );
  });

  test("Says when the engine has no tests of it there, or none on that database at all, and nothing when the database isn't known", () => {
    expect(
      getCubeFunctionTestLine(TEST__h2Results(1, 1), {
        databaseType: 'DuckDB',
        testedDatabases: TESTED,
      }),
    ).toBe('**On DuckDB:** the engine has no tests of it.');
    // a local engine has none on Snowflake: cloud builds alone run them
    expect(
      getCubeFunctionTestLine(TEST__h2Results(1, 1), {
        databaseType: 'Snowflake',
        testedDatabases: TESTED,
      }),
    ).toBe(
      "**On Snowflake:** this engine's catalogue has no tests on Snowflake.",
    );
    expect(
      getCubeFunctionTestLine(TEST__h2Results(1, 1), {
        testedDatabases: TESTED,
      }),
    ).toBeUndefined();
    expect(getCubeDatabaseLabel('MemSQL')).toBe('SingleStore');
    expect(getCubeDatabaseLabel('DuckDB')).toBe('DuckDB');
  });

  test('Writes the line once a definition, after its last signature', () => {
    const lpad = TEST__functionCatalogue().get('lpad')?.signatures ?? [];
    const documentation = getCubeFunctionDocumentation(lpad, {
      databaseType: 'H2',
      testedDatabases: TESTED,
    });
    // the two signatures share their definition's tests
    expect(documentation.match(/\*\*On H2:\*\*/gu)).toHaveLength(1);
    expect(documentation.indexOf('**On H2:**')).toBeGreaterThan(
      documentation.indexOf('As `lpad`, padding with a space.'),
    );
    expect(documentation).toContain('- `testLpadEmptyChar`: Padding string');
    // without the database: as before
    expect(getCubeFunctionDocumentation(lpad)).not.toContain('**On');
  });
});

describe('A call written from the functions panel', () => {
  test('Follows a value with ->, its first argument the value; else written whole, a space before it after code', () => {
    ['A', '1', ')', ']', "'"].forEach((before) =>
      expect([before, followsCubeValue(before)]).toEqual([before, true]),
    );
    ['', ' ', '(', '=', ',', '!'].forEach((before) =>
      expect([before, followsCubeValue(before)]).toEqual([before, false]),
    );
    const lpad = TEST__functionCatalogue().get('lpad')?.signatures ?? [];
    expect(getCubeFunctionCallText(lpad, 'Y')).toBe('->lpad(${1:length})');
    // names from the other signature, the shortest's unnamed
    expect(getCubeFunctionCallText(lpad, ' ')).toBe(
      'lpad(${1:str}, ${2:length})',
    );
    expect(getCubeFunctionCallText(lpad, '=')).toBe(
      ' lpad(${1:str}, ${2:length})',
    );
    expect(getCubeFunctionCallText(lpad, 'Y', true)).toBe('->lpad(length)');
    const contains =
      TEST__functionCatalogue().get('contains')?.signatures ?? [];
    expect(getCubeFunctionCallText(contains, 'Y')).toBe(
      "->contains('${1:val}')",
    );
  });
});

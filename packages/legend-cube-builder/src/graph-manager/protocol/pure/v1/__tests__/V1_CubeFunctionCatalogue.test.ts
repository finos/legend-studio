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

import { describe, expect, jest, test } from '@jest/globals';
import { TypeFamily } from '@finos/legend-cube';
import {
  NetworkClientError,
  type PlainObject,
  TracerService,
} from '@finos/legend-shared';
import { V1_buildCubeFunctionCatalogue } from '../V1_CubeFunctionCatalogue.js';
import { V1_LegendCubeEngine } from '../V1_LegendCubeEngine.js';
import PCT_DOCUMENTATION from './V1_CubePCTDocumentation.json' with { type: 'json' };

// a part of the engine's PCT documentation (`/api/pct/pct-docs.json`), its
// documentation cut before the examples
const catalogue = (): ReturnType<typeof V1_buildCubeFunctionCatalogue> =>
  V1_buildCubeFunctionCatalogue(PCT_DOCUMENTATION as PlainObject);

describe("The engine's PCT documentation, read as a catalogue of functions", () => {
  test('Groups a function by name across its packages, each signature with its documentation', () => {
    const contains = catalogue().get('contains');
    expect(contains?.packages).toEqual([
      'meta::pure::functions::string',
      'meta::pure::functions::collection',
    ]);
    expect(contains?.signatures.map((each) => each.text)).toEqual([
      'contains(source: String[1], val: String[1]): Boolean[1]',
      'contains(collection: Any[*], value: Any[1]): Boolean[1]',
      // its documentation names no parameter
      'contains(Z[*], Z[1], Function<{Z[1], Z[1]->Boolean[1]}>[1]): Boolean[1]',
    ]);
    const [text] = contains?.signatures ?? [];
    expect(text?.documentation).toMatch(
      /^Whether `source` contains `val` anywhere within it\./u,
    );
    expect(text?.parameters.map((each) => each.description)).toEqual([
      'the string to search in.',
      'the substring to look for.',
    ]);
    expect(text?.id).toMatch(/^meta::pure::functions::string::contains_/u);
  });

  test("Marks an operator's function and the platform's own", () => {
    expect(
      catalogue()
        .get('plus')
        ?.signatures.some((each) => each.isOperator),
    ).toBe(true);
    expect(
      catalogue()
        .get('toString')
        ?.signatures.map((each) => each.isPlatformOnly),
    ).toEqual([false, true, true]);
  });

  test('Offers a text value the functions of text and of any value, by their first parameter', () => {
    expect(
      catalogue()
        .offersFor(TypeFamily.STRING)
        .map((offer) => offer.function.name)
        .sort(),
    ).toEqual([
      'between',
      'coalesce',
      'contains',
      'in',
      'isEmpty',
      'isNotEmpty',
      'length',
      'startsWith',
      'toOne',
      'toString',
      'toUpper',
    ]);
    expect(
      catalogue()
        .offersFor(TypeFamily.VARIANT)
        .map((offer) => offer.function.name)
        .sort(),
    ).toEqual([
      'coalesce',
      'get',
      'in',
      'isEmpty',
      'isNotEmpty',
      'to',
      'toOne',
      'toString',
    ]);
  });
});

describe('Legend Cube engine: the function catalogue', () => {
  const newEngine = (): V1_LegendCubeEngine =>
    new V1_LegendCubeEngine(
      { baseUrl: 'http://localhost:6300/api' },
      new TracerService(),
    );

  const failure = (status: number, message?: string): NetworkClientError =>
    new NetworkClientError(
      { status, statusText: 'Error', url: 'http://engine' } as Response,
      (message !== undefined
        ? { code: -1, message, status: 'error' }
        : undefined) as NetworkClientError['payload'],
    );

  test("Reads the engine's PCT documentation once", async () => {
    const engine = newEngine();
    const get = jest
      .spyOn(engine.client, 'get')
      .mockResolvedValue(PCT_DOCUMENTATION as never);
    const read = await engine.getFunctionCatalogue();
    expect(read?.get('toUpper')?.signatures[0]?.text).toBe(
      'toUpper(source: String[1]): String[1]',
    );
    expect(await engine.getFunctionCatalogue()).toBe(read);
    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0]?.[0]).toBe(
      'http://localhost:6300/api/pct/pct-docs.json',
    );
  });

  test('Has none of an engine without it, and asks it no more', async () => {
    const engine = newEngine();
    const get = jest
      .spyOn(engine.client, 'get')
      .mockRejectedValue(failure(404));
    expect(await engine.getFunctionCatalogue()).toBeUndefined();
    expect(await engine.getFunctionCatalogue()).toBeUndefined();
    expect(get).toHaveBeenCalledTimes(1);
    // nor of one whose server says so as an error of its own
    const wrapped = newEngine();
    const wrappedGet = jest
      .spyOn(wrapped.client, 'get')
      .mockRejectedValue(failure(500, 'NotFoundException: HTTP 404 Not Found'));
    expect(await wrapped.getFunctionCatalogue()).toBeUndefined();
    expect(await wrapped.getFunctionCatalogue()).toBeUndefined();
    expect(wrappedGet).toHaveBeenCalledTimes(1);
  });

  test('Has none while the engine fails otherwise, and asks again next time', async () => {
    const engine = newEngine();
    const get = jest
      .spyOn(engine.client, 'get')
      .mockRejectedValueOnce(failure(503, 'Service Unavailable'))
      .mockResolvedValue(PCT_DOCUMENTATION as never);
    expect(await engine.getFunctionCatalogue()).toBeUndefined();
    expect(
      (await engine.getFunctionCatalogue())?.get('contains'),
    ).toBeDefined();
    expect(get).toHaveBeenCalledTimes(2);
  });
});

describe("Each definition's tests on the relational databases (EXPRESSION-EDITOR.md, round 2b)", () => {
  test('Reads them by definition: the text contains passes on DuckDB, the collection one fails', () => {
    const [text, collection] = catalogue().get('contains')?.signatures ?? [];
    expect(text?.testResults?.get('DuckDB')).toEqual({
      database: 'DuckDB',
      passed: 2,
      total: 2,
      failures: [],
    });
    const failing = collection?.testResults?.get('DuckDB');
    expect([failing?.passed, failing?.total]).toEqual([0, 3]);
    expect(failing?.failures.map((each) => each.test)).toEqual([
      'testContainsNonPrimitive',
      'testContainsPrimitive',
      'testContainsWithFunction',
    ]);
    // a message's first line, cut short
    expect(failing?.failures[1]?.message).toBe(
      'java.sql.SQLException: Conversion Error: Unimplemented type for cast (INTEGER -> DATE)',
    );
    expect(
      (failing?.failures[2]?.message.length ?? 0) <= 200 &&
        failing?.failures[2]?.message.endsWith('…'),
    ).toBe(true);
    // year fails its one test everywhere, and runs: information, not a verdict
    expect(
      catalogue().get('year')?.signatures[0]?.testResults?.get('H2')?.failures,
    ).toEqual([{ test: 'testYear', message: expect.any(String) }]);
  });

  test("Keeps the relational databases' alone, one object shared by a definition's signatures", () => {
    const signatures = catalogue().get('coalesce')?.signatures ?? [];
    expect([...(signatures[0]?.testResults?.keys() ?? [])]).toEqual([
      'H2',
      'DuckDB',
      'Postgres',
      'MemSQL',
    ]);
    expect(
      signatures.every(
        (each) => each.testResults === signatures[0]?.testResults,
      ),
    ).toBe(true);
    expect(catalogue().testedDatabases).toEqual(
      new Set(['H2', 'DuckDB', 'Postgres', 'MemSQL']),
    );
    // a definition the documentation reports no tests of
    expect(
      catalogue().get('length')?.signatures[0]?.testResults,
    ).toBeUndefined();
  });
});

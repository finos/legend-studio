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
import { readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { describeDocument } from '../../__test-utils__/CubeSpecTestUtils.js';
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import { buildSchemasAndValidity } from '../../inference/SchemaInference.js';
import {
  createNodeRegistry,
  FILTER_DEFINITION,
  JOIN_DEFINITION,
  NodeRegistry,
  RELATIONAL_TABLE_SOURCE_DEFINITION,
} from '../../nodes/NodeRegistry.js';
import type { JsonObject } from '../../utils/Json.js';
import {
  decodeCubeSpec,
  encodeCubeSpec,
  MAX_SPEC_BYTES,
  parseCubeSpec,
  serializeCubeSpec,
} from '../CubeSpecCodec.js';
import { CubeSpecDecodeError } from '../SpecReader.js';

// Cubes on a direct database connection (PLAN §6.8): the connection is saved
// once, as the model, and the core keeps it whole without reading it; its
// tables are ordinary relational sources of the one Database the engine's
// implementation builds. The samples sit in their own folder, which the
// corpus tests (all Northwind) don't read. Their snapshots hold the types the
// engine gives today, defects included (DuckDB's DECIMAL(10,2) as
// Numeric(0,0) and VARCHAR(5) as Varchar(0)), but the sample the engine tests
// run, the H2 one, has none: those tests would fail once the engine is fixed

const FIXTURES = resolve(__dirname, 'fixtures', 'direct');
const FILES = readdirSync(FIXTURES)
  .filter((file) => file.endsWith('.cube.json'))
  .sort();

const textOf = (file: string): string =>
  readFileSync(join(FIXTURES, file), 'utf-8');
const read = (file: string): JsonObject => JSON.parse(textOf(file));

/** The node kinds of 0.0.2, the first release: a direct cube needs no newer one */
const RELEASE_0_0_2_REGISTRY = new NodeRegistry([
  RELATIONAL_TABLE_SOURCE_DEFINITION,
  FILTER_DEFINITION,
  JOIN_DEFINITION,
]);

describe(unitTest('Saved specs of direct-connection cubes'), () => {
  test('Has every sample', () => {
    expect(FILES).toEqual([
      'duckdb-kept-keys.cube.json',
      'h2-orders-by-country.cube.json',
    ]);
  });

  test.each(FILES)(
    'Re-saves %s exactly, with the node kinds of today and of 0.0.2',
    (file) => {
      const json = read(file);
      [createNodeRegistry(), RELEASE_0_0_2_REGISTRY].forEach((registry) => {
        const { document } = decodeCubeSpec(json, { registry });
        expect(JSON.stringify(encodeCubeSpec(document, registry))).toBe(
          JSON.stringify(json),
        );
      });
    },
  );

  test.each(FILES)(
    'Reads %s offline, its model kept whole and its sources valid',
    (file) => {
      const json = read(file);
      const { document, formatVersion, readOnly } = parseCubeSpec(textOf(file));
      expect(formatVersion).toBe(1);
      expect(readOnly).toBe(false);
      expect(document.context?.model).toEqual(
        (json.context as JsonObject).model,
      );
      expect(document.context?.runtime).toBe('cube::direct::Runtime');
      const { validity } = buildSchemasAndValidity(
        document.query,
        createNodeRegistry().queryRules,
      );
      expect(
        document.query.nodes.filter((node) => validity.get(node.id)?.length),
      ).toEqual([]);
      // and the text form, as exported and imported
      expect(
        describeDocument(parseCubeSpec(serializeCubeSpec(document)).document),
      ).toEqual(describeDocument(document));
    },
  );

  test("Keeps the connection's keys it doesn't know, in order, without touching any prototype", () => {
    const { document } = parseCubeSpec(textOf('duckdb-kept-keys.cube.json'));
    const connection = document.context?.model.connection as JsonObject;
    expect(Object.keys(connection)).toEqual([
      '_type',
      'type',
      'databaseType',
      'datasourceSpecification',
      'authenticationStrategy',
      'laterSetting',
      '__proto__',
    ]);
    expect(Object.hasOwn(connection, '__proto__')).toBe(true);
    expect(Object.getPrototypeOf(connection)).toBe(Object.prototype);
    expect(({} as JsonObject).polluted).toBeUndefined();
    expect(document.context?.model.laterModelKey).toBe('kept');
  });

  test('Counts the connection, setup SQL included, toward the size cap', () => {
    const json = read('h2-orders-by-country.cube.json');
    const model = (json.context as JsonObject).model as JsonObject;
    const connection = model.connection as JsonObject;
    const large = {
      ...json,
      context: {
        ...(json.context as JsonObject),
        model: {
          ...model,
          connection: {
            ...connection,
            datasourceSpecification: {
              ...(connection.datasourceSpecification as JsonObject),
              testDataSetupSqls: [`-- ${'x'.repeat(MAX_SPEC_BYTES)}`],
            },
          },
        },
      },
    };
    const { document } = decodeCubeSpec(large);
    expect(() => serializeCubeSpec(document)).toThrow(
      'The cube is too large to save: its spec is over 1048576 bytes',
    );
    let error: unknown;
    try {
      parseCubeSpec(JSON.stringify(large));
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(CubeSpecDecodeError);
    expect((error as CubeSpecDecodeError).message).toBe(
      'is over 1048576 bytes',
    );
  });
});

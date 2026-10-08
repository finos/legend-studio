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

import { beforeEach, describe, expect, test } from '@jest/globals';
import {
  decodeCubeSpec,
  RelationalTableSource,
  Schema,
} from '@finos/legend-cube';
import { readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { CUBE_ENGINE_TEST__compile } from '../__test-utils__/CubeEngineTestSupport.js';
import { getRuntimesForDatabase } from '../graph-manager/CubeModelOutlineHelper.js';
import { V1_createEngineBackedCubeEngine } from '../graph-manager/protocol/pure/v1/__test-utils__/V1_CubeEngineTestUtils.js';
import type { V1_LegendCubeEngine } from '../graph-manager/protocol/pure/v1/V1_LegendCubeEngine.js';
import {
  CUBE_NORTHWIND_MODEL,
  CUBE_NORTHWIND_RUNTIME,
} from '../stores/fixtures/CubeNorthwindModel.js';

// The core's sample specs (PLAN §10.3) are real cubes: their model is the
// Cube Northwind fixture, it compiles, and each saved schema is what the
// engine gives the table now (PLAN §6.2.4)

const FIXTURES = resolve(
  __dirname,
  '../../../legend-cube/src/spec/__tests__/fixtures',
);
const FILES = readdirSync(FIXTURES)
  .filter((file) => file.endsWith('.cube.json'))
  .sort();

const read = (file: string): unknown =>
  JSON.parse(readFileSync(join(FIXTURES, file), 'utf-8'));

let engine: V1_LegendCubeEngine;

beforeEach(() => {
  ({ engine } = V1_createEngineBackedCubeEngine());
});

describe('Saved spec samples, on the engine', () => {
  test('Has the samples', () => {
    expect(FILES.length).toBeGreaterThanOrEqual(9);
  });

  test('Compiles the model the samples hold', async () => {
    expect(
      await CUBE_ENGINE_TEST__compile(CUBE_NORTHWIND_MODEL),
    ).toHaveProperty('message', 'OK');
  });

  test.each(FILES)(
    'Holds in %s the Cube Northwind model, its runtime, and the schemas the engine gives its tables',
    async (file) => {
      const { document } = decodeCubeSpec(read(file));
      if (!document.context) {
        // nothing picked yet
        expect(document.query.nodes).toEqual([]);
        return;
      }
      expect(document.context.model).toEqual(CUBE_NORTHWIND_MODEL);
      expect(document.context.runtime).toBe(CUBE_NORTHWIND_RUNTIME);
      const sources = document.query.nodes.filter(
        (node): node is RelationalTableSource =>
          node instanceof RelationalTableSource,
      );
      const outline = await engine.loadModel(document.context.model);
      sources.forEach((source) => {
        expect(
          getRuntimesForDatabase(outline, source.database).map(
            (runtime) => runtime.path,
          ),
        ).toContain(CUBE_NORTHWIND_RUNTIME);
      });
      const typed = await engine.resolveSchemas(
        document.context.model,
        new Map(
          sources.map((source) => [
            source.id,
            [source.database, source.schema, source.table] as const,
          ]),
        ),
      );
      sources.forEach((source) => {
        const schema = typed.get(source.id);
        expect(schema).toBeInstanceOf(Schema);
        if (source.resolution.kind === 'resolved') {
          // no drift: the saved snapshot is the engine's schema
          expect(source.resolution.schema.isIdenticalTo(schema as Schema)).toBe(
            true,
          );
        }
      });
    },
  );
});

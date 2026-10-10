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
import type { PlainObject } from '@finos/legend-shared';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  CUBE_ENGINE_TEST__compile,
  CUBE_ENGINE_TEST__lambdaRelationTypeBatch,
} from '../__test-utils__/CubeEngineTestSupport.js';
import { V1_buildCubeModelOutline } from '../graph-manager/protocol/pure/v1/V1_CubeModelOutlineBuilder.js';

// The mock depot's sample projects (PLAN §6.3), committed as JSON
// (fixtures/legend-mock-server, scripts/generate-cube-depot.mjs), still
// compile on the engine CI runs, and every table of their own Databases
// types: the pointer tests themselves need the depot, so run by hand
// (CubeDepot.cube-local-test.ts)

interface SampleVersion {
  versionId: string;
  dependencies: { groupId: string; artifactId: string; versionId: string }[];
  entities: { path: string; classifierPath: string; content: PlainObject }[];
}
interface SampleProject {
  groupId: string;
  artifactId: string;
  versions: SampleVersion[];
}

const PROJECTS = JSON.parse(
  readFileSync(
    resolve(
      __dirname,
      '../../../../fixtures/legend-mock-server/data/cube-depot/projects.json',
    ),
    'utf-8',
  ),
) as SampleProject[];

/** Each project version's model, with its dependencies' elements, as the depot serves the engine */
const CASES = PROJECTS.flatMap((project) =>
  project.versions.map((version) => {
    const dependencyElements = version.dependencies.flatMap(
      (dependency) =>
        PROJECTS.find(
          (candidate) =>
            candidate.groupId === dependency.groupId &&
            candidate.artifactId === dependency.artifactId,
        )
          ?.versions.find(
            (candidate) => candidate.versionId === dependency.versionId,
          )
          ?.entities.map((entity) => entity.content) ?? [],
    );
    const own = version.entities.map((entity) => entity.content);
    return {
      name: `${project.artifactId} ${version.versionId}`,
      own: { _type: 'data', elements: own },
      model: { _type: 'data', elements: [...own, ...dependencyElements] },
    };
  }),
);

describe("The mock depot's sample projects, on the engine", () => {
  test('Has the sample projects and versions', () => {
    expect(CASES.map((each) => each.name)).toEqual([
      'cube-reference 1.0.0',
      'cube-sales 1.0.0',
      'cube-sales 1.9.0',
      'cube-sales 1.10.0',
      'cube-sales master-SNAPSHOT',
    ]);
  });

  test.each(CASES.map((each) => [each.name, each] as const))(
    'Compiles %s and types every table of its own Databases',
    async (_name, { own, model }) => {
      expect(await CUBE_ENGINE_TEST__compile(model)).toHaveProperty(
        'message',
        'OK',
      );
      const tables = V1_buildCubeModelOutline(own).databases.flatMap(
        (database) =>
          database.schemas.flatMap((schema) =>
            schema.tables.map((table) => [
              database.path,
              schema.name,
              table.name,
            ]),
          ),
      );
      expect(tables.length).toBeGreaterThan(0);
      const response = await CUBE_ENGINE_TEST__lambdaRelationTypeBatch({
        model,
        lambdas: Object.fromEntries(
          tables.map((path, index) => [
            String(index),
            {
              _type: 'lambda',
              parameters: [],
              body: [{ _type: 'classInstance', type: '>', value: { path } }],
            },
          ]),
        ),
      });
      expect(response.errors ?? {}).toEqual({});
      expect(Object.keys((response.result ?? {}) as PlainObject)).toHaveLength(
        tables.length,
      );
    },
  );
});

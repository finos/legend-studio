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
import type { DepotServerClient } from '@finos/legend-server-depot';
import type { PlainObject } from '@finos/legend-shared';
import {
  V1_compareCubeProjectVersionsNewestFirst,
  V1_LegendCubeProjectCatalog,
} from '../V1_LegendCubeProjectCatalog.js';

// The project catalog over a depot whose calls are mocked (PLAN §6.3)

const database = (path: string, table: string): PlainObject => {
  const index = path.lastIndexOf('::');
  return {
    _type: 'relational',
    package: path.slice(0, index),
    name: path.slice(index + 2),
    includedStores: [],
    joins: [],
    filters: [],
    schemas: [
      {
        name: 'S',
        tables: [
          {
            name: table,
            primaryKey: [],
            columns: [
              { name: 'ID', type: { _type: 'Integer' }, nullable: false },
            ],
            milestoning: [],
          },
        ],
        views: [],
        tabularFunctions: [],
      },
    ],
  };
};

const runtime = (path: string, store: string): PlainObject => {
  const index = path.lastIndexOf('::');
  return {
    _type: 'runtime',
    package: path.slice(0, index),
    name: path.slice(index + 2),
    runtimeValue: {
      _type: 'engineRuntime',
      mappings: [],
      connections: [
        {
          store: { path: store, type: 'STORE' },
          storeConnections: [
            {
              id: 'connection_1',
              connection: { _type: 'connectionPointer', connection: 'a::Conn' },
            },
          ],
        },
      ],
    },
  };
};

const OWN = {
  _type: 'data',
  elements: [
    database('sales::SalesDb', 'ORDERS'),
    runtime('sales::SalesRuntime', 'sales::SalesDb'),
  ],
};
const DEPENDENCY_ELEMENTS = [
  database('reference::CurrencyDb', 'CURRENCIES'),
  // a dependency's runtime keyed by the project's Database
  runtime('reference::SharedRuntime', 'sales::SalesDb'),
];

const setUp = () => {
  const getProjects = jest.fn(async () => [
    { groupId: 'com.example', artifactId: 'sales', projectId: 'P2' },
    { groupId: 'com.acme', artifactId: 'zeta', projectId: 'P1' },
    { projectId: 'broken' },
  ]);
  const getVersions = jest.fn(async () => [
    '1.9.0',
    'master-SNAPSHOT',
    '1.10.0',
    '1.0.0',
    '2.0.0-SNAPSHOT',
  ]);
  const getPureModelContextData = jest.fn(
    async (
      _groupId: string,
      _artifactId: string,
      _version: string,
      getDependencies: boolean,
    ) =>
      getDependencies
        ? { ...OWN, elements: [...OWN.elements, ...DEPENDENCY_ELEMENTS] }
        : OWN,
  );
  const client = {
    getProjects,
    getVersions,
    getPureModelContextData,
  } as unknown as DepotServerClient;
  return {
    catalog: new V1_LegendCubeProjectCatalog(client),
    getProjects,
    getVersions,
    getPureModelContextData,
  };
};

describe('Project catalog', () => {
  test('Lists the projects by group and artifact, leaving out one with neither', async () => {
    const { catalog } = setUp();
    expect(await catalog.listProjects()).toEqual([
      { groupId: 'com.acme', artifactId: 'zeta' },
      { groupId: 'com.example', artifactId: 'sales' },
    ]);
  });

  test('Lists released versions only, newest first by number', async () => {
    const { catalog, getVersions } = setUp();
    expect(
      await catalog.listVersions({
        groupId: 'com.example',
        artifactId: 'sales',
      }),
    ).toEqual(['1.10.0', '1.9.0', '1.0.0']);
    // the depot is asked for releases only
    expect(getVersions).toHaveBeenCalledWith('com.example', 'sales', false);
    expect(
      ['1.2.0', '1.10.0', '1.9.1', '10.0.0'].sort(
        V1_compareCubeProjectVersionsNewestFirst,
      ),
    ).toEqual(['10.0.0', '1.10.0', '1.9.1', '1.2.0']);
  });

  test("Gives a version's own Databases, with the runtimes of the project and its dependencies", async () => {
    const { catalog } = setUp();
    const outline = await catalog.loadOutline({
      groupId: 'com.example',
      artifactId: 'sales',
      versionId: '1.10.0',
    });
    expect(outline.databases.map((each) => each.path)).toEqual([
      'sales::SalesDb',
    ]);
    expect(outline.runtimes.map((each) => each.path)).toEqual([
      'sales::SalesRuntime',
      'reference::SharedRuntime',
    ]);
  });

  test('Reads a release once, and again after a failure', async () => {
    const { catalog, getPureModelContextData } = setUp();
    const project = {
      groupId: 'com.example',
      artifactId: 'sales',
      versionId: '1.10.0',
    };
    getPureModelContextData.mockRejectedValueOnce(new Error('depot down'));
    await expect(catalog.loadOutline(project)).rejects.toThrow('depot down');
    await catalog.loadOutline(project);
    await catalog.loadOutline(project);
    // two reads (own, and with dependencies) per load: the failed one and one more
    expect(getPureModelContextData).toHaveBeenCalledTimes(4);
  });
});

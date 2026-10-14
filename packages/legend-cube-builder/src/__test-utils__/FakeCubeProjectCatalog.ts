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

import { jest } from '@jest/globals';
import type { CubeModelOutline } from '../graph-manager/CubeEngine.js';
import type { CubeProjectCatalog } from '../graph-manager/CubeProjectCatalog.js';
import { FAKE_NORTHWIND_OUTLINE } from './FakeCubeEngine.js';

// A fake of the depot's published projects, for the Project tab's and the
// editor's tests: com.example:sales at 1.10.0 and 1.9.0 holds the fake
// engine's Northwind Database (so the fake types its tables) and a Database
// no runtime connects to; com.example:reference has one version

export const FAKE_PROJECT_GROUP = 'com.example';
export const FAKE_PLANNED_DATABASE = 'sales::store::PlannedDb';

export const FAKE_SALES_OUTLINE: CubeModelOutline = {
  databases: [
    ...FAKE_NORTHWIND_OUTLINE.databases,
    {
      path: FAKE_PLANNED_DATABASE,
      schemas: [
        {
          name: 'PLANNED',
          tables: [
            {
              name: 'FORECASTS',
              isView: false,
              columnCount: 2,
              flags: [],
              untypedColumns: [],
            },
          ],
        },
      ],
    },
  ],
  runtimes: FAKE_NORTHWIND_OUTLINE.runtimes,
};

export interface FakeCubeProjectCatalog {
  readonly catalog: CubeProjectCatalog;
  readonly listProjects: jest.Mock<CubeProjectCatalog['listProjects']>;
  readonly listVersions: jest.Mock<CubeProjectCatalog['listVersions']>;
  readonly loadOutline: jest.Mock<CubeProjectCatalog['loadOutline']>;
}

/** A fresh fake: build one per test, since jest.fn keeps its calls across tests */
export const createFakeCubeProjectCatalog = (): FakeCubeProjectCatalog => {
  const listProjects = jest.fn<CubeProjectCatalog['listProjects']>(async () =>
    Promise.resolve([
      { groupId: FAKE_PROJECT_GROUP, artifactId: 'reference' },
      { groupId: FAKE_PROJECT_GROUP, artifactId: 'sales' },
    ]),
  );
  const listVersions = jest.fn<CubeProjectCatalog['listVersions']>(
    async (project) =>
      Promise.resolve(
        project.artifactId === 'sales' ? ['1.10.0', '1.9.0'] : ['2.0.0'],
      ),
  );
  const loadOutline = jest.fn<CubeProjectCatalog['loadOutline']>(
    async (project) =>
      Promise.resolve(
        project.artifactId === 'sales'
          ? FAKE_SALES_OUTLINE
          : { databases: [], runtimes: [] },
      ),
  );
  return {
    catalog: { listProjects, listVersions, loadOutline },
    listProjects,
    listVersions,
    loadOutline,
  };
};

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

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import {
  elementPtr,
  EmitRole,
  func,
  lambda,
  type Schema,
  storeAccessor,
} from '@finos/legend-cube';
import { DepotServerClient } from '@finos/legend-server-depot';
import axios from 'axios';
import { flowResult } from 'mobx';
import { TEST__createCubeApplicationStore } from '../__test-utils__/CubeTestApplication.js';
import { CubeEngineError } from '../graph-manager/CubeEngine.js';
import { getRuntimesForDatabase } from '../graph-manager/CubeModelOutlineHelper.js';
import { createCubeProjectModel } from '../graph-manager/CubeProject.js';
import { V1_createEngineBackedCubeEngine } from '../graph-manager/protocol/pure/v1/__test-utils__/V1_CubeEngineTestUtils.js';
import { V1_LegendCubeProjectCatalog } from '../graph-manager/protocol/pure/v1/V1_LegendCubeProjectCatalog.js';
import type { V1_LegendCubeEngine } from '../graph-manager/protocol/pure/v1/V1_LegendCubeEngine.js';
import { CubeEditorState } from '../stores/CubeEditorState.js';
import { LocalModelCatalog } from '../stores/LocalModelCatalog.js';
import { CubeSourcePickerTabKey } from '../stores/source-picker/CubeSourcePickerTab.js';

// Depot databases end to end (PLAN §6.3), run by hand: the mock depot's
// sample projects (`yarn dev:mock-depot-server` on :6200, where the local
// engine's pointer fetch goes) and the engine on :6300.
//   TEST_GROUP=cube-local yarn workspace @finos/legend-cube-builder test

const DEPOT_URL = 'http://localhost:6200/depot/api';
const GROUP = 'org.finos.legend.cube.samples';
const SALES = { groupId: GROUP, artifactId: 'cube-sales' };
const SALES_DB = 'cube::samples::sales::store::SalesDb';
const ARCHIVE_DB = 'cube::samples::sales::store::ArchiveDb';
const PLANNED_DB = 'cube::samples::sales::store::PlannedDb';

/** A depot client over axios: the repo's Jest setup blocks fetch */
const createDepotClient = (): DepotServerClient => {
  const client = new DepotServerClient({ serverUrl: DEPOT_URL });
  jest
    .spyOn(client, 'get')
    .mockImplementation(
      async (url: string, _options, _headers, parameters) =>
        (await axios.get(url, { params: parameters })).data,
    );
  return client;
};

const pointerAt = (versionId: string) =>
  createCubeProjectModel({ ...SALES, versionId });

const accessorOf = (database: string, schema: string, table: string) =>
  storeAccessor([database, schema, table], {
    nodeId: 'relational101',
    role: EmitRole.ACCESSOR,
  });

let engine: V1_LegendCubeEngine;
let catalog: V1_LegendCubeProjectCatalog;

beforeEach(() => {
  ({ engine } = V1_createEngineBackedCubeEngine());
  catalog = new V1_LegendCubeProjectCatalog(createDepotClient());
});

describe('Depot databases, through the mock depot and the engine', () => {
  test('Lists the sample projects, and their released versions newest first', async () => {
    const projects = await catalog.listProjects();
    expect(projects).toEqual(
      expect.arrayContaining([
        { groupId: GROUP, artifactId: 'cube-reference' },
        SALES,
      ]),
    );
    expect(await catalog.listVersions(SALES)).toEqual([
      '1.10.0',
      '1.9.0',
      '1.0.0',
    ]);
  });

  test("Gives the project's own Databases only, each with its runtimes", async () => {
    const outline = await catalog.loadOutline({
      ...SALES,
      versionId: '1.10.0',
    });
    expect(outline.databases.map((database) => database.path)).toEqual([
      SALES_DB,
      ARCHIVE_DB,
      PLANNED_DB,
    ]);
    expect(
      [SALES_DB, ARCHIVE_DB, PLANNED_DB].map(
        (database) => getRuntimesForDatabase(outline, database).length,
      ),
    ).toEqual([1, 2, 0]);
  });

  test('Types tables at the version the pointer names', async () => {
    const tables = new Map([
      ['orders', [SALES_DB, 'SALES', 'ORDERS'] as const],
      ['returns', [SALES_DB, 'SALES', 'RETURNS'] as const],
    ]);
    const at100 = await engine.resolveSchemas(pointerAt('1.0.0'), tables);
    const at190 = await engine.resolveSchemas(pointerAt('1.9.0'), tables);
    const at1100 = await engine.resolveSchemas(pointerAt('1.10.0'), tables);
    const columns = (schema: unknown): string[] =>
      (schema as Schema).columns.map((column) => column.name);
    expect(columns(at100.get('orders'))).not.toContain('STATUS');
    expect(columns(at190.get('orders'))).toContain('STATUS');
    // RETURNS came in 1.10.0: a per-table error before it
    expect(at190.get('returns')).toBeInstanceOf(CubeEngineError);
    expect(columns(at1100.get('returns'))).toEqual(['ORDER_ID', 'REASON']);
  });

  test('Runs a table on each runtime of its Database', async () => {
    const run = async (
      database: string,
      schema: string,
      table: string,
      runtime: string,
    ) =>
      engine.execute(
        pointerAt('1.10.0'),
        lambda(
          [],
          [
            func(
              'from',
              [accessorOf(database, schema, table), elementPtr(runtime)],
              { nodeId: 'relational101', role: EmitRole.FROM },
            ),
          ],
        ),
      );
    expect(
      (
        await run(
          SALES_DB,
          'SALES',
          'ORDERS',
          'cube::samples::sales::SalesRuntime',
        )
      ).rows,
    ).toHaveLength(6);
    expect(
      (
        await run(
          ARCHIVE_DB,
          'ARCHIVE',
          'ORDERS_2025',
          'cube::samples::sales::ArchiveRuntime',
        )
      ).rows,
    ).toHaveLength(3);
    expect(
      (
        await run(
          ARCHIVE_DB,
          'ARCHIVE',
          'ORDERS_2025',
          'cube::samples::sales::ArchiveReplicaRuntime',
        )
      ).rows,
    ).toHaveLength(2);
  });

  test("Says in plain words when the engine can't fetch a version from the depot", async () => {
    const typed = await engine.typeLambdas(
      pointerAt('9.9.9'),
      new Map([
        [
          'relational101',
          lambda([], [accessorOf(SALES_DB, 'SALES', 'ORDERS')]),
        ],
      ]),
    );
    expect((typed.get('relational101') as CubeEngineError).detail).toMatch(
      /^The engine couldn't load the cube's project from its depot/u,
    );
  });

  test('Adds a table through the Project tab and runs the cube', async () => {
    const state = new CubeEditorState({
      applicationStore: TEST__createCubeApplicationStore(),
      engine,
      modelCatalog: new LocalModelCatalog(engine),
      projectCatalog: catalog,
    });
    const picker = state.sourcePicker;
    const tab = picker.projectTab;
    picker.open(CubeSourcePickerTabKey.PROJECT);
    await flowResult(tab.loadProjects());
    await flowResult(tab.selectProject(`${GROUP}:cube-sales`));
    await waitUntil(() => tab.outline !== undefined);
    expect(tab.versionId).toBe('1.10.0');
    tab.selectDatabase(SALES_DB);
    tab.selectSchema('SALES');
    tab.selectTable('ORDERS');
    await flowResult(picker.confirm());
    expect(state.document.context?.model).toEqual(pointerAt('1.10.0'));
    await flowResult(state.execution.execute());
    expect(state.execution.result?.rows).toHaveLength(6);
  });
});

/** Waits for a condition the page reaches on its own, e.g. an outline loading */
const waitUntil = async (condition: () => boolean): Promise<void> => {
  for (let tries = 0; tries < 100 && !condition(); tries++) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  expect(condition()).toBe(true);
};

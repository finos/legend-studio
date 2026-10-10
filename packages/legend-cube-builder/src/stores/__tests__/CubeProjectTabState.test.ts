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
import { CubeDocument, RelationalTableSource } from '@finos/legend-cube';
import { flowResult } from 'mobx';
import {
  NORTHWIND_DATABASE,
  NORTHWIND_RUNTIME,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import {
  createFakeCubeProjectCatalog,
  FAKE_PLANNED_DATABASE,
  FAKE_SALES_OUTLINE,
} from '../../__test-utils__/FakeCubeProjectCatalog.js';
import { createCubeProjectModel } from '../../graph-manager/CubeProject.js';
import { UNSERVED_SOURCE_KIND_TITLE } from '../../__lib__/LegendCubeLabels.js';
import { CubeEditorState } from '../CubeEditorState.js';
import { CubeSourcePickerTabKey } from '../source-picker/CubeSourcePickerTab.js';

const { MODEL, PROJECT } = CubeSourcePickerTabKey;

const SALES = 'com.example:sales';

const setUp = (document?: CubeDocument) => {
  const created = TEST__createCubeHost();
  const projects = createFakeCubeProjectCatalog();
  const state = new CubeEditorState(
    { ...created.host, projectCatalog: projects.catalog },
    document,
  );
  return { ...created, projects, state, tab: state.sourcePicker.projectTab };
};

/** Lets the flows started by an action run */
const settle = async (): Promise<void> => {
  for (let tries = 0; tries < 10; tries++) {
    await Promise.resolve();
  }
};

describe('Project tab', () => {
  test('Is offered after the Model tab only on a host with a project catalog', () => {
    expect(setUp().state.sourcePicker.tabs.map((tab) => tab.key)).toContain(
      PROJECT,
    );
    expect(
      setUp()
        .state.sourcePicker.tabs.map((tab) => tab.key)
        .slice(0, 2),
    ).toEqual([MODEL, PROJECT]);
    const { host } = TEST__createCubeHost();
    expect(
      new CubeEditorState(host).sourcePicker.tabs.map((tab) => tab.key),
    ).not.toContain(PROJECT);
  });

  test('Lists the projects on first opening, then, for a project, its newest version and its own Databases', async () => {
    const { state, tab, projects } = setUp();
    state.sourcePicker.open(PROJECT);
    await settle();
    expect(projects.listProjects).toHaveBeenCalledTimes(1);
    expect(tab.projects?.map((project) => project.artifactId)).toEqual([
      'reference',
      'sales',
    ]);
    // two projects: none picked for the user
    expect(tab.projectKey).toBeUndefined();

    await flowResult(tab.selectProject(SALES));
    await settle();
    expect(tab.versions).toEqual(['1.10.0', '1.9.0']);
    expect(tab.versionId).toBe('1.10.0');
    expect(tab.model).toEqual(
      createCubeProjectModel({
        groupId: 'com.example',
        artifactId: 'sales',
        versionId: '1.10.0',
      }),
    );
    expect(projects.loadOutline).toHaveBeenLastCalledWith({
      groupId: 'com.example',
      artifactId: 'sales',
      versionId: '1.10.0',
    });
    expect(tab.databases.map((database) => database.path)).toEqual(
      FAKE_SALES_OUTLINE.databases.map((database) => database.path),
    );

    // the projects are listed once per page
    state.sourcePicker.close();
    state.sourcePicker.open(PROJECT);
    expect(projects.listProjects).toHaveBeenCalledTimes(1);
  });

  test('Picks the only runtime of a Database, and says when no runtime connects to one', async () => {
    const { state, tab } = setUp();
    state.sourcePicker.open(PROJECT);
    await settle();
    await flowResult(tab.selectProject(SALES));
    await settle();
    tab.selectDatabase(NORTHWIND_DATABASE);
    expect(tab.runtimePath).toBe(NORTHWIND_RUNTIME);
    tab.selectDatabase(FAKE_PLANNED_DATABASE);
    expect(tab.runtimes).toEqual([]);
    tab.selectSchema('PLANNED');
    tab.selectTable('FORECASTS');
    expect(tab.canConfirm).toBe(false);
  });

  test("Adds a table as the cube's first: the project at the version becomes its model, then fixes the tab", async () => {
    const { state, tab, fake } = setUp();
    const picker = state.sourcePicker;
    picker.open(PROJECT);
    await settle();
    await flowResult(tab.selectProject(SALES));
    await settle();
    tab.selectVersion('1.9.0');
    await settle();
    tab.selectDatabase(NORTHWIND_DATABASE);
    tab.selectSchema('NORTHWIND');
    tab.selectTable('ORDERS');
    expect(picker.canConfirm).toBe(true);
    await flowResult(picker.confirm());

    const model = createCubeProjectModel({
      groupId: 'com.example',
      artifactId: 'sales',
      versionId: '1.9.0',
    });
    expect(state.document.context).toEqual({
      model,
      runtime: NORTHWIND_RUNTIME,
    });
    expect(fake.resolveSchemas).toHaveBeenCalledWith(model, expect.anything());
    expect(state.document.query.nodes[0]).toBeInstanceOf(RelationalTableSource);

    // the cube is the Project tab's: it reopens on its project and version, fixed
    expect(picker.fixedTab).toBe(tab);
    expect(picker.isTabEnabled(picker.modelTab)).toBe(false);
    picker.open(MODEL);
    expect(picker.activeTab.key).toBe(PROJECT);
    expect(tab.fixedProjectKey).toBe(SALES);
    expect(tab.versionId).toBe('1.9.0');
  });

  test('Offers nothing on a project cube when the host has no project catalog', () => {
    const { host } = TEST__createCubeHost();
    const state = new CubeEditorState(
      host,
      new CubeDocument().withContext({
        model: createCubeProjectModel({
          groupId: 'com.example',
          artifactId: 'sales',
          versionId: '1.9.0',
        }),
        runtime: NORTHWIND_RUNTIME,
      }),
    );
    expect(state.sourcePicker.disabledReason).toBe(UNSERVED_SOURCE_KIND_TITLE);
  });

  test("Says when the depot's projects can't be listed, and lists them again on Retry", async () => {
    const { state, tab, projects } = setUp();
    projects.listProjects.mockRejectedValueOnce(new Error('depot down'));
    state.sourcePicker.open(PROJECT);
    await settle();
    expect(tab.listError).toBe("Can't list the depot's projects: depot down");
    expect(tab.projects).toBeUndefined();
    await flowResult(tab.loadProjects());
    expect(tab.listError).toBeUndefined();
    expect(tab.projects).toHaveLength(2);
  });

  test("Loads a project cube's outline from the project catalog, for the run's database type", async () => {
    const model = createCubeProjectModel({
      groupId: 'com.example',
      artifactId: 'sales',
      versionId: '1.10.0',
    });
    const { state, projects, fake } = setUp(
      new CubeDocument().withContext({ model, runtime: NORTHWIND_RUNTIME }),
    );
    await flowResult(state.loadModelOutline());
    expect(projects.loadOutline).toHaveBeenCalledTimes(1);
    expect(fake.loadModel).not.toHaveBeenCalled();
    expect(state.getModelOutline(model)).toBe(FAKE_SALES_OUTLINE);
  });
});

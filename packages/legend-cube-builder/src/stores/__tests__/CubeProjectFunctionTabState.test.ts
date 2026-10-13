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
import { FunctionSource, RelationalTableSource } from '@finos/legend-cube';
import { flowResult } from 'mobx';
import {
  ARCHIVE_RUNTIME,
  ARCHIVED,
  FUNCTION_SCHEMA,
  FUNCTIONS_OUTLINE,
} from '../../__test-utils__/CubeFunctionTestOutline.js';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import { createFakeCubeProjectCatalog } from '../../__test-utils__/FakeCubeProjectCatalog.js';
import { isCubeProjectModel } from '../../graph-manager/CubeProject.js';
import { CubeEditorState } from '../CubeEditorState.js';
import { CubeModelReadKind } from '../source-picker/CubeInlineModelTabState.js';
import { CubeSourcePickerTabKey } from '../source-picker/CubeSourcePickerTab.js';

const { MODEL, PROJECT, PROJECT_FUNCTION } = CubeSourcePickerTabKey;

/** Lets the flows started by an action run */
const settle = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

/** A host whose depot's com.example:sales has the test functions */
const setUp = (withCatalog = true): CubeEditorState => {
  const { host, fake } = TEST__createCubeHost();
  fake.typeLambdas.mockImplementation(async (_model, lambdas) =>
    Promise.resolve(
      new Map([...lambdas.keys()].map((key) => [key, FUNCTION_SCHEMA])),
    ),
  );
  const projects = createFakeCubeProjectCatalog();
  projects.loadOutline.mockImplementation(async () =>
    Promise.resolve(FUNCTIONS_OUTLINE),
  );
  return new CubeEditorState(
    withCatalog ? { ...host, projectCatalog: projects.catalog } : host,
  );
};

describe('Project Function tab (PLAN §6.5)', () => {
  test('Is a tab of its own after Project Database, on a host with a project catalog; Project Database reads tables only', () => {
    const state = setUp();
    expect(state.sourcePicker.tabs.map((tab) => tab.key).slice(0, 3)).toEqual([
      MODEL,
      PROJECT,
      PROJECT_FUNCTION,
    ]);
    const { projectTab, projectFunctionTab, modelTab } = state.sourcePicker;
    expect(projectTab.readKinds).toEqual([CubeModelReadKind.TABLE]);
    expect(projectFunctionTab.readKinds).toEqual([CubeModelReadKind.FUNCTION]);
    expect(projectFunctionTab.readKind).toBe(CubeModelReadKind.FUNCTION);
    // Sample Data reads both
    expect(modelTab.readKinds).toEqual([
      CubeModelReadKind.TABLE,
      CubeModelReadKind.FUNCTION,
    ]);
    projectTab.setReadKind(CubeModelReadKind.FUNCTION);
    expect(projectTab.readKind).toBe(CubeModelReadKind.TABLE);
    expect(setUp(false).sourcePicker.tabs.map((tab) => tab.key)).not.toContain(
      PROJECT_FUNCTION,
    );
  });

  test("Lists a project version's functions after its project and version, and adds one on its own runtime", async () => {
    const state = setUp();
    const tab = state.sourcePicker.projectFunctionTab;
    state.sourcePicker.selectTab(PROJECT_FUNCTION);
    state.sourcePicker.open(PROJECT_FUNCTION);
    await settle();
    expect(tab.projects?.length).toBeGreaterThan(0);
    await flowResult(tab.selectProject('com.example:sales'));
    await settle();
    expect(tab.versionId).toBe('1.10.0');
    expect(tab.functions.map((fn) => fn.path)).toContain(ARCHIVED.path);
    tab.selectFunction(ARCHIVED.signature);
    await flowResult(state.sourcePicker.confirm());
    const [node] = state.document.query.nodes;
    expect(node).toBeInstanceOf(FunctionSource);
    const model = state.document.context?.model;
    expect(model && isCubeProjectModel(model)).toBe(true);
    expect(state.document.context?.runtime).toBe(ARCHIVE_RUNTIME);
  });

  test("Joins a project's tables: both project tabs serve a project cube, each item opening its own", async () => {
    const state = setUp();
    const { sourcePicker } = state;
    sourcePicker.open(PROJECT_FUNCTION);
    await settle();
    await flowResult(
      sourcePicker.projectFunctionTab.selectProject('com.example:sales'),
    );
    await settle();
    sourcePicker.projectFunctionTab.selectFunction(ARCHIVED.signature);
    await flowResult(sourcePicker.confirm());
    expect(sourcePicker.fixedTab).toBe(sourcePicker.projectTab);
    expect(sourcePicker.isTabEnabled(sourcePicker.projectTab)).toBe(true);
    expect(sourcePicker.isTabEnabled(sourcePicker.projectFunctionTab)).toBe(
      true,
    );
    expect(sourcePicker.isTabEnabled(sourcePicker.modelTab)).toBe(false);
    expect(sourcePicker.tabForSourceType(FunctionSource.TYPE)).toBe(
      sourcePicker.projectFunctionTab,
    );
    expect(sourcePicker.tabForSourceType(RelationalTableSource.TYPE)).toBe(
      sourcePicker.projectTab,
    );
    // a table of the project, on the function's runtime
    state.addNode(RelationalTableSource.TYPE);
    await settle();
    const tables = sourcePicker.projectTab;
    expect(sourcePicker.activeTabKey).toBe(PROJECT);
    expect(tables.runtimePath).toBe(ARCHIVE_RUNTIME);
    tables.selectSchema('NORTHWIND');
    tables.selectTable('ORDERS');
    await flowResult(sourcePicker.confirm());
    expect(state.document.query.nodes.map((node) => node.type)).toEqual([
      'function',
      'relational',
    ]);
  });

  test('Opens Sample Data from the Function item on a new cube, with or without a project catalog', () => {
    [setUp(), setUp(false)].forEach((state) => {
      const tab = state.sourcePicker.tabForSourceType(FunctionSource.TYPE);
      expect(tab).toBe(state.sourcePicker.modelTab);
    });
  });
});

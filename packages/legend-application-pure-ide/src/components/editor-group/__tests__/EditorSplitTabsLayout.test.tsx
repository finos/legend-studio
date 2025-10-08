/**
 * Copyright (c) 2025-present, Goldman Sachs
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

import React from 'react';
import { expect, test } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import {
  ApplicationStore,
  ApplicationStoreProvider,
} from '@finos/legend-application';
import { LegendPureIDEApplicationConfig } from '../../../application/LegendPureIDEApplicationConfig.js';
import { LegendPureIDEPluginManager } from '../../../application/LegendPureIDEPluginManager.js';
import {
  PureIDEStoreProvider,
  usePureIDEStore,
} from '../../PureIDEStoreProvider.js';
import { EditorSplitGroup } from '../EditorSplitGroup.js';
import { File } from '../../../server/models/File.js';
import { FileEditorState } from '../../../stores/FileEditorState.js';
import { EditorSplitOrientation } from '../../../stores/EditorSplitGroupState.js';

function TestHarness() {
  const ideStore = usePureIDEStore();

  // Seed with two tabs in the active (single) leaf
  const file1 = new File();
  file1.RO = false;
  file1.setContent(`###
Class model::A {}`);
  const file2 = new File();
  file2.RO = false;
  file2.setContent(`###
Class model::B {}`);
  const tab1 = new FileEditorState(ideStore, file1, '/model/A.pure');
  const tab2 = new FileEditorState(ideStore, file2, '/model/B.pure');
  ideStore.editorSplitState.openTab(tab1);
  ideStore.editorSplitState.openTab(tab2);

  // Split and then unsplit to reproduce the reported flow
  ideStore.editorSplitState.splitActiveLeaf(EditorSplitOrientation.VERTICAL);
  ideStore.editorSplitState.unsplitAll();

  return <EditorSplitGroup node={ideStore.editorSplitState.root} />;
}

test('tabs layout remains horizontal after unsplitting', async () => {
  const pluginManager = LegendPureIDEPluginManager.create();
  const config = new LegendPureIDEApplicationConfig({
    configData: {
      appName: 'test',
      env: 'test',
      documentation: { url: 'http://example.com' },
      extensions: {},
      application: {},
      pure: { url: '/' },
    },
    versionData: { version: '0.0.0' },
  });
  const applicationStore = new ApplicationStore(config, pluginManager);

  const { container } = render(
    <ApplicationStoreProvider store={applicationStore}>
      <PureIDEStoreProvider>
        <TestHarness />
      </PureIDEStoreProvider>
    </ApplicationStoreProvider>,
  );

  // One header tab strip present
  const headers = container.querySelectorAll('.editor-group__header__tabs');
  expect(headers.length).toBe(1);

  // Two tabs rendered in the strip
  const tabs = container.querySelectorAll('.tab-manager__tab');
  expect(tabs.length).toBe(2);

  // Spot-check labels are present
  expect(container.textContent).toContain('A.pure');
  expect(container.textContent).toContain('B.pure');
});

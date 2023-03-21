/**
 * Copyright (c) 2020-present, Goldman Sachs
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

import type { Workspace } from '@finos/legend-server-sdlc';
import type { EditorStore } from '../editor/EditorStore.js';
import type { DSL_LegendStudioApplicationPlugin_Extension } from '../LegendStudioApplicationPlugin.js';

export type TestRunnerTabRenderer = (
  selectedTab: string,
  editorStore: EditorStore,
  currentWorkspace: Workspace | undefined,
) => React.ReactNode | undefined;

export interface STO_ProjectOverview_LegendStudioApplicationPlugin_Extension
  extends DSL_LegendStudioApplicationPlugin_Extension {
  // --------------------- project overview test runner tabs ------------------

  /**
   * Get the list of the supported classifers for test runner tabs.
   */
  getExtraTestRunnerTabsClassifiers?(): string[];

  /**
   * Get the list of renderers for the editor for a test runner tab.
   */
  getExtraTestRunnerTabsEditorRenderers?(): TestRunnerTabRenderer[];
}

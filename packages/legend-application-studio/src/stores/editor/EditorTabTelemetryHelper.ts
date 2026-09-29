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

import type { TabState } from '@finos/legend-lego/application';
import {
  type EditorElementKind,
  EDITOR_TAB_KIND,
} from '../../__lib__/LegendStudioTelemetryHelper.js';
import { ArtifactGenerationViewerState } from './editor-state/ArtifactGenerationViewerState.js';
import { EditorDiffViewerState } from './editor-state/diff-viewer-state/EditorDiffViewerState.js';
import { ElementEditorState } from './editor-state/element-editor-state/ElementEditorState.js';
import { EndToEndWorkflowEditorState } from './editor-state/end-to-end-workflow-state/EndToEndWorkflowEditorState.js';
import { ModelImporterState } from './editor-state/ModelImporterState.js';
import { ProjectConfigurationEditorState } from './editor-state/project-configuration-editor-state/ProjectConfigurationEditorState.js';
import type { EditorStore } from './EditorStore.js';

/**
 * Classifies a Studio editor {@link TabState} for telemetry.
 * Returns a `tabKind` bucket and, when the tab is an element editor, the
 * `elementKind` (via `EditorGraphState.getPackageableElementType`, which is
 * plugin-aware and so covers extension-provided element kinds) and
 * `elementPath` of the underlying packageable element.
 */
export const getEditorTabTelemetryData = (
  tab: TabState,
  editorStore: EditorStore,
): {
  tabKind: EDITOR_TAB_KIND;
  elementKind?: EditorElementKind | undefined;
  elementPath?: string | undefined;
} => {
  if (tab instanceof ElementEditorState) {
    return {
      tabKind: EDITOR_TAB_KIND.ELEMENT,
      elementKind: editorStore.graphState.getPackageableElementType(
        tab.element,
      ),
      elementPath: tab.elementPath,
    };
  }
  if (tab instanceof EditorDiffViewerState) {
    return { tabKind: EDITOR_TAB_KIND.ENTITY_DIFF };
  }
  if (tab instanceof ArtifactGenerationViewerState) {
    return { tabKind: EDITOR_TAB_KIND.ARTIFACT_GENERATION };
  }
  if (tab instanceof ModelImporterState) {
    return { tabKind: EDITOR_TAB_KIND.MODEL_IMPORTER };
  }
  if (tab instanceof ProjectConfigurationEditorState) {
    return { tabKind: EDITOR_TAB_KIND.PROJECT_CONFIGURATION };
  }
  if (tab instanceof EndToEndWorkflowEditorState) {
    return { tabKind: EDITOR_TAB_KIND.END_TO_END_WORKFLOW };
  }
  return { tabKind: EDITOR_TAB_KIND.OTHER };
};

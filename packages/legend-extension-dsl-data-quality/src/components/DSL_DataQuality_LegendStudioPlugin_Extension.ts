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
import type { DataQualityState } from './states/DataQualityState.js';
import type {
  EditorExtensionState,
  EditorStore,
  ElementEditorState,
  LegendStudioApplicationPlugin,
} from '@finos/legend-application-studio';

export type ExtensionStateBuilder = (
  editorStore: EditorStore,
  dataQualityState: DataQualityState,
) => EditorExtensionState | undefined;

export type ComponentRenderer = (
  tabName: string,
  elementEditorState: ElementEditorState,
) => React.ReactNode | undefined;

export interface DSL_DataQuality_LegendStudioPlugin_Extension
  extends LegendStudioApplicationPlugin {
  getExtensionStates?(): ExtensionStateBuilder[];
  getComponentRenderers?(): ComponentRenderer[];
  getAllTabs?(): (() => string[])[];
}

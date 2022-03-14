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

import type { DSL_LegendStudioPlugin_Extension } from '@finos/legend-studio';
import type { ClassView } from '../../models/metamodels/pure/packageableElements/diagram/DSLDiagram_ClassView';
import type { DiagramEditorState } from '../../stores/studio/DiagramEditorState';

export type ClassViewContextMenuItemRendererConfiguration = {
  key: string;
  renderer: (
    diagramEditorState: DiagramEditorState,
    classView: ClassView | undefined,
  ) => React.ReactNode | undefined;
};

export interface DSLDiagram_LegendStudioPlugin_Extension
  extends DSL_LegendStudioPlugin_Extension {
  /**
   * Get the list of items to be rendered in the context menu of a class view.
   */
  getExtraClassViewContextMenuItemRendererConfigurations?(): ClassViewContextMenuItemRendererConfiguration[];
}

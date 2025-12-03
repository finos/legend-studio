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

import type { CommandConfigData } from '@finos/legend-application';

export enum DSL_DIAGRAM_LEGEND_STUDIO_COMMAND_KEY {
  RECENTER = 'dsl-diagram.diagram-editor.recenter',
  USE_ZOOM_TOOL = 'dsl-diagram.diagram-editor.use-zoom-tool',
  USE_VIEW_TOOL = 'dsl-diagram.diagram-editor.use-view-tool',
  USE_PAN_TOOL = 'dsl-diagram.diagram-editor.use-pan-tool',
  USE_PROPERTY_TOOL = 'dsl-diagram.diagram-editor.use-property-tool',
  USE_INHERITANCE_TOOL = 'dsl-diagram.diagram-editor.use-inheritance-tool',
  ADD_CLASS = 'dsl-diagram.diagram-editor.add-class',
  EJECT_PROPERTY = 'dsl-diagram.diagram-editor.eject-property',
}

export const DSL_DIAGRAM_LEGEND_STUDIO_COMMAND_CONFIG: CommandConfigData = {
  [DSL_DIAGRAM_LEGEND_STUDIO_COMMAND_KEY.RECENTER]: {
    title: 'Diagram Editor: Recenter',
    defaultKeyboardShortcut: 'KeyR',
  },
  [DSL_DIAGRAM_LEGEND_STUDIO_COMMAND_KEY.USE_ZOOM_TOOL]: {
    title: 'Diagram Editor: Use zoom tool',
    defaultKeyboardShortcut: 'KeyZ',
  },
  [DSL_DIAGRAM_LEGEND_STUDIO_COMMAND_KEY.USE_VIEW_TOOL]: {
    title: 'Diagram Editor: Use view tool',
    defaultKeyboardShortcut: 'KeyV',
  },
  [DSL_DIAGRAM_LEGEND_STUDIO_COMMAND_KEY.USE_PAN_TOOL]: {
    title: 'Diagram Editor: Use pan tool',
    defaultKeyboardShortcut: 'KeyM',
  },
  [DSL_DIAGRAM_LEGEND_STUDIO_COMMAND_KEY.USE_PROPERTY_TOOL]: {
    title: 'Diagram Editor: Use property tool',
    defaultKeyboardShortcut: 'KeyP',
  },
  [DSL_DIAGRAM_LEGEND_STUDIO_COMMAND_KEY.USE_INHERITANCE_TOOL]: {
    title: 'Diagram Editor: Use inheritance tool',
    defaultKeyboardShortcut: 'KeyI',
  },
  [DSL_DIAGRAM_LEGEND_STUDIO_COMMAND_KEY.ADD_CLASS]: {
    title: 'Diagram Editor: Add class',
    defaultKeyboardShortcut: 'KeyC',
  },
  [DSL_DIAGRAM_LEGEND_STUDIO_COMMAND_KEY.EJECT_PROPERTY]: {
    title: 'Diagram Editor: Eject Property',
    defaultKeyboardShortcut: 'ArrowRight',
    when: 'When hovering on a class property',
  },
};

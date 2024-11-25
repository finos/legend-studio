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

export enum DSL_DATA_SPACE_LEGEND_APPLICATION_COMMAND_KEY {
  RECENTER_DIAGRAM = 'dsl-dataspace.diagram-viewer.recenter',
  USE_ZOOM_TOOL = 'dsl-dataspace.diagram-viewer.use-zoom-tool',
  USE_VIEW_TOOL = 'dsl-dataspace.diagram-viewer.use-view-tool',
  USE_PAN_TOOL = 'dsl-dataspace.diagram-viewer.use-pan-tool',
  GO_TO_NEXT_DIAGRAM = 'dsl-dataspace.diagram-viewer.go-to-next-diagram',
  GO_TO_PREVIOUS_DIAGRAM = 'dsl-dataspace.diagram-viewer.go-to-previous-diagram',
  TOGGLE_DIAGRAM_DESCRIPTION = 'dsl-dataspace.diagram-viewer.toggle-description',
  SEARCH_DOCUMENTATION = 'dsl-dataspace.models-documentation.search',
}

export const DSL_DATA_SPACE_LEGEND_APPLICATION_COMMAND_CONFIG: CommandConfigData =
  {
    [DSL_DATA_SPACE_LEGEND_APPLICATION_COMMAND_KEY.RECENTER_DIAGRAM]: {
      title: 'Data Product Diagram Viewer: Recenter',
      defaultKeyboardShortcut: 'KeyR',
      when: 'When diagram viewer is active',
    },
    [DSL_DATA_SPACE_LEGEND_APPLICATION_COMMAND_KEY.USE_ZOOM_TOOL]: {
      title: 'Data Product Diagram Viewer: Use zoom tool',
      defaultKeyboardShortcut: 'KeyZ',
      when: 'When diagram viewer is active',
    },
    [DSL_DATA_SPACE_LEGEND_APPLICATION_COMMAND_KEY.USE_VIEW_TOOL]: {
      title: 'Data Product Diagram Viewer: Use view tool',
      defaultKeyboardShortcut: 'KeyV',
      when: 'When diagram viewer is active',
    },
    [DSL_DATA_SPACE_LEGEND_APPLICATION_COMMAND_KEY.USE_PAN_TOOL]: {
      title: 'Data Product Diagram Viewer: Use pan tool',
      defaultKeyboardShortcut: 'KeyM',
      when: 'When diagram viewer is active',
    },
    [DSL_DATA_SPACE_LEGEND_APPLICATION_COMMAND_KEY.GO_TO_NEXT_DIAGRAM]: {
      title: 'Data Product Diagram Viewer: Next Diagram',
      defaultKeyboardShortcut: 'ArrowRight',
      when: 'When diagram viewer is active',
    },
    [DSL_DATA_SPACE_LEGEND_APPLICATION_COMMAND_KEY.GO_TO_PREVIOUS_DIAGRAM]: {
      title: 'Data Product Diagram Viewer: Previous Diagram',
      defaultKeyboardShortcut: 'ArrowLeft',
      when: 'When viewing diagram',
    },
    [DSL_DATA_SPACE_LEGEND_APPLICATION_COMMAND_KEY.TOGGLE_DIAGRAM_DESCRIPTION]:
      {
        title: 'Data Product Diagram Viewer: Toggle Description',
        defaultKeyboardShortcut: 'KeyD',
        when: 'When diagram viewer is active',
      },
    [DSL_DATA_SPACE_LEGEND_APPLICATION_COMMAND_KEY.SEARCH_DOCUMENTATION]: {
      title: 'Data Product Models Documentation: Search',
      defaultKeyboardShortcut: 'Control+Shift+KeyF',
      additionalKeyboardShortcuts: ['Meta+Shift+KeyF'],
      when: 'When models documentation viewer is active',
    },
  };

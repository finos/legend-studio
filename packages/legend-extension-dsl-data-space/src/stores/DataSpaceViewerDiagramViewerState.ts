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

import { type DataSpaceViewerState } from './DataSpaceViewerState.js';
import { DiagramViewerState } from '@finos/legend-extension-dsl-diagram/application';
import type { CommandRegistrar } from '@finos/legend-application';
import { DSL_DATA_SPACE_LEGEND_APPLICATION_COMMAND_KEY } from '../__lib__/DSL_DataSpace_LegendApplicationCommand.js';
import { DATA_SPACE_VIEWER_ACTIVITY_MODE } from './DataSpaceViewerNavigation.js';

export class DataSpaceViewerDiagramViewerState
  extends DiagramViewerState
  implements CommandRegistrar
{
  readonly dataSpaceViewerState: DataSpaceViewerState;

  constructor(dataSpaceViewerState: DataSpaceViewerState) {
    super(
      dataSpaceViewerState.dataSpaceAnalysisResult.diagrams,
      dataSpaceViewerState.queryClass,
    );
    this.dataSpaceViewerState = dataSpaceViewerState;
  }

  registerCommands(): void {
    const DEFAULT_TRIGGER = (): boolean =>
      this.dataSpaceViewerState.currentActivity ===
      DATA_SPACE_VIEWER_ACTIVITY_MODE.DIAGRAM_VIEWER;
    this.dataSpaceViewerState.applicationStore.commandService.registerCommand({
      key: DSL_DATA_SPACE_LEGEND_APPLICATION_COMMAND_KEY.RECENTER_DIAGRAM,
      trigger: DEFAULT_TRIGGER,
      action: () => this.diagramRenderer.recenter(),
    });
    this.dataSpaceViewerState.applicationStore.commandService.registerCommand({
      key: DSL_DATA_SPACE_LEGEND_APPLICATION_COMMAND_KEY.USE_ZOOM_TOOL,
      trigger: DEFAULT_TRIGGER,
      action: () => this.diagramRenderer.switchToZoomMode(),
    });
    this.dataSpaceViewerState.applicationStore.commandService.registerCommand({
      key: DSL_DATA_SPACE_LEGEND_APPLICATION_COMMAND_KEY.USE_VIEW_TOOL,
      trigger: DEFAULT_TRIGGER,
      action: () => this.diagramRenderer.switchToViewMode(),
    });
    this.dataSpaceViewerState.applicationStore.commandService.registerCommand({
      key: DSL_DATA_SPACE_LEGEND_APPLICATION_COMMAND_KEY.USE_PAN_TOOL,
      trigger: DEFAULT_TRIGGER,
      action: () => this.diagramRenderer.switchToPanMode(),
    });
    this.dataSpaceViewerState.applicationStore.commandService.registerCommand({
      key: DSL_DATA_SPACE_LEGEND_APPLICATION_COMMAND_KEY.GO_TO_NEXT_DIAGRAM,
      trigger: DEFAULT_TRIGGER,
      action: () => {
        if (this.nextDiagram) {
          this.setCurrentDiagram(this.nextDiagram);
        }
      },
    });
    this.dataSpaceViewerState.applicationStore.commandService.registerCommand({
      key: DSL_DATA_SPACE_LEGEND_APPLICATION_COMMAND_KEY.GO_TO_PREVIOUS_DIAGRAM,
      trigger: DEFAULT_TRIGGER,
      action: () => {
        if (this.previousDiagram) {
          this.setCurrentDiagram(this.previousDiagram);
        }
      },
    });
    this.dataSpaceViewerState.applicationStore.commandService.registerCommand({
      key: DSL_DATA_SPACE_LEGEND_APPLICATION_COMMAND_KEY.TOGGLE_DIAGRAM_DESCRIPTION,
      trigger: DEFAULT_TRIGGER,
      action: () => this.setShowDescription(!this.showDescription),
    });
  }

  deregisterCommands(): void {
    [
      DSL_DATA_SPACE_LEGEND_APPLICATION_COMMAND_KEY.RECENTER_DIAGRAM,
      DSL_DATA_SPACE_LEGEND_APPLICATION_COMMAND_KEY.USE_ZOOM_TOOL,
      DSL_DATA_SPACE_LEGEND_APPLICATION_COMMAND_KEY.USE_VIEW_TOOL,
      DSL_DATA_SPACE_LEGEND_APPLICATION_COMMAND_KEY.USE_PAN_TOOL,
      DSL_DATA_SPACE_LEGEND_APPLICATION_COMMAND_KEY.GO_TO_NEXT_DIAGRAM,
      DSL_DATA_SPACE_LEGEND_APPLICATION_COMMAND_KEY.GO_TO_PREVIOUS_DIAGRAM,
    ].forEach((commandKey) =>
      this.dataSpaceViewerState.applicationStore.commandService.deregisterCommand(
        commandKey,
      ),
    );
  }
}

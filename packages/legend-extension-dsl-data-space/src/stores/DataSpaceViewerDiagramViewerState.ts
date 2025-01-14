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

import { guaranteeNonNullable } from '@finos/legend-shared';
import { action, computed, makeObservable, observable } from 'mobx';
import { type DataSpaceViewerState } from './DataSpaceViewerState.js';
import type { ClassView } from '@finos/legend-extension-dsl-diagram/graph';
import {
  DIAGRAM_INTERACTION_MODE,
  type DiagramRenderer,
} from '@finos/legend-extension-dsl-diagram/application';
import type { CommandRegistrar } from '@finos/legend-application';
import { DSL_DATA_SPACE_LEGEND_APPLICATION_COMMAND_KEY } from '../__lib__/DSL_DataSpace_LegendApplicationCommand.js';
import { DATA_SPACE_VIEWER_ACTIVITY_MODE } from './DataSpaceViewerNavigation.js';
import type { DataSpaceDiagramAnalysisResult } from '../graph-manager/action/analytics/DataSpaceAnalysis.js';

export class DataSpaceViewerDiagramViewerState implements CommandRegistrar {
  readonly dataSpaceViewerState: DataSpaceViewerState;

  _renderer?: DiagramRenderer | undefined;
  currentDiagram?: DataSpaceDiagramAnalysisResult | undefined;
  contextMenuClassView?: ClassView | undefined;
  showDescription = true;
  expandDescription = false;

  constructor(dataSpaceViewerState: DataSpaceViewerState) {
    makeObservable(this, {
      _renderer: observable,
      currentDiagram: observable,
      contextMenuClassView: observable,
      showDescription: observable,
      expandDescription: observable,
      previousDiagram: computed,
      nextDiagram: computed,
      currentDiagramIndex: computed,
      diagramRenderer: computed,
      setDiagramRenderer: action,
      setCurrentDiagram: action,
      setContextMenuClassView: action,
      setShowDescription: action,
      setExpandDescription: action,
    });

    this.dataSpaceViewerState = dataSpaceViewerState;
    this.currentDiagram =
      this.dataSpaceViewerState.dataSpaceAnalysisResult.diagrams[0];
  }

  get diagramRenderer(): DiagramRenderer {
    return guaranteeNonNullable(
      this._renderer,
      `Diagram renderer must be initialized (this is likely caused by calling this method at the wrong place)`,
    );
  }

  get isDiagramRendererInitialized(): boolean {
    return Boolean(this._renderer);
  }

  // NOTE: we have tried to use React to control the cursor and
  // could not overcome the jank/lag problem, so we settle with CSS-based approach
  // See https://css-tricks.com/using-css-cursors/
  // See https://developer.mozilla.org/en-US/docs/Web/CSS/cursor
  get diagramCursorClass(): string {
    if (!this.isDiagramRendererInitialized) {
      return '';
    }
    switch (this.diagramRenderer.interactionMode) {
      case DIAGRAM_INTERACTION_MODE.PAN: {
        return this.diagramRenderer.leftClick
          ? 'data-space__viewer__diagram-viewer__cursor--grabbing'
          : 'data-space__viewer__diagram-viewer__cursor--grab';
      }
      case DIAGRAM_INTERACTION_MODE.ZOOM_IN: {
        return 'data-space__viewer__diagram-viewer__cursor--zoom-in';
      }
      case DIAGRAM_INTERACTION_MODE.ZOOM_OUT: {
        return 'data-space__viewer__diagram-viewer__cursor--zoom-out';
      }
      case DIAGRAM_INTERACTION_MODE.LAYOUT: {
        if (this.diagramRenderer.mouseOverClassView) {
          return 'data-space__viewer__diagram-viewer__cursor--pointer';
        }
        return '';
      }
      default:
        return '';
    }
  }

  get previousDiagram(): DataSpaceDiagramAnalysisResult | undefined {
    if (!this.currentDiagram) {
      return undefined;
    }
    const idx =
      this.dataSpaceViewerState.dataSpaceAnalysisResult.diagrams.indexOf(
        this.currentDiagram,
      );
    if (idx === 0 || idx === -1) {
      return undefined;
    }
    return this.dataSpaceViewerState.dataSpaceAnalysisResult.diagrams[idx - 1];
  }

  get nextDiagram(): DataSpaceDiagramAnalysisResult | undefined {
    if (!this.currentDiagram) {
      return undefined;
    }
    const idx =
      this.dataSpaceViewerState.dataSpaceAnalysisResult.diagrams.indexOf(
        this.currentDiagram,
      );
    if (
      idx ===
        this.dataSpaceViewerState.dataSpaceAnalysisResult.diagrams.length - 1 ||
      idx === -1
    ) {
      return undefined;
    }
    return this.dataSpaceViewerState.dataSpaceAnalysisResult.diagrams[idx + 1];
  }

  get currentDiagramIndex(): number {
    return this.currentDiagram
      ? this.dataSpaceViewerState.dataSpaceAnalysisResult.diagrams.indexOf(
          this.currentDiagram,
        ) + 1
      : 0;
  }

  setDiagramRenderer(val: DiagramRenderer): void {
    this._renderer = val;
  }

  setCurrentDiagram(val: DataSpaceDiagramAnalysisResult): void {
    this.currentDiagram = val;
  }

  setContextMenuClassView(val: ClassView | undefined): void {
    this.contextMenuClassView = val;
  }

  setupDiagramRenderer(): void {
    this.diagramRenderer.setIsReadOnly(true);
    this.diagramRenderer.setEnableLayoutAutoAdjustment(true);
    this.diagramRenderer.onClassViewDoubleClick = (
      classView: ClassView,
    ): void => this.dataSpaceViewerState.queryClass(classView.class.value);
    this.diagramRenderer.onClassViewRightClick = (
      classView: ClassView,
    ): void => {
      this.setContextMenuClassView(classView);
    };
  }

  setShowDescription(val: boolean): void {
    this.showDescription = val;
    this.setExpandDescription(false);
  }

  setExpandDescription(val: boolean): void {
    this.expandDescription = val;
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

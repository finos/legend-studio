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

import { guaranteeNonNullable } from '@finos/legend-shared';
import { action, computed, makeObservable, observable } from 'mobx';
import type { ClassView } from '../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_ClassView.js';
import {
  type DiagramAnalysisResult,
  type DiagramRenderer,
  DIAGRAM_INTERACTION_MODE,
} from './DiagramRenderer.js';
import type { CommandRegistrar } from '@finos/legend-application';
import type { Class } from '@finos/legend-graph';

export abstract class DiagramViewerState implements CommandRegistrar {
  readonly diagrams: DiagramAnalysisResult[];
  readonly queryClass?: ((_class: Class) => void) | undefined;

  _renderer?: DiagramRenderer | undefined;
  currentDiagram?: DiagramAnalysisResult | undefined;
  contextMenuClassView?: ClassView | undefined;
  showDescription = true;
  expandDescription = false;

  abstract registerCommands(): void;
  abstract deregisterCommands(): void;

  constructor(
    diagrams: DiagramAnalysisResult[],
    queryClass?: (_class: Class) => void,
  ) {
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
    this.queryClass = queryClass;
    this.diagrams = diagrams;
    this.currentDiagram = diagrams[0];
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

  get previousDiagram(): DiagramAnalysisResult | undefined {
    if (!this.currentDiagram) {
      return undefined;
    }
    const idx = this.diagrams.indexOf(this.currentDiagram);
    if (idx === 0 || idx === -1) {
      return undefined;
    }
    return this.diagrams[idx - 1];
  }

  get nextDiagram(): DiagramAnalysisResult | undefined {
    if (!this.currentDiagram) {
      return undefined;
    }
    const idx = this.diagrams.indexOf(this.currentDiagram);
    if (idx === this.diagrams.length - 1 || idx === -1) {
      return undefined;
    }
    return this.diagrams[idx + 1];
  }

  get currentDiagramIndex(): number {
    return this.currentDiagram
      ? this.diagrams.indexOf(this.currentDiagram) + 1
      : 0;
  }

  setDiagramRenderer(val: DiagramRenderer): void {
    this._renderer = val;
  }

  setCurrentDiagram(val: DiagramAnalysisResult): void {
    this.currentDiagram = val;
  }

  setContextMenuClassView(val: ClassView | undefined): void {
    this.contextMenuClassView = val;
  }

  setupDiagramRenderer(): void {
    this.diagramRenderer.setIsReadOnly(true);
    this.diagramRenderer.setEnableLayoutAutoAdjustment(true);
    if (this.queryClass) {
      this.diagramRenderer.onClassViewDoubleClick = (
        classView: ClassView,
      ): void => this.queryClass?.(classView.class.value);
    }
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
}

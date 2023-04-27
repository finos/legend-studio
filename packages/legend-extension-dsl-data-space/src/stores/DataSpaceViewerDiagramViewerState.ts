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

import {
  getNullableFirstEntry,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { action, computed, makeObservable, observable } from 'mobx';
import type { DataSpaceViewerState } from './DataSpaceViewerState.js';
import type { ClassView } from '@finos/legend-extension-dsl-diagram/graph';
import type { DataSpaceDiagramAnalysisResult } from '../graph-manager/index.js';
import {
  DIAGRAM_INTERACTION_MODE,
  type DiagramRenderer,
} from '@finos/legend-extension-dsl-diagram/application';

export class DataSpaceViewerDiagramViewerState {
  readonly dataSpaceViewerState: DataSpaceViewerState;

  _renderer?: DiagramRenderer | undefined;
  currentDiagram?: DataSpaceDiagramAnalysisResult | undefined;
  contextMenuClassView?: ClassView | undefined;

  constructor(dataSpaceViewerState: DataSpaceViewerState) {
    makeObservable(this, {
      _renderer: observable,
      currentDiagram: observable,
      contextMenuClassView: observable,
      previousDiagram: computed,
      nextDiagram: computed,
      diagramRenderer: computed,
      setDiagramRenderer: action,
      setCurrentDiagram: action,
      setContextMenuClassView: action,
    });

    this.dataSpaceViewerState = dataSpaceViewerState;
    this.currentDiagram = getNullableFirstEntry(
      this.dataSpaceViewerState.dataSpaceAnalysisResult.diagrams,
    );
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
    if (this.diagramRenderer.middleClick || this.diagramRenderer.rightClick) {
      return 'diagram-editor__cursor--grabbing';
    }
    switch (this.diagramRenderer.interactionMode) {
      case DIAGRAM_INTERACTION_MODE.LAYOUT: {
        if (this.diagramRenderer.mouseOverClassView) {
          return 'diagram-editor__cursor--pointer';
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
}

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
  type Diagram,
  type Point,
} from '@finos/legend-extension-dsl-diagram/graph';
import type { Entity } from '@finos/legend-storage';
import { type PureModel } from '@finos/legend-graph';
import { type GeneratorFn, guaranteeNonNullable } from '@finos/legend-shared';
import { action, computed, flow, makeObservable, observable } from 'mobx';
import {
  DIAGRAM_INTERACTION_MODE,
  type DiagramRenderer,
} from '@finos/legend-extension-dsl-diagram/application';

export class DiagramEditorState {
  _renderer?: DiagramRenderer | undefined;
  diagramId: string;
  diagram?: Diagram;
  graph?: PureModel;
  entities: Entity[];

  constructor(diagramId: string) {
    makeObservable(this, {
      _renderer: observable,
      diagram: observable,
      diagramCursorClass: computed,
      addClassView: flow,
      setRenderer: action,
    });

    this.diagramId = diagramId;
    this.entities = [];
  }

  get renderer(): DiagramRenderer {
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
    if (this.renderer.middleClick || this.renderer.rightClick) {
      return 'diagram-editor__cursor--grabbing';
    }
    switch (this.renderer.interactionMode) {
      case DIAGRAM_INTERACTION_MODE.PAN: {
        return this.renderer.leftClick
          ? 'diagram-editor__cursor--grabbing'
          : 'diagram-editor__cursor--grab';
      }
      case DIAGRAM_INTERACTION_MODE.ZOOM_IN: {
        return 'diagram-editor__cursor--zoom-in';
      }
      case DIAGRAM_INTERACTION_MODE.ZOOM_OUT: {
        return 'diagram-editor__cursor--zoom-out';
      }
      case DIAGRAM_INTERACTION_MODE.LAYOUT: {
        if (this.renderer.selectionStart) {
          return 'diagram-editor__cursor--crosshair';
        } else if (
          this.renderer.mouseOverClassCorner ||
          this.renderer.selectedClassCorner
        ) {
          return 'diagram-editor__cursor--resize';
        } else if (this.renderer.mouseOverClassView) {
          return 'diagram-editor__cursor--pointer';
        }
        return '';
      }
      default:
        return '';
    }
  }

  setupRenderer(): void {
    this.renderer.setIsReadOnly(false);
  }

  setRenderer(val: DiagramRenderer): void {
    this._renderer = val;
  }

  setDiagram(val: Diagram): void {
    this.diagram = val;
  }

  setGraph(val: PureModel): void {
    this.graph = val;
  }

  setEntities(val: Entity[]): void {
    this.entities = val;
  }

  *addClassView(path: string, position: Point | undefined): GeneratorFn<void> {
    if (!this.graph || !this.diagram) {
      return;
    }
    const _class = this.graph.getClass(path);
    this.renderer.addClassView(_class, position);
  }
}

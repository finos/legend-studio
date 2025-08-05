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

import type { CommandRegistrar } from '@finos/legend-application';
import {
  type ClassView,
  type Diagram,
  type Point,
} from '@finos/legend-extension-dsl-diagram/graph';
import {
  extractElementNameFromPath,
  type PureModel,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  generateEnumerableNameFromToken,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import { deserialize } from 'serializr';
import {
  type DiagramInfo,
  type DiagramClassMetadata,
  DiagramClassInfo,
  addClassToGraph,
  buildGraphFromDiagramInfo,
} from '../server/models/DiagramInfo.js';
import { FileCoordinate, trimPathLeadingSlash } from '../server/models/File.js';
import type { PureIDEStore } from './PureIDEStore.js';
import { PureIDETabState } from './PureIDETabManagerState.js';
import { LEGEND_PURE_IDE_DIAGRAM_EDITOR_COMMAND_KEY } from '../__lib__/LegendPureIDECommand.js';
import type { TabState } from '@finos/legend-lego/application';
import {
  DIAGRAM_INTERACTION_MODE,
  type DiagramRenderer,
} from '@finos/legend-extension-dsl-diagram/application';

export class DiagramEditorState
  extends PureIDETabState
  implements CommandRegistrar
{
  diagramInfo: DiagramInfo;
  _renderer?: DiagramRenderer | undefined;
  diagram: Diagram;
  diagramClasses: Map<string, DiagramClassMetadata>;
  graph: PureModel;
  diagramPath: string;
  filePath: string;
  fileLine: number;
  fileColumn: number;

  constructor(
    ideStore: PureIDEStore,
    diagramInfo: DiagramInfo,
    diagramPath: string,
    filePath: string,
    fileLine: number,
    fileColumn: number,
  ) {
    super(ideStore);

    makeObservable(this, {
      _renderer: observable,
      diagram: observable,
      diagramInfo: observable,
      diagramName: computed,
      diagramCursorClass: computed,
      addClassView: flow,
      rebuild: action,
      setRenderer: action,
    });

    this.diagramPath = diagramPath;
    this.filePath = filePath;
    this.fileLine = fileLine;
    this.fileColumn = fileColumn;
    this.diagramInfo = diagramInfo;
    const [diagram, graph, diagramClasses] =
      buildGraphFromDiagramInfo(diagramInfo);
    this.diagram = diagram;
    this.graph = graph;
    this.diagramClasses = diagramClasses;
  }

  get label(): string {
    return trimPathLeadingSlash(this.diagramPath);
  }

  override get description(): string | undefined {
    return `Diagram: ${trimPathLeadingSlash(this.diagramPath)}`;
  }

  get diagramName(): string {
    return extractElementNameFromPath(this.diagramPath);
  }

  override match(tab: TabState): boolean {
    return (
      tab instanceof DiagramEditorState && this.diagramPath === tab.diagramPath
    );
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

  rebuild(value: DiagramInfo): void {
    this.diagramInfo = value;
    const [diagram, graph, diagramClasses] = buildGraphFromDiagramInfo(value);
    this.diagram = diagram;
    this.graph = graph;
    this.diagramClasses = diagramClasses;
    this.fileLine = value.diagram.sourceInformation.line;
    this.fileColumn = value.diagram.sourceInformation.column;
  }

  setupRenderer(): void {
    this.renderer.onClassViewDoubleClick = (classView: ClassView): void => {
      const sourceInformation = this.diagramClasses.get(
        classView.class.value.path,
      )?.sourceInformation;
      if (sourceInformation) {
        const coordinate = new FileCoordinate(
          sourceInformation.sourceId,
          sourceInformation.startLine,
          sourceInformation.startColumn,
        );
        flowResult(this.ideStore.executeNavigation(coordinate)).catch(
          this.ideStore.applicationStore.alertUnhandledError,
        );
      }
    };
  }

  setRenderer(val: DiagramRenderer): void {
    this._renderer = val;
  }

  *addClassView(path: string, position: Point | undefined): GeneratorFn<void> {
    const diagramClassInfo = deserialize(
      DiagramClassInfo,
      yield this.ideStore.client.getDiagramClassInfo(path),
    );
    const _class = addClassToGraph(
      diagramClassInfo,
      this.graph,
      this.diagramClasses,
    );
    const classView = this.renderer.addClassView(_class, position);
    // NOTE: The auto-generated ID by diagram renderer will cause a parser error in Pure
    // so we need to rewrite it accordingly
    if (classView) {
      classView.id = generateEnumerableNameFromToken(
        this.diagram.classViews.map((cv) => cv.id),
        'cview',
      );
    }
  }

  registerCommands(): void {
    const DEFAULT_TRIGGER = (): boolean =>
      // make sure the current active editor is this diagram editor
      this.ideStore.editorSplitState.currentTab === this &&
      // make sure the renderer is initialized
      this.isDiagramRendererInitialized;
    this.ideStore.applicationStore.commandService.registerCommand({
      key: LEGEND_PURE_IDE_DIAGRAM_EDITOR_COMMAND_KEY.RECENTER,
      trigger: DEFAULT_TRIGGER,
      action: () => this.renderer.recenter(),
    });
    this.ideStore.applicationStore.commandService.registerCommand({
      key: LEGEND_PURE_IDE_DIAGRAM_EDITOR_COMMAND_KEY.USE_ZOOM_TOOL,
      trigger: DEFAULT_TRIGGER,
      action: () => this.renderer.switchToZoomMode(),
    });
    this.ideStore.applicationStore.commandService.registerCommand({
      key: LEGEND_PURE_IDE_DIAGRAM_EDITOR_COMMAND_KEY.USE_VIEW_TOOL,
      trigger: DEFAULT_TRIGGER,
      action: () => this.renderer.switchToViewMode(),
    });
    this.ideStore.applicationStore.commandService.registerCommand({
      key: LEGEND_PURE_IDE_DIAGRAM_EDITOR_COMMAND_KEY.USE_PAN_TOOL,
      trigger: DEFAULT_TRIGGER,
      action: () => this.renderer.switchToPanMode(),
    });
  }

  deregisterCommands(): void {
    [
      LEGEND_PURE_IDE_DIAGRAM_EDITOR_COMMAND_KEY.RECENTER,
      LEGEND_PURE_IDE_DIAGRAM_EDITOR_COMMAND_KEY.USE_ZOOM_TOOL,
      LEGEND_PURE_IDE_DIAGRAM_EDITOR_COMMAND_KEY.USE_VIEW_TOOL,
      LEGEND_PURE_IDE_DIAGRAM_EDITOR_COMMAND_KEY.USE_PAN_TOOL,
    ].forEach((commandKey) =>
      this.ideStore.applicationStore.commandService.deregisterCommand(
        commandKey,
      ),
    );
  }
}

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

import type {
  ClassView,
  Diagram,
  DiagramRenderer,
  Point,
} from '@finos/legend-extension-dsl-diagram';
import type { PureModel } from '@finos/legend-graph';
import {
  type GeneratorFn,
  generateEnumerableNameFromToken,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import { deserialize } from 'serializr';
import {
  type DiagramInfo,
  type DiagramClassMetadata,
  DiagramClassInfo,
  addClassToGraph,
  buildGraphFromDiagramInfo,
} from '../server/models/DiagramInfo.js';
import {
  FileCoordinate,
  trimPathLeadingSlash,
} from '../server/models/PureFile.js';
import type { EditorStore } from './EditorStore.js';
import { EditorTabState } from './EditorTabManagerState.js';

export class DiagramEditorState extends EditorTabState {
  diagramInfo: DiagramInfo;
  _renderer?: DiagramRenderer | undefined;
  diagram: Diagram;
  diagramClasses: Map<string, DiagramClassMetadata>;
  graph: PureModel;
  diagramPath: string;
  filePath: string;

  constructor(
    editorStore: EditorStore,
    diagramInfo: DiagramInfo,
    diagramPath: string,
    filePath: string,
  ) {
    super(editorStore);

    makeObservable(this, {
      _renderer: observable,
      diagram: observable,
      diagramInfo: observable,
      addClassView: flow,
      rebuild: action,
      setRenderer: action,
    });

    this.diagramPath = diagramPath;
    this.filePath = filePath;
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
    return trimPathLeadingSlash(this.diagramPath);
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

  rebuild(value: DiagramInfo): void {
    this.diagramInfo = value;
    const [diagram, graph, diagramClasses] = buildGraphFromDiagramInfo(value);
    this.diagram = diagram;
    this.graph = graph;
    this.diagramClasses = diagramClasses;
  }

  setupRenderer(): void {
    this.renderer.onClassViewDoubleClick = (classView: ClassView): void => {
      const sourceInformation = this.diagramClasses.get(
        classView.class.value.path,
      )?.sourceInformation;
      if (sourceInformation) {
        const coordinate = new FileCoordinate(
          sourceInformation.source,
          sourceInformation.startLine,
          sourceInformation.startColumn,
        );
        flowResult(this.editorStore.executeNavigation(coordinate)).catch(
          this.editorStore.applicationStore.alertUnhandledError,
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
      yield this.editorStore.client.getDiagramClassInfo(path),
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
}

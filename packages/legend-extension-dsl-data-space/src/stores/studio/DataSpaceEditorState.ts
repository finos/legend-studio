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

import { computed, action, makeObservable, observable } from 'mobx';
import type { EditorStore } from '@finos/legend-studio';
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import { ElementEditorState } from '@finos/legend-studio';
import type { PackageableElement } from '@finos/legend-graph';
import { DataSpace } from '../../models/metamodels/pure/model/packageableElements/dataSpace/DataSpace';
import type { DiagramRenderer } from '@finos/legend-extension-dsl-diagram';
import { Diagram } from '@finos/legend-extension-dsl-diagram';

export enum DATA_SPACE_VIEWER_ACTIVITY_MODE {
  MODELS = 'MODELS',
  EXECUTION = 'EXECUTION',
  ENTITLEMENT = 'ENTITLEMENT',
  SUPPORT = 'SUPPORT',
}

export class DataSpaceEditorState extends ElementEditorState {
  _renderer?: DiagramRenderer | undefined;
  currentDiagram?: Diagram | undefined;
  currentActivity = DATA_SPACE_VIEWER_ACTIVITY_MODE.MODELS;
  diagrams: Diagram[] = [];

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      _renderer: observable,
      currentDiagram: observable,
      currentActivity: observable,
      renderer: computed,
      dataSpace: computed,
      setRenderer: action,
      setCurrentDiagram: action,
      setCurrentActivity: action,
      reprocess: action,
    });

    this.dataSpace.diagrams.forEach((diagram) => {
      this.diagrams.push(
        this.editorStore.graphManagerState.graph.getExtensionElement(
          diagram,
          Diagram,
        ),
      );
    });
    if (this.diagrams.length !== 0) {
      this.setCurrentDiagram(this.diagrams[0]);
    }
  }

  get dataSpace(): DataSpace {
    return guaranteeType(
      this.element,
      DataSpace,
      'Element inside data space editor state must be a data space element',
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

  setRenderer(val: DiagramRenderer): void {
    this._renderer = val;
  }

  setCurrentDiagram(val: Diagram): void {
    this.currentDiagram = val;
  }

  setCurrentActivity(val: DATA_SPACE_VIEWER_ACTIVITY_MODE): void {
    this.currentActivity = val;
  }

  reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState {
    const newElementEditorState = new DataSpaceEditorState(
      editorStore,
      newElement,
    );
    return newElementEditorState;
  }
}

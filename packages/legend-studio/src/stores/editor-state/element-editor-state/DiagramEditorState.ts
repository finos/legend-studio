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
import type { EditorStore } from '../../EditorStore';
import {
  guaranteeNonNullable,
  guaranteeType,
} from '@finos/legend-studio-shared';
import { ElementEditorState } from './ElementEditorState';
import type { PackageableElement } from '../../../models/metamodels/pure/model/packageableElements/PackageableElement';
import { Diagram } from '../../../models/metamodels/pure/model/packageableElements/diagram/Diagram';
import type { DiagramRenderer } from '../../../components/shared/diagram-viewer/DiagramRenderer';

export class DiagramEditorState extends ElementEditorState {
  _diagramRenderer?: DiagramRenderer;
  showHotkeyInfosModal = false;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      _diagramRenderer: observable,
      showHotkeyInfosModal: observable,
      diagramRenderer: computed,
      diagram: computed,
      isDiagramRendererInitialized: computed,
      setShowHotkeyInfosModal: action,
      setDiagramRenderer: action,
      reprocess: action,
    });
  }

  get diagram(): Diagram {
    return guaranteeType(
      this.element,
      Diagram,
      'Element inside diagram editor state must be a diagram',
    );
  }

  get diagramRenderer(): DiagramRenderer {
    return guaranteeNonNullable(
      this._diagramRenderer,
      `Diagram renderer must be initialized (this is likely caused by calling this method at the wrong place)`,
    );
  }

  get isDiagramRendererInitialized(): boolean {
    return Boolean(this._diagramRenderer);
  }

  setDiagramRenderer(val: DiagramRenderer): void {
    this._diagramRenderer = val;
  }

  setShowHotkeyInfosModal(val: boolean): void {
    this.showHotkeyInfosModal = val;
  }

  reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState {
    const diagramEditorState = new DiagramEditorState(editorStore, newElement);
    return diagramEditorState;
  }
}

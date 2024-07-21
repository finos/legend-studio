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

import { action, computed, makeObservable, observable } from 'mobx';
import {
  type EditorStore,
  ElementEditorState,
} from '@finos/legend-application-studio';
import type { PackageableElement } from '@finos/legend-graph';
import { DataSpace } from '@finos/legend-extension-dsl-data-space/graph';
import { guaranteeType } from '@finos/legend-shared';

export class FormEditorState extends ElementEditorState {
  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      dataSpace: computed,
      reprocess: action,
    });
  }

  get dataSpace(): DataSpace {
    return guaranteeType(
      this.element,
      DataSpace,
      'Element inside text element editor state must be a text element',
    );
  }

  override reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState {
    const newState = new FormEditorState(editorStore, newElement);
    return newState;
  }
}

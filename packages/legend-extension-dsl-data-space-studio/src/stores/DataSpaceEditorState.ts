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

import { guaranteeType } from '@finos/legend-shared';
import { action, computed, makeObservable, observable } from 'mobx';
import {
  type EditorStore,
  ElementEditorState,
} from '@finos/legend-application-studio';
import type { PackageableElement } from '@finos/legend-graph';
import { DataSpace } from '@finos/legend-extension-dsl-data-space/graph';

export class DataSpaceEditorState extends ElementEditorState {
  dataSpace: DataSpace;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);
    this.dataSpace = guaranteeType(
      element,
      DataSpace,
      'Element inside DataSpaceEditorState must be a DataSpace',
    );

    makeObservable(this, {
      dataSpace: observable,
      title: computed,
      setTitle: action,
      setDescription: action,
    });
  }

  get title(): string {
    return this.dataSpace.title ?? '';
  }

  override get description(): string {
    return this.dataSpace.description ?? '';
  }

  setTitle(title: string): void {
    this.dataSpace.title = title;
  }

  setDescription(description: string): void {
    this.dataSpace.description = description;
  }

  override reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState {
    const newState = new DataSpaceEditorState(editorStore, newElement);
    newState.setTitle(this.title);
    newState.setDescription(this.description);
    return newState;
  }
}

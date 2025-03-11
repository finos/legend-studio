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

export enum DATASPACE_EDITOR_TAB {
  GENERAL = 'General',
  EXECUTION_CONTEXTS = 'Execution Contexts',
  ELEMENTS = 'Elements',
  EXECUTABLES = 'Executables',
  DIAGRAMS = 'Diagrams',
  SUPPORT_INFO = 'Support Info',
}

export class DataSpaceEditorState extends ElementEditorState {
  selectedTab = DATASPACE_EDITOR_TAB.GENERAL;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      dataSpace: computed,
      selectedTab: observable,
      setSelectedTab: action,
      reprocess: action,
    });
  }
  
  // Use the inherited isReadOnly property from ElementEditorState

  get dataSpace(): DataSpace {
    return guaranteeType(
      this.element,
      DataSpace,
      'Element inside dataspace editor state must be a dataspace element',
    );
  }
  
  setSelectedTab(tab: DATASPACE_EDITOR_TAB): void {
    this.selectedTab = tab;
  }

  override reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState {
    const newState = new DataSpaceEditorState(editorStore, newElement);
    newState.selectedTab = this.selectedTab;
    return newState;
  }
}

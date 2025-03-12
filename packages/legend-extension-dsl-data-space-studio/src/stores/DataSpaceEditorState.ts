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
import { DataSpaceExecutionContextState } from './DataSpaceExecutionContextState.js';

export enum DATASPACE_TAB {
  GENERAL = 'GENERAL',
  EXECUTION_CONTEXT = 'EXECUTION_CONTEXT',
}
export class DataSpaceEditorState extends ElementEditorState {
  executionContextState: DataSpaceExecutionContextState;
  selectedTab: DATASPACE_TAB = DATASPACE_TAB.GENERAL;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      executionContextState: observable,
      selectedTab: observable,
      dataSpace: computed,
      reprocess: action,
      setSelectedTab: action,
    });

    this.executionContextState = new DataSpaceExecutionContextState(this);
  }

  setSelectedTab(tab: DATASPACE_TAB): void {
    this.selectedTab = tab;
  }

  get dataSpace(): DataSpace {
    return guaranteeType(
      this.element,
      DataSpace,
      'Element inside DataSpace editor state must be a DataSpace element',
    );
  }

  override reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState {
    const newState = new DataSpaceEditorState(editorStore, newElement);
    return newState;
  }
}

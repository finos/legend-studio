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
import {
  DataSpace,
  DataSpaceExecutionContext,
  DataSpaceSupportEmail,
} from '@finos/legend-extension-dsl-data-space/graph';
import { guaranteeType } from '@finos/legend-shared';

export enum SUPPORT_INFO_TYPE {
  EMAIL = 'Email',
  COMBINED_INFO = 'CombinedInfo',
}

export enum DATASPACE_TAB {
  GENERAL = 'GENERAL',
  EXECUTION_CONTEXT = 'EXECUTION_CONTEXT',
}
export class DataSpaceEditorState extends ElementEditorState {
  selectedSupportInfoType?: SUPPORT_INFO_TYPE;
  selectedTab: DATASPACE_TAB = DATASPACE_TAB.GENERAL;
  selectedExecutionContext?: DataSpaceExecutionContext;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      dataSpace: computed,
      selectedSupportInfoType: observable,
      setSelectedSupportInfoType: action,
      setSelectedTab: observable,
      selectedExecutionContext: observable,
      setSelectedExecutionContext: action,
      setDefaultExecutionContext: action,
      reprocess: action,
    });

    this.selectedSupportInfoType =
      this.dataSpace.supportInfo instanceof DataSpaceSupportEmail
        ? SUPPORT_INFO_TYPE.EMAIL
        : SUPPORT_INFO_TYPE.COMBINED_INFO;
  }

  get dataSpace(): DataSpace {
    return guaranteeType(
      this.element,
      DataSpace,
      'Element inside text element editor state must be a text element',
    );
  }

  setSelectedSupportInfoType(type: SUPPORT_INFO_TYPE) {
    this.selectedSupportInfoType = type;
  }

  setSelectedTab(tab: DATASPACE_TAB): void {
    this.selectedTab = tab;
  }

  setSelectedExecutionContext(context: DataSpaceExecutionContext): void {
    this.selectedExecutionContext = context;
  }

  setDefaultExecutionContext(context: DataSpaceExecutionContext): void {
    set_defaultExecutionContext(this.dataSpace, context);
  }

  override reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState {
    const newState = new DataSpaceEditorState(editorStore, newElement);
    return newState;
  }
}
function set_executionContexts(
  dataSpace: DataSpace,
  contexts: DataSpaceExecutionContext[],
) {
  throw new Error('Function not implemented.');
}

function set_defaultExecutionContext(
  dataSpace: DataSpace,
  context: DataSpaceExecutionContext,
) {
  throw new Error('Function not implemented.');
}

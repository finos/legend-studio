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
  DataElement,
  type EmbeddedData,
  type PackageableElement,
} from '@finos/legend-graph';
import { guaranteeType, uuid } from '@finos/legend-shared';
import { action, computed, makeObservable, observable } from 'mobx';
import type { EditorStore } from '../../../EditorStore.js';
import { ElementEditorState } from '../ElementEditorState.js';
import {
  type EmbeddedDataState,
  buildEmbeddedDataEditorState,
  type EmbeddedDataStateOption,
} from './EmbeddedDataState.js';

export enum DATA_TAB_TYPE {
  GENERAL = 'GENERAL',
  STEREOTYPES = 'STEREOTYPES',
  TAGGED_VALUES = 'TAGGED_VALUES',
}

export type EmbeddedDataTypeOption = {
  value: string;
  label: string;
};

export class EmbeddedDataEditorState {
  readonly uuid = uuid();
  readonly editorStore: EditorStore;
  readonly embeddedData: EmbeddedData;
  readonly embeddedDataState: EmbeddedDataState;

  constructor(
    editorStore: EditorStore,
    embeddedData: EmbeddedData,
    options?: EmbeddedDataStateOption,
  ) {
    this.editorStore = editorStore;
    this.embeddedData = embeddedData;
    this.embeddedDataState = buildEmbeddedDataEditorState(
      embeddedData,
      editorStore,
      options,
    );
  }
}

export class PackageableDataEditorState extends ElementEditorState {
  readonly embeddedDataState: EmbeddedDataEditorState;

  selectedTab = DATA_TAB_TYPE.GENERAL;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      data: computed,
      selectedTab: observable,
      setSelectedTab: action,
      reprocess: action,
    });

    this.embeddedDataState = new EmbeddedDataEditorState(
      editorStore,
      this.data.data,
    );
  }

  setSelectedTab(val: DATA_TAB_TYPE): void {
    this.selectedTab = val;
  }

  get data(): DataElement {
    return guaranteeType(
      this.element,
      DataElement,
      `Element inside data editor state must be a DataElement`,
    );
  }

  reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState {
    const editorState = new PackageableDataEditorState(editorStore, newElement);
    return editorState;
  }
}

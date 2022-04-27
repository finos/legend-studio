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
  ExternalFormatData,
  ModelStoreData,
  type PackageableElement,
} from '@finos/legend-graph';
import { guaranteeType, uuid } from '@finos/legend-shared';
import { action, computed, makeObservable, observable } from 'mobx';
import type { DSLData_LegendStudioPlugin_Extension } from '../../../DSLData_LegendStudioPlugin_Extension';
import type { EditorStore } from '../../../EditorStore';
import { ElementEditorState } from '../ElementEditorState';

export enum DATA_TAB_TYPE {
  GENERAL = 'GENERAL',
  STEREOTYPES = 'STEREOTYPES',
  TAGGED_VALUES = 'TAGGED_VALUES',
}

export type EmbeddedDataTypeOption = {
  value: string;
  label: string;
};

export abstract class EmbeddedDataState {
  editorStore: EditorStore;
  embeddedData: EmbeddedData;

  constructor(editorStore: EditorStore, embeddedData: EmbeddedData) {
    this.editorStore = editorStore;
    this.embeddedData = embeddedData;
  }

  abstract label(): string;
}

export class ExternalFormatDataState extends EmbeddedDataState {
  override embeddedData: ExternalFormatData;

  constructor(editorStore: EditorStore, embeddedData: ExternalFormatData) {
    super(editorStore, embeddedData);
    this.embeddedData = embeddedData;
  }

  label(): string {
    return 'ExternalFormat Data';
  }
}

export class ModelStoreDataState extends EmbeddedDataState {
  override embeddedData: ModelStoreData;

  constructor(editorStore: EditorStore, embeddedData: ModelStoreData) {
    super(editorStore, embeddedData);
    this.embeddedData = embeddedData;
  }

  label(): string {
    return 'ModelStore Data';
  }
}

export class UnSupportedDataState extends EmbeddedDataState {
  label(): string {
    return 'Unsupported embedded data';
  }
}

export class EmbeddedDataEditorState {
  uuid = uuid(); // NOTE: used to force component remount on state change
  editorStore: EditorStore;
  embeddedData: EmbeddedData;
  embeddedDataState: EmbeddedDataState;

  constructor(editorStore: EditorStore, embeddedData: EmbeddedData) {
    this.editorStore = editorStore;
    this.embeddedData = embeddedData;
    this.embeddedDataState = this.buildEmbeddedDataEditorState();
  }

  buildEmbeddedDataEditorState(): EmbeddedDataState {
    const embeddedData = this.embeddedData;
    if (embeddedData instanceof ExternalFormatData) {
      return new ExternalFormatDataState(this.editorStore, embeddedData);
    } else if (embeddedData instanceof ModelStoreData) {
      return new ModelStoreDataState(this.editorStore, embeddedData);
    } else {
      const extraEmbeddedDataEditorStateBuilders =
        this.editorStore.pluginManager
          .getStudioPlugins()
          .flatMap(
            (plugin) =>
              (
                plugin as DSLData_LegendStudioPlugin_Extension
              ).getExtraEmbeddedDataEditorStateBuilders?.() ?? [],
          );
      for (const stateBuilder of extraEmbeddedDataEditorStateBuilders) {
        const state = stateBuilder(this.editorStore, embeddedData);
        if (state) {
          return state;
        }
      }
      return new UnSupportedDataState(this.editorStore, embeddedData);
    }
  }
}

export class PackageableDataEditorState extends ElementEditorState {
  embeddedDataState: EmbeddedDataEditorState;
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

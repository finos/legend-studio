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
import type { DataElement } from '@finos/legend-graph';
import {
  type EmbeddedData,
  DataElementReference,
  ExternalFormatData,
  ModelStoreData,
} from '@finos/legend-graph';
import type { DSLData_LegendStudioPlugin_Extension } from '../../../DSLData_LegendStudioPlugin_Extension';
import type { EditorStore } from '../../../EditorStore';
import { dataElementReference_setDataElement } from '../../../graphModifier/DSLData_GraphModifierHelper';

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

export class DataElementReferenceState extends EmbeddedDataState {
  override embeddedData: DataElementReference;
  embeddedDataValueState: EmbeddedDataState;

  constructor(editorStore: EditorStore, embeddedData: DataElementReference) {
    super(editorStore, embeddedData);
    this.embeddedData = embeddedData;
    this.embeddedDataValueState = this.buildValueState();
  }

  label(): string {
    return 'Data Element Reference';
  }

  setDataElement(dataElement: DataElement): void {
    dataElementReference_setDataElement(
      this.embeddedData,
      dataElement,
      this.editorStore.changeDetectionState.observerContext,
    );
    this.embeddedDataValueState = this.buildValueState();
  }

  buildValueState(): EmbeddedDataState {
    return buildEmbeddedDataEditorState(
      this.embeddedData.dataElement.value.data,
      this.editorStore,
    );
  }
}

export class UnSupportedDataState extends EmbeddedDataState {
  label(): string {
    return 'Unsupported embedded data';
  }
}
export function buildEmbeddedDataEditorState(
  _embeddedData: EmbeddedData,
  editorStore: EditorStore,
): EmbeddedDataState {
  const embeddedData = _embeddedData;
  if (embeddedData instanceof ExternalFormatData) {
    return new ExternalFormatDataState(editorStore, embeddedData);
  } else if (embeddedData instanceof ModelStoreData) {
    return new ModelStoreDataState(editorStore, embeddedData);
  } else if (embeddedData instanceof DataElementReference) {
    return new DataElementReferenceState(editorStore, embeddedData);
  } else {
    const extraEmbeddedDataEditorStateBuilders = editorStore.pluginManager
      .getStudioPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as DSLData_LegendStudioPlugin_Extension
          ).getExtraEmbeddedDataEditorStateBuilders?.() ?? [],
      );
    for (const stateBuilder of extraEmbeddedDataEditorStateBuilders) {
      const state = stateBuilder(editorStore, embeddedData);
      if (state) {
        return state;
      }
    }
    return new UnSupportedDataState(editorStore, embeddedData);
  }
}

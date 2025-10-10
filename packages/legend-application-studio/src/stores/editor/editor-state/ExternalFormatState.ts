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

import type { ExternalFormatDescription } from '@finos/legend-graph';
import {
  type GeneratorFn,
  assertErrorThrown,
  LogEvent,
  ActionState,
} from '@finos/legend-shared';
import { flow, action, makeObservable, observable } from 'mobx';
import type { EditorStore } from '../EditorStore.js';
import { LEGEND_STUDIO_APP_EVENT } from '../../../__lib__/LegendStudioEvent.js';
import { ElementXTSchemaGenerationState } from './element-editor-state/ElementExternalFormatGenerationState.js';

export type ExternalFormatTypeOption = {
  value: string;
  label: string;
};

export enum EmbeddedDataType {
  EXTERNAL_FORMAT_DATA = 'EXTERNAL_FORMAT',
  MODEL_STORE_DATA = 'MODEL_STORE',
  RELATIONAL_CSV = 'RELATIONAL',
  DATA_ELEMENT = 'DATA_ELEMENT',
  RELATION_ELEMENTS_DATA = 'RELATION_ELEMENTS_DATA',
}

export class ExternalFormatState {
  fetchingDescriptionsState = ActionState.create();
  editorStore: EditorStore;
  externalFormatDescriptions: ExternalFormatDescription[] = [];
  schemaGenerationStates: ElementXTSchemaGenerationState[] = [];

  constructor(editorStore: EditorStore) {
    makeObservable<ExternalFormatState>(this, {
      externalFormatDescriptions: observable,
      schemaGenerationStates: observable,
      setExternalFormatDescriptions: action,
      fetchExternalFormatDescriptions: flow,
    });

    this.editorStore = editorStore;
  }

  get formatTypes(): string[] {
    return this.externalFormatDescriptions.map((e) => e.name);
  }

  get formatTypeOptions(): ExternalFormatTypeOption[] {
    return this.externalFormatDescriptions.map((types) => ({
      value: types.name,
      label: types.name,
    }));
  }

  get formatContentTypes(): string[] {
    return this.externalFormatDescriptions.map((e) => e.contentTypes).flat();
  }

  get externalFormatDescriptionsWithModelGenerationSupport(): ExternalFormatDescription[] {
    return this.externalFormatDescriptions.filter(
      (d) => d.supportsModelGeneration,
    );
  }

  getFormatTypeForContentType(contentType: string): string | undefined {
    return this.externalFormatDescriptions.find(
      (externalFormatDescription) =>
        externalFormatDescription.contentTypes[0] === contentType,
    )?.name;
  }

  setExternalFormatDescriptions(val: ExternalFormatDescription[]): void {
    this.externalFormatDescriptions = val;
  }

  *fetchExternalFormatDescriptions(): GeneratorFn<void> {
    try {
      this.fetchingDescriptionsState.inProgress();
      const externalFormatDescriptions =
        (yield this.editorStore.graphManagerState.graphManager.getAvailableExternalFormatsDescriptions()) as ExternalFormatDescription[];
      this.setExternalFormatDescriptions(externalFormatDescriptions);
      this.schemaGenerationStates = externalFormatDescriptions
        .filter((s) => s.supportsSchemaGeneration)
        .map(
          (descr) =>
            new ElementXTSchemaGenerationState(this.editorStore, descr),
        );
      this.fetchingDescriptionsState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.EXTERNAL_FORMAT_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.fetchingDescriptionsState.fail();
    }
  }

  getTypeDescription(type: string): ExternalFormatDescription | undefined {
    return this.externalFormatDescriptions.find((e) => e.name === type);
  }
}

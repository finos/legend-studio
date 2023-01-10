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
import { LEGEND_STUDIO_APP_EVENT } from '../LegendStudioAppEvent.js';
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
}

export class ExternalFormatState {
  fetchingDescriptionsState = ActionState.create();
  editorStore: EditorStore;
  externalFormatsDescriptions: ExternalFormatDescription[] = [];
  schemaGenerationStates: ElementXTSchemaGenerationState[] = [];

  constructor(editorStore: EditorStore) {
    makeObservable<ExternalFormatState>(this, {
      externalFormatsDescriptions: observable,
      schemaGenerationStates: observable,
      setExternalFormatsDescriptions: action,
      fetchExternalFormatsDescriptions: flow,
    });

    this.editorStore = editorStore;
  }

  get formatTypes(): string[] {
    return this.externalFormatsDescriptions.map((e) => e.name);
  }

  get formatTypeOptions(): ExternalFormatTypeOption[] {
    return this.externalFormatsDescriptions.map((types) => ({
      value: types.name,
      label: types.name,
    }));
  }

  get formatContentTypes(): string[] {
    return this.externalFormatsDescriptions.map((e) => e.contentTypes).flat();
  }

  get externalFormatDescriptionsWithModelGenerationSupport(): ExternalFormatDescription[] {
    return this.externalFormatsDescriptions.filter(
      (d) => d.supportsModelGeneration,
    );
  }

  getFormatTypeForContentType(contentType: string): string | undefined {
    return this.externalFormatsDescriptions.find(
      (externalFormatDescription) =>
        externalFormatDescription.contentTypes[0] === contentType,
    )?.name;
  }

  setExternalFormatsDescriptions(
    externalFormatsDescriptions: ExternalFormatDescription[],
  ): void {
    this.externalFormatsDescriptions = externalFormatsDescriptions;
  }

  *fetchExternalFormatsDescriptions(): GeneratorFn<void> {
    try {
      this.fetchingDescriptionsState.inProgress();
      const externalFormatDescriptions =
        (yield this.editorStore.graphManagerState.graphManager.getAvailableExternalFormatsDescriptions()) as ExternalFormatDescription[];
      this.setExternalFormatsDescriptions(externalFormatDescriptions);
      this.schemaGenerationStates = externalFormatDescriptions
        .filter((s) => s.supportsSchemaGeneration)
        .map(
          (descr) =>
            new ElementXTSchemaGenerationState(this.editorStore, descr),
        );
      this.fetchingDescriptionsState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.EXTERNAL_FORMAT_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
      this.fetchingDescriptionsState.fail();
    }
  }

  getTypeDescription(type: string): ExternalFormatDescription | undefined {
    return this.externalFormatsDescriptions.find((e) => e.name === type);
  }
}

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

import { action, flow, makeObservable, observable } from 'mobx';
import type {
  EditorStore,
  PackageableElementOption,
} from '@finos/legend-studio';
import type {
  Mapping,
  ModelGenerationConfiguration,
} from '@finos/legend-graph';
import { V1_MappingGenConfiguration } from '../models/protocols/pure/v1/model/V1_MappingGenConfiguration';
import {
  assertErrorThrown,
  LogEvent,
  type GeneratorFn,
} from '@finos/legend-shared';
import type { Entity } from '@finos/legend-model-storage';

const MAPPING_GENERATION_LOG_EVENT_TYPE = 'MAPPING_GENERATION_FAILURE';
export class MappingGenerationEditorState {
  editorStore: EditorStore;
  config: ModelGenerationConfiguration;
  sourceMapping?: PackageableElementOption<Mapping> | undefined;
  mappingToRegenerate?: PackageableElementOption<Mapping> | undefined;
  mappingNewName?: string | undefined;
  storeNewName?: string | undefined;
  m2mAdditionalMappings: PackageableElementOption<Mapping>[] = [];
  isGenerating = false;

  constructor(editorStore: EditorStore, config: ModelGenerationConfiguration) {
    this.editorStore = editorStore;
    this.config = config;
    makeObservable(this, {
      sourceMapping: observable,
      mappingToRegenerate: observable,
      mappingNewName: observable,
      storeNewName: observable,
      m2mAdditionalMappings: observable,
      isGenerating: observable,
      setSourceMapping: action,
      setMappingToRegenerate: action,
      setMappingName: action,
      setStoreName: action,
      setM2mAdditionalMappings: action,
      generate: flow,
    });
  }

  setSourceMapping(
    sourceMapping: PackageableElementOption<Mapping> | undefined,
  ): void {
    this.sourceMapping = sourceMapping;
  }

  setMappingToRegenerate(
    mappingToRegenerate: PackageableElementOption<Mapping>,
  ): void {
    this.mappingToRegenerate = mappingToRegenerate;
  }

  setMappingName(mappingNewName: string | undefined): void {
    this.mappingNewName = mappingNewName;
  }

  setStoreName(storeNewName: string | undefined): void {
    this.storeNewName = storeNewName;
  }

  setM2mAdditionalMappings(
    m2mAdditionalMappings: PackageableElementOption<Mapping>[],
  ): void {
    this.m2mAdditionalMappings = m2mAdditionalMappings;
  }

  *generate(): GeneratorFn<void> {
    try {
      this.isGenerating = true;
      this.editorStore.modelLoaderState.setModelText('');
      const config = new V1_MappingGenConfiguration(
        this.sourceMapping?.value.path,
        this.mappingToRegenerate?.value.path,
        this.mappingNewName,
        this.storeNewName,
        this.m2mAdditionalMappings.map((m2m) => m2m.value.path),
        this.config.key,
        this.config.label,
      );

      const entities: Entity[] =
        (yield this.editorStore.graphManagerState.graphManager.generateModelFromConfiguration(
          config,
          this.editorStore.graphManagerState.graph,
        )) as Entity[];

      const generatedModelGrammar: string =
        (yield this.editorStore.graphManagerState.graphManager.entitiesToPureCode(
          entities,
        )) as string;

      this.editorStore.modelLoaderState.setModelText(generatedModelGrammar);
      this.isGenerating = false;
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(MAPPING_GENERATION_LOG_EVENT_TYPE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
      this.isGenerating = false;
    }
  }
}

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

import { action, computed, flow, makeObservable, observable } from 'mobx';
import type { EditorStore } from '@finos/legend-application-studio';
import type { Mapping } from '@finos/legend-graph';
import {
  assertErrorThrown,
  guaranteeNonNullable,
  LogEvent,
  type GeneratorFn,
} from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';
import type { PackageableElementOption } from '@finos/legend-application';
import { MappingGenerationConfiguration } from '../graphManager/action/generation/MappingGenerationConfiguration.js';
import { getMappingGenerationGraphManagerExtension } from '../graphManager/protocol/pure/MappingGeneration_PureGraphManagerExtension.js';

const MAPPING_GENERATION_LOG_EVENT_TYPE = 'MAPPING_GENERATION_FAILURE';

export class MappingGenerationEditorState {
  editorStore: EditorStore;
  sourceMapping?: PackageableElementOption<Mapping> | undefined;
  mappingToRegenerate?: PackageableElementOption<Mapping> | undefined;
  resultMappingName?: string | undefined;
  resultStoreName?: string | undefined;
  resultIncludedMappingName?: string | undefined;
  originalMappingName?: string | undefined;
  m2mIntermediateMappings: PackageableElementOption<Mapping>[] = [];
  isGenerating = false;

  constructor(editorStore: EditorStore) {
    makeObservable(this, {
      sourceMapping: observable,
      mappingToRegenerate: observable,
      resultMappingName: observable,
      resultStoreName: observable,
      resultIncludedMappingName: observable,
      originalMappingName: observable,
      m2mIntermediateMappings: observable,
      isGenerating: observable,
      canGenerate: computed,
      setSourceMapping: action,
      setMappingToRegenerate: action,
      setResultMappingName: action,
      setResultStoreName: action,
      setResultIncludedMappingName: action,
      setOriginalMappingName: action,
      setM2MIntermediateMappings: action,
      generate: flow,
    });

    this.editorStore = editorStore;
  }

  get canGenerate(): boolean {
    return Boolean(this.sourceMapping && this.mappingToRegenerate);
  }

  setSourceMapping(val: PackageableElementOption<Mapping> | undefined): void {
    this.sourceMapping = val;
  }

  setMappingToRegenerate(val: PackageableElementOption<Mapping>): void {
    this.mappingToRegenerate = val;
  }

  setResultMappingName(val: string | undefined): void {
    this.resultMappingName = val;
  }

  setResultStoreName(val: string | undefined): void {
    this.resultStoreName = val;
  }

  setM2MIntermediateMappings(val: PackageableElementOption<Mapping>[]): void {
    this.m2mIntermediateMappings = val;
  }

  setResultIncludedMappingName(val: string | undefined): void {
    this.resultIncludedMappingName = val;
  }

  setOriginalMappingName(val: string | undefined): void {
    this.originalMappingName = val;
  }

  *generate(): GeneratorFn<void> {
    if (!this.canGenerate || this.isGenerating) {
      return;
    }
    try {
      this.isGenerating = true;
      this.editorStore.modelLoaderState.setModelText('');
      const config = new MappingGenerationConfiguration();
      config.sourceMapping = guaranteeNonNullable(
        this.sourceMapping?.value,
        `Source mapping is not set`,
      );
      config.mappingToRegenerate = guaranteeNonNullable(
        this.mappingToRegenerate?.value,
        `Mapping to regenerate is not set`,
      );
      config.resultMappingName = this.resultMappingName;
      config.resultStoreName = this.resultStoreName;
      config.resultIncludedMappingName = this.resultIncludedMappingName;
      config.originalMappingName = this.originalMappingName;
      config.m2mIntermediateMappings = this.m2mIntermediateMappings.map(
        (val) => val.value,
      );
      const entities = (yield getMappingGenerationGraphManagerExtension(
        this.editorStore.graphManagerState.graphManager,
      ).generate(config, this.editorStore.graphManagerState.graph)) as Entity[];
      this.editorStore.modelLoaderState.setModelText(
        (yield this.editorStore.graphManagerState.graphManager.entitiesToPureCode(
          entities,
        )) as string,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(MAPPING_GENERATION_LOG_EVENT_TYPE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isGenerating = false;
    }
  }
}

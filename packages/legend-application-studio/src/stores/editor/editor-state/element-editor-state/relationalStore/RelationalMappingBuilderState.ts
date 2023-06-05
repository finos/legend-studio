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
  type Database,
  type Schema,
  RelationalModelGenerationInput,
} from '@finos/legend-graph';
import type { EditorStore } from '../../../EditorStore.js';
import {
  type GeneratorFn,
  ActionState,
  assertErrorThrown,
  LogEvent,
} from '@finos/legend-shared';
import { makeObservable, observable, flow } from 'mobx';
import type { Entity } from '@finos/legend-storage';
import { LEGEND_STUDIO_APP_EVENT } from '../../../../../__lib__/LegendStudioEvent.js';

export const DEFAULT_MAPPING_PACKAGE = 'generated::mapping';

export class RelationalMappingBuilderState {
  readonly database: Database;
  readonly editorStore: EditorStore;
  mappingPackage = DEFAULT_MAPPING_PACKAGE;
  modelPackage = DEFAULT_MAPPING_PACKAGE;
  generatedModel = '';

  buildingMappingState = ActionState.create();
  constructor(editorStore: EditorStore, element: Database) {
    this.editorStore = editorStore;
    this.database = element;

    makeObservable<RelationalMappingBuilderState>(this, {
      mappingPackage: observable,
      buildingMappingState: observable,
      generatedModel: observable,
      generateMapping: flow,
    });
  }

  setMappingPackage(val: string): void {
    this.mappingPackage = val;
  }

  *generateMapping(schema: Schema): GeneratorFn<void> {
    try {
      this.buildingMappingState.inProgress();
      const input = new RelationalModelGenerationInput(
        schema,
        this.mappingPackage,
        this.mappingPackage,
      );
      const entities =
        (yield this.editorStore.graphManagerState.graphManager.buildRelationalMapping(
          input,
          this.editorStore.graphManagerState.graph,
        )) as Entity[];
      const code =
        (yield this.editorStore.graphManagerState.graphManager.entitiesToPureCode(
          entities,
        )) as string;
      this.generatedModel = code;
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DATABASE_BUILDER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.buildingMappingState.complete();
    }
  }
}

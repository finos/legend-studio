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

import type { Entity } from '@finos/legend-storage';
import {
  type GeneratorFn,
  assertErrorThrown,
  LogEvent,
  guaranteeNonNullable,
  ActionState,
} from '@finos/legend-shared';
import { observable, action, makeObservable, flow, flowResult } from 'mobx';
import { LEGEND_STUDIO_APP_EVENT } from '../../../../../__lib__/LegendStudioEvent.js';
import type { EditorStore } from '../../../EditorStore.js';
import type { Database, PureModel } from '@finos/legend-graph';
import { EntityChangeType, type EntityChange } from '@finos/legend-server-sdlc';

export const GENERATED = 'generated';

export class DatabaseModelBuilderState {
  readonly editorStore: EditorStore;
  readonly isReadOnly: boolean;
  generatingModelState = ActionState.create();
  saveModelState = ActionState.create();
  database: Database;
  showModal = false;
  generatedGrammarCode = '';
  entities: Entity[] | undefined;
  targetPackage: string;
  graph?: PureModel;

  constructor(
    editorStore: EditorStore,
    database: Database,
    isReadOnly: boolean,
  ) {
    makeObservable(this, {
      showModal: observable,
      database: observable,
      generatedGrammarCode: observable,
      generatingModelState: observable,
      graph: observable,
      saveModelState: observable,
      targetPackage: observable,
      close: action,
      setShowModal: action,
      setEntities: action,
      setDatabase: action,
      setDatabaseGrammarCode: action,
      setTargetPackage: action,
      saveModels: flow,
      previewDatabaseModels: flow,
    });
    this.editorStore = editorStore;
    this.database = database;
    this.isReadOnly = isReadOnly;
    this.targetPackage = database.package?.path ?? GENERATED;
  }

  setShowModal(val: boolean): void {
    this.showModal = val;
  }

  setDatabaseGrammarCode(val: string): void {
    this.generatedGrammarCode = val;
  }

  setEntities(val: Entity[] | undefined): void {
    this.entities = val;
  }

  setDatabase(val: Database): void {
    this.database = val;
  }

  close(): void {
    this.setShowModal(false);
    this.editorStore.explorerTreeState.setDatabaseModelBuilderState(undefined);
  }

  setTargetPackage(val: string): void {
    this.targetPackage = val;
  }

  *previewDatabaseModels(): GeneratorFn<void> {
    try {
      this.generatingModelState.isInProgress;
      this.entities = [];
      const entities =
        (yield this.editorStore.graphManagerState.graphManager.generateModelsFromDatabaseSpecification(
          this.database.path,
          this.targetPackage,
          this.graph ?? this.editorStore.graphManagerState.graph,
        )) as Entity[];
      this.setEntities(entities);
      this.setDatabaseGrammarCode(
        (yield this.editorStore.graphManagerState.graphManager.entitiesToPureCode(
          entities,
          { pretty: true },
        )) as string,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DATABASE_MODEL_BUILDER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.generatingModelState.complete();
    }
  }

  *saveModels(): GeneratorFn<void> {
    try {
      this.saveModelState.inProgress();
      const entities = guaranteeNonNullable(this.entities);
      const newEntities: EntityChange[] = [];
      for (const entity of entities) {
        let entityChangeType: EntityChangeType;
        const graph = this.graph ?? this.editorStore.graphManagerState.graph;
        if (graph.getNullableElement(entity.path) === undefined) {
          entityChangeType = EntityChangeType.CREATE;
        } else {
          entityChangeType = EntityChangeType.MODIFY;
        }
        newEntities.push({
          type: entityChangeType,
          entityPath: entity.path,
          content: entity.content,
        });
      }
      this.editorStore.explorerTreeState.setDatabaseModelBuilderState(
        undefined,
      );
      this.setShowModal(false);
      yield flowResult(
        this.editorStore.graphState.loadEntityChangesToGraph(
          newEntities,
          undefined,
        ),
      );
      this.editorStore.applicationStore.notificationService.notifySuccess(
        'Generated models successfully!',
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DATABASE_MODEL_BUILDER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.saveModelState.complete();
    }
  }
}

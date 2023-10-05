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
} from '@finos/legend-shared';
import { observable, action, makeObservable, flow, flowResult } from 'mobx';
import { LEGEND_STUDIO_APP_EVENT } from '../../../../../__lib__/LegendStudioEvent.js';
import type { EditorStore } from '../../../EditorStore.js';
import { DatabaseSchemaExplorerState } from './DatabaseBuilderState.js';
import type { RelationalDatabaseConnection } from '@finos/legend-graph';

export class DatabaseBuilderWizardState {
  readonly editorStore: EditorStore;
  readonly connection: RelationalDatabaseConnection;
  readonly schemaExplorerState: DatabaseSchemaExplorerState;
  readonly isReadOnly: boolean;

  showModal = false;
  databaseGrammarCode = '';

  constructor(
    editorStore: EditorStore,
    connection: RelationalDatabaseConnection,
    isReadOnly: boolean,
  ) {
    makeObservable(this, {
      showModal: observable,
      databaseGrammarCode: observable,
      setShowModal: action,
      setDatabaseGrammarCode: action,
      previewDatabaseModel: flow,
      updateDatabase: flow,
    });

    this.editorStore = editorStore;
    this.connection = connection;
    this.schemaExplorerState = new DatabaseSchemaExplorerState(
      editorStore,
      connection,
    );
    this.isReadOnly = isReadOnly;
  }

  setShowModal(val: boolean): void {
    this.showModal = val;
  }

  setDatabaseGrammarCode(val: string): void {
    this.databaseGrammarCode = val;
  }

  *previewDatabaseModel(): GeneratorFn<void> {
    if (!this.schemaExplorerState.treeData) {
      return;
    }
    try {
      this.setDatabaseGrammarCode(
        (yield this.editorStore.graphManagerState.graphManager.entitiesToPureCode(
          [
            (yield flowResult(
              this.schemaExplorerState.generateDatabase(),
            )) as Entity,
          ],
          { pretty: true },
        )) as string,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.DATABASE_BUILDER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    }
  }

  *updateDatabase(): GeneratorFn<void> {
    if (!this.schemaExplorerState.treeData) {
      return;
    }
    yield flowResult(this.schemaExplorerState.updateDatabaseAndGraph());
    this.setShowModal(false);
  }
}

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
  type GeneratorFn,
  assertErrorThrown,
  LogEvent,
  ActionState,
  uniqBy,
} from '@finos/legend-shared';
import { observable, makeObservable, flow, flowResult, action } from 'mobx';
import { languages as monacoLanguagesAPI } from 'monaco-editor';
import {
  type Database,
  type PackageableConnection,
  guaranteeRelationalDatabaseConnection,
  GRAPH_MANAGER_EVENT,
} from '@finos/legend-graph';
import type { EditorStore } from '../EditorStore.js';

import type { CommandRegistrar } from '@finos/legend-application';
import { STO_RELATIONAL_LEGEND_STUDIO_COMMAND_KEY } from '../../../__lib__/STO_Relational_LegendStudioCommand.js';
import { PANEL_MODE } from '../EditorConfig.js';
import { DatabaseSchemaExplorerState } from '../editor-state/element-editor-state/connection/DatabaseBuilderState.js';
import { AbstractSQLPlaygroundState } from '@finos/legend-lego/sql-playground';

const DEFAULT_SQL_TEXT = `--Start building your SQL. Note that you can also drag-and-drop nodes from schema explorer\n`;

export interface SQL_ExecutionResult {
  value: string;
  sqlDuration: number;
}

export class StudioSQLPlaygroundPanelState
  extends AbstractSQLPlaygroundState
  implements CommandRegistrar
{
  readonly editorStore: EditorStore;

  isFetchingSchema = ActionState.create();
  connection?: PackageableConnection | undefined;
  database?: Database | undefined;
  schemaExplorerState?: DatabaseSchemaExplorerState | undefined;
  databaseSchema: monacoLanguagesAPI.CompletionItem[];

  constructor(editorStore: EditorStore) {
    super();
    makeObservable(this, {
      isFetchingSchema: observable,
      connection: observable,
      database: observable,
      schemaExplorerState: observable,
      databaseSchema: observable,
      setConnection: action,
      setDataBaseSchema: action,
      executeRawSQL: flow,
    });
    this.sqlEditorTextModel?.setValue(DEFAULT_SQL_TEXT);
    this.editorStore = editorStore;
    this.databaseSchema = [];
  }

  setConnection(val: PackageableConnection | undefined): void {
    this.connection = val;
    if (val) {
      const connection = guaranteeRelationalDatabaseConnection(val);
      this.database = connection.store?.value;
      this.schemaExplorerState = new DatabaseSchemaExplorerState(
        this.editorStore,
        connection,
      );
    } else {
      this.database = undefined;
      this.schemaExplorerState = undefined;
    }
    this.sqlEditorTextModel?.setValue(DEFAULT_SQL_TEXT);
  }

  setDataBaseSchema(val: monacoLanguagesAPI.CompletionItem[]): void {
    this.databaseSchema = val;
  }

  fetchSchemaMetaData(): GeneratorFn<void> | undefined {
    return this.schemaExplorerState?.fetchDatabaseMetadata();
  }
  override getCodeCompletionSuggestions(): string[] {
    const base = super.getCodeCompletionSuggestions();
    if (this.schemaExplorerState?.treeData) {
      const dbLabelText = uniqBy(
        Array.from(this.schemaExplorerState.treeData.nodes.values()).map(
          (value) => value.label,
        ),
        (label) => label,
      );
      const dbLabelsCompletionItem = uniqBy(
        dbLabelText.map(
          (value) =>
            ({
              label: value,
              kind: monacoLanguagesAPI.CompletionItemKind.Field,
              insertTextRules:
                monacoLanguagesAPI.CompletionItemInsertTextRule.InsertAsSnippet,
              insertText: `${value} `,
            }) as monacoLanguagesAPI.CompletionItem,
        ),
        (val) => val.label,
      );
      this.setDataBaseSchema(dbLabelsCompletionItem);
      return base.concat(dbLabelText);
    }
    return base;
  }

  override registerCommands(): void {
    this.editorStore.applicationStore.commandService.registerCommand({
      key: STO_RELATIONAL_LEGEND_STUDIO_COMMAND_KEY.SQL_PLAYGROUND_EXECUTE,
      trigger: () =>
        this.editorStore.isInitialized &&
        this.editorStore.activePanelMode === PANEL_MODE.SQL_PLAYGROUND &&
        Boolean(this.connection) &&
        Boolean(this.sqlText.length),
      action: () => {
        flowResult(this.executeRawSQL()).catch(
          this.editorStore.applicationStore.alertUnhandledError,
        );
      },
    });
  }

  override deregisterCommands(): void {
    [STO_RELATIONAL_LEGEND_STUDIO_COMMAND_KEY.SQL_PLAYGROUND_EXECUTE].forEach(
      (key) =>
        this.editorStore.applicationStore.commandService.deregisterCommand(key),
    );
  }

  override *executeRawSQL(): GeneratorFn<void> {
    if (!this.connection || this.executeRawSQLState.isInProgress) {
      return;
    }

    try {
      this.executeRawSQLState.inProgress();

      let sql = this.sqlText;
      const currentSelection = this.sqlEditor?.getSelection();
      if (currentSelection) {
        const selectionValue =
          this.sqlEditorTextModel.getValueInRange(currentSelection);
        if (selectionValue.trim() !== '') {
          sql = selectionValue;
        }
      }
      const start = Date.now();
      const value =
        (yield this.editorStore.graphManagerState.graphManager.executeRawSQL(
          guaranteeRelationalDatabaseConnection(this.connection),
          sql,
        )) as string;
      this.sqlExecutionResult = {
        value: value,
        sqlDuration: Date.now() - start,
      };
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.executeRawSQLState.complete();
    }
  }
}

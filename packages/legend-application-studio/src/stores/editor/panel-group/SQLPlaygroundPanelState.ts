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
} from '@finos/legend-shared';
import { observable, makeObservable, flow, flowResult, action } from 'mobx';
import { editor as monacoEditorAPI } from 'monaco-editor';
import {
  type Database,
  type PackageableConnection,
  guaranteeRelationalDatabaseConnection,
  GRAPH_MANAGER_EVENT,
} from '@finos/legend-graph';
import type { EditorStore } from '../EditorStore.js';
import {
  CODE_EDITOR_LANGUAGE,
  moveCursorToPosition,
} from '@finos/legend-code-editor';
import type { CommandRegistrar } from '@finos/legend-application';
import { STO_RELATIONAL_LEGEND_STUDIO_COMMAND_KEY } from '../../../__lib__/STO_Relational_LegendStudioCommand.js';
import { PANEL_MODE } from '../EditorConfig.js';
import { DatabaseSchemaExplorerState } from '../editor-state/element-editor-state/connection/DatabaseBuilderState.js';

const DEFAULT_SQL_TEXT = `--Start building your SQL. Note that you can also drag-and-drop nodes from schema explorer\n`;

export interface SQL_ExecutionResult {
  value: string;
  sqlDuration: number;
}

export class SQLPlaygroundPanelState implements CommandRegistrar {
  readonly editorStore: EditorStore;

  isFetchingSchema = ActionState.create();
  executeRawSQLState = ActionState.create();

  connection?: PackageableConnection | undefined;
  database?: Database | undefined;
  schemaExplorerState?: DatabaseSchemaExplorerState | undefined;

  readonly sqlEditorTextModel: monacoEditorAPI.ITextModel;
  sqlEditor?: monacoEditorAPI.IStandaloneCodeEditor | undefined;
  sqlEditorViewState?: monacoEditorAPI.ICodeEditorViewState | undefined;
  sqlText = DEFAULT_SQL_TEXT;
  sqlExecutionResult?: SQL_ExecutionResult | undefined;

  isLocalModeEnabled = false;

  constructor(editorStore: EditorStore) {
    makeObservable(this, {
      isFetchingSchema: observable,
      executeRawSQLState: observable,
      connection: observable,
      database: observable,
      schemaExplorerState: observable,
      sqlText: observable,
      isLocalModeEnabled: observable,
      sqlExecutionResult: observable,
      sqlEditor: observable.ref,
      sqlEditorViewState: observable.ref,
      stopExecuteSQL: action,
      toggleIsLocalModeEnabled: action,
      setConnection: action,
      setSQLEditor: action,
      setSQLEditorViewState: action,
      setSQLText: action,
      executeRawSQL: flow,
    });

    this.editorStore = editorStore;
    this.sqlEditorTextModel = monacoEditorAPI.createModel(
      this.sqlText,
      CODE_EDITOR_LANGUAGE.SQL,
    );
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
    this.sqlEditorTextModel.setValue(DEFAULT_SQL_TEXT);
  }

  setSQLText(val: string): void {
    this.sqlText = val;
  }

  setSQLEditor(val: monacoEditorAPI.IStandaloneCodeEditor | undefined): void {
    this.sqlEditor = val;
    if (val) {
      const lines = this.sqlText.split('\n');
      moveCursorToPosition(val, {
        lineNumber: lines.length,
        column: lines.at(-1)?.length ?? 0,
      });
    }
  }

  stopExecuteSQL(): void {
    this.sqlExecutionResult = undefined;
  }

  setSQLEditorViewState(
    val: monacoEditorAPI.ICodeEditorViewState | undefined,
  ): void {
    this.sqlEditorViewState = val;
  }

  registerCommands(): void {
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

  deregisterCommands(): void {
    [STO_RELATIONAL_LEGEND_STUDIO_COMMAND_KEY.SQL_PLAYGROUND_EXECUTE].forEach(
      (key) =>
        this.editorStore.applicationStore.commandService.deregisterCommand(key),
    );
  }

  toggleIsLocalModeEnabled(): void {
    this.isLocalModeEnabled = !this.isLocalModeEnabled;
    this.sqlExecutionResult = undefined;
  }

  *executeRawSQL(): GeneratorFn<void> {
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

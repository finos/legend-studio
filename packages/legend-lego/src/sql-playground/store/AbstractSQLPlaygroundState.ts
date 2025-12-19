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

import { ActionState, type GeneratorFn } from '@finos/legend-shared';
import * as monaco from 'monaco-editor';
import type { CommandRegistrar } from '@finos/legend-application';
import {
  CODE_EDITOR_LANGUAGE,
  moveCursorToPosition,
} from '@finos/legend-code-editor';
import { action, makeObservable, observable } from 'mobx';

export type SQLPlaygroundTheme = 'light' | 'dark';
export interface SQL_ExecutionResult {
  value: string;
  sqlDuration: number;
}
const SQL_KEYWORDS = [
  'AND',
  'AS',
  'ASC',
  'BETWEEN',
  'DESC',
  'DISTINCT',
  'EXEC',
  'EXISTS',
  'FROM',
  'FULL OUTER JOIN',
  'GROUP BY',
  'HAVING',
  'IN',
  'INNER JOIN',
  'IS NULL',
  'IS NOT NULL',
  'JOIN',
  'LEFT JOIN',
  'LIKE',
  'LIMIT',
  'NOT',
  'NOT NULL',
  'OR',
  'ORDER BY',
  'OUTER JOIN',
  'RIGHT JOIN',
  'SELECT',
  'SELECT DISTINCT',
  'SELECT INTO',
  'SELECT TOP',
  'TOP',
  'UNION',
  'UNION ALL',
  'UNIQUE',
  'WHERE',
];

export abstract class AbstractSQLPlaygroundState implements CommandRegistrar {
  theme: SQLPlaygroundTheme;
  sqlText = '';
  executeRawSQLState: ActionState;
  sqlExecutionResult?: SQL_ExecutionResult | undefined;
  sqlEditorViewState: monaco.editor.ICodeEditorViewState | undefined;
  sqlEditorTextModel: monaco.editor.ITextModel;
  sqlEditor?: monaco.editor.IStandaloneCodeEditor | undefined;
  isLocalModeEnabled: boolean;

  constructor() {
    this.sqlEditorTextModel = monaco.editor.createModel(
      this.sqlText,
      CODE_EDITOR_LANGUAGE.SQL,
    );
    this.isLocalModeEnabled = false;
    this.executeRawSQLState = ActionState.create();
    this.theme = 'light';
    makeObservable(this, {
      sqlExecutionResult: observable,
      isLocalModeEnabled: observable,
      sqlText: observable,
      executeRawSQLState: observable,
      stopExecuteSQL: action,
      setSQLEditor: action,
      setSQLEditorViewState: action,
      setSQLText: action,
      setTheme: action,
      toggleIsLocalModeEnabled: action,
      sqlEditorViewState: observable.ref,
      sqlEditor: observable.ref,
    });
  }

  abstract executeRawSQL(): GeneratorFn<void>;
  abstract registerCommands(): void;
  abstract deregisterCommands(): void;

  getCodeCompletionSuggestions(): string[] {
    return SQL_KEYWORDS;
  }

  stopExecuteSQL(): void {
    this.sqlExecutionResult = undefined;
  }

  setSqlExecutionResult(val: SQL_ExecutionResult | undefined) {
    this.sqlExecutionResult = val;
  }

  setSQLText(val: string): void {
    this.sqlText = val;
  }

  setTheme(val: SQLPlaygroundTheme): void {
    this.theme = val;
  }

  setSQLEditorViewState(
    state: monaco.editor.ICodeEditorViewState | undefined,
  ): void {
    this.sqlEditorViewState = state;
  }

  setSQLEditor(val: monaco.editor.IStandaloneCodeEditor | undefined): void {
    this.sqlEditor = val;
    if (val) {
      const lines = this.sqlText.split('\n');
      moveCursorToPosition(val, {
        lineNumber: lines.length,
        column: lines.at(-1)?.length ?? 0,
      });
    }
  }

  toggleIsLocalModeEnabled(): void {
    this.isLocalModeEnabled = !this.isLocalModeEnabled;
    this.sqlExecutionResult = undefined;
  }

  get isExecuting(): boolean {
    return this.executeRawSQLState.isInProgress;
  }

  get hasResult(): boolean {
    return this.sqlExecutionResult !== undefined;
  }
}

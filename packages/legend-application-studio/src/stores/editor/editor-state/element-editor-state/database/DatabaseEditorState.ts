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

import { action, computed, makeObservable, observable } from 'mobx';
import { ElementEditorState } from '../ElementEditorState.js';
import type { EditorStore } from '../../../EditorStore.js';
import {
  type PackageableElement,
  type Schema,
  type Table,
  type Column,
  Database,
} from '@finos/legend-graph';
import { guaranteeType } from '@finos/legend-shared';

export class DatabaseEditorState extends ElementEditorState {
  selectedSchema: Schema | undefined;
  selectedTable: Table | undefined;
  selectedColumn: Column | undefined;
  isLoadingSchemas = false;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      selectedSchema: observable,
      selectedTable: observable,
      selectedColumn: observable,
      isLoadingSchemas: observable,
      database: computed,
      setSelectedSchema: action,
      setSelectedTable: action,
      setSelectedColumn: action,
      setIsLoadingSchemas: action,
    });
  }

  get database(): Database {
    return guaranteeType(
      this.element,
      Database,
      'Element inside database editor state must be a database',
    );
  }

  setSelectedSchema(schema: Schema | undefined): void {
    this.selectedSchema = schema;
    this.selectedTable = undefined;
    this.selectedColumn = undefined;
  }

  setSelectedTable(table: Table | undefined): void {
    this.selectedTable = table;
    this.selectedColumn = undefined;
  }

  setSelectedColumn(column: Column | undefined): void {
    this.selectedColumn = column;
  }

  setIsLoadingSchemas(isLoading: boolean): void {
    this.isLoadingSchemas = isLoading;
  }

  reprocess(
    newElement: Database,
    editorStore: EditorStore,
  ): DatabaseEditorState {
    const databaseEditorState = new DatabaseEditorState(
      editorStore,
      newElement,
    );
    return databaseEditorState;
  }
}

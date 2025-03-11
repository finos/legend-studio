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

import type { Database, PackageableElement } from '@finos/legend-graph';
import type { ElementEditorState } from '../ElementEditorState.js';
import { observable, action, makeObservable } from 'mobx';
import { EditorStore } from '../../../EditorStore.js';

export enum DATABASE_EDITOR_TAB {
  GENERAL = 'General',
  SCHEMAS = 'Schemas',
  JOINS = 'Joins',
  FILTERS = 'Filters',
  QUERY = 'Query',
}

export class DatabaseEditorState implements ElementEditorState {
  readonly editorStore: EditorStore;
  readonly database: Database;
  queryDatabaseState: unknown | undefined;

  @observable selectedTab = DATABASE_EDITOR_TAB.GENERAL;

  constructor(editorStore: EditorStore, database: Database) {
    makeObservable(this);
    this.editorStore = editorStore;
    this.database = database;
  }

  get element(): PackageableElement {
    return this.database;
  }

  get isReadOnly(): boolean {
    return this.editorStore.isReadOnly;
  }

  @action setSelectedTab(tab: DATABASE_EDITOR_TAB): void {
    this.selectedTab = tab;
  }
}

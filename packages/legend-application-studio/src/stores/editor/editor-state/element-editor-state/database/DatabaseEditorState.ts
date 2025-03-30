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
import { Database } from '@finos/legend-graph';
import type { EditorStore } from '../../../EditorStore.js';
import type { PackageableElement } from '@finos/legend-graph';
import { ElementEditorState } from '../ElementEditorState.js';
import { QueryDatabaseState } from './QueryDatabaseState.js';

export enum DATABASE_EDITOR_TAB {
  GENERAL = 'GENERAL',
  SCHEMAS = 'SCHEMAS',
  JOINS = 'JOINS',
  FILTERS = 'FILTERS',
  QUERY = 'QUERY',
}

export class DatabaseEditorState extends ElementEditorState {
  readonly queryDatabaseState: QueryDatabaseState;
  selectedTab: DATABASE_EDITOR_TAB;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      selectedTab: observable,
      database: computed,
      setSelectedTab: action,
    });

    this.selectedTab = DATABASE_EDITOR_TAB.GENERAL;
    this.queryDatabaseState = new QueryDatabaseState(
      this.database,
      this.editorStore,
    );
  }

  get database(): Database {
    return this.element as Database;
  }

  setSelectedTab(tab: DATABASE_EDITOR_TAB): void {
    this.selectedTab = tab;
  }

  reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState {
    return new DatabaseEditorState(editorStore, newElement);
  }
}

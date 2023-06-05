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

import { computed, action, makeObservable, observable } from 'mobx';
import { Database, type PackageableElement } from '@finos/legend-graph';
import { ElementEditorState } from '../ElementEditorState.js';
import type { EditorStore } from '../../../EditorStore.js';
import { guaranteeType } from '@finos/legend-shared';
import { RelationalMappingBuilderState } from './RelationalMappingBuilderState.js';

export enum STORE_DATABASE_TAB_TYPE {
  GENERAL = 'General',
  BUILD_MAPPING = 'BUILD_MAPPING',
}

export class DatabaseEditorState extends ElementEditorState {
  selectedTab = STORE_DATABASE_TAB_TYPE.GENERAL;
  readonly relationalMappingBuilderState: RelationalMappingBuilderState;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      database: computed,
      reprocess: action,
      selectedTab: observable,
      setSelectedTab: action,
    });
    this.relationalMappingBuilderState = new RelationalMappingBuilderState(
      this.editorStore,
      this.database,
    );
  }

  get database(): Database {
    return guaranteeType(
      this.element,
      Database,
      `Element inside connection editor state must be a packageable connection`,
    );
  }

  setSelectedTab(val: STORE_DATABASE_TAB_TYPE): void {
    this.selectedTab = val;
  }

  reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState {
    const editorState = new DatabaseEditorState(editorStore, newElement);

    return editorState;
  }
}

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

import type { QueryBuilderState } from './QueryBuilderState';
import { makeAutoObservable, action } from 'mobx';
import type { DEPRECATED_GraphFetchTreeData } from './DEPRECATED_QueryBuilderGraphFetchTreeUtil';
import {
  DEPRECATED_buildGraphFetchTreeData,
  DEPREACTED_getGraphFetchTreeData,
} from './DEPRECATED_QueryBuilderGraphFetchTreeUtil';
import type { EditorStore, RootGraphFetchTree } from '@finos/legend-studio';

export class QueryBuilderGraphFetchTreeState {
  editorStore: EditorStore;
  queryBuilderState: QueryBuilderState;
  DEPRECATED_graphFetchTree?: DEPRECATED_GraphFetchTreeData;

  constructor(editorStore: EditorStore, queryBuilderState: QueryBuilderState) {
    makeAutoObservable(this, {
      editorStore: false,
      queryBuilderState: false,
      setGraphFetchTree: action,
    });

    this.editorStore = editorStore;
    this.queryBuilderState = queryBuilderState;
  }

  setGraphFetchTree(
    graphFetchTree: DEPRECATED_GraphFetchTreeData | undefined,
  ): void {
    this.DEPRECATED_graphFetchTree = graphFetchTree;
  }

  init(rootGraphFetchTree?: RootGraphFetchTree): void {
    if (this.queryBuilderState.fetchStructureState.isGraphFetchMode()) {
      if (rootGraphFetchTree) {
        this.setGraphFetchTree(
          DEPRECATED_buildGraphFetchTreeData(
            this.editorStore,
            rootGraphFetchTree,
            this.queryBuilderState.querySetupState.mapping,
          ),
        );
      } else {
        const _class = this.queryBuilderState.querySetupState._class;
        if (_class) {
          this.setGraphFetchTree(
            DEPREACTED_getGraphFetchTreeData(
              this.editorStore,
              _class,
              this.queryBuilderState.querySetupState.mapping,
            ),
          );
        } else {
          this.setGraphFetchTree(undefined);
        }
      }
    }
  }
}

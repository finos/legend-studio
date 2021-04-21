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
import type { GraphFetchTreeData } from './QueryBuilderGraphFetchTreeUtil';
import {
  buildGraphFetchTreeData,
  getGraphFetchTreeData,
} from './QueryBuilderGraphFetchTreeUtil';
import type { EditorStore, RootGraphFetchTree } from '@finos/legend-studio';

export class QueryBuilderGraphFetchTreeState {
  editorStore: EditorStore;
  queryBuilderState: QueryBuilderState;
  graphFetchTree?: GraphFetchTreeData;

  constructor(editorStore: EditorStore, queryBuilderState: QueryBuilderState) {
    makeAutoObservable(this, {
      editorStore: false,
      queryBuilderState: false,
      setGraphFetchTree: action,
    });

    this.editorStore = editorStore;
    this.queryBuilderState = queryBuilderState;
  }

  setGraphFetchTree(graphFetchTree: GraphFetchTreeData | undefined): void {
    this.graphFetchTree = graphFetchTree;
  }

  init(rootGraphFetchTree?: RootGraphFetchTree): void {
    if (this.queryBuilderState.fetchStructureState.isGraphFetchMode()) {
      if (rootGraphFetchTree) {
        this.setGraphFetchTree(
          buildGraphFetchTreeData(
            this.editorStore,
            rootGraphFetchTree,
            this.queryBuilderState.querySetupState.mapping,
          ),
        );
      } else {
        const _class = this.queryBuilderState.querySetupState._class;
        if (_class) {
          this.setGraphFetchTree(
            getGraphFetchTreeData(
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

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
import type { EditorStore } from '@finos/legend-studio';
import {
  PackageableElementExplicitReference,
  RootGraphFetchTree,
} from '@finos/legend-studio';
import type { QueryBuilderGraphFetchTreeData } from './QueryBuilderGraphFetchTreeUtil';
import {
  addQueryBuilderPropertyNode,
  buildGraphFetchTreeData,
} from './QueryBuilderGraphFetchTreeUtil';
import type { QueryBuilderExplorerTreePropertyNodeData } from './QueryBuilderExplorerState';

export class QueryBuilderGraphFetchTreeState {
  editorStore: EditorStore;
  queryBuilderState: QueryBuilderState;
  treeData?: QueryBuilderGraphFetchTreeData;

  constructor(editorStore: EditorStore, queryBuilderState: QueryBuilderState) {
    makeAutoObservable(this, {
      editorStore: false,
      queryBuilderState: false,
      setGraphFetchTree: action,
    });

    this.editorStore = editorStore;
    this.queryBuilderState = queryBuilderState;
  }

  setGraphFetchTree(val: QueryBuilderGraphFetchTreeData | undefined): void {
    this.treeData = val;
  }

  init(tree?: RootGraphFetchTree): void {
    if (this.queryBuilderState.fetchStructureState.isGraphFetchMode()) {
      if (tree) {
        this.setGraphFetchTree(buildGraphFetchTreeData(tree));
      } else {
        const _class = this.queryBuilderState.querySetupState._class;
        if (_class) {
          this.setGraphFetchTree(
            buildGraphFetchTreeData(
              new RootGraphFetchTree(
                PackageableElementExplicitReference.create(_class),
              ),
            ),
          );
        } else {
          this.setGraphFetchTree(undefined);
        }
      }
    }
  }

  addProperty(node: QueryBuilderExplorerTreePropertyNodeData): void {
    if (this.treeData) {
      addQueryBuilderPropertyNode(
        this.treeData,
        this.queryBuilderState.explorerState.nonNullableTreeData,
        node,
      );
      this.setGraphFetchTree({ ...this.treeData });
    }
  }
}

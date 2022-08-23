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

import type { QueryBuilderState } from '../../QueryBuilderState.js';
import { makeAutoObservable, action } from 'mobx';
import {
  PackageableElementExplicitReference,
  RootGraphFetchTree,
} from '@finos/legend-graph';
import {
  type QueryBuilderGraphFetchTreeData,
  addQueryBuilderPropertyNode,
  buildGraphFetchTreeData,
} from './QueryBuilderGraphFetchTreeUtil.js';
import type { QueryBuilderExplorerTreePropertyNodeData } from '../../explorer/QueryBuilderExplorerState.js';
import { assertNonNullable } from '@finos/legend-shared';
import { QueryBuilderFetchStructureImplementationState } from '../QueryBuilderFetchStructureImplementationState.js';

export class QueryBuilderGraphFetchTreeState extends QueryBuilderFetchStructureImplementationState {
  treeData?: QueryBuilderGraphFetchTreeData | undefined;
  /**
   * If set to `true` we will use `graphFetchChecked` function instead of `graphFetch`.
   * `graphFetchChecked` will do extra checks on constraints and only work on M2M use case for now.
   * Hence we default this to `false` for graph fetch to work universally.
   */
  isChecked = false;

  constructor(queryBuilderState: QueryBuilderState) {
    super(queryBuilderState);

    makeAutoObservable(this, {
      queryBuilderState: false,
      setGraphFetchTree: action,
      setChecked: action,
    });

    this.queryBuilderState = queryBuilderState;
  }

  setGraphFetchTree(val: QueryBuilderGraphFetchTreeData | undefined): void {
    this.treeData = val;
  }

  setChecked(val: boolean): void {
    this.isChecked = val;
  }

  initialize(tree?: RootGraphFetchTree): void {
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

  addProperty(node: QueryBuilderExplorerTreePropertyNodeData): void {
    if (!this.treeData) {
      this.initialize();
    }
    assertNonNullable(
      this.treeData,
      `Graph-fetch tree has not been properly initialized`,
    );
    addQueryBuilderPropertyNode(
      this.treeData,
      this.queryBuilderState.explorerState.nonNullableTreeData,
      node,
      this.queryBuilderState,
    );
    this.setGraphFetchTree({ ...this.treeData });
  }
}

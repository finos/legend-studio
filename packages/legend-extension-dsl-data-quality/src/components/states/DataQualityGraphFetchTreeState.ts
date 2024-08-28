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

import { type Hashable, hashArray } from '@finos/legend-shared';
import {
  type DataQualityGraphFetchTreeData,
  type DataQualityGraphFetchTreeNodeData,
  updateNodeConstraints,
  addQueryBuilderPropertyNode,
  buildGraphFetchTreeData,
} from '../utils/DataQualityGraphFetchTreeUtil.js';
import type { DataQualityState } from './DataQualityState.js';
import { action, makeObservable, observable } from 'mobx';
import {
  type Class,
  type Constraint,
  PackageableElementExplicitReference,
} from '@finos/legend-graph';
import type {
  QueryBuilderExplorerTreePropertyNodeData,
  QueryBuilderExplorerTreeRootNodeData,
} from '@finos/legend-query-builder';
import { DataQualityRootGraphFetchTree } from '../../graph/metamodel/pure/packageableElements/data-quality/DataQualityGraphFetchTree.js';
import { DATA_QUALITY_HASH_STRUCTURE } from '../../graph/metamodel/DSL_DataQuality_HashUtils.js';

export class DataQualityGraphFetchTreeState implements Hashable {
  readonly dataQualityState: DataQualityState;
  treeData?: DataQualityGraphFetchTreeData | undefined;

  constructor(dataQualityState: DataQualityState) {
    makeObservable(this, {
      treeData: observable.ref,
      setGraphFetchTree: action,
    });

    this.dataQualityState = dataQualityState;
    this.updateTreeData(
      this.dataQualityState.dataQualityQueryBuilderState.class,
    );
  }
  setGraphFetchTree(val: DataQualityGraphFetchTreeData | undefined): void {
    this.treeData = val;
  }

  private updateTreeData(_class: Class | undefined): void {
    this.setGraphFetchTree(
      _class
        ? buildGraphFetchTreeData(
            this.dataQualityState.editorStore,
            new DataQualityRootGraphFetchTree(
              PackageableElementExplicitReference.create(_class),
            ),
            false,
            false,
            false,
          )
        : undefined,
    );
  }

  updateNode(
    node: DataQualityGraphFetchTreeNodeData,
    constraints: Constraint[],
    addConstraint: boolean,
  ): void {
    if (!this.treeData) {
      this.dataQualityState.applicationStore.notificationService.notifyWarning(
        `Can't add property: data quality graph-fetch tree has not been properly initialized`,
      );
      return;
    }
    updateNodeConstraints(this.treeData, node, constraints, addConstraint);
    this.setGraphFetchTree({ ...this.treeData });
  }

  addProperty(
    node:
      | QueryBuilderExplorerTreePropertyNodeData
      | QueryBuilderExplorerTreeRootNodeData,
    options?: {
      refreshTreeData?: boolean;
    },
  ): void {
    if (!this.treeData) {
      this.dataQualityState.applicationStore.notificationService.notifyWarning(
        `Can't add property: data quality graph-fetch tree has not been properly initialized`,
      );
      return;
    }
    addQueryBuilderPropertyNode(
      this.treeData,
      this.dataQualityState.dataQualityQueryBuilderState.explorerState
        .nonNullableTreeData,
      node,
      this.dataQualityState,
    );
    if (options?.refreshTreeData) {
      this.setGraphFetchTree({ ...this.treeData });
    }
  }

  get hashCode(): string {
    return hashArray([
      DATA_QUALITY_HASH_STRUCTURE.DATA_QUALITY_GRAPH_FETCH_STATE,
      this.treeData?.tree ?? '',
    ]);
  }
}

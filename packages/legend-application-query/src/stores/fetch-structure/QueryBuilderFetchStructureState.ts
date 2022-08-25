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

import { action, makeAutoObservable } from 'mobx';
import type { QueryBuilderState } from '../QueryBuilderState.js';
import { QueryBuilderGraphFetchTreeState } from './graph-fetch/QueryBuilderGraphFetchTreeState.js';
import { QueryBuilderProjectionState } from './projection/QueryBuilderProjectionState.js';
import {
  buildPropertyExpressionFromExplorerTreeNodeData,
  type QueryBuilderExplorerTreeNodeData,
  QueryBuilderExplorerTreePropertyNodeData,
} from '../explorer/QueryBuilderExplorerState.js';
import { Class } from '@finos/legend-graph';
import { filterByType, UnsupportedOperationError } from '@finos/legend-shared';
import { addQueryBuilderPropertyNode } from './graph-fetch/QueryBuilderGraphFetchTreeUtil.js';
import { QueryBuilderSimpleProjectionColumnState } from './projection/QueryBuilderProjectionColumnState.js';
import {
  FETCH_STRUCTURE_IMPLEMENTATION,
  type QueryBuilderFetchStructureImplementationState,
} from './QueryBuilderFetchStructureImplementationState.js';

export class QueryBuilderFetchStructureState {
  queryBuilderState: QueryBuilderState;
  projectionState: QueryBuilderProjectionState;
  graphFetchTreeState: QueryBuilderGraphFetchTreeState;
  implementation: QueryBuilderFetchStructureImplementationState;

  constructor(queryBuilderState: QueryBuilderState) {
    makeAutoObservable(this, {
      queryBuilderState: false,
      changeImplementation: action,
    });

    this.queryBuilderState = queryBuilderState;
    // TODO: we probably should modularize this a bit better
    // See https://github.com/finos/legend-studio/issues/731
    this.projectionState = new QueryBuilderProjectionState(
      queryBuilderState,
      this,
    );
    this.graphFetchTreeState = new QueryBuilderGraphFetchTreeState(
      queryBuilderState,
      this,
    );
    /**
     * TODO?: perhaps it would eventually make sense to default to
     * graph-fetch since `getAll()` naturally works for graph-fetch case
     * and graph-fetch allows somewhat an empty tree
     */
    this.implementation = this.projectionState;
  }

  // TODO-BEFORE-PR: can we use the `recreate()` method here somehow?
  changeImplementation(type: string): void {
    switch (type) {
      case FETCH_STRUCTURE_IMPLEMENTATION.PROJECTION: {
        this.implementation = new QueryBuilderProjectionState(
          this.queryBuilderState,
          this,
        );
        return;
      }
      case FETCH_STRUCTURE_IMPLEMENTATION.GRAPH_FETCH: {
        const graphFetchTreeState = new QueryBuilderGraphFetchTreeState(
          this.queryBuilderState,
          this,
        );
        graphFetchTreeState.initialize();
        this.implementation = graphFetchTreeState;
        return;
      }
      default:
        throw new UnsupportedOperationError(
          `Can't change fetch-structure implementation to unsupport type: '${type}'`,
        );
    }
  }

  // TODO-BEFORE-PR: refactor this
  fetchProperty(node: QueryBuilderExplorerTreeNodeData): void {
    if (
      node instanceof QueryBuilderExplorerTreePropertyNodeData &&
      !(node.type instanceof Class)
    ) {
      if (this.implementation instanceof QueryBuilderGraphFetchTreeState) {
        this.implementation.addProperty(node);
      } else if (this.implementation instanceof QueryBuilderProjectionState) {
        this.implementation.addColumn(
          new QueryBuilderSimpleProjectionColumnState(
            this.implementation,
            buildPropertyExpressionFromExplorerTreeNodeData(
              this.queryBuilderState.explorerState.nonNullableTreeData,
              node,
              this.queryBuilderState.graphManagerState.graph,
              this.queryBuilderState.explorerState.propertySearchPanelState
                .allMappedPropertyNodes,
            ),
            this.queryBuilderState.explorerState.humanizePropertyName,
          ),
        );
      }
    }
  }

  fetchNodeChildrenProperties(node: QueryBuilderExplorerTreeNodeData): void {
    if (node.type instanceof Class) {
      // NOTE: here we require the node to already been expanded so the child nodes are generated
      // we don't allow adding unopened node. Maybe if it helps, we can show a warning.
      const nodesToAdd = node.childrenIds
        .map((childId) =>
          this.queryBuilderState.explorerState.nonNullableTreeData.nodes.get(
            childId,
          ),
        )
        .filter(filterByType(QueryBuilderExplorerTreePropertyNodeData))
        .filter(
          (childNode) =>
            !(childNode.type instanceof Class) && childNode.mappingData.mapped,
        );

      if (this.implementation instanceof QueryBuilderGraphFetchTreeState) {
        const graphFetchTreeData = this.implementation.treeData;
        if (graphFetchTreeData) {
          nodesToAdd.forEach((nodeToAdd) =>
            addQueryBuilderPropertyNode(
              graphFetchTreeData,
              this.queryBuilderState.explorerState.nonNullableTreeData,
              nodeToAdd,
              this.queryBuilderState,
            ),
          );
          this.graphFetchTreeState.setGraphFetchTree({
            ...graphFetchTreeData,
          });
        }
      } else if (this.implementation instanceof QueryBuilderProjectionState) {
        nodesToAdd.forEach((nodeToAdd) => {
          this.projectionState.addColumn(
            new QueryBuilderSimpleProjectionColumnState(
              this.projectionState,
              buildPropertyExpressionFromExplorerTreeNodeData(
                this.queryBuilderState.explorerState.nonNullableTreeData,
                nodeToAdd,
                this.queryBuilderState.graphManagerState.graph,
                this.queryBuilderState.explorerState.propertySearchPanelState
                  .allMappedPropertyNodes,
              ),
              this.queryBuilderState.explorerState.humanizePropertyName,
            ),
          );
        });
      }
    }
  }

  get validationIssues(): string[] | undefined {
    if (this.implementation instanceof QueryBuilderProjectionState) {
      return this.implementation.validationIssues;
    }
    return undefined;
  }
}

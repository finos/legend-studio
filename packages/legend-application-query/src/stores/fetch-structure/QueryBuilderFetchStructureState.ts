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
import {
  QueryBuilderProjectionState,
  QueryBuilderSimpleProjectionColumnState,
} from './projection/QueryBuilderProjectionState.js';
import {
  buildPropertyExpressionFromExplorerTreeNodeData,
  type QueryBuilderExplorerTreeNodeData,
  QueryBuilderExplorerTreePropertyNodeData,
} from '../explorer/QueryBuilderExplorerState.js';
import { Class } from '@finos/legend-graph';
import { filterByType } from '@finos/legend-shared';
import { addQueryBuilderPropertyNode } from './graph-fetch/QueryBuilderGraphFetchTreeUtil.js';

export enum FETCH_STRUCTURE_MODE {
  PROJECTION = 'PROJECTION',
  GRAPH_FETCH = 'GRAPH_FETCH',
}

export class QueryBuilderFetchStructureState {
  queryBuilderState: QueryBuilderState;
  /**
   * TODO: refactor this so we could reduce this to
   * `implementationState: QueryBuilderFetchStructureImplementationState`
   * so we don't have graph fetch and projection at the same time
   *
   * TODO?: perhaps it would eventually make sense to default to
   * graph-fetch since `getAll()` naturally works for graph-fetch case
   * and graph-fetch allows somewhat an empty tree
   */
  fetchStructureMode = FETCH_STRUCTURE_MODE.PROJECTION;
  projectionState: QueryBuilderProjectionState;
  graphFetchTreeState: QueryBuilderGraphFetchTreeState;

  constructor(queryBuilderState: QueryBuilderState) {
    makeAutoObservable(this, {
      queryBuilderState: false,
      setFetchStructureMode: action,
    });

    this.queryBuilderState = queryBuilderState;
    // TODO: we probably should modularize this a bit better
    // See https://github.com/finos/legend-studio/issues/731
    this.projectionState = new QueryBuilderProjectionState(queryBuilderState);
    this.graphFetchTreeState = new QueryBuilderGraphFetchTreeState(
      queryBuilderState,
    );
  }

  setFetchStructureMode(val: FETCH_STRUCTURE_MODE): void {
    this.fetchStructureMode = val;
  }

  fetchProperty(node: QueryBuilderExplorerTreeNodeData): void {
    if (
      node instanceof QueryBuilderExplorerTreePropertyNodeData &&
      !(node.type instanceof Class)
    ) {
      switch (this.fetchStructureMode) {
        case FETCH_STRUCTURE_MODE.GRAPH_FETCH: {
          this.graphFetchTreeState.addProperty(node);
          return;
        }
        case FETCH_STRUCTURE_MODE.PROJECTION: {
          this.projectionState.addColumn(
            new QueryBuilderSimpleProjectionColumnState(
              this.projectionState,
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
          return;
        }
        default:
          return;
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

      switch (this.fetchStructureMode) {
        case FETCH_STRUCTURE_MODE.GRAPH_FETCH: {
          const graphFetchTreeData = this.graphFetchTreeState.treeData;
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
          return;
        }
        case FETCH_STRUCTURE_MODE.PROJECTION: {
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
          return;
        }
        default:
          return;
      }
    }
  }

  get validationIssues(): string[] | undefined {
    switch (this.fetchStructureMode) {
      case FETCH_STRUCTURE_MODE.PROJECTION:
        return this.projectionState.validationIssues;
      case FETCH_STRUCTURE_MODE.GRAPH_FETCH:
      default:
        return undefined;
    }
  }
}

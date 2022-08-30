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
  type QueryBuilderExplorerTreeNodeData,
  QueryBuilderExplorerTreePropertyNodeData,
} from '../explorer/QueryBuilderExplorerState.js';
import { Class } from '@finos/legend-graph';
import { filterByType, UnsupportedOperationError } from '@finos/legend-shared';
import {
  FETCH_STRUCTURE_IMPLEMENTATION,
  type QueryBuilderFetchStructureImplementationState,
} from './QueryBuilderFetchStructureImplementationState.js';

export class QueryBuilderFetchStructureState {
  queryBuilderState: QueryBuilderState;
  implementation: QueryBuilderFetchStructureImplementationState;

  constructor(queryBuilderState: QueryBuilderState) {
    makeAutoObservable(this, {
      queryBuilderState: false,
      changeImplementation: action,
    });

    this.queryBuilderState = queryBuilderState;
    /**
     * TODO?: perhaps it would eventually make sense to default to
     * graph-fetch since `getAll()` naturally works for graph-fetch case
     * and graph-fetch allows somewhat an empty tree
     *
     * TODO?: we could consider making this configurable
     */
    this.implementation = new QueryBuilderProjectionState(
      this.queryBuilderState,
      this,
    );
  }

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
        this.implementation = new QueryBuilderGraphFetchTreeState(
          this.queryBuilderState,
          this,
        );
        return;
      }
      default:
        throw new UnsupportedOperationError(
          `Can't change fetch-structure implementation to unsupported type: '${type}'`,
        );
    }
  }

  fetchProperty(node: QueryBuilderExplorerTreeNodeData): void {
    if (
      node instanceof QueryBuilderExplorerTreePropertyNodeData &&
      !(node.type instanceof Class)
    ) {
      this.implementation.fetchProperty(node);
    }
  }

  fetchNodeChildrenProperties(node: QueryBuilderExplorerTreeNodeData): void {
    if (node.type instanceof Class) {
      this.implementation.fetchProperties(
        // NOTE: here we require the node to already been expanded so the child nodes are generated
        // we don't allow adding unopened node. Maybe if it helps, we can show a warning.
        node.childrenIds
          .map((childId) =>
            this.queryBuilderState.explorerState.nonNullableTreeData.nodes.get(
              childId,
            ),
          )
          .filter(filterByType(QueryBuilderExplorerTreePropertyNodeData))
          .filter(
            (childNode) =>
              !(childNode.type instanceof Class) &&
              childNode.mappingData.mapped,
          ),
      );
    }
  }
}

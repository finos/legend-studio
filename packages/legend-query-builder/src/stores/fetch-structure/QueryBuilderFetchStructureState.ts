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

import { action, makeObservable, observable } from 'mobx';
import type { QueryBuilderState } from '../QueryBuilderState.js';
import { QueryBuilderGraphFetchTreeState } from './graph-fetch/QueryBuilderGraphFetchTreeState.js';
import { QueryBuilderTDSState } from './tds/QueryBuilderTDSState.js';
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
import { QueryBuilderTelemetryHelper } from '../../__lib__/QueryBuilderTelemetryHelper.js';

export const onChangeFetchStructureImplementation =
  (
    implementationType: FETCH_STRUCTURE_IMPLEMENTATION,
    fetchStructureState: QueryBuilderFetchStructureState,
  ): (() => void) =>
  (): void => {
    if (fetchStructureState.implementation.type !== implementationType) {
      QueryBuilderTelemetryHelper.logEvent_ToggleFetchStructure(
        fetchStructureState.queryBuilderState.applicationStore.telemetryService,
      );
      fetchStructureState.implementation.checkBeforeChangingImplementation(
        () => {
          fetchStructureState.changeImplementation(implementationType);
        },
      );
    }
  };

export class QueryBuilderFetchStructureState {
  readonly queryBuilderState: QueryBuilderState;
  implementation: QueryBuilderFetchStructureImplementationState;

  constructor(queryBuilderState: QueryBuilderState) {
    makeObservable(this, {
      implementation: observable,
      changeImplementation: action,
      initializeWithQuery: action,
    });

    this.queryBuilderState = queryBuilderState;
    /**
     * TODO?: if needed, we could make this configurable as part of QueryBuilderState
     * Also, perhaps, some day it would even make sense to default to
     * graph-fetch since `getAll()` naturally works for graph-fetch case
     * and graph-fetch allows somewhat an empty tree
     */
    this.implementation = new QueryBuilderTDSState(
      this.queryBuilderState,
      this,
    );
  }

  changeImplementation(type: string): void {
    switch (type) {
      case FETCH_STRUCTURE_IMPLEMENTATION.TABULAR_DATA_STRUCTURE: {
        this.implementation = new QueryBuilderTDSState(
          this.queryBuilderState,
          this,
        );
        break;
      }
      case FETCH_STRUCTURE_IMPLEMENTATION.GRAPH_FETCH: {
        this.queryBuilderState.setIsCalendarEnabled(false);
        this.implementation = new QueryBuilderGraphFetchTreeState(
          this.queryBuilderState,
          this,
        );
        break;
      }
      default:
        throw new UnsupportedOperationError(
          `Can't change fetch-structure implementation to unsupported type: '${type}'`,
        );
    }
    this.implementation.initialize();
  }

  initializeWithQuery(): void {
    this.implementation.initializeWithQuery();
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

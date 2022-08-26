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
import { action, makeObservable, observable } from 'mobx';
import {
  type CompilationError,
  PackageableElementExplicitReference,
  RootGraphFetchTree,
  type Class,
} from '@finos/legend-graph';
import {
  type QueryBuilderGraphFetchTreeData,
  addQueryBuilderPropertyNode,
  buildGraphFetchTreeData,
} from './QueryBuilderGraphFetchTreeUtil.js';
import type { QueryBuilderExplorerTreePropertyNodeData } from '../../explorer/QueryBuilderExplorerState.js';
import {
  FETCH_STRUCTURE_IMPLEMENTATION,
  QueryBuilderFetchStructureImplementationState,
} from '../QueryBuilderFetchStructureImplementationState.js';
import type { QueryBuilderFetchStructureState } from '../QueryBuilderFetchStructureState.js';
import {
  ActionAlertActionType,
  ActionAlertType,
} from '@finos/legend-application';

export class QueryBuilderGraphFetchTreeState extends QueryBuilderFetchStructureImplementationState {
  treeData?: QueryBuilderGraphFetchTreeData | undefined;
  /**
   * If set to `true` we will use `graphFetchChecked` function instead of `graphFetch`.
   * `graphFetchChecked` will do extra checks on constraints and only work on M2M use case for now.
   * Hence we default this to `false` for graph fetch to work universally.
   */
  isChecked = false;

  constructor(
    queryBuilderState: QueryBuilderState,
    fetchStructureState: QueryBuilderFetchStructureState,
  ) {
    super(queryBuilderState, fetchStructureState);

    makeObservable(this, {
      treeData: observable,
      isChecked: observable,
      setGraphFetchTree: action,
      setChecked: action,
    });

    // try to initialize the graph-fetch tree data using the setup class
    this.updateTreeData(this.queryBuilderState.querySetupState._class);
  }

  get type(): string {
    return FETCH_STRUCTURE_IMPLEMENTATION.GRAPH_FETCH;
  }

  get validationIssues(): string[] | undefined {
    return undefined;
  }

  setGraphFetchTree(val: QueryBuilderGraphFetchTreeData | undefined): void {
    this.treeData = val;
  }

  setChecked(val: boolean): void {
    this.isChecked = val;
  }

  private updateTreeData(_class: Class | undefined): void {
    this.setGraphFetchTree(
      _class
        ? buildGraphFetchTreeData(
            new RootGraphFetchTree(
              PackageableElementExplicitReference.create(_class),
            ),
          )
        : undefined,
    );
  }

  onClassChange(_class: Class | undefined): void {
    this.updateTreeData(_class);
  }

  addProperty(
    node: QueryBuilderExplorerTreePropertyNodeData,
    options?: {
      refreshTreeData?: boolean;
    },
  ): void {
    if (!this.treeData) {
      this.queryBuilderState.applicationStore.notifyWarning(
        `Can't add property: graph-fetch tree has not been properly initialized`,
      );
      return;
    }
    addQueryBuilderPropertyNode(
      this.treeData,
      this.queryBuilderState.explorerState.nonNullableTreeData,
      node,
      this.queryBuilderState,
    );
    if (options?.refreshTreeData) {
      this.setGraphFetchTree({ ...this.treeData });
    }
  }

  revealCompilationError(compilationError: CompilationError): boolean {
    return false;
  }

  clearCompilationError(): void {
    return;
  }

  fetchProperty(node: QueryBuilderExplorerTreePropertyNodeData): void {
    this.addProperty(node, { refreshTreeData: true });
  }

  fetchProperties(nodes: QueryBuilderExplorerTreePropertyNodeData[]): void {
    if (!this.treeData) {
      this.queryBuilderState.applicationStore.notifyWarning(
        `Can't add property: graph-fetch tree has not been properly initialized`,
      );
      return;
    }
    nodes.forEach((nodeToAdd) => this.addProperty(nodeToAdd));
    this.setGraphFetchTree({
      ...this.treeData,
    });
  }

  checkBeforeChangingImplementation(onChange: () => void): void {
    if (this.treeData?.rootIds.length) {
      this.queryBuilderState.applicationStore.setActionAlertInfo({
        message:
          'Current graph-fetch will be lost when switching to projection mode. Do you still want to proceed?',
        type: ActionAlertType.CAUTION,
        actions: [
          {
            label: 'Proceed',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            handler:
              this.queryBuilderState.applicationStore.guardUnhandledError(
                async () => onChange(),
              ),
          },
          {
            label: 'Cancel',
            type: ActionAlertActionType.PROCEED,
            default: true,
          },
        ],
      });
    } else {
      onChange();
    }
  }
}

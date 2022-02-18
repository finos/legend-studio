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

import type { TreeData, TreeNodeData } from '@finos/legend-art';
import type { ValueSpecification } from '@finos/legend-graph';
import {
  addUniqueEntry,
  assertTrue,
  deleteEntry,
  getNullableFirstElement,
  guaranteeNonNullable,
  guaranteeType,
  uuid,
} from '@finos/legend-shared';
import {
  action,
  computed,
  makeAutoObservable,
  makeObservable,
  observable,
  toJS,
} from 'mobx';
import {
  type QueryBuilderFilterOperator,
  QUERY_BUILDER_FILTER_GROUP_OPERATION,
  QueryBuilderFilterTreeNodeData,
} from './QueryBuilderFilterState';
import type { QueryBuilderProjectionColumnState } from './QueryBuilderProjectionState';
import type { QueryBuilderState } from './QueryBuilderState';

export abstract class QueryBuilderPostFilterTreeNodeData
  implements TreeNodeData
{
  readonly id = uuid();
  readonly label = '';
  // NOTE: we don't use the `isSelected` attribute is not used since we keep track of it from the tree data level
  isOpen?: boolean | undefined;
  parentId?: string | undefined;

  constructor(parentId: string | undefined) {
    this.parentId = parentId;

    makeObservable(this, {
      isOpen: observable,
      parentId: observable,
      setIsOpen: action,
      setParentId: action,
    });
  }

  abstract get dragLayerLabel(): string;
  setIsOpen(val: boolean): void {
    this.isOpen = val;
  }
  setParentId(val: string | undefined): void {
    this.parentId = val;
  }
}

export class QueryBuilderPostFilterTreeGroupNodeData extends QueryBuilderPostFilterTreeNodeData {
  groupOperation: QUERY_BUILDER_FILTER_GROUP_OPERATION;
  childrenIds: string[] = [];

  constructor(
    parentId: string | undefined,
    groupOperation: QUERY_BUILDER_FILTER_GROUP_OPERATION,
  ) {
    super(parentId);
    makeObservable(this, {
      groupOperation: observable,
      childrenIds: observable,
      setGroupOperation: action,
      addChildNode: action,
      removeChildNode: action,
      dragLayerLabel: computed,
    });
    this.groupOperation = groupOperation;
    this.isOpen = true;
  }

  get dragLayerLabel(): string {
    return `${this.groupOperation.toUpperCase()} group`;
  }

  setGroupOperation(val: QUERY_BUILDER_FILTER_GROUP_OPERATION): void {
    this.groupOperation = val;
  }
  addChildNode(node: QueryBuilderPostFilterTreeNodeData): void {
    addUniqueEntry(this.childrenIds, node.id);
    node.setParentId(this.id);
  }
  removeChildNode(node: QueryBuilderPostFilterTreeGroupNodeData): void {
    deleteEntry(this.childrenIds, node.id);
    node.setParentId(undefined);
  }
  addChildNodeAt(node: QueryBuilderPostFilterTreeNodeData, idx: number): void {
    if (!this.childrenIds.find((childId) => childId === node.id)) {
      idx = Math.max(0, Math.min(idx, this.childrenIds.length - 1));
      this.childrenIds.splice(idx, 0, node.id);
      node.setParentId(this.id);
    }
  }
}
export class PostFilterConditionState {
  postFilterState: QueryBuilderPostFilterState;
  colState: QueryBuilderProjectionColumnState;
  value?: ValueSpecification | undefined;
  operator: QueryBuilderFilterOperator;
  constructor(
    postFilterState: QueryBuilderPostFilterState,
    colState: QueryBuilderProjectionColumnState,
    value: ValueSpecification | undefined,
    operator: QueryBuilderFilterOperator,
  ) {
    makeAutoObservable(this, {
      colState: observable,
    });
    this.postFilterState = postFilterState;
    this.colState = colState;
    this.value = value;
    this.operator = operator;
  }
  get columnName(): string {
    return this.colState.columnName;
  }
  setValue(val: ValueSpecification | undefined): void {
    this.value = val;
  }

  get operators(): QueryBuilderFilterOperator[] {
    return this.postFilterState.operators;
    // .filter((op) =>
    //   op.isCompatibleWithFilterConditionProperty(this),
    // );
  }
}

export class QueryBuilderPostFilterTreeConditionNodeData extends QueryBuilderPostFilterTreeNodeData {
  condition: PostFilterConditionState;

  constructor(
    parentId: string | undefined,
    condition: PostFilterConditionState,
  ) {
    super(parentId);

    makeObservable(this, {
      condition: observable,
      dragLayerLabel: computed,
    });

    this.condition = condition;
  }

  get dragLayerLabel(): string {
    return 'TOOO';
    // return this.condition.propertyExpressionState.title;
  }
}

const DEFAULT_POST_FILTER_LAMBDA_VARIABLE_NAME = 'row';
export class QueryBuilderPostFilterState
  implements TreeData<QueryBuilderPostFilterTreeNodeData>
{
  showPostFilterPanel = false;
  queryBuilderState: QueryBuilderState;
  lambdaParameterName = DEFAULT_POST_FILTER_LAMBDA_VARIABLE_NAME;
  selectedNode?: QueryBuilderFilterTreeNodeData | undefined;

  operators: QueryBuilderFilterOperator[] = [];
  rootIds: string[] = [];
  nodes = new Map<string, QueryBuilderPostFilterTreeNodeData>();

  constructor(
    queryBuilderState: QueryBuilderState,
    operators: QueryBuilderFilterOperator[],
  ) {
    makeAutoObservable(this, {
      queryBuilderState: false,
      setLambdaParameterName: action,
      setSelectedNode: action,
      addNodeFromNode: action,
      setShowPostFilterPanel: action,
      // addGroupConditionNodeFromNode: action,
      // newGroupWithConditionFromNode: action,
      // removeNodeAndPruneBranch: action,
      // pruneTree: action,
      // simplifyTree: action,
      // collapseTree: action,
      // expandTree: action,
    });

    this.queryBuilderState = queryBuilderState;
    this.operators = operators;
  }
  setShowPostFilterPanel(val: boolean): void {
    this.showPostFilterPanel = val;
  }
  setSelectedNode(val: QueryBuilderPostFilterTreeNodeData | undefined): void {
    this.selectedNode = val;
  }


  get isEmpty(): boolean {
    return !this.nodes.size && !this.rootIds.length;
  }
  private getParentNode(
    node: QueryBuilderPostFilterTreeNodeData,
  ): QueryBuilderPostFilterTreeGroupNodeData | undefined {
    return node.parentId
      ? guaranteeType(
          this.nodes.get(node.parentId),
          QueryBuilderPostFilterTreeGroupNodeData,
        )
      : undefined;
  }

  getRootNode(): QueryBuilderPostFilterTreeNodeData | undefined {
    assertTrue(
      this.rootIds.length < 2,
      'Query builder filter tree cannot have more than 1 root',
    );
    const rootId = getNullableFirstElement(this.rootIds);
    return rootId ? this.getNode(rootId) : undefined;
  }

  private addRootNode(node: QueryBuilderPostFilterTreeNodeData): void {
    console.log('addRoot', toJS(node));
    const rootNode = this.getRootNode();
    this.nodes.set(node.id, node);
    if (rootNode instanceof QueryBuilderPostFilterTreeGroupNodeData) {
      rootNode.addChildNode(node);
    } else if (
      rootNode instanceof QueryBuilderPostFilterTreeConditionNodeData
    ) {
      // if the root node is condition node, form a group between the root node and the new node and nominate the group node as the new root
      const groupNode = new QueryBuilderPostFilterTreeGroupNodeData(
        undefined,
        QUERY_BUILDER_FILTER_GROUP_OPERATION.AND,
      );
      groupNode.addChildNode(rootNode);
      groupNode.addChildNode(node);
      this.rootIds = [groupNode.id];
      this.nodes.set(groupNode.id, groupNode);
    } else if (!rootNode) {
      console.log('testtt');
      // if there is no root node, set this node as the root
      this.rootIds = [node.id];
      console.log(toJS(this.rootIds));
    }
  }

  setLambdaParameterName(val: string): void {
    this.lambdaParameterName = val;
  }
  getNode(id: string): QueryBuilderPostFilterTreeNodeData {
    return guaranteeNonNullable(
      this.nodes.get(id),
      `Can't find query builder filter tree node with ID '${id}'`,
    );
  }
  addNodeFromNode(
    node: QueryBuilderPostFilterTreeNodeData,
    fromNode: QueryBuilderPostFilterTreeNodeData | undefined,
  ): void {
    console.log('addNodeFromNode');
    if (fromNode instanceof QueryBuilderPostFilterTreeGroupNodeData) {
      this.nodes.set(node.id, node);
      fromNode.addChildNode(node);
    } else if (
      fromNode instanceof QueryBuilderPostFilterTreeConditionNodeData
    ) {
      this.nodes.set(node.id, node);
      const fromNodeParent = this.getParentNode(fromNode);
      if (fromNodeParent) {
        fromNodeParent.addChildNode(node);
      } else {
        this.addRootNode(node);
      }
    } else if (!this.selectedNode) {
      // if no current node is selected, the node will be added to root
      this.addRootNode(node);
    }
  }
}

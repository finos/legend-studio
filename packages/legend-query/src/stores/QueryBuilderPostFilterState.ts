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
import {
  type PureModel,
  type Type,
  type ValueSpecification,
  Enumeration,
  PRIMITIVE_TYPE,
  observe_ValueSpecification,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  addUniqueEntry,
  assertErrorThrown,
  assertTrue,
  deleteEntry,
  getNullableFirstElement,
  guaranteeNonNullable,
  guaranteeType,
  IllegalStateError,
  UnsupportedOperationError,
  uuid,
  filterByType,
} from '@finos/legend-shared';
import {
  action,
  computed,
  flow,
  flowResult,
  makeAutoObservable,
  makeObservable,
  observable,
} from 'mobx';
import { DEFAULT_POST_FILTER_LAMBDA_VARIABLE_NAME } from '../QueryBuilder_Const.js';
import type { QueryBuilderAggregateColumnState } from './QueryBuilderAggregationState.js';
import { QUERY_BUILDER_GROUP_OPERATION } from './QueryBuilderOperatorsHelper.js';
import type { QueryBuilderPostFilterOperator } from './QueryBuilderPostFilterOperator.js';
import {
  type QueryBuilderProjectionColumnDragSource,
  type QueryBuilderProjectionColumnState,
  QueryBuilderDerivationProjectionColumnState,
} from './QueryBuilderProjectionState.js';
import type { QueryBuilderState } from './QueryBuilderState.js';

export enum QUERY_BUILDER_POST_FILTER_DND_TYPE {
  GROUP_CONDITION = 'GROUP_CONDITION',
  CONDITION = 'CONDITION',
  BLANK_CONDITION = 'BLANK_CONDITION',
}

export enum TDS_COLUMN_GETTER {
  GET_STRING = 'getString',
  GET_NUMBER = 'getNumber',
  GET_INTEGER = 'getInteger',
  GET_FLOAT = 'getFloat',
  GET_DECIMAL = 'getDecimal',
  GET_DATE = 'getDate',
  GET_DATETIME = 'getDateTime',
  GET_STRICTDATE = 'getStrictDate',
  GET_BOOLEAN = 'getBoolean',
  GET_ENUM = 'getEnum',
  IS_NULL = 'isNull',
  IS_NOT_NULL = 'isNotNull',
}

export const getTDSColumnDerivedProperyFromType = (
  type: Type,
): TDS_COLUMN_GETTER => {
  if (type instanceof Enumeration) {
    return TDS_COLUMN_GETTER.GET_ENUM;
  }
  switch (type.path) {
    case PRIMITIVE_TYPE.STRING:
      return TDS_COLUMN_GETTER.GET_STRING;
    case PRIMITIVE_TYPE.NUMBER:
      return TDS_COLUMN_GETTER.GET_NUMBER;
    case PRIMITIVE_TYPE.INTEGER:
      return TDS_COLUMN_GETTER.GET_INTEGER;
    case PRIMITIVE_TYPE.FLOAT:
      return TDS_COLUMN_GETTER.GET_FLOAT;
    case PRIMITIVE_TYPE.DECIMAL:
      return TDS_COLUMN_GETTER.GET_DECIMAL;
    case PRIMITIVE_TYPE.DATE:
      return TDS_COLUMN_GETTER.GET_DATE;
    case PRIMITIVE_TYPE.DATETIME:
      return TDS_COLUMN_GETTER.GET_DATETIME;
    case PRIMITIVE_TYPE.STRICTDATE:
      return TDS_COLUMN_GETTER.GET_STRICTDATE;
    case PRIMITIVE_TYPE.BOOLEAN:
      return TDS_COLUMN_GETTER.GET_BOOLEAN;
    default:
      throw new UnsupportedOperationError(
        `Can't find TDS column derived property name for type: '${type.path}'`,
      );
  }
};

export const getTypeFromDerivedProperty = (
  derivedProperty: TDS_COLUMN_GETTER,
  graph: PureModel,
): Type | undefined => {
  switch (derivedProperty) {
    case TDS_COLUMN_GETTER.GET_STRING:
      return graph.getPrimitiveType(PRIMITIVE_TYPE.STRING);
    case TDS_COLUMN_GETTER.GET_NUMBER:
      return graph.getPrimitiveType(PRIMITIVE_TYPE.NUMBER);
    case TDS_COLUMN_GETTER.GET_INTEGER:
      return graph.getPrimitiveType(PRIMITIVE_TYPE.INTEGER);
    case TDS_COLUMN_GETTER.GET_FLOAT:
      return graph.getPrimitiveType(PRIMITIVE_TYPE.FLOAT);
    case TDS_COLUMN_GETTER.GET_DECIMAL:
      return graph.getPrimitiveType(PRIMITIVE_TYPE.DECIMAL);
    case TDS_COLUMN_GETTER.GET_DATE:
      return graph.getPrimitiveType(PRIMITIVE_TYPE.DATE);
    case TDS_COLUMN_GETTER.GET_DATETIME:
      return graph.getPrimitiveType(PRIMITIVE_TYPE.DATETIME);
    case TDS_COLUMN_GETTER.GET_STRICTDATE:
      return graph.getPrimitiveType(PRIMITIVE_TYPE.STRICTDATE);
    case TDS_COLUMN_GETTER.GET_BOOLEAN:
      return graph.getPrimitiveType(PRIMITIVE_TYPE.BOOLEAN);
    default:
      return undefined;
  }
};

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

export interface QueryBuilderPostFilterConditionDragSource {
  node: QueryBuilderPostFilterTreeNodeData;
}

export type QueryBuilderPostFilterDropTarget =
  | QueryBuilderProjectionColumnDragSource
  | QueryBuilderPostFilterConditionDragSource;

export class QueryBuilderPostFilterTreeGroupNodeData extends QueryBuilderPostFilterTreeNodeData {
  groupOperation: QUERY_BUILDER_GROUP_OPERATION;
  childrenIds: string[] = [];

  constructor(
    parentId: string | undefined,
    groupOperation: QUERY_BUILDER_GROUP_OPERATION,
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

  setGroupOperation(val: QUERY_BUILDER_GROUP_OPERATION): void {
    this.groupOperation = val;
  }
  addChildNode(node: QueryBuilderPostFilterTreeNodeData): void {
    addUniqueEntry(this.childrenIds, node.id);
    node.setParentId(this.id);
  }
  removeChildNode(node: QueryBuilderPostFilterTreeNodeData): void {
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
    return this.condition.columnName;
  }
}

export class QueryBuilderPostFilterTreeBlankConditionNodeData extends QueryBuilderPostFilterTreeNodeData {
  constructor(parentId: string | undefined) {
    super(parentId);

    makeObservable(this, {
      dragLayerLabel: computed,
    });
  }

  get dragLayerLabel(): string {
    return '<blank>';
  }
}
export class PostFilterConditionState {
  postFilterState: QueryBuilderPostFilterState;
  columnState:
    | QueryBuilderProjectionColumnState
    | QueryBuilderAggregateColumnState;
  value?: ValueSpecification | undefined;
  operator: QueryBuilderPostFilterOperator;

  constructor(
    postFilterState: QueryBuilderPostFilterState,
    colState:
      | QueryBuilderProjectionColumnState
      | QueryBuilderAggregateColumnState,
    value: ValueSpecification | undefined,
    operator: QueryBuilderPostFilterOperator | undefined,
  ) {
    makeAutoObservable(this, {
      columnState: observable,
      changeOperator: action,
      setColumnState: action,
      setValue: action,
      setOperator: action,
      changeColumn: flow,
    });

    this.postFilterState = postFilterState;
    this.columnState = colState;
    this.setValue(value);
    if (operator) {
      this.operator = operator;
    } else {
      assertTrue(
        this.operators.length !== 0,
        `Can't find an operator for column '${this.columnState.columnName}`,
      );
      this.operator = guaranteeNonNullable(this.operators[0]);
    }
  }

  get columnName(): string {
    return this.columnState.columnName;
  }

  get operators(): QueryBuilderPostFilterOperator[] {
    return this.postFilterState.operators.filter((op) =>
      op.isCompatibleWithPostFilterColumn(this),
    );
  }

  changeOperator(val: QueryBuilderPostFilterOperator): void {
    this.setOperator(val);
    if (!this.operator.isCompatibleWithConditionValue(this)) {
      this.setValue(this.operator.getDefaultFilterConditionValue(this));
    }
  }

  setValue(val: ValueSpecification | undefined): void {
    this.value = val
      ? observe_ValueSpecification(
          val,
          this.postFilterState.queryBuilderState.observableContext,
        )
      : undefined;
  }

  setColumnState(
    val: QueryBuilderProjectionColumnState | QueryBuilderAggregateColumnState,
  ): void {
    this.columnState = val;
  }

  setOperator(val: QueryBuilderPostFilterOperator): void {
    this.operator = val;
  }

  *changeColumn(
    columnState: QueryBuilderProjectionColumnState,
  ): GeneratorFn<void> {
    try {
      const aggregateColumnState =
        this.postFilterState.queryBuilderState.fetchStructureState.projectionState.aggregationState.columns.find(
          (column) => column.projectionColumnState === columnState,
        );
      const colState = aggregateColumnState ?? columnState;
      if (colState instanceof QueryBuilderDerivationProjectionColumnState) {
        yield flowResult(colState.fetchDerivationLambdaReturnType());
      }

      //column
      this.setColumnState(colState);

      //operator
      if (!this.operator.isCompatibleWithPostFilterColumn(this)) {
        this.setOperator(guaranteeNonNullable(this.operators[0]));
      }

      // value
      if (!this.operator.isCompatibleWithConditionValue(this)) {
        this.setValue(this.operator.getDefaultFilterConditionValue(this));
      }
    } catch (error) {
      assertErrorThrown(error);
      this.postFilterState.queryBuilderState.applicationStore.notifyError(
        `Can't drag column '${columnState.columnName}' due to: ${error.message}`,
      );
    }
  }
}

export class QueryBuilderPostFilterState
  implements TreeData<QueryBuilderPostFilterTreeNodeData>
{
  showPostFilterPanel = false;
  queryBuilderState: QueryBuilderState;
  lambdaParameterName = DEFAULT_POST_FILTER_LAMBDA_VARIABLE_NAME;
  selectedNode?: QueryBuilderPostFilterTreeNodeData | undefined;
  isRearrangingConditions = false;
  operators: QueryBuilderPostFilterOperator[] = [];
  rootIds: string[] = [];
  nodes = new Map<string, QueryBuilderPostFilterTreeNodeData>();
  _suppressClickawayEventListener = false;

  constructor(
    queryBuilderState: QueryBuilderState,
    operators: QueryBuilderPostFilterOperator[],
  ) {
    makeAutoObservable(this, {
      queryBuilderState: false,
      setLambdaParameterName: action,
      setSelectedNode: action,
      addNodeFromNode: action,
      setShowPostFilterPanel: action,
      addGroupConditionNodeFromNode: action,
      newGroupWithConditionFromNode: action,
      removeNodeAndPruneBranch: action,
      pruneTree: action,
      simplifyTree: action,
      collapseTree: action,
      expandTree: action,
      replaceBlankNodeWithNode: action,
      suppressClickawayEventListener: action,
    });

    this.queryBuilderState = queryBuilderState;
    this.operators = operators;
  }

  setRearrangingConditions(val: boolean): void {
    this.isRearrangingConditions = val;
  }

  suppressClickawayEventListener(): void {
    this._suppressClickawayEventListener = true;
  }

  setShowPostFilterPanel(val: boolean): void {
    this.showPostFilterPanel = val;
  }
  setSelectedNode(val: QueryBuilderPostFilterTreeNodeData | undefined): void {
    this.selectedNode = val;
  }
  getNode(id: string): QueryBuilderPostFilterTreeNodeData {
    return guaranteeNonNullable(
      this.nodes.get(id),
      `Can't find query builder post-filter tree node with ID '${id}'`,
    );
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
      'Query builder post-filter tree cannot have more than 1 root',
    );
    const rootId = getNullableFirstElement(this.rootIds);
    return rootId ? this.getNode(rootId) : undefined;
  }

  private addRootNode(node: QueryBuilderPostFilterTreeNodeData): void {
    const rootNode = this.getRootNode();
    this.nodes.set(node.id, node);
    if (rootNode instanceof QueryBuilderPostFilterTreeGroupNodeData) {
      rootNode.addChildNode(node);
    } else if (
      rootNode instanceof QueryBuilderPostFilterTreeConditionNodeData ||
      rootNode instanceof QueryBuilderPostFilterTreeBlankConditionNodeData
    ) {
      // if the root node is condition node, form a group between the root node and the new node and nominate the group node as the new root
      const groupNode = new QueryBuilderPostFilterTreeGroupNodeData(
        undefined,
        QUERY_BUILDER_GROUP_OPERATION.AND,
      );
      groupNode.addChildNode(rootNode);
      groupNode.addChildNode(node);
      this.rootIds = [groupNode.id];
      this.nodes.set(groupNode.id, groupNode);
    } else if (!rootNode) {
      // if there is no root node, set this node as the root
      this.rootIds = [node.id];
    }
  }

  replaceBlankNodeWithNode(
    node: QueryBuilderPostFilterTreeNodeData,
    blankNode: QueryBuilderPostFilterTreeBlankConditionNodeData,
  ): void {
    this.nodes.set(node.id, node);
    const blankNodeParent = this.getParentNode(blankNode);
    if (blankNodeParent) {
      const blankNodeIdx = blankNodeParent.childrenIds.findIndex(
        (childId) => childId === blankNode.id,
      );
      blankNodeParent.addChildNodeAt(node, blankNodeIdx);
      blankNodeParent.removeChildNode(blankNode);
    } else {
      this.addRootNode(node);
    }
    this.removeNode(blankNode);
  }
  setLambdaParameterName(val: string): void {
    this.lambdaParameterName = val;
  }

  addGroupConditionNodeFromNode(
    fromNode: QueryBuilderPostFilterTreeNodeData | undefined,
  ): void {
    const newGroupNode = new QueryBuilderPostFilterTreeGroupNodeData(
      undefined,
      QUERY_BUILDER_GROUP_OPERATION.AND,
    );
    const newBlankConditionNode1 =
      new QueryBuilderPostFilterTreeBlankConditionNodeData(undefined);
    const newBlankConditionNode2 =
      new QueryBuilderPostFilterTreeBlankConditionNodeData(undefined);
    this.nodes.set(newBlankConditionNode1.id, newBlankConditionNode1);
    this.nodes.set(newBlankConditionNode2.id, newBlankConditionNode2);
    newGroupNode.addChildNode(newBlankConditionNode1);
    newGroupNode.addChildNode(newBlankConditionNode2);
    this.addNodeFromNode(newGroupNode, fromNode);
  }

  newGroupWithConditionFromNode(
    node: QueryBuilderPostFilterTreeNodeData | undefined,
    fromNode: QueryBuilderPostFilterTreeNodeData | undefined,
  ): void {
    const newNode =
      node ?? new QueryBuilderPostFilterTreeBlankConditionNodeData(undefined);
    if (fromNode instanceof QueryBuilderPostFilterTreeConditionNodeData) {
      const fromNodeParent = this.getParentNode(fromNode);
      if (fromNodeParent) {
        const fromNodeIdx = fromNodeParent.childrenIds.findIndex(
          (childId) => childId === fromNode.id,
        );
        fromNodeParent.removeChildNode(fromNode);
        const newGroupNode = new QueryBuilderPostFilterTreeGroupNodeData(
          undefined,
          QUERY_BUILDER_GROUP_OPERATION.AND,
        );
        this.nodes.set(newNode.id, newNode);
        this.nodes.set(newGroupNode.id, newGroupNode);
        newGroupNode.addChildNode(fromNode);
        newGroupNode.addChildNode(newNode);
        fromNodeParent.addChildNodeAt(newGroupNode, fromNodeIdx);
      } else {
        this.addRootNode(newNode);
      }
    }
  }

  handleClickaway(): void {
    if (this._suppressClickawayEventListener) {
      this._suppressClickawayEventListener = false;
      return;
    }
    this.setSelectedNode(undefined);
  }

  addNodeFromNode(
    node: QueryBuilderPostFilterTreeNodeData,
    fromNode: QueryBuilderPostFilterTreeNodeData | undefined,
  ): void {
    if (fromNode instanceof QueryBuilderPostFilterTreeGroupNodeData) {
      this.nodes.set(node.id, node);
      fromNode.addChildNode(node);
    } else if (
      fromNode instanceof QueryBuilderPostFilterTreeConditionNodeData ||
      fromNode instanceof QueryBuilderPostFilterTreeBlankConditionNodeData
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

  private removeNode(node: QueryBuilderPostFilterTreeNodeData): void {
    this.nodes.delete(node.id);
    // remove relationship with children nodes
    if (node instanceof QueryBuilderPostFilterTreeGroupNodeData) {
      // NOTE: we are deleting child node, i.e. modifying `childrenIds` as we iterate
      [...node.childrenIds].forEach((childId) =>
        node.removeChildNode(this.getNode(childId)),
      );
    }
    // remove relationship with parent node
    const parentNode = this.getParentNode(node);
    if (parentNode) {
      parentNode.removeChildNode(node);
    } else {
      deleteEntry(this.rootIds, node.id);
    }
  }

  removeNodeAndPruneBranch(node: QueryBuilderPostFilterTreeNodeData): void {
    const parentNode = this.getParentNode(node);
    this.removeNode(node);
    // squash parent node after the current node is deleted
    if (parentNode) {
      parentNode.removeChildNode(node);
      let currentParentNode:
        | QueryBuilderPostFilterTreeGroupNodeData
        | undefined = parentNode;
      while (currentParentNode) {
        if (currentParentNode.childrenIds.length >= 2) {
          break;
        }
        this.squashGroupNode(currentParentNode);
        currentParentNode = this.getParentNode(currentParentNode);
      }
    } else {
      deleteEntry(this.rootIds, node.id);
    }
    this.pruneOrphanNodes();
    // check if selected node is still around, if not, unset the selected node
    if (this.selectedNode && !this.nodes.get(this.selectedNode.id)) {
      this.setSelectedNode(undefined);
    }
  }

  /**
   * Cleanup unecessary group nodes (i.e. group node whose group operation is the same as its parent's)
   */
  simplifyTree(): void {
    this.setSelectedNode(undefined);
    const getUnnecessaryNodes = (): QueryBuilderPostFilterTreeGroupNodeData[] =>
      Array.from(this.nodes.values())
        .filter(filterByType(QueryBuilderPostFilterTreeGroupNodeData))
        .filter((node) => {
          if (!node.parentId || !this.nodes.has(node.parentId)) {
            return false;
          }
          const parentGroupNode = guaranteeType(
            this.nodes.get(node.parentId),
            QueryBuilderPostFilterTreeGroupNodeData,
          );
          return parentGroupNode.groupOperation === node.groupOperation;
        });
    // Squash these unnecessary group nodes
    let nodesToProcess = getUnnecessaryNodes();
    while (nodesToProcess.length) {
      nodesToProcess.forEach((node) => {
        const parentNode = guaranteeType(
          this.nodes.get(guaranteeNonNullable(node.parentId)),
          QueryBuilderPostFilterTreeGroupNodeData,
        );
        // send all children of the current group node to their grandparent node
        [...node.childrenIds].forEach((childId) => {
          const childNode = this.getNode(childId);
          parentNode.addChildNode(childNode);
        });
        // remove the current group node
        parentNode.removeChildNode(node);
        // remove the node
        this.nodes.delete(node.id);
      });
      nodesToProcess = getUnnecessaryNodes();
    }
  }

  private pruneOrphanNodes(): void {
    const getOrphanNodes = (): QueryBuilderPostFilterTreeNodeData[] =>
      Array.from(this.nodes.values()).filter(
        (node) => !node.parentId && !this.rootIds.includes(node.id),
      ); // nodes without parent, except for root nodes
    let nodesToProcess = getOrphanNodes();
    while (nodesToProcess.length) {
      nodesToProcess.forEach((node) => this.removeNode(node));
      nodesToProcess = getOrphanNodes();
    }
  }

  private pruneChildlessGroupNodes(): void {
    const getChildlessGroupNodes =
      (): QueryBuilderPostFilterTreeGroupNodeData[] =>
        Array.from(this.nodes.values())
          .filter(filterByType(QueryBuilderPostFilterTreeGroupNodeData))
          .filter((node) => !node.childrenIds.length);
    let nodesToProcess = getChildlessGroupNodes();
    while (nodesToProcess.length) {
      nodesToProcess.forEach((node) => this.removeNode(node));
      nodesToProcess = getChildlessGroupNodes();
    }
  }

  pruneTree(): void {
    this.setSelectedNode(undefined);
    // remove all blank nodes
    Array.from(this.nodes.values())
      .filter(
        (node) =>
          node instanceof QueryBuilderPostFilterTreeBlankConditionNodeData,
      )
      .forEach((node) => this.removeNode(node));
    // prune
    this.pruneOrphanNodes();
    this.pruneChildlessGroupNodes();
    // squash group nodes
    // NOTE: since we have pruned all blank nodes and childless group nodes, at this point, if there are group nodes to be squashed
    // it will be group node with exactly 1 non-blank condition
    const getSquashableGroupNodes =
      (): QueryBuilderPostFilterTreeGroupNodeData[] =>
        Array.from(this.nodes.values())
          .filter(filterByType(QueryBuilderPostFilterTreeGroupNodeData))
          .filter((node) => node.childrenIds.length < 2)
          .filter((node) => {
            if (!node.childrenIds.length) {
              throw new IllegalStateError(
                'Query builder post-filter tree found unexpected childless group nodes',
              );
            }
            const firstChildNodeId = node.childrenIds[0] as string;
            const childNode = this.getNode(firstChildNodeId);
            if (
              childNode instanceof
              QueryBuilderPostFilterTreeBlankConditionNodeData
            ) {
              throw new IllegalStateError(
                'Query builder post-filter tree found unexpected blank nodes',
              );
            }
            return (
              this.getNode(firstChildNodeId) instanceof
              QueryBuilderPostFilterTreeConditionNodeData
            );
          });
    let nodesToProcess = getSquashableGroupNodes();
    while (nodesToProcess.length) {
      nodesToProcess.forEach((node) => this.squashGroupNode(node));
      nodesToProcess = getSquashableGroupNodes();
    }
    // check if selected node is still around, if not, unset the selected node
    if (this.selectedNode && !this.nodes.get(this.selectedNode.id)) {
      this.setSelectedNode(undefined);
    }
  }

  /**
   * If group node has fewer than 2 children, flatten it
   */
  private squashGroupNode(node: QueryBuilderPostFilterTreeGroupNodeData): void {
    if (node.childrenIds.length < 2) {
      const parentNode = this.getParentNode(node);
      // NOTE: we are deleting child node, i.e. modifying `childrenIds` as we iterate
      [...node.childrenIds].forEach((childId) => {
        const childNode = this.getNode(childId);
        node.removeChildNode(childNode);
        if (parentNode) {
          parentNode.addChildNode(childNode);
        } else {
          addUniqueEntry(this.rootIds, childId);
        }
      });
      // remove the group node
      this.nodes.delete(node.id);
      if (parentNode) {
        parentNode.removeChildNode(node);
      } else {
        deleteEntry(this.rootIds, node.id);
      }
    }
  }

  collapseTree(): void {
    Array.from(this.nodes.values()).forEach((node) => node.setIsOpen(false));
  }

  expandTree(): void {
    Array.from(this.nodes.values()).forEach((node) => node.setIsOpen(true));
  }
}

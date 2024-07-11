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

import { action, computed, makeObservable, observable, flow } from 'mobx';
import type { TreeNodeData, TreeData } from '@finos/legend-art';
import {
  type GeneratorFn,
  assertTrue,
  getNullableFirstEntry,
  guaranteeNonNullable,
  guaranteeType,
  IllegalStateError,
  uuid,
  addUniqueEntry,
  deleteEntry,
  assertErrorThrown,
  filterByType,
  ActionState,
  type Hashable,
  hashArray,
  isNonNullable,
} from '@finos/legend-shared';
import type { QueryBuilderExplorerTreeDragSource } from '../explorer/QueryBuilderExplorerState.js';
import { QueryBuilderPropertyExpressionState } from '../QueryBuilderPropertyEditorState.js';
import type { QueryBuilderState } from '../QueryBuilderState.js';
import {
  type ExecutionResult,
  AbstractPropertyExpression,
  type ValueSpecification,
  type VariableExpression,
  type Type,
  observe_ValueSpecification,
  CollectionInstanceValue,
  InstanceValue,
  SimpleFunctionExpression,
  matchFunctionName,
} from '@finos/legend-graph';
import { DEFAULT_LAMBDA_VARIABLE_NAME } from '../QueryBuilderConfig.js';
import type { QueryBuilderProjectionColumnDragSource } from '../fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';
import {
  buildPropertyTypeaheadQuery,
  buildTypeaheadOptions,
  performTypeahead,
} from '../QueryBuilderTypeaheadHelper.js';
import type { QueryBuilderFilterOperator } from './QueryBuilderFilterOperator.js';
import { QUERY_BUILDER_GROUP_OPERATION } from '../QueryBuilderGroupOperationHelper.js';
import { QUERY_BUILDER_STATE_HASH_STRUCTURE } from '../QueryBuilderStateHashUtils.js';
import {
  getCollectionValueSpecificationType,
  getNonCollectionValueSpecificationType,
  isValidInstanceValue,
  isValueExpressionReferencedInValue,
} from '../QueryBuilderValueSpecificationHelper.js';
import { instanceValue_setValues } from '../shared/ValueSpecificationModifierHelper.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../graph/QueryBuilderMetaModelConst.js';
import type { QueryBuilderVariableDragSource } from '../../components/shared/BasicValueSpecificationEditor.js';

export enum QUERY_BUILDER_FILTER_DND_TYPE {
  GROUP_CONDITION = 'QUERY_BUILDER_FILTER_DND_TYPE.GROUP_CONDITION',
  CONDITION = 'QUERY_BUILDER_FILTER_DND_TYPE.CONDITION',
  BLANK_CONDITION = 'QUERY_BUILDER_FILTER_DND_TYPE.BLANK_CONDITION',
}

export interface QueryBuilderFilterConditionDragSource {
  node: QueryBuilderFilterTreeNodeData;
}

export type QueryBuilderFilterNodeDropTarget =
  | QueryBuilderExplorerTreeDragSource
  | QueryBuilderProjectionColumnDragSource
  | QueryBuilderFilterConditionDragSource;

export type QueryBuilderFilterValueDropTarget =
  | QueryBuilderVariableDragSource
  | QueryBuilderProjectionColumnDragSource
  | QueryBuilderExplorerTreeDragSource;

export type QueryBuilderFilterConditionRearrangeDropTarget =
  QueryBuilderFilterConditionDragSource;

export const isCollectionProperty = (
  propertyExpression: AbstractPropertyExpression,
): boolean => {
  let currentExpression: ValueSpecification | undefined = propertyExpression;
  while (currentExpression instanceof AbstractPropertyExpression) {
    // Check if the property chain can results in column that have multiple values
    if (
      currentExpression.func.value.multiplicity.upperBound === undefined ||
      currentExpression.func.value.multiplicity.upperBound > 1
    ) {
      return true;
    }
    currentExpression = getNullableFirstEntry(
      currentExpression.parametersValues,
    );
    // Take care of chains of subtype
    while (
      currentExpression instanceof SimpleFunctionExpression &&
      matchFunctionName(
        currentExpression.functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.SUBTYPE,
      )
    ) {
      currentExpression = getNullableFirstEntry(
        currentExpression.parametersValues,
      );
    }
  }
  return false;
};

export abstract class FilterConditionValueState implements Hashable {
  conditionState: FilterConditionState;

  constructor(conditionState: FilterConditionState) {
    this.conditionState = conditionState;
  }

  get type(): Type | undefined {
    return undefined;
  }

  get isCollection(): boolean {
    return false;
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.FILTER_CONDITION_RIGHT_VALUE,
    ]);
  }
}

export class FilterValueSpecConditionValueState extends FilterConditionValueState {
  value?: ValueSpecification | undefined;

  constructor(
    conditionState: FilterConditionState,
    value?: ValueSpecification | undefined,
  ) {
    super(conditionState);
    makeObservable(this, {
      value: observable,
      setValue: action,
    });
    this.value = this.setValue(value);
  }

  override get type(): Type | undefined {
    if (this.value instanceof CollectionInstanceValue) {
      return getCollectionValueSpecificationType(
        this.conditionState.filterState.queryBuilderState.graphManagerState
          .graph,
        this.value.values,
      );
    }
    return this.value
      ? getNonCollectionValueSpecificationType(this.value)
      : undefined;
  }

  setValue(
    val: ValueSpecification | undefined,
  ): ValueSpecification | undefined {
    this.value = val
      ? observe_ValueSpecification(
          val,
          this.conditionState.filterState.queryBuilderState.observerContext,
        )
      : undefined;
    return this.value;
  }

  override get isCollection(): boolean {
    return this.value instanceof CollectionInstanceValue;
  }

  override get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.FILTER_CONDITION_RIGHT_VALUE_SPEC,
      this.value,
    ]);
  }
}

export class FilterPropertyExpressionStateConditionValueState extends FilterConditionValueState {
  propertyExpressionState: QueryBuilderPropertyExpressionState;

  constructor(
    conditionState: FilterConditionState,
    propertyExpressionState: QueryBuilderPropertyExpressionState,
  ) {
    super(conditionState);
    makeObservable(this, {
      propertyExpressionState: observable,
      changePropertyExpressionState: action,
    });
    this.propertyExpressionState = propertyExpressionState;
  }

  override get type(): Type | undefined {
    return this.propertyExpressionState.propertyExpression.genericType?.value
      .rawType;
  }

  override get isCollection(): boolean {
    return isCollectionProperty(
      this.propertyExpressionState.propertyExpression,
    );
  }

  changePropertyExpressionState(
    propertyExpressionState: QueryBuilderPropertyExpressionState,
  ): void {
    this.propertyExpressionState = propertyExpressionState;
  }
}

export class FilterConditionState implements Hashable {
  readonly filterState: QueryBuilderFilterState;
  propertyExpressionState: QueryBuilderPropertyExpressionState;
  operator!: QueryBuilderFilterOperator;
  rightConditionValue?: FilterConditionValueState | undefined;
  existsLambdaParamNames: string[] = [];
  typeaheadSearchResults: string[] | undefined;
  typeaheadSearchState = ActionState.create();

  constructor(
    filterState: QueryBuilderFilterState,
    propertyExpression: AbstractPropertyExpression,
  ) {
    makeObservable(this, {
      propertyExpressionState: observable,
      operator: observable,
      rightConditionValue: observable,
      existsLambdaParamNames: observable,
      typeaheadSearchResults: observable,
      changeOperator: action,
      setOperator: action,
      setRightConditionValue: action,
      addExistsLambdaParamNames: action,
      buildFromValueSpec: action,
      buildFromPropertyExpressionState: action,
      handleTypeaheadSearch: flow,
      operators: computed,
      hashCode: computed,
    });

    this.filterState = filterState;
    this.propertyExpressionState = new QueryBuilderPropertyExpressionState(
      filterState.queryBuilderState,
      propertyExpression,
    );

    // operator
    assertTrue(
      this.operators.length !== 0,
      `Can't find an operator for property '${this.propertyExpressionState.path}': no operators registered`,
    );
    this.operator = this.operators[0] as QueryBuilderFilterOperator;
    this.buildFromValueSpec(this.operator.getDefaultFilterConditionValue(this));
  }

  get operators(): QueryBuilderFilterOperator[] {
    return this.filterState.operators.filter((op) =>
      op.isCompatibleWithFilterConditionProperty(this),
    );
  }

  *handleTypeaheadSearch(
    searchValue?: ValueSpecification | undefined,
  ): GeneratorFn<void> {
    try {
      this.typeaheadSearchState.inProgress();
      this.typeaheadSearchResults = undefined;
      const rightConditionValue = guaranteeType(
        this.rightConditionValue,
        FilterValueSpecConditionValueState,
      );
      const value = searchValue ?? rightConditionValue.value;
      if (performTypeahead(value)) {
        const result =
          (yield this.filterState.queryBuilderState.graphManagerState.graphManager.runQuery(
            buildPropertyTypeaheadQuery(
              this.filterState.queryBuilderState,
              this.propertyExpressionState.propertyExpression,
              value,
            ),
            guaranteeNonNullable(
              this.filterState.queryBuilderState.executionContextState.mapping,
            ),
            guaranteeNonNullable(
              this.filterState.queryBuilderState.executionContextState
                .runtimeValue,
            ),
            this.filterState.queryBuilderState.graphManagerState.graph,
          )) as ExecutionResult;
        this.typeaheadSearchResults = buildTypeaheadOptions(result);
      }
      this.typeaheadSearchState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.typeaheadSearchResults = [];
      this.typeaheadSearchState.fail();
    } finally {
      this.typeaheadSearchState.complete();
    }
  }

  changeOperator(val: QueryBuilderFilterOperator): void {
    this.setOperator(val);
    if (!this.operator.isCompatibleWithFilterConditionValue(this)) {
      let defaultValue = this.operator.getDefaultFilterConditionValue(this);
      if (
        defaultValue instanceof CollectionInstanceValue &&
        this.rightConditionValue instanceof
          FilterValueSpecConditionValueState &&
        this.rightConditionValue.value instanceof InstanceValue &&
        isValidInstanceValue(this.rightConditionValue.value)
      ) {
        instanceValue_setValues(
          defaultValue,
          [this.rightConditionValue],
          this.filterState.queryBuilderState.observerContext,
        );
      } else if (
        defaultValue instanceof InstanceValue &&
        this.rightConditionValue instanceof
          FilterValueSpecConditionValueState &&
        this.rightConditionValue.value instanceof CollectionInstanceValue &&
        this.rightConditionValue.value.values.length
      ) {
        defaultValue = this.rightConditionValue.value.values[0];
      }
      this.buildFromValueSpec(defaultValue);
    }
  }

  setOperator(val: QueryBuilderFilterOperator): void {
    this.operator = val;
  }

  setRightConditionValue(val: FilterConditionValueState | undefined): void {
    this.rightConditionValue = val;
  }

  addExistsLambdaParamNames(val: string): void {
    this.existsLambdaParamNames.push(val);
  }

  buildFromValueSpec(val: ValueSpecification | undefined): void {
    if (
      this.rightConditionValue instanceof FilterValueSpecConditionValueState
    ) {
      this.rightConditionValue.setValue(val);
    } else {
      this.setRightConditionValue(
        new FilterValueSpecConditionValueState(this, val),
      );
    }
  }

  buildFromPropertyExpressionState(
    propertyExpressionState: QueryBuilderPropertyExpressionState,
  ): void {
    if (
      this.rightConditionValue instanceof
      FilterPropertyExpressionStateConditionValueState
    ) {
      this.rightConditionValue.changePropertyExpressionState(
        propertyExpressionState,
      );
    } else {
      this.setRightConditionValue(
        new FilterPropertyExpressionStateConditionValueState(
          this,
          propertyExpressionState,
        ),
      );
    }
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.FILTER_CONDITION_STATE,
      this.propertyExpressionState,
      this.rightConditionValue ?? '',
      this.operator,
    ]);
  }
}

export abstract class QueryBuilderFilterTreeNodeData
  implements TreeNodeData, Hashable
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
      hashCode: computed,
    });
  }

  abstract get dragPreviewLabel(): string;

  setIsOpen(val: boolean): void {
    this.isOpen = val;
  }

  setParentId(val: string | undefined): void {
    this.parentId = val;
  }

  abstract get hashCode(): string;
}

export abstract class QueryBuilderFilterTreeOperationNodeData
  extends QueryBuilderFilterTreeNodeData
  implements Hashable
{
  childrenIds: string[] = [];
  lambdaParameterName?: string | undefined;

  constructor(parentId: string | undefined) {
    super(parentId);

    makeObservable(this, {
      childrenIds: observable,
      addChildNode: action,
      removeChildNode: action,
      dragPreviewLabel: computed,
    });

    this.isOpen = true;
  }

  addChildNode(node: QueryBuilderFilterTreeNodeData): void {
    addUniqueEntry(this.childrenIds, node.id);
    node.setParentId(this.id);
  }

  removeChildNode(node: QueryBuilderFilterTreeNodeData): void {
    deleteEntry(this.childrenIds, node.id);
    node.setParentId(undefined);
  }

  addChildNodeAt(node: QueryBuilderFilterTreeNodeData, idx: number): void {
    if (!this.childrenIds.find((childId) => childId === node.id)) {
      idx = Math.max(0, Math.min(idx, this.childrenIds.length - 1));
      this.childrenIds.splice(idx, 0, node.id);
      node.setParentId(this.id);
    }
  }
}

export class QueryBuilderFilterTreeGroupNodeData
  extends QueryBuilderFilterTreeOperationNodeData
  implements Hashable
{
  groupOperation: QUERY_BUILDER_GROUP_OPERATION;

  constructor(
    parentId: string | undefined,
    groupOperation: QUERY_BUILDER_GROUP_OPERATION,
  ) {
    super(parentId);

    makeObservable(this, {
      groupOperation: observable,
      setGroupOperation: action,
    });

    this.groupOperation = groupOperation;
    this.isOpen = true;
  }

  get dragPreviewLabel(): string {
    return `${this.groupOperation.toUpperCase()} group`;
  }

  setGroupOperation(val: QUERY_BUILDER_GROUP_OPERATION): void {
    this.groupOperation = val;
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.FILTER_TREE_GROUP_NODE_DATA,
      this.parentId ?? '',
      hashArray(this.childrenIds),
      this.groupOperation,
      this.lambdaParameterName ?? '',
    ]);
  }
}

export class QueryBuilderFilterTreeExistsNodeData
  extends QueryBuilderFilterTreeOperationNodeData
  implements Hashable
{
  readonly filterState: QueryBuilderFilterState;
  propertyExpressionState!: QueryBuilderPropertyExpressionState;

  constructor(
    filterState: QueryBuilderFilterState,
    parentId: string | undefined,
  ) {
    super(parentId);

    makeObservable(this, {
      propertyExpressionState: observable,
      setPropertyExpression: action,
    });

    this.filterState = filterState;
    this.isOpen = true;
  }

  get dragPreviewLabel(): string {
    return `exists`;
  }

  setPropertyExpression(val: AbstractPropertyExpression): void {
    this.propertyExpressionState = new QueryBuilderPropertyExpressionState(
      this.filterState.queryBuilderState,
      val,
    );
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.FILTER_TREE_EXISTS_NODE_DATA,
      this.parentId ?? '',
      hashArray(this.childrenIds),
      this.propertyExpressionState.propertyExpression,
      this.lambdaParameterName ?? '',
    ]);
  }
}

export class QueryBuilderFilterTreeConditionNodeData
  extends QueryBuilderFilterTreeNodeData
  implements Hashable
{
  condition: FilterConditionState;
  isNewlyAdded: boolean;

  constructor(parentId: string | undefined, condition: FilterConditionState) {
    super(parentId);

    makeObservable(this, {
      condition: observable,
      isNewlyAdded: observable,
      setIsNewlyAdded: action,
      dragPreviewLabel: computed,
    });

    this.isNewlyAdded = false;
    this.condition = condition;
  }

  setIsNewlyAdded(val: boolean): void {
    this.isNewlyAdded = val;
  }

  get dragPreviewLabel(): string {
    return this.condition.propertyExpressionState.title;
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.FILTER_TREE_CONDIITION_NODE_DATA,
      this.parentId ?? '',
      this.condition,
    ]);
  }
}

export class QueryBuilderFilterTreeBlankConditionNodeData
  extends QueryBuilderFilterTreeNodeData
  implements Hashable
{
  constructor(parentId: string | undefined) {
    super(parentId);

    makeObservable(this, {
      dragPreviewLabel: computed,
    });
  }

  get dragPreviewLabel(): string {
    return '<blank>';
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.FILTER_TREE_BLANK_CONDITION_NODE_DATA,
      this.parentId ?? '',
    ]);
  }
}

export class QueryBuilderFilterState
  implements TreeData<QueryBuilderFilterTreeNodeData>, Hashable
{
  queryBuilderState: QueryBuilderState;
  lambdaParameterName = DEFAULT_LAMBDA_VARIABLE_NAME;
  rootIds: string[] = [];
  nodes = new Map<string, QueryBuilderFilterTreeNodeData>();
  selectedNode?: QueryBuilderFilterTreeNodeData | undefined;
  isRearrangingConditions = false;
  operators: QueryBuilderFilterOperator[] = [];
  showPanel = true;

  constructor(
    queryBuilderState: QueryBuilderState,
    operators: QueryBuilderFilterOperator[],
  ) {
    makeObservable(this, {
      rootIds: observable,
      nodes: observable,
      selectedNode: observable,
      isRearrangingConditions: observable,
      lambdaParameterName: observable,
      showPanel: observable,
      setLambdaParameterName: action,
      setRearrangingConditions: action,
      setSelectedNode: action,
      addNodeFromNode: action,
      replaceBlankNodeWithNode: action,
      addGroupConditionNodeFromNode: action,
      newGroupConditionFromNode: action,
      newGroupWithConditionFromNode: action,
      removeNodeAndPruneBranch: action,
      pruneTree: action,
      simplifyTree: action,
      collapseTree: action,
      setShowPanel: action,
      expandTree: action,
      allValidationIssues: computed,
      hasInvalidFilterValues: computed,
      hasInvalidDerivedPropertyParameters: computed,
      hashCode: computed,
    });

    this.queryBuilderState = queryBuilderState;
    this.operators = operators;
  }

  get isEmpty(): boolean {
    return !this.nodes.size && !this.rootIds.length;
  }

  setLambdaParameterName(val: string): void {
    this.lambdaParameterName = val;
  }

  setShowPanel(val: boolean): void {
    this.showPanel = val;
  }

  setRearrangingConditions(val: boolean): void {
    this.isRearrangingConditions = val;
  }
  setSelectedNode(val: QueryBuilderFilterTreeNodeData | undefined): void {
    this.selectedNode = val;
  }

  getNode(id: string): QueryBuilderFilterTreeNodeData {
    return guaranteeNonNullable(
      this.nodes.get(id),
      `Can't find query builder filter tree node with ID '${id}'`,
    );
  }
  getRootNode(): QueryBuilderFilterTreeNodeData | undefined {
    assertTrue(
      this.rootIds.length < 2,
      'Query builder filter tree cannot have more than 1 root',
    );
    const rootId = getNullableFirstEntry(this.rootIds);
    return rootId ? this.getNode(rootId) : undefined;
  }

  getParentNode(
    node: QueryBuilderFilterTreeNodeData,
  ): QueryBuilderFilterTreeOperationNodeData | undefined {
    return node.parentId
      ? guaranteeType(
          this.nodes.get(node.parentId),
          QueryBuilderFilterTreeOperationNodeData,
        )
      : undefined;
  }

  private addRootNode(node: QueryBuilderFilterTreeNodeData): void {
    const rootNode = this.getRootNode();
    this.nodes.set(node.id, node);
    if (rootNode instanceof QueryBuilderFilterTreeGroupNodeData) {
      rootNode.addChildNode(node);
    } else if (
      rootNode instanceof QueryBuilderFilterTreeConditionNodeData ||
      rootNode instanceof QueryBuilderFilterTreeBlankConditionNodeData ||
      rootNode instanceof QueryBuilderFilterTreeExistsNodeData
    ) {
      // if the root node is condition node, form a group between the root node and the new node and nominate the group node as the new root
      const groupNode = new QueryBuilderFilterTreeGroupNodeData(
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

  addNodeFromNode(
    node: QueryBuilderFilterTreeNodeData,
    fromNode: QueryBuilderFilterTreeNodeData | undefined,
  ): void {
    if (fromNode instanceof QueryBuilderFilterTreeGroupNodeData) {
      this.nodes.set(node.id, node);
      fromNode.addChildNode(node);
    } else if (fromNode instanceof QueryBuilderFilterTreeExistsNodeData) {
      // Here we check if there are any child nodes for exists node. The rationale
      // behind doing this check is if there are no childs we can just add a child
      // node to this otherwise we need to add a group condition for the existing
      // child node and the node we are trying to add.
      if (!fromNode.childrenIds.length) {
        this.nodes.set(node.id, node);
        fromNode.addChildNode(node);
      } else {
        this.nodes.set(node.id, node);
        const groupNode = new QueryBuilderFilterTreeGroupNodeData(
          undefined,
          QUERY_BUILDER_GROUP_OPERATION.AND,
        );
        groupNode.addChildNode(
          guaranteeNonNullable(
            this.nodes.get(guaranteeNonNullable(fromNode.childrenIds[0])),
          ),
        );
        groupNode.addChildNode(node);
        groupNode.lambdaParameterName = fromNode.lambdaParameterName;
        this.nodes.set(groupNode.id, groupNode);
        fromNode.childrenIds = [];
        fromNode.addChildNode(groupNode);
      }
    } else if (
      fromNode instanceof QueryBuilderFilterTreeConditionNodeData ||
      fromNode instanceof QueryBuilderFilterTreeBlankConditionNodeData
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

  replaceBlankNodeWithNode(
    node: QueryBuilderFilterTreeNodeData,
    blankNode: QueryBuilderFilterTreeBlankConditionNodeData,
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

  addGroupConditionNodeFromNode(
    fromNode: QueryBuilderFilterTreeNodeData | undefined,
  ): void {
    const newGroupNode = new QueryBuilderFilterTreeGroupNodeData(
      undefined,
      QUERY_BUILDER_GROUP_OPERATION.AND,
    );
    const newBlankConditionNode1 =
      new QueryBuilderFilterTreeBlankConditionNodeData(undefined);
    const newBlankConditionNode2 =
      new QueryBuilderFilterTreeBlankConditionNodeData(undefined);
    this.nodes.set(newBlankConditionNode1.id, newBlankConditionNode1);
    this.nodes.set(newBlankConditionNode2.id, newBlankConditionNode2);
    newGroupNode.addChildNode(newBlankConditionNode1);
    newGroupNode.addChildNode(newBlankConditionNode2);
    this.addNodeFromNode(newGroupNode, fromNode);
  }

  /**
   *
   * Function to create group condition from node where either of the
   * child nodes of group condition is `exists` node
   */
  newGroupConditionFromNode(
    fromNode:
      | QueryBuilderFilterTreeConditionNodeData
      | QueryBuilderFilterTreeExistsNodeData,
    node?:
      | QueryBuilderFilterTreeConditionNodeData
      | QueryBuilderFilterTreeExistsNodeData
      | undefined,
    operation?: QUERY_BUILDER_GROUP_OPERATION | undefined,
  ): QueryBuilderFilterTreeGroupNodeData {
    const fromNodeParent = this.getParentNode(fromNode);
    const newGroupNode = new QueryBuilderFilterTreeGroupNodeData(
      undefined,
      operation ?? QUERY_BUILDER_GROUP_OPERATION.AND,
    );
    this.nodes.set(newGroupNode.id, newGroupNode);
    fromNodeParent?.removeChildNode(fromNode);
    newGroupNode.addChildNode(fromNode);
    if (node) {
      this.nodes.set(node.id, node);
      newGroupNode.addChildNode(node);
    }
    newGroupNode.lambdaParameterName =
      fromNodeParent?.lambdaParameterName ?? this.lambdaParameterName;
    if (fromNodeParent) {
      fromNodeParent.addChildNode(newGroupNode);
    } else {
      deleteEntry(this.rootIds, fromNode.id);
      this.addRootNode(newGroupNode);
    }
    return newGroupNode;
  }

  newGroupWithConditionFromNode(
    node: QueryBuilderFilterTreeNodeData | undefined,
    fromNode: QueryBuilderFilterTreeNodeData | undefined,
  ): void {
    const newNode =
      node ?? new QueryBuilderFilterTreeBlankConditionNodeData(undefined);
    if (fromNode instanceof QueryBuilderFilterTreeConditionNodeData) {
      const fromNodeParent = this.getParentNode(fromNode);
      if (fromNodeParent) {
        const fromNodeIdx = fromNodeParent.childrenIds.findIndex(
          (childId) => childId === fromNode.id,
        );
        fromNodeParent.removeChildNode(fromNode);
        const newGroupNode = new QueryBuilderFilterTreeGroupNodeData(
          undefined,
          QUERY_BUILDER_GROUP_OPERATION.AND,
        );
        this.nodes.set(newNode.id, newNode);
        this.nodes.set(newGroupNode.id, newGroupNode);
        newGroupNode.addChildNode(fromNode);
        newGroupNode.addChildNode(newNode);
        newGroupNode.lambdaParameterName = fromNodeParent.lambdaParameterName;
        fromNodeParent.addChildNodeAt(newGroupNode, fromNodeIdx);
      } else {
        this.addRootNode(newNode);
      }
    }
  }

  private removeNode(node: QueryBuilderFilterTreeNodeData): void {
    this.nodes.delete(node.id);
    // remove relationship with children nodes
    if (node instanceof QueryBuilderFilterTreeOperationNodeData) {
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

  private pruneChildlessGroupNodes(): void {
    const getChildlessGroupNodes = (): QueryBuilderFilterTreeGroupNodeData[] =>
      Array.from(this.nodes.values())
        .filter(filterByType(QueryBuilderFilterTreeGroupNodeData))
        .filter((node) => !node.childrenIds.length);
    let nodesToProcess = getChildlessGroupNodes();
    while (nodesToProcess.length) {
      nodesToProcess.forEach((node) => this.removeNode(node));
      nodesToProcess = getChildlessGroupNodes();
    }
  }

  private pruneOrphanNodes(): void {
    const getOrphanNodes = (): QueryBuilderFilterTreeNodeData[] =>
      Array.from(this.nodes.values()).filter(
        (node) => !node.parentId && !this.rootIds.includes(node.id),
      ); // nodes without parent, except for root nodes
    let nodesToProcess = getOrphanNodes();
    while (nodesToProcess.length) {
      nodesToProcess.forEach((node) => this.removeNode(node));
      nodesToProcess = getOrphanNodes();
    }
  }

  /**
   * If group node has fewer than 2 children, flatten it
   */
  private squashGroupNode(node: QueryBuilderFilterTreeGroupNodeData): void {
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

  removeNodeAndPruneBranch(node: QueryBuilderFilterTreeNodeData): void {
    const parentNode = this.getParentNode(node);
    this.removeNode(node);
    // squash parent node after the current node is deleted
    if (parentNode) {
      parentNode.removeChildNode(node);
      let currentParentNode:
        | QueryBuilderFilterTreeOperationNodeData
        | undefined = parentNode;
      while (
        currentParentNode &&
        currentParentNode instanceof QueryBuilderFilterTreeGroupNodeData
      ) {
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

  pruneTree(): void {
    this.setSelectedNode(undefined);
    // remove all blank nodes
    Array.from(this.nodes.values())
      .filter(
        (node) => node instanceof QueryBuilderFilterTreeBlankConditionNodeData,
      )
      .forEach((node) => this.removeNode(node));
    // prune
    this.pruneOrphanNodes();
    this.pruneChildlessGroupNodes();
    // squash group nodes
    // NOTE: since we have pruned all blank nodes and childless group nodes, at this point, if there are group nodes to be squashed
    // it will be group node with exactly 1 non-blank condition
    const getSquashableGroupNodes = (): QueryBuilderFilterTreeGroupNodeData[] =>
      Array.from(this.nodes.values())
        .filter(filterByType(QueryBuilderFilterTreeGroupNodeData))
        .filter((node) => node.childrenIds.length < 2)
        .filter((node) => {
          if (!node.childrenIds.length) {
            throw new IllegalStateError(
              'Query builder filter tree found unexpected childless group nodes',
            );
          }
          const firstChildNodeId = node.childrenIds[0] as string;
          const childNode = this.getNode(firstChildNodeId);
          if (
            childNode instanceof QueryBuilderFilterTreeBlankConditionNodeData
          ) {
            throw new IllegalStateError(
              'Query builder filter tree found unexpected blank nodes',
            );
          }
          return (
            this.getNode(firstChildNodeId) instanceof
            QueryBuilderFilterTreeConditionNodeData
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
   * Cleanup unecessary group nodes (i.e. group node whose group operation is the same as its parent's)
   */
  simplifyTree(): void {
    this.setSelectedNode(undefined);
    const getUnnecessaryNodes = (): QueryBuilderFilterTreeGroupNodeData[] =>
      Array.from(this.nodes.values())
        .filter(filterByType(QueryBuilderFilterTreeGroupNodeData))
        .filter((node) => {
          if (!node.parentId || !this.nodes.has(node.parentId)) {
            return false;
          }
          const parentGroupNode = this.nodes.get(node.parentId);

          return (
            parentGroupNode instanceof QueryBuilderFilterTreeGroupNodeData &&
            parentGroupNode.groupOperation === node.groupOperation
          );
        });
    // Squash these unnecessary group nodes
    let nodesToProcess = getUnnecessaryNodes();
    while (nodesToProcess.length) {
      nodesToProcess.forEach((node) => {
        const parentNode = guaranteeType(
          this.nodes.get(guaranteeNonNullable(node.parentId)),
          QueryBuilderFilterTreeGroupNodeData,
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

  isValidMove(
    node: QueryBuilderFilterTreeNodeData,
    toNode: QueryBuilderFilterTreeNodeData,
  ): boolean {
    const isMovingToItself = node === toNode;
    // disallow moving a node to its descendants
    let isMovingToChildNode = false;
    let currentParentNode = this.getParentNode(toNode);
    while (currentParentNode) {
      if (currentParentNode === node) {
        isMovingToChildNode = true;
        break;
      }
      currentParentNode = this.getParentNode(currentParentNode);
    }
    return !isMovingToItself && !isMovingToChildNode;
  }

  moveNode(
    node: QueryBuilderFilterTreeNodeData,
    toNode: QueryBuilderFilterTreeNodeData,
  ): void {
    // do something;
  }

  collapseTree(): void {
    Array.from(this.nodes.values()).forEach((node) => node.setIsOpen(false));
  }

  expandTree(): void {
    Array.from(this.nodes.values()).forEach((node) => node.setIsOpen(true));
  }

  isVariableUsed(variable: VariableExpression): boolean {
    return Boolean(
      Array.from(this.nodes.values())
        .filter(filterByType(QueryBuilderFilterTreeConditionNodeData))
        .map((node) =>
          node.condition.rightConditionValue instanceof
          FilterValueSpecConditionValueState
            ? node.condition.rightConditionValue.value
            : undefined,
        )
        .filter(isNonNullable)
        .find((value) => isValueExpressionReferencedInValue(variable, value)),
    );
  }

  get allValidationIssues(): string[] {
    const validationIssues: string[] = [];
    Array.from(this.nodes.values()).forEach((node) => {
      if (node instanceof QueryBuilderFilterTreeConditionNodeData) {
        if (
          node.condition.rightConditionValue instanceof InstanceValue &&
          !isValidInstanceValue(node.condition.rightConditionValue)
        ) {
          validationIssues.push(
            `Filter value for ${node.condition.propertyExpressionState.title} is missing or invalid`,
          );
        }
        if (!node.condition.propertyExpressionState.isValid) {
          validationIssues.push(
            `Derived property parameter value for ${node.condition.propertyExpressionState.title} is missing or invalid`,
          );
        }
      }
    });
    return validationIssues;
  }

  get hasInvalidFilterValues(): boolean {
    return Array.from(this.nodes.values()).some(
      (node) =>
        node instanceof QueryBuilderFilterTreeConditionNodeData &&
        node.condition.rightConditionValue instanceof InstanceValue &&
        !isValidInstanceValue(node.condition.rightConditionValue),
    );
  }

  get hasInvalidDerivedPropertyParameters(): boolean {
    return Array.from(this.nodes.values()).some(
      (node) =>
        node instanceof QueryBuilderFilterTreeConditionNodeData &&
        !node.condition.propertyExpressionState.isValid,
    );
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.FILTER_STATE,
      hashArray(this.rootIds),
      hashArray(Array.from(this.nodes.values())),
    ]);
  }
}

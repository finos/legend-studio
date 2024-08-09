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
  type ExecutionResult,
  type SimpleFunctionExpression,
  observe_ValueSpecification,
  PrimitiveType,
  CollectionInstanceValue,
  InstanceValue,
  VariableExpression,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  addUniqueEntry,
  assertErrorThrown,
  assertTrue,
  deleteEntry,
  getNullableFirstEntry,
  guaranteeNonNullable,
  guaranteeType,
  IllegalStateError,
  uuid,
  filterByType,
  ActionState,
  hashArray,
  uniq,
  type Hashable,
  isNonNullable,
} from '@finos/legend-shared';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import { DEFAULT_POST_FILTER_LAMBDA_VARIABLE_NAME } from '../../../QueryBuilderConfig.js';
import { QueryBuilderAggregateColumnState } from '../aggregation/QueryBuilderAggregationState.js';
import type { QueryBuilderPostFilterOperator } from './QueryBuilderPostFilterOperator.js';
import {
  QueryBuilderProjectionColumnState,
  type QueryBuilderProjectionColumnDragSource,
  QueryBuilderDerivationProjectionColumnState,
  QueryBuilderSimpleProjectionColumnState,
} from '../projection/QueryBuilderProjectionColumnState.js';
import {
  buildProjectionColumnTypeaheadQuery,
  buildTypeaheadOptions,
  performTypeahead,
} from '../../../QueryBuilderTypeaheadHelper.js';
import { QUERY_BUILDER_GROUP_OPERATION } from '../../../QueryBuilderGroupOperationHelper.js';
import type { QueryBuilderTDSState } from '../QueryBuilderTDSState.js';
import { QUERY_BUILDER_STATE_HASH_STRUCTURE } from '../../../QueryBuilderStateHashUtils.js';
import type { QueryBuilderTDSColumnState } from '../QueryBuilderTDSColumnState.js';
import {
  getCollectionValueSpecificationType,
  getNonCollectionValueSpecificationType,
  isTypeCompatibleForAssignment,
  isValidInstanceValue,
  isValueExpressionReferencedInValue,
} from '../../../QueryBuilderValueSpecificationHelper.js';
import { buildtdsPropertyExpressionFromColState } from './operators/QueryBuilderPostFilterOperatorValueSpecificationBuilder.js';
import { TDS_COLUMN_GETTER } from '../../../../graph/QueryBuilderMetaModelConst.js';
import type { QueryBuilderFilterTreeNodeData } from '../../../filter/QueryBuilderFilterState.js';

export enum QUERY_BUILDER_POST_FILTER_DND_TYPE {
  GROUP_CONDITION = 'QUERY_BUILDER_POST_FILTER_DND_TYPE.GROUP_CONDITION',
  CONDITION = 'QUERY_BUILDER_POST_FILTER_DND_TYPE.CONDITION',
  BLANK_CONDITION = 'QUERY_BUILDER_POST_FILTER_DND_TYPE.BLANK_CONDITION',
}

export const getTypeFromDerivedProperty = (
  derivedProperty: TDS_COLUMN_GETTER,
  graph: PureModel,
): Type | undefined => {
  switch (derivedProperty) {
    case TDS_COLUMN_GETTER.GET_STRING:
      return PrimitiveType.STRING;
    case TDS_COLUMN_GETTER.GET_NUMBER:
      return PrimitiveType.NUMBER;
    case TDS_COLUMN_GETTER.GET_INTEGER:
      return PrimitiveType.INTEGER;
    case TDS_COLUMN_GETTER.GET_FLOAT:
      return PrimitiveType.FLOAT;
    case TDS_COLUMN_GETTER.GET_DECIMAL:
      return PrimitiveType.DECIMAL;
    case TDS_COLUMN_GETTER.GET_DATE:
      return PrimitiveType.DATE;
    case TDS_COLUMN_GETTER.GET_DATETIME:
      return PrimitiveType.DATETIME;
    case TDS_COLUMN_GETTER.GET_STRICTDATE:
      return PrimitiveType.STRICTDATE;
    case TDS_COLUMN_GETTER.GET_BOOLEAN:
      return PrimitiveType.BOOLEAN;
    default:
      return undefined;
  }
};

export abstract class QueryBuilderPostFilterTreeNodeData
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

export interface QueryBuilderPostFilterConditionDragSource {
  node: QueryBuilderPostFilterTreeNodeData;
}

export type QueryBuilderPostFilterDropTarget =
  | QueryBuilderProjectionColumnDragSource
  | QueryBuilderPostFilterConditionDragSource;

export class QueryBuilderPostFilterTreeGroupNodeData
  extends QueryBuilderPostFilterTreeNodeData
  implements Hashable
{
  groupOperation: QUERY_BUILDER_GROUP_OPERATION;
  childrenIds: string[] = [];

  constructor(
    parentId: string | undefined,
    groupOperation: QUERY_BUILDER_GROUP_OPERATION,
  ) {
    super(parentId);
    makeObservable(this, {
      groupOperation: observable,
      setGroupOperation: action,
      childrenIds: observable,
      addChildNode: action,
      removeChildNode: action,
      dragPreviewLabel: computed,
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

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.POST_FILTER_TREE_GROUP_NODE_DATA,
      this.parentId ?? '',
      hashArray(this.childrenIds),
      this.groupOperation,
    ]);
  }
}

export class QueryBuilderPostFilterTreeConditionNodeData
  extends QueryBuilderPostFilterTreeNodeData
  implements Hashable
{
  condition: PostFilterConditionState;
  isNewlyAdded: boolean;

  constructor(
    parentId: string | undefined,
    condition: PostFilterConditionState,
    isNewlyAdded?: boolean,
  ) {
    super(parentId);

    makeObservable(this, {
      condition: observable,
      isNewlyAdded: observable,
      setIsNewlyAdded: action,
      dragPreviewLabel: computed,
    });

    this.condition = condition;
    this.isNewlyAdded = isNewlyAdded ?? false;
  }

  setIsNewlyAdded(val: boolean): void {
    this.isNewlyAdded = val;
  }

  get dragPreviewLabel(): string {
    return this.condition.columnName;
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.POST_FILTER_TREE_CONDIITION_NODE_DATA,
      this.parentId ?? '',
      this.condition,
    ]);
  }
}

export class QueryBuilderPostFilterTreeBlankConditionNodeData
  extends QueryBuilderPostFilterTreeNodeData
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
      QUERY_BUILDER_STATE_HASH_STRUCTURE.POST_FILTER_TREE_BLANK_CONDITION_NODE_DATA,
      this.parentId ?? '',
    ]);
  }
}

export abstract class PostFilterConditionValueState implements Hashable {
  conditionState: PostFilterConditionState;

  constructor(conditionState: PostFilterConditionState) {
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
      QUERY_BUILDER_STATE_HASH_STRUCTURE.POST_FILTER_CONDITION_RIGHT_VALUE,
    ]);
  }

  abstract appendConditionValue(expressionVal: SimpleFunctionExpression): void;
}

export class PostFilterValueSpecConditionValueState extends PostFilterConditionValueState {
  value?: ValueSpecification | undefined;

  constructor(
    conditionState: PostFilterConditionState,
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
        this.conditionState.postFilterState.tdsState.queryBuilderState
          .graphManagerState.graph,
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
          this.conditionState.postFilterState.tdsState.queryBuilderState
            .observerContext,
        )
      : undefined;
    return this.value;
  }
  override appendConditionValue(expressionVal: SimpleFunctionExpression): void {
    if (this.value) {
      expressionVal.parametersValues.push(this.value);
    }
  }

  override get isCollection(): boolean {
    return this.value instanceof CollectionInstanceValue;
  }

  override get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.POST_FILTER_CONDITION_RIGHT_VALUE_SPEC,
      this.value,
    ]);
  }
}

export class PostFilterTDSColumnValueConditionValueState extends PostFilterConditionValueState {
  tdsColumn: QueryBuilderTDSColumnState;

  constructor(
    conditionState: PostFilterConditionState,
    tdsColumn: QueryBuilderTDSColumnState,
  ) {
    super(conditionState);
    makeObservable(this, {
      tdsColumn: observable,
      changeCol: action,
    });
    this.tdsColumn = tdsColumn;
  }

  override get type(): Type | undefined {
    return this.tdsColumn.getColumnType();
  }

  override get isCollection(): boolean {
    return false;
  }
  override appendConditionValue(expressionVal: SimpleFunctionExpression): void {
    const tdsPropertyExpression = buildtdsPropertyExpressionFromColState(
      this.conditionState,
      this.tdsColumn,
      this.conditionState.postFilterState.tdsState.queryBuilderState
        .graphManagerState.graph,
      undefined,
    );
    expressionVal.parametersValues.push(tdsPropertyExpression);
  }

  changeCol(col: QueryBuilderTDSColumnState): void {
    this.tdsColumn = col;
  }
}

export class PostFilterConditionState implements Hashable {
  readonly postFilterState: QueryBuilderPostFilterState;
  leftConditionValue: QueryBuilderTDSColumnState;
  rightConditionValue: PostFilterConditionValueState;
  operator: QueryBuilderPostFilterOperator;
  typeaheadSearchResults: string[] | undefined;
  typeaheadSearchState = ActionState.create();

  constructor(
    postFilterState: QueryBuilderPostFilterState,
    colState: QueryBuilderTDSColumnState,
    operator: QueryBuilderPostFilterOperator | undefined,
  ) {
    makeObservable(this, {
      postFilterState: observable,
      rightConditionValue: observable,
      operator: observable,
      leftConditionValue: observable,
      typeaheadSearchResults: observable,
      changeOperator: action,
      setColumnState: action,
      setRightConditionVal: action,
      buildFromValueSpec: action,
      setOperator: action,
      changeColumn: flow,
      handleTypeaheadSearch: flow,
      columnName: computed,
      hashCode: computed,
    });

    this.postFilterState = postFilterState;
    this.leftConditionValue = colState;
    this.rightConditionValue = new PostFilterValueSpecConditionValueState(
      this,
      undefined,
    );
    if (operator) {
      this.operator = operator;
    } else {
      assertTrue(
        this.operators.length !== 0,
        `Can't find an operator for column '${this.leftConditionValue.columnName}`,
      );
      this.operator = guaranteeNonNullable(this.operators[0]);
    }
  }

  get columnName(): string {
    return this.leftConditionValue.columnName;
  }

  get operators(): QueryBuilderPostFilterOperator[] {
    return this.postFilterState.operators.filter((op) =>
      op.isCompatibleWithPostFilterColumn(this),
    );
  }

  setRightConditionVal(val: PostFilterConditionValueState): void {
    this.rightConditionValue = val;
  }

  buildFromValueSpec(val: ValueSpecification | undefined): void {
    if (
      this.rightConditionValue instanceof PostFilterValueSpecConditionValueState
    ) {
      this.rightConditionValue.setValue(val);
      return;
    } else {
      this.setRightConditionVal(
        new PostFilterValueSpecConditionValueState(this, val),
      );
    }
  }
  *handleTypeaheadSearch(
    searchValue?: ValueSpecification | undefined,
  ): GeneratorFn<void> {
    try {
      this.typeaheadSearchState.inProgress();
      this.typeaheadSearchResults = undefined;
      const _columnState =
        this.leftConditionValue instanceof QueryBuilderProjectionColumnState ||
        this.leftConditionValue instanceof QueryBuilderAggregateColumnState
          ? this.leftConditionValue
          : undefined;
      const columnState = guaranteeNonNullable(_columnState);
      const rightConditionValue = guaranteeType(
        this.rightConditionValue,
        PostFilterValueSpecConditionValueState,
      );
      const value = searchValue ?? rightConditionValue.value;
      if (performTypeahead(value)) {
        const result =
          (yield this.postFilterState.tdsState.queryBuilderState.graphManagerState.graphManager.runQuery(
            buildProjectionColumnTypeaheadQuery(
              this.postFilterState.tdsState.queryBuilderState,
              columnState,
              value,
            ),
            guaranteeNonNullable(
              this.postFilterState.tdsState.queryBuilderState
                .executionContextState.mapping,
            ),
            guaranteeNonNullable(
              this.postFilterState.tdsState.queryBuilderState
                .executionContextState.runtimeValue,
            ),
            this.postFilterState.tdsState.queryBuilderState.graphManagerState
              .graph,
          )) as ExecutionResult;
        this.typeaheadSearchResults = buildTypeaheadOptions(result);
      }
      this.typeaheadSearchState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.typeaheadSearchState.fail();
    } finally {
      this.typeaheadSearchState.complete();
    }
  }

  changeOperator(val: QueryBuilderPostFilterOperator): void {
    this.setOperator(val);
    if (!this.operator.isCompatibleWithConditionValue(this)) {
      this.buildFromValueSpec(
        this.operator.getDefaultFilterConditionValue(this),
      );
    }
  }
  setColumnState(
    val: QueryBuilderProjectionColumnState | QueryBuilderAggregateColumnState,
  ): void {
    this.leftConditionValue = val;
  }

  setOperator(val: QueryBuilderPostFilterOperator): void {
    this.operator = val;
  }

  *changeColumn(
    columnState: QueryBuilderProjectionColumnState,
  ): GeneratorFn<void> {
    try {
      const aggregateColumnState =
        this.postFilterState.tdsState.aggregationState.columns.find(
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
        this.buildFromValueSpec(
          this.operator.getDefaultFilterConditionValue(this),
        );
      }
    } catch (error) {
      assertErrorThrown(error);
      this.postFilterState.tdsState.queryBuilderState.applicationStore.notificationService.notifyError(
        `Can't drag column '${columnState.columnName}' due to: ${error.message}`,
      );
    }
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.POST_FILTER_CONDITION_STATE,
      this.leftConditionValue,
      this.rightConditionValue,
      this.operator,
    ]);
  }
}

export class QueryBuilderPostFilterState
  implements TreeData<QueryBuilderPostFilterTreeNodeData>, Hashable
{
  tdsState: QueryBuilderTDSState;
  lambdaParameterName = DEFAULT_POST_FILTER_LAMBDA_VARIABLE_NAME;
  selectedNode?: QueryBuilderPostFilterTreeNodeData | undefined;
  isRearrangingConditions = false;
  operators: QueryBuilderPostFilterOperator[] = [];
  rootIds: string[] = [];
  nodes = new Map<string, QueryBuilderPostFilterTreeNodeData>();
  derivedColumnBeingDropped:
    | QueryBuilderDerivationProjectionColumnState
    | undefined;

  constructor(
    tdsState: QueryBuilderTDSState,
    operators: QueryBuilderPostFilterOperator[],
  ) {
    makeObservable(this, {
      tdsState: false,
      selectedNode: observable,
      isRearrangingConditions: observable,
      rootIds: observable,
      nodes: observable,
      lambdaParameterName: observable,
      derivedColumnBeingDropped: observable,
      setLambdaParameterName: action,
      setSelectedNode: action,
      addNodeFromNode: action,
      addGroupConditionNodeFromNode: action,
      newGroupWithConditionFromNode: action,
      removeNodeAndPruneBranch: action,
      pruneTree: action,
      simplifyTree: action,
      collapseTree: action,
      expandTree: action,
      replaceBlankNodeWithNode: action,
      setRearrangingConditions: action,
      setDerivedColumnBeingDropped: action,
      allValidationIssues: computed,
      hasInvalidFilterValues: computed,
      hasInvalidDerivedPropertyParameters: computed,
      hashCode: computed,
    });

    this.tdsState = tdsState;
    this.operators = operators;
  }

  setRearrangingConditions(val: boolean): void {
    this.isRearrangingConditions = val;
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

  setDerivedColumnBeingDropped(
    val: QueryBuilderDerivationProjectionColumnState | undefined,
  ): void {
    this.derivedColumnBeingDropped = val;
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

  get referencedTDSColumns(): QueryBuilderTDSColumnState[] {
    return uniq(
      Array.from(this.nodes.values())
        .filter(filterByType(QueryBuilderPostFilterTreeConditionNodeData))
        .map((n) => [
          n.condition.leftConditionValue,
          ...(n.condition.rightConditionValue instanceof
          PostFilterTDSColumnValueConditionValueState
            ? [n.condition.rightConditionValue.tdsColumn]
            : []),
        ])
        .flat(),
    );
  }

  getRootNode(): QueryBuilderPostFilterTreeNodeData | undefined {
    assertTrue(
      this.rootIds.length < 2,
      'Query builder post-filter tree cannot have more than 1 root',
    );
    const rootId = getNullableFirstEntry(this.rootIds);
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

  isVariableUsed(variable: VariableExpression): boolean {
    return Boolean(
      Array.from(this.nodes.values())
        .filter(filterByType(QueryBuilderPostFilterTreeConditionNodeData))
        .map((node) => node.condition.rightConditionValue)
        .filter(filterByType(PostFilterValueSpecConditionValueState))
        .map((condition) => condition.value)
        .filter(isNonNullable)
        .find((value) => isValueExpressionReferencedInValue(variable, value)),
    );
  }

  isInvalidValueSpecPostFilterValue(
    node: QueryBuilderPostFilterTreeNodeData,
  ): boolean {
    return (
      node instanceof QueryBuilderPostFilterTreeConditionNodeData &&
      node.condition.rightConditionValue instanceof
        PostFilterValueSpecConditionValueState &&
      ((node.condition.rightConditionValue.value instanceof InstanceValue &&
        !isValidInstanceValue(node.condition.rightConditionValue.value)) ||
        (node.condition.rightConditionValue.value instanceof
          VariableExpression &&
          !isTypeCompatibleForAssignment(
            node.condition.leftConditionValue.getColumnType(),
            node.condition.rightConditionValue.type,
          )))
    );
  }

  isInvalidTDSColumnPostFilterValue(
    node: QueryBuilderFilterTreeNodeData,
  ): boolean {
    return (
      node instanceof QueryBuilderPostFilterTreeConditionNodeData &&
      node.condition.rightConditionValue instanceof
        PostFilterTDSColumnValueConditionValueState &&
      !isTypeCompatibleForAssignment(
        node.condition.leftConditionValue.getColumnType(),
        node.condition.rightConditionValue.type,
      )
    );
  }

  get allValidationIssues(): string[] {
    const validationIssues: string[] = [];
    Array.from(this.nodes.values()).forEach((node) => {
      if (node instanceof QueryBuilderPostFilterTreeConditionNodeData) {
        if (
          this.isInvalidValueSpecPostFilterValue(node) ||
          this.isInvalidTDSColumnPostFilterValue(node)
        ) {
          validationIssues.push(
            `Filter value for ${node.condition.leftConditionValue.columnName} is missing or invalid`,
          );
        }
        if (
          node.condition.leftConditionValue instanceof
            QueryBuilderSimpleProjectionColumnState &&
          !node.condition.leftConditionValue.propertyExpressionState.isValid
        ) {
          validationIssues.push(
            `Derived property parameter value for ${node.condition.leftConditionValue.propertyExpressionState.title} is missing or invalid`,
          );
        }
      }
    });
    return validationIssues;
  }

  get hasInvalidFilterValues(): boolean {
    return Array.from(this.nodes.values()).some(
      (node) =>
        this.isInvalidValueSpecPostFilterValue(node) ||
        this.isInvalidTDSColumnPostFilterValue(node),
    );
  }

  get hasInvalidDerivedPropertyParameters(): boolean {
    return Array.from(this.nodes.values()).some(
      (node) =>
        node instanceof QueryBuilderPostFilterTreeConditionNodeData &&
        node.condition.leftConditionValue instanceof
          QueryBuilderSimpleProjectionColumnState &&
        !node.condition.leftConditionValue.propertyExpressionState.isValid,
    );
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.POST_FILTER_STATE,
      hashArray(this.rootIds),
      hashArray(Array.from(this.nodes.values())),
    ]);
  }
}

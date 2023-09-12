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

import { useRef, useState, useCallback, forwardRef, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import {
  type TreeNodeContainerProps,
  type TreeNodeViewProps,
  clsx,
  ContextMenu,
  DropdownMenu,
  MenuContent,
  MenuContentItem,
  BlankPanelPlaceholder,
  FilledTriangleIcon,
  CompressIcon,
  ExpandIcon,
  TrashIcon,
  NewFolderIcon,
  CircleIcon,
  CaretDownIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlusCircleIcon,
  TimesIcon,
  PanelDropZone,
  DragPreviewLayer,
  PanelEntryDropZonePlaceholder,
  useDragPreviewLayer,
  PanelContent,
  MoreVerticalIcon,
  MenuContentItemIcon,
  MenuContentItemLabel,
  InfoCircleIcon,
} from '@finos/legend-art';
import {
  type QueryBuilderFilterConditionDragSource,
  type QueryBuilderFilterDropTarget,
  type QueryBuilderFilterTreeNodeData,
  QUERY_BUILDER_FILTER_DND_TYPE,
  FilterConditionState,
  QueryBuilderFilterTreeConditionNodeData,
  QueryBuilderFilterTreeBlankConditionNodeData,
  QueryBuilderFilterTreeGroupNodeData,
  QueryBuilderFilterTreeExistsNodeData,
  QueryBuilderFilterTreeOperationNodeData,
  type QueryBuilderFilterState,
} from '../../stores/filter/QueryBuilderFilterState.js';
import { useDrag, useDragLayer, useDrop } from 'react-dnd';
import {
  type QueryBuilderExplorerTreeDragSource,
  type QueryBuilderExplorerTreePropertyNodeData,
  buildPropertyExpressionFromExplorerTreeNodeData,
  QUERY_BUILDER_EXPLORER_TREE_DND_TYPE,
} from '../../stores/explorer/QueryBuilderExplorerState.js';
import {
  QueryBuilderPropertyExpressionBadge,
  QueryBuilderPropertyExpressionEditor,
} from '../QueryBuilderPropertyExpressionEditor.js';
import type { QueryBuilderState } from '../../stores/QueryBuilderState.js';
import {
  assertErrorThrown,
  assertTrue,
  debounce,
  generateEnumerableNameFromToken,
  getNullableFirstEntry,
  guaranteeNonNullable,
  guaranteeType,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import {
  ActionAlertActionType,
  ActionAlertType,
  useApplicationStore,
} from '@finos/legend-application';
import {
  AbstractPropertyExpression,
  extractElementNameFromPath,
  matchFunctionName,
  Multiplicity,
  SimpleFunctionExpression,
  type ValueSpecification,
  VariableExpression,
} from '@finos/legend-graph';
import {
  type QueryBuilderProjectionColumnDragSource,
  QueryBuilderSimpleProjectionColumnState,
  QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE,
} from '../../stores/fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';
import type { QueryBuilderFilterOperator } from '../../stores/filter/QueryBuilderFilterOperator.js';
import { isTypeCompatibleForAssignment } from '../../stores/QueryBuilderValueSpecificationHelper.js';
import { QUERY_BUILDER_GROUP_OPERATION } from '../../stores/QueryBuilderGroupOperationHelper.js';
import {
  BasicValueSpecificationEditor,
  type QueryBuilderVariableDragSource,
  QUERY_BUILDER_VARIABLE_DND_TYPE,
} from '../shared/BasicValueSpecificationEditor.js';
import { QueryBuilderTelemetryHelper } from '../../__lib__/QueryBuilderTelemetryHelper.js';
import { getPropertyChainName } from '../../stores/QueryBuilderPropertyEditorState.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../graph/QueryBuilderMetaModelConst.js';

const isCollectionProperty = (
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

/**
 * This function updates the filter state when we DnD a property that can accept multiple values.
 */
export const buildFilterTreeWithExists = (
  propertyExpression: AbstractPropertyExpression,
  filterState: QueryBuilderFilterState,
  targetDropNode?: QueryBuilderFilterTreeOperationNodeData,
): void => {
  // 1. Decompose property expression
  const expressions: (AbstractPropertyExpression | SimpleFunctionExpression)[] =
    [];
  let currentPropertyExpression: ValueSpecification = propertyExpression;
  while (
    currentPropertyExpression instanceof AbstractPropertyExpression ||
    (currentPropertyExpression instanceof SimpleFunctionExpression &&
      matchFunctionName(
        currentPropertyExpression.functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.SUBTYPE,
      ))
  ) {
    let exp: AbstractPropertyExpression | SimpleFunctionExpression;
    if (currentPropertyExpression instanceof SimpleFunctionExpression) {
      exp = new SimpleFunctionExpression(
        extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.SUBTYPE),
      );
    } else {
      exp = new AbstractPropertyExpression('');
      exp.func = currentPropertyExpression.func;
    }
    // NOTE: we must retain the rest of the parameters as those are derived property parameters
    exp.parametersValues =
      currentPropertyExpression.parametersValues.length > 1
        ? currentPropertyExpression.parametersValues.slice(1)
        : [];
    expressions.push(exp);
    currentPropertyExpression = guaranteeNonNullable(
      currentPropertyExpression.parametersValues[0],
    );
  }
  const rootVariable = guaranteeType(
    currentPropertyExpression,
    VariableExpression,
  );

  // 2. Traverse the list of decomposed property expression backward, every time we encounter a property of
  // multiplicity many, create a new property expression and keep track of it to later form the lambda chain
  let existsLambdaParamNames: string[] = [];
  let existsLambdaPropertyChains: ValueSpecification[] = [rootVariable];
  let currentParamNameIndex = 0;

  for (let i = expressions.length - 1; i >= 0; --i) {
    const exp = expressions[i] as
      | AbstractPropertyExpression
      | SimpleFunctionExpression;
    // just keep adding to the property chain
    exp.parametersValues.unshift(
      existsLambdaPropertyChains[
        existsLambdaPropertyChains.length - 1
      ] as ValueSpecification,
    );
    existsLambdaPropertyChains[existsLambdaPropertyChains.length - 1] = exp;
    // ... but if the property is of multiplicity multiple, start a new property chain
    if (
      exp instanceof AbstractPropertyExpression &&
      (exp.func.value.multiplicity.upperBound === undefined ||
        exp.func.value.multiplicity.upperBound > 1)
    ) {
      // NOTE: we need to find/generate the property chain variable name
      if (currentParamNameIndex > existsLambdaParamNames.length - 1) {
        existsLambdaParamNames.push(
          generateEnumerableNameFromToken(
            existsLambdaParamNames,
            filterState.lambdaParameterName,
          ),
        );
        assertTrue(currentParamNameIndex === existsLambdaParamNames.length - 1);
      }
      existsLambdaPropertyChains.push(
        new VariableExpression(
          existsLambdaParamNames[currentParamNameIndex] as string,
          Multiplicity.ONE,
        ),
      );
      currentParamNameIndex++;
    }
  }
  let parentNode: QueryBuilderFilterTreeOperationNodeData | undefined =
    undefined;
  if (targetDropNode) {
    if (targetDropNode instanceof QueryBuilderFilterTreeExistsNodeData) {
      // Here we check if the target drop node is an exists tree node, if it is
      // then we try to check in the lambda property chains that it contains the
      // property expression of the target drop node. If we find any lambda property
      // chain we just create exists filter for the rest of the property and add it to the
      // target drop exists node, otherwise we just create exists for all the property chains.
      // For example if we find property chain we create
      // employees->exists($x.name == 'Bob' && $x.id == '1') instead of creating
      // employess->exists($x.name == 'Bob) && employess->exists($x.id == '1')
      const parentPropertyChainIndex = existsLambdaPropertyChains.findIndex(
        (p) =>
          p instanceof AbstractPropertyExpression &&
          p.func.value ===
            targetDropNode.propertyExpressionState.propertyExpression.func
              .value &&
          p.func.ownerReference.value.path ===
            targetDropNode.propertyExpressionState.propertyExpression.func
              .ownerReference.value.path,
      );
      if (parentPropertyChainIndex >= 0) {
        parentNode = targetDropNode;
        existsLambdaPropertyChains = existsLambdaPropertyChains.slice(
          parentPropertyChainIndex + 1,
        );
        existsLambdaParamNames = existsLambdaParamNames.slice(
          parentPropertyChainIndex + 1,
        );
      }
    } else {
      // Here the target drop node is a group operation tree node. So we try to find if there is
      // any exists tree parent node of the target drop node. If there is any exists parent node,
      // we try to check in the lambda property chains that it contains the
      // property expression of the target drop node. If we find any lambda property
      // chain we just create exists filter for the rest of the property and add it to the
      // target drop exists node, otherwise we just create exists for all the property chains.
      // For example if we find property chain we create
      // employees->exists($x.name == 'Bob' && $x.id == '1' && $x.age == '30) instead of creating
      // employess->exists($x.name == 'Bob) && employess->exists($x.id == '1') && employess->exists($x.age == '30')
      let cn: QueryBuilderFilterTreeNodeData | undefined = targetDropNode;
      let parentId = targetDropNode.parentId;
      while (
        parentId &&
        !(cn instanceof QueryBuilderFilterTreeExistsNodeData)
      ) {
        cn = filterState.nodes.get(parentId);
        parentId = cn?.parentId;
      }
      if (cn instanceof QueryBuilderFilterTreeExistsNodeData) {
        const parentPropertyChainIndex = existsLambdaPropertyChains.findIndex(
          (p) =>
            p instanceof AbstractPropertyExpression &&
            cn instanceof QueryBuilderFilterTreeExistsNodeData &&
            p.func.value ===
              guaranteeType(cn, QueryBuilderFilterTreeExistsNodeData)
                .propertyExpressionState.propertyExpression.func.value &&
            p.func.ownerReference.value.path ===
              cn.propertyExpressionState.propertyExpression.func.ownerReference
                .value.path,
        );
        if (parentPropertyChainIndex >= 0) {
          parentNode = targetDropNode;
          existsLambdaPropertyChains = existsLambdaPropertyChains.slice(
            parentPropertyChainIndex + 1,
          );
          existsLambdaParamNames = existsLambdaParamNames.slice(
            parentPropertyChainIndex + 1,
          );
        }
      } else if (!parentId) {
        parentNode = targetDropNode;
      }
    }
  }
  // 3. Create exists tree node for all the property chains and add them to the filter tree
  for (let i = 0; i < existsLambdaPropertyChains.length - 1; ++i) {
    const existsNode: QueryBuilderFilterTreeExistsNodeData =
      new QueryBuilderFilterTreeExistsNodeData(filterState, parentNode?.id);
    existsNode.setPropertyExpression(
      existsLambdaPropertyChains[i] as AbstractPropertyExpression,
    );
    existsNode.lambdaParameterName = existsLambdaParamNames[i];
    filterState.nodes.set(existsNode.id, existsNode);
    filterState.addNodeFromNode(existsNode, parentNode);
    parentNode = existsNode;
  }

  // create the filter condition tree node data
  const filterConditionState = new FilterConditionState(
    filterState,
    existsLambdaPropertyChains[
      existsLambdaPropertyChains.length - 1
    ] as AbstractPropertyExpression,
  );
  const treeNode = new QueryBuilderFilterTreeConditionNodeData(
    undefined,
    filterConditionState,
  );
  filterState.addNodeFromNode(treeNode, parentNode);
};

/**
 * This function builds the filter tree when we DnD a node to the filter panel.
 */
const buildFilterTree = (
  propertyExpression: AbstractPropertyExpression,
  filterState: QueryBuilderFilterState,
  targetDropNode?: QueryBuilderFilterTreeOperationNodeData | undefined,
): void => {
  if (isCollectionProperty(propertyExpression)) {
    const propertyChainName = getPropertyChainName(
      propertyExpression,
      filterState.queryBuilderState.explorerState.humanizePropertyName,
    );
    filterState.queryBuilderState.applicationStore.alertService.setActionAlertInfo(
      {
        message: `The property '${propertyChainName}' is a collection. As you are trying to filter on a collection, the filter created will be an exist filter. e.g. There exists at least one '${propertyChainName}' where 'Type' is the value specified.
         If you are looking to create the filter where all values in this collection equal the value specified, rather than at least one value, consider creating post filter instead.`,
        type: ActionAlertType.CAUTION,
        actions: [
          {
            label: 'Cancel',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            default: true,
          },
          {
            label: 'Proceed',
            type: ActionAlertActionType.PROCEED,
            handler:
              filterState.queryBuilderState.applicationStore.guardUnhandledError(
                async () =>
                  buildFilterTreeWithExists(
                    propertyExpression,
                    filterState,
                    targetDropNode,
                  ),
              ),
          },
        ],
      },
    );
  } else {
    const filterConditionState = new FilterConditionState(
      filterState,
      propertyExpression,
    );
    const treeNode = new QueryBuilderFilterTreeConditionNodeData(
      undefined,
      filterConditionState,
    );
    filterState.addNodeFromNode(
      treeNode,
      targetDropNode instanceof QueryBuilderFilterTreeGroupNodeData
        ? targetDropNode
        : undefined,
    );
  }
};

export const IS_DRAGGABLE_FILTER_DND_TYPES_FETCH_SUPPORTED = [
  QUERY_BUILDER_FILTER_DND_TYPE.CONDITION,
  QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.ENUM_PROPERTY,
  QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.PRIMITIVE_PROPERTY,
  QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE,
];

export const IS_DRAGGABLE_FILTER_DND_TYPES = [
  QUERY_BUILDER_FILTER_DND_TYPE.CONDITION,
  QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.ENUM_PROPERTY,
  QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.PRIMITIVE_PROPERTY,
];

const QueryBuilderFilterGroupConditionEditor = observer(
  (props: {
    node: QueryBuilderFilterTreeGroupNodeData;
    isDragOver: boolean;
    isDroppable: boolean;
  }) => {
    const { node, isDragOver, isDroppable } = props;
    const switchOperation: React.MouseEventHandler<HTMLDivElement> = (
      event,
    ): void => {
      event.stopPropagation(); // prevent triggering selecting the node
      node.setGroupOperation(
        node.groupOperation === QUERY_BUILDER_GROUP_OPERATION.AND
          ? QUERY_BUILDER_GROUP_OPERATION.OR
          : QUERY_BUILDER_GROUP_OPERATION.AND,
      );
    };

    const operationName =
      node.groupOperation === QUERY_BUILDER_GROUP_OPERATION.AND ? 'AND' : 'OR';

    return (
      <div className="query-builder-filter-tree__node__label__content dnd__entry__container">
        <PanelEntryDropZonePlaceholder
          isDragOver={isDragOver}
          isDroppable={isDroppable}
          label={`Add to Logical Group '${operationName}'`}
        >
          <div
            className={clsx('query-builder-filter-tree__group-node', {
              'query-builder-filter-tree__group-node--and':
                node.groupOperation === QUERY_BUILDER_GROUP_OPERATION.AND,
              'query-builder-filter-tree__group-node--or':
                node.groupOperation === QUERY_BUILDER_GROUP_OPERATION.OR,
            })}
            title="Switch Operation"
            onClick={switchOperation}
          >
            <div className="query-builder-filter-tree__group-node__label">
              {node.groupOperation}
            </div>
            <button className="query-builder-filter-tree__group-node__action">
              <FilledTriangleIcon />
            </button>
          </div>
        </PanelEntryDropZonePlaceholder>
      </div>
    );
  },
);

const QueryBuilderFilterExistsConditionEditor = observer(
  (props: {
    node: QueryBuilderFilterTreeExistsNodeData;
    humanizePropertyName: boolean;
    isDragOver: boolean;
    isDroppable: boolean;
  }) => {
    const { node, humanizePropertyName, isDragOver, isDroppable } = props;
    const hasDerivedPropertyInExpression = Boolean(
      node.propertyExpressionState.derivedPropertyExpressionStates.length,
    );
    const isValid = node.propertyExpressionState.isValid;
    const setDerivedPropertyArguments = (): void => {
      if (hasDerivedPropertyInExpression) {
        node.propertyExpressionState.setIsEditingDerivedProperty(true);
      }
    };

    return (
      <div className="query-builder-filter-tree__node__label__content dnd__entry__container">
        <PanelEntryDropZonePlaceholder
          isDragOver={isDragOver}
          isDroppable={isDroppable}
          label={`Add to Exists Group`}
        >
          <div
            className="query-builder-filter-tree__exists-node"
            title="This is an exists filter on the collection property"
          >
            <div className="query-builder-filter-tree__exists-node__label">
              {getPropertyChainName(
                node.propertyExpressionState.propertyExpression,
                humanizePropertyName,
              )}
            </div>
            <div className="query-builder-filter-tree__exists-node__exists--label">
              exists
            </div>
            {hasDerivedPropertyInExpression && (
              <button
                className={clsx(
                  'query-builder-filter-tree__exists-node__exists--label__action',
                  {
                    'query-builder-filter-tree__exists-node__exists--label__action--error':
                      !isValid,
                  },
                )}
                tabIndex={-1}
                onClick={setDerivedPropertyArguments}
                title="Set Derived Property Argument(s)..."
              >
                {!isValid && <InfoCircleIcon />} (...)
              </button>
            )}
            <QueryBuilderPropertyExpressionEditor
              propertyExpressionState={node.propertyExpressionState}
            />
          </div>
        </PanelEntryDropZonePlaceholder>
      </div>
    );
  },
);

const QueryBuilderFilterConditionEditor = observer(
  (props: {
    node: QueryBuilderFilterTreeConditionNodeData;
    isDragOver: boolean;
  }) => {
    const { node, isDragOver } = props;
    const graph =
      node.condition.filterState.queryBuilderState.graphManagerState.graph;
    const queryBuilderState = node.condition.filterState.queryBuilderState;
    const applicationStore = useApplicationStore();
    const changeOperator = (val: QueryBuilderFilterOperator) => (): void =>
      node.condition.changeOperator(val);
    const changeProperty = (
      propertyNode: QueryBuilderExplorerTreePropertyNodeData,
    ): void =>
      node.condition.changeProperty(
        buildPropertyExpressionFromExplorerTreeNodeData(
          propertyNode,
          queryBuilderState.explorerState,
        ),
      );
    // Drag and Drop on filter condition value
    const handleDrop = useCallback(
      (item: QueryBuilderVariableDragSource): void => {
        const parameterType = item.variable.genericType?.value.rawType;
        const conditionValueType =
          node.condition.propertyExpressionState.propertyExpression.func.value
            .genericType.value.rawType;
        if (isTypeCompatibleForAssignment(parameterType, conditionValueType)) {
          node.condition.setValue(item.variable);
        } else {
          applicationStore.notificationService.notifyWarning(
            `Incompatible parameter type ${parameterType?.name}. ${parameterType?.name} is not compatible with type ${conditionValueType.name}.`,
          );
        }
      },
      [applicationStore, node.condition],
    );
    const [{ isFilterValueDragOver }, dropConnector] = useDrop<
      QueryBuilderVariableDragSource,
      void,
      { isFilterValueDragOver: boolean }
    >(
      () => ({
        accept: [QUERY_BUILDER_VARIABLE_DND_TYPE],
        drop: (item, monitor): void => {
          if (!monitor.didDrop()) {
            handleDrop(item);
          } // prevent drop event propagation to accomondate for nested DnD
        },
        collect: (monitor) => ({
          isFilterValueDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDrop],
    );

    const resetNode = (): void => {
      node.condition.setValue(
        node.condition.operator.getDefaultFilterConditionValue(node.condition),
      );
    };
    const debouncedTypeaheadSearch = useMemo(
      () =>
        debounce(
          (inputVal: string) => node.condition.handleTypeaheadSearch(),
          1000,
        ),
      [node],
    );
    const cleanUpReloadValues = (): void => {
      node.condition.typeaheadSearchState.complete();
    };
    const changeValueSpecification = (val: ValueSpecification): void => {
      node.condition.setValue(val);
    };
    const selectorConfig = {
      values: node.condition.typeaheadSearchResults,
      isLoading: node.condition.typeaheadSearchState.isInProgress,
      reloadValues: debouncedTypeaheadSearch,
      cleanUpReloadValues,
    };

    return (
      <div className="query-builder-filter-tree__node__label__content dnd__entry__container">
        <PanelEntryDropZonePlaceholder
          isDragOver={isDragOver}
          label="Add New Logical Group"
        >
          <div className="query-builder-filter-tree__condition-node">
            <div className="query-builder-filter-tree__condition-node__property">
              <QueryBuilderPropertyExpressionBadge
                propertyExpressionState={node.condition.propertyExpressionState}
                onPropertyExpressionChange={changeProperty}
              />
            </div>
            <DropdownMenu
              className="query-builder-filter-tree__condition-node__operator"
              title="Choose Operator..."
              content={
                <MenuContent>
                  {node.condition.operators.map((op) => (
                    <MenuContentItem
                      key={op.uuid}
                      className="query-builder-filter-tree__condition-node__operator__dropdown__option"
                      onClick={changeOperator(op)}
                    >
                      {op.getLabel(node.condition)}
                    </MenuContentItem>
                  ))}
                </MenuContent>
              }
              menuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
                transformOrigin: { vertical: 'top', horizontal: 'left' },
                elevation: 7,
              }}
            >
              <div className="query-builder-filter-tree__condition-node__operator__label">
                {node.condition.operator.getLabel(node.condition)}
              </div>
              <div className="query-builder-filter-tree__condition-node__operator__dropdown__trigger">
                <CaretDownIcon />
              </div>
            </DropdownMenu>
            {node.condition.value && (
              <div
                ref={dropConnector}
                className="query-builder-filter-tree__condition-node__value"
              >
                <PanelEntryDropZonePlaceholder
                  isDragOver={isFilterValueDragOver}
                  label="Change Filter Value"
                >
                  <BasicValueSpecificationEditor
                    valueSpecification={node.condition.value}
                    setValueSpecification={changeValueSpecification}
                    graph={graph}
                    obseverContext={queryBuilderState.observerContext}
                    typeCheckOption={{
                      expectedType:
                        node.condition.propertyExpressionState
                          .propertyExpression.func.value.genericType.value
                          .rawType,
                    }}
                    resetValue={resetNode}
                    selectorConfig={selectorConfig}
                    isConstant={queryBuilderState.constantState.isValueSpecConstant(
                      node.condition.value,
                    )}
                  />
                </PanelEntryDropZonePlaceholder>
              </div>
            )}
          </div>
        </PanelEntryDropZonePlaceholder>
      </div>
    );
  },
);

const QueryBuilderFilterBlankConditionEditor = observer(
  (props: {
    node: QueryBuilderFilterTreeBlankConditionNodeData;
    isDragOver: boolean;
    isDroppable: boolean;
  }) => {
    const { isDragOver, isDroppable } = props;
    return (
      <div className="query-builder-filter-tree__node__label__content">
        <PanelEntryDropZonePlaceholder
          isDragOver={isDragOver}
          isDroppable={isDroppable}
          label="Create Condition"
        >
          <div className="query-builder-filter-tree__blank-node">blank</div>
        </PanelEntryDropZonePlaceholder>
      </div>
    );
  },
);

const QueryBuilderFilterConditionContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      queryBuilderState: QueryBuilderState;
      node: QueryBuilderFilterTreeNodeData;
    }
  >(function QueryBuilderFilterConditionContextMenu(props, ref) {
    const { queryBuilderState, node } = props;
    const filterState = queryBuilderState.filterState;
    const removeNode = (): void => filterState.removeNodeAndPruneBranch(node);
    const createCondition = (): void => {
      filterState.addNodeFromNode(
        new QueryBuilderFilterTreeBlankConditionNodeData(undefined),
        node,
      );
    };
    const createGroupCondition = (): void => {
      filterState.addGroupConditionNodeFromNode(node);
    };
    const newGroupWithCondition = (): void => {
      QueryBuilderTelemetryHelper.logEvent_FilterCreateGroupFromConditionLaunched(
        queryBuilderState.applicationStore.telemetryService,
      );

      filterState.newGroupWithConditionFromNode(undefined, node);
    };

    return (
      <MenuContent ref={ref}>
        {node instanceof QueryBuilderFilterTreeGroupNodeData && (
          <MenuContentItem onClick={createCondition}>
            Add New Condition
          </MenuContentItem>
        )}
        {node instanceof QueryBuilderFilterTreeGroupNodeData && (
          <MenuContentItem onClick={createGroupCondition}>
            Add New Logical Group
          </MenuContentItem>
        )}
        {node instanceof QueryBuilderFilterTreeConditionNodeData && (
          <MenuContentItem onClick={newGroupWithCondition}>
            Form a New Logical Group
          </MenuContentItem>
        )}
        <MenuContentItem onClick={removeNode}>Remove</MenuContentItem>
      </MenuContent>
    );
  }),
);

const QueryBuilderFilterTreeNodeContainer = observer(
  (
    props: TreeNodeContainerProps<
      QueryBuilderFilterTreeNodeData,
      {
        queryBuilderState: QueryBuilderState;
      }
    >,
  ) => {
    const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
    const { queryBuilderState } = innerProps;
    const ref = useRef<HTMLDivElement>(null);
    const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
      useState(false);
    const applicationStore = useApplicationStore();
    const filterState = queryBuilderState.filterState;
    const isExpandable =
      node instanceof QueryBuilderFilterTreeOperationNodeData;
    const selectNode = (): void => onNodeSelect?.(node);
    const toggleExpandNode = (): void => node.setIsOpen(!node.isOpen);
    const removeNode = (): void => filterState.removeNodeAndPruneBranch(node);

    // Drag and Drop
    const handleDrop = useCallback(
      (item: QueryBuilderFilterDropTarget, type: string): void => {
        if (QUERY_BUILDER_FILTER_DND_TYPE.CONDITION === type) {
          const nodeBeingDragged = (
            item as QueryBuilderFilterConditionDragSource
          ).node;

          const newCreatedNode = new QueryBuilderFilterTreeConditionNodeData(
            undefined,
            (
              filterState.nodes.get(
                nodeBeingDragged.id,
              ) as QueryBuilderFilterTreeConditionNodeData
            ).condition,
          );

          if (node instanceof QueryBuilderFilterTreeBlankConditionNodeData) {
            filterState.replaceBlankNodeWithNode(newCreatedNode, node);
            filterState.removeNodeAndPruneBranch(nodeBeingDragged);
          } else if (node instanceof QueryBuilderFilterTreeConditionNodeData) {
            filterState.newGroupWithConditionFromNode(newCreatedNode, node);

            filterState.removeNodeAndPruneBranch(nodeBeingDragged);
          } else if (node instanceof QueryBuilderFilterTreeGroupNodeData) {
            filterState.addNodeFromNode(newCreatedNode, node);
            filterState.removeNodeAndPruneBranch(nodeBeingDragged);
          }
        } else {
          let filterConditionState: FilterConditionState;
          try {
            let propertyExpression;
            if (type === QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE) {
              if (
                (item as QueryBuilderProjectionColumnDragSource)
                  .columnState instanceof
                QueryBuilderSimpleProjectionColumnState
              ) {
                propertyExpression = (
                  (item as QueryBuilderProjectionColumnDragSource)
                    .columnState as QueryBuilderSimpleProjectionColumnState
                ).propertyExpressionState.propertyExpression;
              } else {
                throw new UnsupportedOperationError(
                  `Dragging and Dropping derivation projection column is not supported.`,
                );
              }
            } else {
              propertyExpression =
                buildPropertyExpressionFromExplorerTreeNodeData(
                  (item as QueryBuilderExplorerTreeDragSource).node,
                  filterState.queryBuilderState.explorerState,
                );
            }
            filterConditionState = new FilterConditionState(
              filterState,
              propertyExpression,
            );
          } catch (error) {
            assertErrorThrown(error);
            applicationStore.notificationService.notifyWarning(error.message);
            return;
          }
          if (node instanceof QueryBuilderFilterTreeOperationNodeData) {
            buildFilterTree(
              filterConditionState.propertyExpressionState.propertyExpression,
              filterState,
              node,
            );
          } else if (node instanceof QueryBuilderFilterTreeConditionNodeData) {
            filterState.newGroupWithConditionFromNode(
              new QueryBuilderFilterTreeConditionNodeData(
                undefined,
                filterConditionState,
              ),
              node,
            );
          } else if (
            node instanceof QueryBuilderFilterTreeBlankConditionNodeData
          ) {
            filterState.replaceBlankNodeWithNode(
              new QueryBuilderFilterTreeConditionNodeData(
                undefined,
                filterConditionState,
              ),
              node,
            );
          }
        }
      },
      [applicationStore, filterState, node],
    );
    const [{ isDragOver }, dropConnector] = useDrop<
      QueryBuilderFilterConditionDragSource,
      void,
      { isDragOver: boolean }
    >(
      () => ({
        accept:
          queryBuilderState.TEMPORARY__isDnDFetchStructureToFilterSupported
            ? IS_DRAGGABLE_FILTER_DND_TYPES_FETCH_SUPPORTED
            : IS_DRAGGABLE_FILTER_DND_TYPES,
        drop: (item, monitor): void => {
          if (!monitor.didDrop()) {
            handleDrop(item, monitor.getItemType() as string);
          } // prevent drop event propagation to accomondate for nested DnD
        },
        collect: (monitor) => ({
          isDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDrop],
    );
    const [, dragConnector, dragPreviewConnector] =
      useDrag<QueryBuilderFilterConditionDragSource>(
        () => ({
          type:
            node instanceof QueryBuilderFilterTreeGroupNodeData
              ? QUERY_BUILDER_FILTER_DND_TYPE.GROUP_CONDITION
              : node instanceof QueryBuilderFilterTreeConditionNodeData
              ? QUERY_BUILDER_FILTER_DND_TYPE.CONDITION
              : QUERY_BUILDER_FILTER_DND_TYPE.BLANK_CONDITION,
          item: () => ({ node }),
          end: (): void => filterState.setRearrangingConditions(false),
        }),
        [node, filterState],
      );
    dragConnector(dropConnector(ref));
    useDragPreviewLayer(dragPreviewConnector);

    const { isDroppable } = useDragLayer((monitor) => ({
      isDroppable:
        monitor.isDragging() &&
        (queryBuilderState.TEMPORARY__isDnDFetchStructureToFilterSupported
          ? IS_DRAGGABLE_FILTER_DND_TYPES_FETCH_SUPPORTED
          : IS_DRAGGABLE_FILTER_DND_TYPES
        ).includes(monitor.getItemType()?.toString() ?? ''),
    }));

    // context menu
    const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
    const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);

    return (
      <ContextMenu
        content={
          <QueryBuilderFilterConditionContextMenu
            queryBuilderState={queryBuilderState}
            node={node}
          />
        }
        menuProps={{ elevation: 7 }}
        onOpen={onContextMenuOpen}
        onClose={onContextMenuClose}
      >
        <div
          ref={ref}
          className={clsx(
            'tree-view__node__container query-builder-filter-tree__node__container',
            {
              'query-builder-filter-tree__node__container--no-hover':
                filterState.isRearrangingConditions,
              'query-builder-filter-tree__node__container--selected':
                node === filterState.selectedNode,
              'query-builder-filter-tree__node__container--selected-from-context-menu':
                isSelectedFromContextMenu,
            },
          )}
        >
          <div
            className="query-builder-filter-tree__node__content"
            style={{
              paddingLeft: `${(level - 1) * (stepPaddingInRem ?? 2) + 1.5}rem`,
              display: 'flex',
            }}
            onClick={selectNode}
          >
            {isExpandable && (
              <div
                className="query-builder-filter-tree__expand-icon"
                onClick={toggleExpandNode}
              >
                {node.isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
              </div>
            )}
            <div
              className={clsx(
                'tree-view__node__label query-builder-filter-tree__node__label',
                {
                  'query-builder-filter-tree__node__label--expandable':
                    isExpandable,
                },
              )}
            >
              {node instanceof QueryBuilderFilterTreeGroupNodeData && (
                <QueryBuilderFilterGroupConditionEditor
                  node={node}
                  isDroppable={isDroppable}
                  isDragOver={isDragOver}
                />
              )}
              {node instanceof QueryBuilderFilterTreeExistsNodeData && (
                <QueryBuilderFilterExistsConditionEditor
                  node={node}
                  humanizePropertyName={
                    filterState.queryBuilderState.explorerState
                      .humanizePropertyName
                  }
                  isDroppable={isDroppable}
                  isDragOver={isDragOver}
                />
              )}
              {node instanceof QueryBuilderFilterTreeConditionNodeData && (
                <QueryBuilderFilterConditionEditor
                  node={node}
                  isDragOver={isDragOver}
                />
              )}
              {node instanceof QueryBuilderFilterTreeBlankConditionNodeData && (
                <QueryBuilderFilterBlankConditionEditor
                  node={node}
                  isDragOver={isDragOver}
                  isDroppable={isDroppable}
                />
              )}
            </div>
          </div>
          <div className="query-builder-filter-tree__node__actions">
            <button
              className="query-builder-filter-tree__node__action"
              tabIndex={-1}
              title="Remove"
              onClick={removeNode}
            >
              <TimesIcon />
            </button>
          </div>
        </div>
      </ContextMenu>
    );
  },
);

const QueryBuilderFilterTreeNodeView = observer(
  (
    props: TreeNodeViewProps<
      QueryBuilderFilterTreeNodeData,
      {
        queryBuilderState: QueryBuilderState;
      }
    >,
  ) => {
    const {
      node,
      level,
      onNodeSelect,
      getChildNodes,
      stepPaddingInRem,
      innerProps,
    } = props;
    return (
      <div className="tree-view__node__block">
        <QueryBuilderFilterTreeNodeContainer
          node={node}
          level={level + 1}
          stepPaddingInRem={stepPaddingInRem}
          onNodeSelect={onNodeSelect}
          innerProps={innerProps}
        />
        {node.isOpen &&
          getChildNodes(node).map((childNode) => (
            <QueryBuilderFilterTreeNodeView
              key={childNode.id}
              node={childNode}
              level={level + 1}
              onNodeSelect={onNodeSelect}
              getChildNodes={getChildNodes}
              innerProps={innerProps}
            />
          ))}
      </div>
    );
  },
);

const QueryBuilderFilterTree = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const filterState = queryBuilderState.filterState;
    const rootNodes = filterState.rootIds.map((rootId) =>
      filterState.getNode(rootId),
    );
    const onNodeSelect = (node: QueryBuilderFilterTreeNodeData): void => {
      filterState.setSelectedNode(
        filterState.selectedNode !== node ? node : undefined,
      );
    };
    const getChildNodes = (
      node: QueryBuilderFilterTreeNodeData,
    ): QueryBuilderFilterTreeNodeData[] =>
      node instanceof QueryBuilderFilterTreeOperationNodeData
        ? node.childrenIds.map((id) => filterState.getNode(id))
        : [];
    return (
      <div className="tree-view__node__root query-builder-filter-tree__root">
        {rootNodes.map((node) => (
          <QueryBuilderFilterTreeNodeView
            key={node.id}
            level={0}
            node={node}
            getChildNodes={getChildNodes}
            onNodeSelect={onNodeSelect}
            innerProps={{
              queryBuilderState,
            }}
          />
        ))}
      </div>
    );
  },
);

export const QueryBuilderFilterPanel = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;

    const applicationStore = useApplicationStore();
    const filterState = queryBuilderState.filterState;
    const rootNode = filterState.getRootNode();
    const collapseTree = (): void => {
      QueryBuilderTelemetryHelper.logEvent_FilterCollapseTreeLaunched(
        queryBuilderState.applicationStore.telemetryService,
      );
      filterState.setSelectedNode(undefined);
      filterState.collapseTree();
    };
    const expandTree = (): void => {
      QueryBuilderTelemetryHelper.logEvent_FilterExpandTreeLaunched(
        queryBuilderState.applicationStore.telemetryService,
      );
      filterState.setSelectedNode(undefined);
      filterState.expandTree();
    };
    const pruneTree = (): void => {
      QueryBuilderTelemetryHelper.logEvent_FilterCleanupTreeLaunched(
        queryBuilderState.applicationStore.telemetryService,
      );
      filterState.pruneTree();
    };
    const simplifyTree = (): void => {
      QueryBuilderTelemetryHelper.logEvent_FilterSimplifyTreeLaunched(
        queryBuilderState.applicationStore.telemetryService,
      );
      filterState.simplifyTree();
    };
    const createCondition = (): void => {
      QueryBuilderTelemetryHelper.logEvent_FilterCreateConditionLaunched(
        queryBuilderState.applicationStore.telemetryService,
      );
      filterState.addNodeFromNode(
        new QueryBuilderFilterTreeBlankConditionNodeData(undefined),
        filterState.selectedNode,
      );
    };
    const allowGroupCreation =
      filterState.isEmpty || // either the tree is empty
      (filterState.selectedNode && // or a node is currently selected which is...
        (filterState.selectedNode !== rootNode || // either not a root node
          rootNode instanceof QueryBuilderFilterTreeGroupNodeData)); // or if it is the root note, it has to be a group node
    const createGroupCondition = (): void => {
      QueryBuilderTelemetryHelper.logEvent_FilterCreateLogicalGroupLaunched(
        queryBuilderState.applicationStore.telemetryService,
      );
      if (allowGroupCreation) {
        filterState.addGroupConditionNodeFromNode(filterState.selectedNode);
      }
    };
    const newGroupWithCondition = (): void => {
      QueryBuilderTelemetryHelper.logEvent_FilterCreateLogicalGroupLaunched(
        applicationStore.telemetryService,
      );
      if (
        filterState.selectedNode instanceof
        QueryBuilderFilterTreeConditionNodeData
      ) {
        filterState.newGroupWithConditionFromNode(
          undefined,
          filterState.selectedNode,
        );
      }
    };

    const { isDroppable } = useDragLayer((monitor) => ({
      isDroppable:
        monitor.isDragging() &&
        (queryBuilderState.TEMPORARY__isDnDFetchStructureToFilterSupported
          ? IS_DRAGGABLE_FILTER_DND_TYPES_FETCH_SUPPORTED
          : IS_DRAGGABLE_FILTER_DND_TYPES
        ).includes(monitor.getItemType()?.toString() ?? ''),
    }));

    // Drag and Drop
    const handleDrop = useCallback(
      (item: QueryBuilderFilterDropTarget, type: string): void => {
        try {
          let propertyExpression;
          if (type === QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE) {
            if (
              (item as QueryBuilderProjectionColumnDragSource)
                .columnState instanceof QueryBuilderSimpleProjectionColumnState
            ) {
              propertyExpression = (
                (item as QueryBuilderProjectionColumnDragSource)
                  .columnState as QueryBuilderSimpleProjectionColumnState
              ).propertyExpressionState.propertyExpression;
            } else {
              throw new UnsupportedOperationError(
                `Dragging and Dropping derivation projection column is not supported.`,
              );
            }
          } else {
            propertyExpression =
              buildPropertyExpressionFromExplorerTreeNodeData(
                (item as QueryBuilderExplorerTreeDragSource).node,
                filterState.queryBuilderState.explorerState,
              );
          }
          // NOTE: unfocus the current node when DnD a new node to the tree
          filterState.setSelectedNode(undefined);
          buildFilterTree(propertyExpression, filterState);
        } catch (error) {
          assertErrorThrown(error);
          applicationStore.notificationService.notifyWarning(error.message);
          return;
        }
      },
      [applicationStore, filterState],
    );

    const [{ isDragOver }, dropTargetConnector] = useDrop<
      QueryBuilderExplorerTreeDragSource,
      void,
      { isDragOver: boolean }
    >(
      () => ({
        accept:
          queryBuilderState.TEMPORARY__isDnDFetchStructureToFilterSupported
            ? [
                QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.ENUM_PROPERTY,
                QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.PRIMITIVE_PROPERTY,
                QUERY_BUILDER_PROJECTION_COLUMN_DND_TYPE,
              ]
            : [
                QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.ENUM_PROPERTY,
                QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.PRIMITIVE_PROPERTY,
              ],
        drop: (item, monitor): void => {
          if (!monitor.didDrop()) {
            handleDrop(item, monitor.getItemType() as string);
          } // prevent drop event propagation to accomondate for nested DnD
        },
        collect: (monitor) => ({
          isDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDrop],
    );

    const addFilterRef = useRef<HTMLInputElement>(null);
    dropTargetConnector(addFilterRef);

    return (
      <div
        data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_FILTER}
        className="panel"
      >
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">filter</div>
          </div>

          <div className="panel__header__actions">
            <DropdownMenu
              className="panel__header__action"
              title="Show Filter Options Menu..."
              content={
                <MenuContent>
                  <MenuContentItem onClick={createCondition}>
                    <MenuContentItemIcon>
                      <PlusIcon />
                    </MenuContentItemIcon>
                    <MenuContentItemLabel>
                      Create Condition
                    </MenuContentItemLabel>
                  </MenuContentItem>
                  <MenuContentItem
                    disabled={
                      !(
                        filterState.selectedNode instanceof
                        QueryBuilderFilterTreeConditionNodeData
                      )
                    }
                    onClick={newGroupWithCondition}
                  >
                    <MenuContentItemIcon>
                      <PlusCircleIcon />
                    </MenuContentItemIcon>
                    <MenuContentItemLabel>
                      Create Group From Condition
                    </MenuContentItemLabel>
                  </MenuContentItem>
                  <MenuContentItem
                    disabled={!allowGroupCreation}
                    title={
                      !allowGroupCreation
                        ? 'Please select a filter node first to create logical group'
                        : ''
                    }
                    onClick={createGroupCondition}
                  >
                    <MenuContentItemIcon>
                      <NewFolderIcon />
                    </MenuContentItemIcon>
                    <MenuContentItemLabel>
                      Create Logical Group
                    </MenuContentItemLabel>
                  </MenuContentItem>
                  <MenuContentItem onClick={pruneTree}>
                    <MenuContentItemIcon>
                      <TrashIcon />
                    </MenuContentItemIcon>
                    <MenuContentItemLabel>Cleanup Tree</MenuContentItemLabel>
                  </MenuContentItem>
                  <MenuContentItem onClick={simplifyTree}>
                    <MenuContentItemIcon>
                      <CircleIcon />
                    </MenuContentItemIcon>
                    <MenuContentItemLabel>Simplify Tree</MenuContentItemLabel>
                  </MenuContentItem>
                  <MenuContentItem onClick={collapseTree}>
                    <MenuContentItemIcon>
                      <CompressIcon />
                    </MenuContentItemIcon>
                    <MenuContentItemLabel>Collapse Tree</MenuContentItemLabel>
                  </MenuContentItem>
                  <MenuContentItem onClick={expandTree}>
                    <MenuContentItemIcon>
                      <ExpandIcon />
                    </MenuContentItemIcon>
                    <MenuContentItemLabel>Expand Tree</MenuContentItemLabel>
                  </MenuContentItem>
                </MenuContent>
              }
            >
              <MoreVerticalIcon className="query-builder__icon__more-options" />
            </DropdownMenu>
          </div>
        </div>
        <PanelContent>
          <PanelDropZone
            isDragOver={isDragOver && filterState.isEmpty}
            isDroppable={isDroppable && filterState.isEmpty}
            dropTargetConnector={dropTargetConnector}
          >
            {filterState.isEmpty && (
              <BlankPanelPlaceholder
                text="Add a filter condition"
                tooltipText="Drag and drop properties here"
              />
            )}
            {!filterState.isEmpty && (
              <>
                <DragPreviewLayer
                  labelGetter={(
                    item: QueryBuilderFilterConditionDragSource,
                  ): string => item.node.dragPreviewLabel}
                  types={Object.values(QUERY_BUILDER_FILTER_DND_TYPE)}
                />
                <QueryBuilderFilterTree queryBuilderState={queryBuilderState} />
              </>
            )}
            {isDroppable && !filterState.isEmpty && (
              <div
                ref={addFilterRef}
                className="query-builder-filter-tree__free-drop-zone__container"
              >
                <PanelEntryDropZonePlaceholder
                  isDragOver={isDragOver}
                  isDroppable={isDroppable}
                  className="query-builder-filter-tree__free-drop-zone"
                  label="Add filter to main group"
                >
                  <></>
                </PanelEntryDropZonePlaceholder>
              </div>
            )}
          </PanelDropZone>
        </PanelContent>
      </div>
    );
  },
);

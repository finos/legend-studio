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

import { observer } from 'mobx-react-lite';
import type { DataQualityState } from './states/DataQualityState.js';
import { useDrop } from 'react-dnd';
import { useCallback } from 'react';
import { getClassPropertyIcon } from '@finos/legend-lego/graph-editor';
import {
  type DataQualityGraphFetchTreeData,
  DataQualityGraphFetchTreeNodeData,
  isConstraintsClassesTreeEmpty,
  removeNodeRecursively,
} from './utils/DataQualityGraphFetchTreeUtil.js';
import type { ConstraintState } from './states/ConstraintState.js';
import {
  type TreeNodeContainerProps,
  BlankPanelPlaceholder,
  CheckSquareIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  clsx,
  PanelDropZone,
  PURE_UnknownElementTypeIcon,
  SquareIcon,
  TimesIcon,
  TreeView,
} from '@finos/legend-art';
import { dataQualityClassValidation_setDataQualityGraphFetchTree } from '../graph-manager/DSL_DataQuality_GraphModifierHelper.js';
import type { DataQualityClassValidationsConfiguration } from '../graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.js';
import {
  type Type,
  Class,
  Enumeration,
  PropertyGraphFetchTree,
  RootGraphFetchTree,
} from '@finos/legend-graph';
import { DATA_QUALITY_VALIDATION_TEST_ID } from './constants/DataQualityConstants.js';
import { flowResult } from 'mobx';
import { DataQualityStructuralValidationsPanel } from './DataQualityStructuralValidationsPanel.js';
import {
  type QueryBuilderExplorerTreeDragSource,
  QUERY_BUILDER_EXPLORER_TREE_DND_TYPE,
} from '@finos/legend-query-builder';

export const getQueryBuilderExplorerTreeNodeSortRank = (
  node: DataQualityGraphFetchTreeNodeData,
): number => {
  if (node.type instanceof Class) {
    return 1;
  } else if (node.type instanceof Enumeration) {
    return 2;
  } else {
    return 3;
  }
};

export const DataQualityConstraintsTreeNodeContainer = observer(
  (
    props: TreeNodeContainerProps<
      DataQualityGraphFetchTreeNodeData,
      {
        dataQualityState: DataQualityState;
        isReadOnly: boolean;
        removeNode?: (node: DataQualityGraphFetchTreeNodeData) => void;
      }
    >,
  ) => {
    const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
    const { dataQualityState, isReadOnly, removeNode } = innerProps;
    const { dataQualityGraphFetchTreeState } = dataQualityState;
    let property, type: Type | undefined;
    if (node.tree instanceof PropertyGraphFetchTree) {
      property = node.tree.property.value;
      type = property.genericType.value.rawType;
    } else if (node.tree instanceof RootGraphFetchTree) {
      type = node.tree.class.value;
    }

    const isExpandable = Boolean(node.childrenIds.length);
    const nodeExpandIcon = isExpandable ? (
      node.isOpen ? (
        <ChevronDownIcon />
      ) : (
        <ChevronRightIcon />
      )
    ) : (
      <div />
    );
    const nodeTypeIcon = type ? (
      getClassPropertyIcon(type)
    ) : (
      <PURE_UnknownElementTypeIcon />
    );
    const toggleExpandNode = (): void => onNodeSelect?.(node);
    const deleteNode = (): void => removeNode?.(node);
    const toggleChecked = (constraint: ConstraintState): void => {
      dataQualityGraphFetchTreeState.updateNode(
        node,
        constraint.constraint,
        !constraint.isSelected,
      );
      constraint.setIsSelected(!constraint.isSelected);
    };

    return (
      <div className="constraints-selection-node">
        <div
          className="tree-view__node__container  data-quality-validation-graph-fetch-tree__node__container"
          style={{
            paddingLeft: `${(level - 1) * (stepPaddingInRem ?? 2)}rem`,
            display: 'flex',
          }}
        >
          <div className="data-quality-validation-graph-fetch-tree__node__content">
            <div className="tree-view__node__icon data-quality-validation-graph-fetch-tree__node__icon">
              <div
                className="data-quality-validation-graph-fetch-tree__expand-icon"
                onClick={toggleExpandNode}
              >
                {nodeExpandIcon}
              </div>
              <div
                className="data-quality-validation-graph-fetch-tree__type-icon"
                onClick={toggleExpandNode}
              >
                {nodeTypeIcon}
              </div>
            </div>
            <div
              className="tree-view__node__label data-quality-validation-graph-fetch-tree__node__label"
              onClick={toggleExpandNode}
            >
              {node.label}
              {
                <div className="data-quality-validation-graph-fetch-tree__node__type">
                  <div className="data-quality-validation-graph-fetch-tree__node__type__label">
                    {type ? type.name : ''}
                  </div>
                </div>
              }
            </div>
          </div>
          {!node.isReadOnly ? (
            <div className="data-quality-validation-graph-fetch-tree__node__actions">
              <button
                className="data-quality-validation-graph-fetch-tree__node__action"
                title="Remove"
                tabIndex={-1}
                onClick={deleteNode}
                disabled={isReadOnly}
              >
                <TimesIcon />
              </button>
            </div>
          ) : (
            <div />
          )}
        </div>
        {node.constraints.length ? (
          <div
            style={{
              paddingLeft: `${(level + 2) * (stepPaddingInRem ?? 2)}rem`,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {node.constraints.map((constraint) => (
              <div
                className="data-quality-validation-graph-fetch-tree__node__label data-quality-validation-graph-fetch-tree__node__constraint"
                key={constraint.lambdaId}
                onClick={() => {
                  toggleChecked(constraint);
                }}
              >
                <button
                  className={clsx(
                    'panel__content__form__section__toggler__btn',
                    'data-quality-validation-graph-fetch-tree__constraint__checkbox',
                    {
                      'panel__content__form__section__toggler__btn--toggled':
                        constraint.isSelected,
                    },
                  )}
                >
                  {constraint.isSelected ? <CheckSquareIcon /> : <SquareIcon />}
                </button>
                <div className="data-quality-validation-graph-fetch-tree__constraint__name">
                  {constraint.constraint.name}
                </div>
                <div className="data-quality-validation-graph-fetch-tree__constraint__value">
                  {constraint.lambdaString}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <></>
        )}
      </div>
    );
  },
);

export const ConstraintsSelectionExplorer = observer(
  (props: {
    constraintsClasses: DataQualityGraphFetchTreeData;
    dataQualityState: DataQualityState;
    updateTreeData: (data: DataQualityGraphFetchTreeData) => void;
  }) => {
    const { constraintsClasses, dataQualityState, updateTreeData } = props;
    const { applicationStore } = dataQualityState;
    const getChildNodes = (
      node: DataQualityGraphFetchTreeNodeData,
    ): DataQualityGraphFetchTreeNodeData[] =>
      node.childrenIds
        .map((id) => constraintsClasses.nodes.get(id))
        .filter(
          (_node): _node is DataQualityGraphFetchTreeNodeData =>
            _node instanceof DataQualityGraphFetchTreeNodeData,
        )
        .sort((a, b) => a.label.localeCompare(b.label))
        .sort(
          (a, b) =>
            getQueryBuilderExplorerTreeNodeSortRank(b) -
            getQueryBuilderExplorerTreeNodeSortRank(a),
        );
    const removeNode = (node: DataQualityGraphFetchTreeNodeData): void => {
      removeNodeRecursively(constraintsClasses, node);
      updateTreeData({ ...constraintsClasses });
      dataQualityClassValidation_setDataQualityGraphFetchTree(
        dataQualityState.constraintsConfigurationElement as DataQualityClassValidationsConfiguration,
        constraintsClasses.tree,
      );
    };

    const showStructuralValidations = () => {
      dataQualityState.setShowStructuralValidations(true);
      flowResult(dataQualityState.fetchStructuralValidations()).catch(
        applicationStore.alertUnhandledError,
      );
    };

    const disableSyncToDQ = Boolean(
      !dataQualityState.dataQualityGraphFetchTreeState.treeData,
    );

    return (
      <div className="data-quality-validation-graph-fetch-constraints-selection__config-group__content">
        <div className="data-quality-validation-graph-fetch-constraints-selection__structural-attributes">
          <button
            className="btn--dark structure-validations-btn"
            onClick={showStructuralValidations}
            disabled={Boolean(disableSyncToDQ)}
            tabIndex={-1}
            title="Show Structural Attributes to be validated during run"
          >
            Show Structural Attributes
          </button>
        </div>
        <div className="data-quality-validation-graph-fetch-constraints-selection__config-group__item">
          <TreeView
            components={{
              TreeNodeContainer: DataQualityConstraintsTreeNodeContainer,
            }}
            className="data-quality-validation-graph-fetch-tree__container__tree"
            treeData={constraintsClasses}
            getChildNodes={getChildNodes}
            innerProps={{
              dataQualityState,
              isReadOnly: false,
              removeNode,
            }}
          />
        </div>
        <DataQualityStructuralValidationsPanel
          dataQualityState={dataQualityState}
        />
      </div>
    );
  },
);

export const DataQualityConstraintsSelection = observer(
  (props: { dataQualityState: DataQualityState }) => {
    const { dataQualityState } = props;
    const constraintsConfiguration =
      dataQualityState.constraintsConfigurationElement;
    const dataQualityGraphFetchTreeState =
      dataQualityState.dataQualityGraphFetchTreeState;
    const treeData = dataQualityGraphFetchTreeState.treeData;

    const updateTreeData = (data: DataQualityGraphFetchTreeData): void => {
      dataQualityGraphFetchTreeState.setGraphFetchTree(data);
    };

    const handleDrop = useCallback(
      (item: QueryBuilderExplorerTreeDragSource): void => {
        dataQualityGraphFetchTreeState.addProperty(item.node, {
          refreshTreeData: true,
        });
        if (dataQualityGraphFetchTreeState.treeData) {
          dataQualityClassValidation_setDataQualityGraphFetchTree(
            constraintsConfiguration as DataQualityClassValidationsConfiguration,
            dataQualityGraphFetchTreeState.treeData.tree,
          );
        }
      },
      [dataQualityGraphFetchTreeState, constraintsConfiguration],
    );

    const [{ isDragOver }, dropTargetConnector] = useDrop<
      QueryBuilderExplorerTreeDragSource,
      void,
      { isDragOver: boolean }
    >(
      () => ({
        accept: [
          QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.CLASS_PROPERTY,
          QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.PRIMITIVE_PROPERTY,
        ],
        drop: (item, monitor): void => {
          if (!monitor.didDrop()) {
            handleDrop(item);
          } // prevent drop event propagation to accomondate for nested DnD
        },
        collect: (monitor) => ({
          isDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDrop],
    );

    return (
      <div
        data-testid={
          DATA_QUALITY_VALIDATION_TEST_ID.DATA_QUALITY_VALIDATION_TREE
        }
        className="constraints-selection-tab"
      >
        <PanelDropZone
          isDragOver={isDragOver}
          dropTargetConnector={dropTargetConnector}
          contentClassName="data-quality-validation-graph-fetch-panel"
        >
          {(!treeData || isConstraintsClassesTreeEmpty(treeData)) && (
            <BlankPanelPlaceholder
              text="Add a scope for constraints"
              tooltipText="Drag and drop properties here"
            />
          )}
          {treeData && !isConstraintsClassesTreeEmpty(treeData) && (
            <ConstraintsSelectionExplorer
              constraintsClasses={treeData}
              dataQualityState={dataQualityState}
              updateTreeData={updateTreeData}
            />
          )}
        </PanelDropZone>
      </div>
    );
  },
);

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

import { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useDrag } from 'react-dnd';
import { useApplicationStore } from '@finos/legend-application';
import { guaranteeNonNullable, prettyCONSTName } from '@finos/legend-shared';
import type { DataQualityState } from './states/DataQualityState.js';
import { flowResult } from 'mobx';
import { DATA_QUALITY_VALIDATION_TEST_ID } from './constants/DataQualityConstants.js';
import {
  type QueryBuilderExplorerTreeDragSource,
  QueryBuilderExplorerTreeNodeData,
  QUERY_BUILDER_EXPLORER_TREE_DND_TYPE,
  QueryBuilderExplorerTreePropertyNodeData,
  QueryBuilderExplorerTreeRootNodeData,
  QueryBuilderExplorerTreeSubTypeNodeData,
  checkForDeprecatedNode,
  getQueryBuilderPropertyNodeData,
  getQueryBuilderSubTypeNodeData,
  QueryBuilderPropertyInfoTooltip,
  QueryBuilderRootClassInfoTooltip,
  QueryBuilderSubclassInfoTooltip,
  renderPropertyTypeIcon,
  getQueryBuilderExplorerTreeNodeSortRank,
} from '@finos/legend-query-builder';
import {
  type TreeNodeContainerProps,
  type TreeNodeViewProps,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  clsx,
  CompressIcon,
  InfoCircleIcon,
  MenuContentItemIcon,
  MenuContentItemLabel,
  MoreVerticalIcon,
  PanelHeaderActions,
  BlankPanelContent,
  DragPreviewLayer,
  MenuContent,
  MenuContentItem,
  PanelHeader,
  PanelHeaderActionItem,
  PanelLoadingIndicator,
  PURE_ClassIcon,
  TreeView,
  useDragPreviewLayer,
  ControlledDropdownMenu,
} from '@finos/legend-art';
import {
  Class,
  DerivedProperty,
  Enumeration,
  PrimitiveType,
  TYPE_CAST_TOKEN,
  getAllClassDerivedProperties,
  getAllClassProperties,
  getAllOwnClassProperties,
} from '@finos/legend-graph';

export const QueryBuilderExplorerTreeNodeContainer = observer(
  (
    props: TreeNodeContainerProps<
      QueryBuilderExplorerTreeNodeData,
      {
        dataQualityState: DataQualityState;
      }
    >,
  ) => {
    const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
    const { dataQualityState } = innerProps;
    const { dataQualityQueryBuilderState } = dataQualityState;
    const [isSelectedFromContextMenu] = useState(false);
    const explorerState = dataQualityQueryBuilderState.explorerState;
    const [, dragConnector, dragPreviewConnector] = useDrag<{
      node?: QueryBuilderExplorerTreeNodeData;
    }>(
      () => ({
        type:
          node.type instanceof Enumeration
            ? QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.ENUM_PROPERTY
            : node.type instanceof Class
              ? QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.CLASS_PROPERTY
              : QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.PRIMITIVE_PROPERTY,
        item: () =>
          node instanceof QueryBuilderExplorerTreeNodeData ? { node } : {},
      }),
      [node],
    );
    const ref = useRef<HTMLDivElement>(null);
    dragConnector(ref);
    useDragPreviewLayer(dragPreviewConnector);

    const isExpandable = Boolean(node.childrenIds.length);
    const isDerivedProperty =
      node instanceof QueryBuilderExplorerTreePropertyNodeData &&
      node.property instanceof DerivedProperty;
    const isMultiple =
      (node instanceof QueryBuilderExplorerTreePropertyNodeData &&
        (node.property.multiplicity.upperBound === undefined ||
          node.property.multiplicity.upperBound > 1)) ||
      (node instanceof QueryBuilderExplorerTreeSubTypeNodeData &&
        (node.multiplicity.upperBound === undefined ||
          node.multiplicity.upperBound > 1));
    const allowPreview =
      node.mappingData.mapped &&
      node instanceof QueryBuilderExplorerTreePropertyNodeData &&
      node.type instanceof PrimitiveType &&
      !node.isPartOfDerivedPropertyBranch;
    const nodeExpandIcon = isExpandable ? (
      node.isOpen ? (
        <ChevronDownIcon />
      ) : (
        <ChevronRightIcon />
      )
    ) : (
      <div />
    );
    const propertyName = explorerState.humanizePropertyName
      ? node instanceof QueryBuilderExplorerTreeSubTypeNodeData
        ? TYPE_CAST_TOKEN + prettyCONSTName(node.label)
        : prettyCONSTName(node.label)
      : node instanceof QueryBuilderExplorerTreeSubTypeNodeData
        ? TYPE_CAST_TOKEN + node.label
        : node.label;
    const selectNode = (): void => onNodeSelect?.(node);

    if (
      !node.mappingData.mapped &&
      // NOTE: we always want to show at least the root node
      !(node instanceof QueryBuilderExplorerTreeRootNodeData) &&
      !explorerState.showUnmappedProperties
    ) {
      return null;
    }
    return (
      <div
        className={clsx(
          'data-quality-tree-view__node__container data-quality-validation-explorer-tree__node__container',
          {
            'data-quality-validation-explorer-tree__node__container--selected-from-context-menu':
              isSelectedFromContextMenu,
            'data-quality-validation-explorer-tree__node__container--unmapped':
              !node.mappingData.mapped,
            'data-quality-validation-explorer-tree__node__container--selected':
              node.isSelected,
          },
        )}
        title={
          !node.mappingData.mapped
            ? node instanceof QueryBuilderExplorerTreeRootNodeData
              ? 'Root class is not mapped'
              : 'Property is not mapped'
            : undefined
        }
        onClick={selectNode}
        ref={node.mappingData.mapped ? ref : undefined}
        style={{
          paddingLeft: `${(level - 1) * (stepPaddingInRem ?? 1) + 0.5}rem`,
          display: 'flex',
        }}
      >
        {node instanceof QueryBuilderExplorerTreeRootNodeData && (
          <>
            <div className="data-quality-tree-view__node__icon data-quality-validation-explorer-tree__node__icon">
              <div className="data-quality-validation-explorer-tree__expand-icon">
                {nodeExpandIcon}
              </div>
              <div className="data-quality-validation-explorer-tree__type-icon">
                <PURE_ClassIcon />
              </div>
            </div>
            <div className="data-quality-tree-view__node__label data-quality-validation-explorer-tree__node__label data-quality-validation-explorer-tree__node__label--with-action">
              {node.label}
            </div>
            <div className="data-quality-validation-explorer-tree__node__actions">
              <QueryBuilderRootClassInfoTooltip
                _class={guaranteeNonNullable(
                  dataQualityQueryBuilderState.class,
                )}
              >
                <div
                  className="data-quality-validation-explorer-tree__node__action data-quality-validation-explorer-tree__node__info"
                  data-testid={
                    DATA_QUALITY_VALIDATION_TEST_ID.DATA_QUALITY_VALIDATION_TOOLTIP_ICON
                  }
                >
                  <InfoCircleIcon />
                </div>
              </QueryBuilderRootClassInfoTooltip>
            </div>
          </>
        )}
        {(node instanceof QueryBuilderExplorerTreePropertyNodeData ||
          node instanceof QueryBuilderExplorerTreeSubTypeNodeData) && (
          <>
            <div
              className="data-quality-tree-view__node__icon data-quality-validation-explorer-tree__node__icon"
              ref={node.elementRef}
            >
              <div className="data-quality-validation-explorer-tree__expand-icon">
                {nodeExpandIcon}
              </div>
              <div className="data-quality-validation-explorer-tree__type-icon">
                {renderPropertyTypeIcon(node.type)}
              </div>
            </div>
            <div
              className={clsx(
                'data-quality-tree-view__node__label data-quality-validation-explorer-tree__node__label data-quality-validation-explorer-tree__node__label--with-action',
                {
                  'data-quality-validation-explorer-tree__node__label--with-preview':
                    allowPreview,
                },
                {
                  'data-quality-validation-explorer-tree__node__label--highlight':
                    node.isHighlighting,
                },
              )}
              onAnimationEnd={() => node.setIsHighlighting(false)}
            >
              <div
                className={clsx(
                  'data-quality-validation-explorer-tree__node__label--property__name',
                  {
                    'data-quality-validation-explorer-tree__node__label--deprecated':
                      checkForDeprecatedNode(
                        node,
                        explorerState.queryBuilderState.graphManagerState.graph,
                        explorerState.nonNullableTreeData,
                      ),
                  },
                )}
              >
                {propertyName}
              </div>
              {isDerivedProperty && (
                <div
                  className="data-quality-validation-explorer-tree__node__label__derived-property"
                  title="Property is derived and may require user to specify parameter values"
                >
                  (...)
                </div>
              )}
              {isMultiple && (
                <div
                  className="data-quality-validation-explorer-tree__node__label__multiple"
                  title="Multiple values of this property can cause row explosion"
                >
                  *
                </div>
              )}
            </div>
            <div className="data-quality-validation-explorer-tree__node__actions">
              {node instanceof QueryBuilderExplorerTreePropertyNodeData && (
                <QueryBuilderPropertyInfoTooltip
                  title={propertyName}
                  property={node.property}
                  path={node.id}
                  isMapped={node.mappingData.mapped}
                  type={node.type}
                >
                  <div
                    className="data-quality-validation-explorer-tree__node__action data-quality-validation-explorer-tree__node__info"
                    data-testid={
                      DATA_QUALITY_VALIDATION_TEST_ID.DATA_QUALITY_VALIDATION_TOOLTIP_ICON
                    }
                  >
                    <InfoCircleIcon />
                  </div>
                </QueryBuilderPropertyInfoTooltip>
              )}
              {node instanceof QueryBuilderExplorerTreeSubTypeNodeData && (
                <QueryBuilderSubclassInfoTooltip
                  subclass={node.subclass}
                  path={node.id}
                  isMapped={node.mappingData.mapped}
                  multiplicity={node.multiplicity}
                >
                  <div
                    className="data-quality-validation-explorer-tree__node__action data-quality-validation-explorer-tree__node__info"
                    data-testid={
                      DATA_QUALITY_VALIDATION_TEST_ID.DATA_QUALITY_VALIDATION_TOOLTIP_ICON
                    }
                  >
                    <InfoCircleIcon />
                  </div>
                </QueryBuilderSubclassInfoTooltip>
              )}
            </div>
          </>
        )}
      </div>
    );
  },
);

const QueryBuilderExplorerTreeNodeView = observer(
  (
    props: TreeNodeViewProps<
      QueryBuilderExplorerTreeNodeData,
      {
        dataQualityState: DataQualityState;
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
    const { dataQualityState } = innerProps;
    const { dataQualityQueryBuilderState } = dataQualityState;
    if (
      !node.mappingData.mapped &&
      // NOTE: we always want to show at least the root node
      !(node instanceof QueryBuilderExplorerTreeRootNodeData) &&
      !dataQualityQueryBuilderState.explorerState.showUnmappedProperties
    ) {
      return null;
    }
    return (
      <div className="data-quality-tree-view__node__block">
        <QueryBuilderExplorerTreeNodeContainer
          node={node}
          level={level + 1}
          stepPaddingInRem={stepPaddingInRem}
          onNodeSelect={onNodeSelect}
          innerProps={innerProps}
        />
        {node.isOpen &&
          getChildNodes(node).map((childNode) => (
            <QueryBuilderExplorerTreeNodeView
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

const QueryBuilderExplorerTree = observer(
  (props: { dataQualityState: DataQualityState }) => {
    const { dataQualityState } = props;
    const { dataQualityQueryBuilderState } = dataQualityState;
    const explorerState = dataQualityQueryBuilderState.explorerState;
    const treeData = explorerState.nonNullableTreeData;
    const onNodeSelect = (node: QueryBuilderExplorerTreeNodeData): void => {
      if (node.childrenIds.length) {
        node.isOpen = !node.isOpen;
        if (
          node.isOpen &&
          (node instanceof QueryBuilderExplorerTreePropertyNodeData ||
            node instanceof QueryBuilderExplorerTreeSubTypeNodeData) &&
          node.type instanceof Class
        ) {
          (node instanceof QueryBuilderExplorerTreeSubTypeNodeData
            ? getAllOwnClassProperties(node.type)
            : getAllClassProperties(node.type).concat(
                getAllClassDerivedProperties(node.type),
              )
          ).forEach((property) => {
            const propertyTreeNodeData = getQueryBuilderPropertyNodeData(
              property,
              node,
              guaranteeNonNullable(
                explorerState.mappingModelCoverageAnalysisResult,
              ),
            );
            if (propertyTreeNodeData) {
              treeData.nodes.set(propertyTreeNodeData.id, propertyTreeNodeData);
            }
          });
          node.type._subclasses.forEach((subclass) => {
            const subTypeTreeNodeData = getQueryBuilderSubTypeNodeData(
              subclass,
              node,
              guaranteeNonNullable(
                explorerState.mappingModelCoverageAnalysisResult,
              ),
            );
            treeData.nodes.set(subTypeTreeNodeData.id, subTypeTreeNodeData);
          });
        }
      }
      explorerState.refreshTree();
    };
    const getChildNodes = (
      node: QueryBuilderExplorerTreeNodeData,
    ): QueryBuilderExplorerTreeNodeData[] => {
      const dataToReturn = node.childrenIds
        .map((id) => treeData.nodes.get(id))
        .filter(
          (
            childNode,
          ): childNode is
            | QueryBuilderExplorerTreePropertyNodeData
            | QueryBuilderExplorerTreeSubTypeNodeData =>
            childNode instanceof QueryBuilderExplorerTreeSubTypeNodeData ||
            childNode instanceof QueryBuilderExplorerTreePropertyNodeData,
        )
        // simple properties come first
        .sort((a, b) => a.label.localeCompare(b.label))
        .sort(
          (a, b) =>
            getQueryBuilderExplorerTreeNodeSortRank(b) -
            getQueryBuilderExplorerTreeNodeSortRank(a),
        );
      return dataToReturn;
    };

    return (
      <TreeView
        components={{
          TreeNodeContainer: QueryBuilderExplorerTreeNodeContainer,
          TreeNodeView: QueryBuilderExplorerTreeNodeView,
        }}
        className="data-quality-validation-explorer-tree__root"
        treeData={treeData}
        onNodeSelect={onNodeSelect}
        getChildNodes={getChildNodes}
        innerProps={{
          dataQualityState,
        }}
      />
    );
  },
);
export const DataQualityExplorerPanel = observer(
  (props: { dataQualityState: DataQualityState }) => {
    const { dataQualityState } = props;
    const { dataQualityQueryBuilderState } = dataQualityState;
    const explorerState = dataQualityQueryBuilderState.explorerState;
    const applicationStore = useApplicationStore();
    const collapseTree = (): void => {
      if (explorerState.treeData) {
        Array.from(explorerState.treeData.nodes.values()).forEach((node) => {
          node.isOpen = false;
        });
        explorerState.refreshTree();
      }
    };
    const toggleShowUnmappedProperties = (): void =>
      explorerState.setShowUnmappedProperties(
        !explorerState.showUnmappedProperties,
      );
    const toggleHumanizePropertyName = (): void =>
      explorerState.setHumanizePropertyName(
        !explorerState.humanizePropertyName,
      );
    const toggleHighlightUsedProperties = (): void =>
      explorerState.setHighlightUsedProperties(
        !explorerState.highlightUsedProperties,
      );

    useEffect(() => {
      flowResult(explorerState.analyzeMappingModelCoverage()).catch((error) => {
        applicationStore.alertUnhandledError(error);
      });
    }, [
      applicationStore,
      explorerState,
      dataQualityQueryBuilderState.executionContextState.mapping,
    ]);
    return (
      <div
        data-testid={
          DATA_QUALITY_VALIDATION_TEST_ID.DATA_QUALITY_VALIDATION_EXPLORER
        }
        className={clsx('panel data-quality-validation__explorer', {
          backdrop__element: applicationStore.layoutService.showBackdrop,
        })}
      >
        <PanelHeader title="explorer">
          <PanelHeaderActions>
            <PanelHeaderActionItem onClick={collapseTree} title="Collapse Tree">
              <CompressIcon />
            </PanelHeaderActionItem>
            <ControlledDropdownMenu
              className="panel__header__action"
              title="Show Options Menu..."
              content={
                <MenuContent>
                  <MenuContentItem onClick={toggleShowUnmappedProperties}>
                    <MenuContentItemIcon>
                      {explorerState.showUnmappedProperties ? (
                        <CheckIcon />
                      ) : null}
                    </MenuContentItemIcon>
                    <MenuContentItemLabel>
                      Show Unmapped Properties
                    </MenuContentItemLabel>
                  </MenuContentItem>
                  <MenuContentItem onClick={toggleHumanizePropertyName}>
                    <MenuContentItemIcon>
                      {explorerState.humanizePropertyName ? (
                        <CheckIcon />
                      ) : null}
                    </MenuContentItemIcon>
                    <MenuContentItemLabel>
                      Humanize Property Name
                    </MenuContentItemLabel>
                  </MenuContentItem>
                  <MenuContentItem onClick={toggleHighlightUsedProperties}>
                    <MenuContentItemIcon>
                      {explorerState.highlightUsedProperties ? (
                        <CheckIcon />
                      ) : null}
                    </MenuContentItemIcon>
                    <MenuContentItemLabel>
                      Highlight already used properties
                    </MenuContentItemLabel>
                  </MenuContentItem>
                </MenuContent>
              }
              menuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
                transformOrigin: { vertical: 'top', horizontal: 'left' },
                elevation: 7,
              }}
            >
              <MoreVerticalIcon className="data-quality-validation__icon__more-options" />
            </ControlledDropdownMenu>
          </PanelHeaderActions>
        </PanelHeader>

        <div className="panel__content data-quality-validation-explorer-tree__content">
          <PanelLoadingIndicator
            isLoading={
              explorerState.mappingModelCoverageAnalysisState.isInProgress
            }
          />
          <DragPreviewLayer
            labelGetter={(item: QueryBuilderExplorerTreeDragSource): string =>
              explorerState.humanizePropertyName
                ? prettyCONSTName(item.node.label)
                : item.node.label
            }
            types={Object.values(QUERY_BUILDER_EXPLORER_TREE_DND_TYPE)}
          />
          {explorerState.mappingModelCoverageAnalysisState.isInProgress ? (
            <BlankPanelContent>
              {explorerState.mappingModelCoverageAnalysisState.message}
            </BlankPanelContent>
          ) : (
            <>
              {!explorerState.treeData && (
                <BlankPanelContent>
                  Specify the class, mapping, and runtime to start building
                  query
                </BlankPanelContent>
              )}
              {explorerState.treeData && (
                <QueryBuilderExplorerTree dataQualityState={dataQualityState} />
              )}
            </>
          )}
        </div>
      </div>
    );
  },
);

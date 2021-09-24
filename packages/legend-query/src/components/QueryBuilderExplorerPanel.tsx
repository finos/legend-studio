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

import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import type {
  TreeNodeContainerProps,
  TreeNodeViewProps,
} from '@finos/legend-art';
import {
  clsx,
  TreeView,
  BlankPanelContent,
  DropdownMenu,
  ContextMenu,
  MenuContent,
  MenuContentItem,
  MenuContentItemIcon,
  MenuContentItemLabel,
  StringTypeIcon,
  BooleanTypeIcon,
  NumberTypeIcon,
  DateTypeIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  MoreVerticalIcon,
  CompressIcon,
  EyeIcon,
  InfoCircleIcon,
  ClassIcon,
  CheckIcon,
} from '@finos/legend-art';
import type {
  QueryBuilderExplorerTreeDragSource,
  QueryBuilderExplorerTreeNodeData,
} from '../stores/QueryBuilderExplorerState';
import {
  QUERY_BUILDER_EXPLORER_TREE_DND_TYPE,
  QueryBuilderExplorerTreeRootNodeData,
  QueryBuilderExplorerTreePropertyNodeData,
  getQueryBuilderPropertyNodeData,
  buildPropertyExpressionFromExplorerTreeNodeData,
} from '../stores/QueryBuilderExplorerState';
import { useDrag, useDragLayer } from 'react-dnd';
import { QueryBuilderPropertyInfoTooltip } from './QueryBuilderSharedInfoTooltip';
import { getEmptyImage } from 'react-dnd-html5-backend';
import type { QueryBuilderState } from '../stores/QueryBuilderState';
import { addQueryBuilderPropertyNode } from '../stores/QueryBuilderGraphFetchTreeUtil';
import { QueryBuilderSimpleProjectionColumnState } from '../stores/QueryBuilderProjectionState';
import { flowResult } from 'mobx';
import { Dialog } from '@material-ui/core';
import { prettyPropertyName } from '../stores/QueryBuilderPropertyEditorState';
import type { Type } from '@finos/legend-graph';
import {
  Class,
  DerivedProperty,
  PrimitiveType,
  PRIMITIVE_TYPE,
  Enumeration,
} from '@finos/legend-graph';
import { useApplicationStore } from '@finos/legend-application';
import { getClassPropertyIcon } from './shared/ElementIconUtils';

const QueryBuilderExplorerPreviewDataModal = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const previewDataState = queryBuilderState.explorerState.previewDataState;
    const close = (): void => previewDataState.setPreviewData(undefined);

    return (
      <Dialog
        open={Boolean(previewDataState.previewData)}
        onClose={close}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <div className="modal modal--dark editor-modal query-builder__explorer__preview-data-modal">
          <div className="modal__header">
            <div className="modal__title">
              {prettyPropertyName(previewDataState.propertyName)}
            </div>
          </div>
          <div className="modal__body query-builder__explorer__preview-data-modal__body">
            {previewDataState.previewData && (
              <table className="table">
                <thead>
                  <tr>
                    {previewDataState.previewData.columns.map((column, idx) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <th key={idx} className="table__cell--left">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewDataState.previewData.rows.map((row, rowIdx) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <tr key={rowIdx}>
                      {row.values.map((value, idx) => (
                        // eslint-disable-next-line react/no-array-index-key
                        <td key={idx} className="table__cell--left">
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="modal__footer">
            <button className="btn modal__footer__close-btn" onClick={close}>
              Close
            </button>
          </div>
        </div>
      </Dialog>
    );
  },
);

const QueryBuilderExplorerPropertyDragLayer = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const explorerState = queryBuilderState.explorerState;
    const { itemType, item, isDragging, currentPosition } = useDragLayer(
      (monitor) => ({
        itemType: monitor.getItemType() as QUERY_BUILDER_EXPLORER_TREE_DND_TYPE,
        item: monitor.getItem() as QueryBuilderExplorerTreeDragSource | null,
        isDragging: monitor.isDragging(),
        initialOffset: monitor.getInitialSourceClientOffset(),
        currentPosition: monitor.getClientOffset(),
      }),
    );

    if (
      !isDragging ||
      !item ||
      !Object.values(QUERY_BUILDER_EXPLORER_TREE_DND_TYPE).includes(itemType)
    ) {
      return null;
    }
    return (
      <div className="query-builder-explorer-tree__drag-preview-layer">
        <div
          className="query-builder-explorer-tree__drag-preview"
          // added some offset so the mouse doesn't overlap the label too much
          style={
            !currentPosition
              ? { display: 'none' }
              : {
                  transform: `translate(${currentPosition.x + 20}px, ${
                    currentPosition.y + 10
                  }px)`,
                }
          }
        >
          {explorerState.humanizePropertyName
            ? prettyPropertyName(item.node.label)
            : item.node.label}
        </div>
      </div>
    );
  },
);

const QueryBuilderExplorerContextMenu = observer(
  (
    props: {
      queryBuilderState: QueryBuilderState;
      node: QueryBuilderExplorerTreeNodeData;
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const { queryBuilderState, node } = props;
    const applicationStore = useApplicationStore();
    const viewType = (): void =>
      applicationStore.notifyUnsupportedFeature('View Type');
    const addNodeToFetchStructure = (): void => {
      if (
        node instanceof QueryBuilderExplorerTreePropertyNodeData &&
        !(node.type instanceof Class)
      ) {
        if (queryBuilderState.fetchStructureState.isGraphFetchMode()) {
          queryBuilderState.fetchStructureState.graphFetchTreeState.addProperty(
            node,
          );
        } else if (queryBuilderState.fetchStructureState.isProjectionMode()) {
          const projectionState =
            queryBuilderState.fetchStructureState.projectionState;
          projectionState.addColumn(
            new QueryBuilderSimpleProjectionColumnState(
              projectionState,
              buildPropertyExpressionFromExplorerTreeNodeData(
                queryBuilderState.explorerState.nonNullableTreeData,
                node,
                projectionState.queryBuilderState.graphManagerState.graph,
              ),
            ),
          );
        }
      }
    };
    const addAllChildrenToFetchStructure = (): void => {
      if (node.type instanceof Class) {
        // NOTE: here we require the node to already been expanded so the child nodes are generated
        // we don't allow adding unopened node. Maybe if it helps, we can show a warning.
        const nodesToAdd = node.childrenIds
          .map((childId) =>
            queryBuilderState.explorerState.nonNullableTreeData.nodes.get(
              childId,
            ),
          )
          .filter(
            (
              childNode,
            ): childNode is QueryBuilderExplorerTreePropertyNodeData =>
              childNode instanceof QueryBuilderExplorerTreePropertyNodeData &&
              !(childNode.type instanceof Class) &&
              childNode.mapped,
          );
        if (queryBuilderState.fetchStructureState.isGraphFetchMode()) {
          const graphFetchTreeData =
            queryBuilderState.fetchStructureState.graphFetchTreeState.treeData;
          if (graphFetchTreeData) {
            nodesToAdd.forEach((nodeToAdd) =>
              addQueryBuilderPropertyNode(
                graphFetchTreeData,
                queryBuilderState.explorerState.nonNullableTreeData,
                nodeToAdd,
              ),
            );
            queryBuilderState.fetchStructureState.graphFetchTreeState.setGraphFetchTree(
              {
                ...graphFetchTreeData,
              },
            );
          }
        } else if (queryBuilderState.fetchStructureState.isProjectionMode()) {
          nodesToAdd.forEach((nodeToAdd) => {
            const projectionState =
              queryBuilderState.fetchStructureState.projectionState;
            projectionState.addColumn(
              new QueryBuilderSimpleProjectionColumnState(
                projectionState,
                buildPropertyExpressionFromExplorerTreeNodeData(
                  queryBuilderState.explorerState.nonNullableTreeData,
                  nodeToAdd,
                  projectionState.queryBuilderState.graphManagerState.graph,
                ),
              ),
            );
          });
        }
      }
    };

    return (
      <MenuContent ref={ref}>
        {node instanceof QueryBuilderExplorerTreePropertyNodeData &&
          !(node.type instanceof Class) && (
            <MenuContentItem onClick={addNodeToFetchStructure}>
              Add Property to Fetch Structure
            </MenuContentItem>
          )}
        {node.type instanceof Class && (
          <MenuContentItem onClick={addAllChildrenToFetchStructure}>
            Add All Properties to Fetch Structure
          </MenuContentItem>
        )}
        <MenuContentItem onClick={viewType}>View Type</MenuContentItem>
      </MenuContent>
    );
  },
  { forwardRef: true },
);

const renderPropertyTypeIcon = (type: Type): React.ReactNode => {
  if (type instanceof PrimitiveType) {
    if (type.name === PRIMITIVE_TYPE.STRING) {
      return (
        <StringTypeIcon className="query-builder-explorer-tree__icon query-builder-explorer-tree__icon__string" />
      );
    } else if (type.name === PRIMITIVE_TYPE.BOOLEAN) {
      return (
        <BooleanTypeIcon className="query-builder-explorer-tree__icon query-builder-explorer-tree__icon__boolean" />
      );
    } else if (
      type.name === PRIMITIVE_TYPE.NUMBER ||
      type.name === PRIMITIVE_TYPE.INTEGER ||
      type.name === PRIMITIVE_TYPE.FLOAT ||
      type.name === PRIMITIVE_TYPE.DECIMAL
    ) {
      return (
        <NumberTypeIcon className="query-builder-explorer-tree__icon query-builder-explorer-tree__icon__number" />
      );
    } else if (
      type.name === PRIMITIVE_TYPE.DATE ||
      type.name === PRIMITIVE_TYPE.DATETIME ||
      type.name === PRIMITIVE_TYPE.STRICTDATE
    ) {
      return (
        <DateTypeIcon className="query-builder-explorer-tree__icon query-builder-explorer-tree__icon__time" />
      );
    }
  }
  return getClassPropertyIcon(type);
};

const QueryBuilderExplorerTreeNodeContainer = observer(
  (
    props: TreeNodeContainerProps<
      QueryBuilderExplorerTreeNodeData,
      {
        queryBuilderState: QueryBuilderState;
      }
    >,
  ) => {
    const { node, level, stepPaddingInRem, onNodeSelect, innerProps } = props;
    const { queryBuilderState } = innerProps;
    const [isSelectedFromContextMenu, setIsSelectedFromContextMenu] =
      useState(false);
    const applicationStore = useApplicationStore();
    const explorerState = queryBuilderState.explorerState;
    const [, dragConnector, dragPreviewConnector] = useDrag(
      () => ({
        type:
          node instanceof QueryBuilderExplorerTreePropertyNodeData
            ? node.type instanceof Enumeration
              ? QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.ENUM_PROPERTY
              : node.type instanceof Class
              ? QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.CLASS_PROPERTY
              : QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.PRIMITIVE_PROPERTY
            : QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.ROOT,
        item: (): { node?: QueryBuilderExplorerTreePropertyNodeData } =>
          node instanceof QueryBuilderExplorerTreePropertyNodeData
            ? { node }
            : {},
      }),
      [node],
    );
    const isExpandable = Boolean(node.childrenIds.length);
    const isDerivedProperty =
      node instanceof QueryBuilderExplorerTreePropertyNodeData &&
      node.property instanceof DerivedProperty;
    const isMultiple =
      node instanceof QueryBuilderExplorerTreePropertyNodeData &&
      (node.property.multiplicity.upperBound === undefined ||
        node.property.multiplicity.upperBound > 1);
    const allowPreview =
      node.mapped &&
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
    const selectNode = (): void => onNodeSelect?.(node);
    // context menu
    const showContextMenu =
      node instanceof QueryBuilderExplorerTreeRootNodeData ||
      (node instanceof QueryBuilderExplorerTreePropertyNodeData &&
        !(node.type instanceof PrimitiveType));
    const onContextMenuOpen = (): void => setIsSelectedFromContextMenu(true);
    const onContextMenuClose = (): void => setIsSelectedFromContextMenu(false);
    const previewData = (): void => {
      if (node instanceof QueryBuilderExplorerTreePropertyNodeData) {
        flowResult(
          queryBuilderState.fetchStructureState.projectionState.previewData(
            node,
          ),
        ).catch(applicationStore.alertIllegalUnhandledError);
      }
    };
    // hide default HTML5 preview image
    useEffect(() => {
      dragPreviewConnector(getEmptyImage(), { captureDraggingState: true });
    }, [dragPreviewConnector]);

    if (
      !node.mapped &&
      !explorerState.showUnmappedProperties &&
      queryBuilderState.querySetupState.isMappingCompatible
    ) {
      return null;
    }
    return (
      <ContextMenu
        content={
          <QueryBuilderExplorerContextMenu
            queryBuilderState={queryBuilderState}
            node={node}
          />
        }
        disabled={
          !showContextMenu ||
          // NOTE: this might make it hard to modularize
          queryBuilderState.fetchStructureState.projectionState.hasParserError
        }
        menuProps={{ elevation: 7 }}
        onOpen={onContextMenuOpen}
        onClose={onContextMenuClose}
      >
        <div
          className={clsx(
            'tree-view__node__container query-builder-explorer-tree__node__container',
            {
              'query-builder-explorer-tree__node__container--selected-from-context-menu':
                isSelectedFromContextMenu,
              'query-builder-explorer-tree__node__container--unmapped':
                !node.mapped,
            },
          )}
          title={!node.mapped ? 'Property is not mapped' : undefined}
          onClick={selectNode}
          ref={node.mapped && !isExpandable ? dragConnector : undefined}
          style={{
            paddingLeft: `${(level - 1) * (stepPaddingInRem ?? 1) + 0.5}rem`,
            display: 'flex',
          }}
        >
          {node instanceof QueryBuilderExplorerTreeRootNodeData && (
            // NOTE: since the root of the tree is the class, not the property, we want to display it differently
            <>
              <div className="query-builder-explorer-tree__expand-icon">
                {nodeExpandIcon}
              </div>
              <div className="tree-view__node__label query-builder-explorer-tree__root-node__label">
                <div className="query-builder-explorer-tree__root-node__label__icon">
                  <ClassIcon />
                </div>
                <div className="query-builder-explorer-tree__root-node__label__text">
                  {node.label}
                </div>
              </div>
            </>
          )}
          {node instanceof QueryBuilderExplorerTreePropertyNodeData && (
            <>
              <div className="tree-view__node__icon query-builder-explorer-tree__node__icon">
                <div className="query-builder-explorer-tree__expand-icon">
                  {nodeExpandIcon}
                </div>
                <div className="query-builder-explorer-tree__type-icon">
                  {renderPropertyTypeIcon(node.type)}
                </div>
              </div>
              <div
                className={clsx(
                  'tree-view__node__label query-builder-explorer-tree__node__label query-builder-explorer-tree__node__label--with-action',
                  {
                    'query-builder-explorer-tree__node__label--with-preview':
                      allowPreview,
                  },
                )}
              >
                {explorerState.humanizePropertyName
                  ? prettyPropertyName(node.label)
                  : node.label}
                {isDerivedProperty && (
                  <div
                    className="query-builder-explorer-tree__node__label__derived-property"
                    title="Property is derived and may require user to specify parameter values"
                  >
                    (...)
                  </div>
                )}
                {isMultiple && (
                  <div
                    className="query-builder-explorer-tree__node__label__multiple"
                    title="Multiple values of this property can cause row explosion"
                  >
                    *
                  </div>
                )}
              </div>
              <div className="query-builder-explorer-tree__node__actions">
                {allowPreview && (
                  <button
                    className="query-builder-explorer-tree__node__action"
                    disabled={
                      explorerState.previewDataState.isGeneratingPreviewData
                    }
                    tabIndex={-1}
                    title="Preview Data"
                    onClick={previewData}
                  >
                    <EyeIcon />
                  </button>
                )}
                <QueryBuilderPropertyInfoTooltip
                  property={node.property}
                  path={node.id}
                  isMapped={node.mapped}
                  placement="bottom"
                >
                  <div className="query-builder-explorer-tree__node__action query-builder-explorer-tree__node__info">
                    <InfoCircleIcon />
                  </div>
                </QueryBuilderPropertyInfoTooltip>
              </div>
            </>
          )}
        </div>
      </ContextMenu>
    );
  },
);

const QueryBuilderExplorerTreeNodeView = observer(
  (
    props: TreeNodeViewProps<
      QueryBuilderExplorerTreeNodeData,
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
    const { queryBuilderState } = innerProps;

    if (
      !node.mapped &&
      !queryBuilderState.explorerState.showUnmappedProperties &&
      queryBuilderState.querySetupState.isMappingCompatible
    ) {
      return null;
    }
    return (
      <div className="tree-view__node__block">
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
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const explorerState = queryBuilderState.explorerState;
    const treeData = explorerState.nonNullableTreeData;
    const onNodeSelect = (node: QueryBuilderExplorerTreeNodeData): void => {
      if (node.childrenIds.length) {
        node.isOpen = !node.isOpen;
        if (
          node.isOpen &&
          node instanceof QueryBuilderExplorerTreePropertyNodeData &&
          node.type instanceof Class
        ) {
          node.type
            .getAllProperties()
            .concat(node.type.getAllDerivedProperties())
            .forEach((property) => {
              const propertyTreeNodeData = getQueryBuilderPropertyNodeData(
                queryBuilderState.graphManagerState,
                property,
                node,
              );
              treeData.nodes.set(propertyTreeNodeData.id, propertyTreeNodeData);
            });
        }
      }
      explorerState.refreshTree();
    };

    const getChildNodes = (
      node: QueryBuilderExplorerTreeNodeData,
    ): QueryBuilderExplorerTreePropertyNodeData[] =>
      node.childrenIds
        .map((id) => treeData.nodes.get(id))
        .filter(
          (childNode): childNode is QueryBuilderExplorerTreePropertyNodeData =>
            childNode instanceof QueryBuilderExplorerTreePropertyNodeData,
        )
        // simple properties come first
        .sort((a, b) => a.label.localeCompare(b.label))
        .sort(
          (a, b) =>
            (b.type instanceof Class
              ? 2
              : b.type instanceof Enumeration
              ? 1
              : 0) -
            (a.type instanceof Class
              ? 2
              : a.type instanceof Enumeration
              ? 1
              : 0),
        );

    return (
      <TreeView
        components={{
          TreeNodeContainer: QueryBuilderExplorerTreeNodeContainer,
          TreeNodeView: QueryBuilderExplorerTreeNodeView,
        }}
        className="query-builder-explorer-tree__root"
        treeData={treeData}
        onNodeSelect={onNodeSelect}
        getChildNodes={getChildNodes}
        innerProps={{
          queryBuilderState,
        }}
      />
    );
  },
);

export const QueryBuilderExplorerPanel = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const explorerState = queryBuilderState.explorerState;
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

    return (
      <div
        className={clsx('panel query-builder__explorer', {
          // NOTE: this might make it hard to modularize
          backdrop__element:
            queryBuilderState.fetchStructureState.projectionState
              .hasParserError,
        })}
      >
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">explorer</div>
          </div>
          <div className="panel__header__actions">
            <button
              className="panel__header__action"
              onClick={collapseTree}
              tabIndex={-1}
              title="Collapse Tree"
            >
              <CompressIcon />
            </button>
            <DropdownMenu
              className="panel__header__action"
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
                </MenuContent>
              }
              menuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
                transformOrigin: { vertical: 'top', horizontal: 'left' },
                elevation: 7,
              }}
            >
              <MoreVerticalIcon
                title="Show Options Menu..."
                className="query-builder__icon__more-options"
              />
            </DropdownMenu>
          </div>
        </div>
        <div className="panel__content query-builder-explorer-tree__content">
          <QueryBuilderExplorerPropertyDragLayer
            queryBuilderState={queryBuilderState}
          />
          {!explorerState.treeData && (
            <BlankPanelContent>
              Specify the class, mapping, and connection to start building query
            </BlankPanelContent>
          )}
          {explorerState.treeData && (
            <QueryBuilderExplorerTree queryBuilderState={queryBuilderState} />
          )}
          <QueryBuilderExplorerPreviewDataModal
            queryBuilderState={queryBuilderState}
          />
        </div>
      </div>
    );
  },
);

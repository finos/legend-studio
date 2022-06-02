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

import {
  clsx,
  CheckSquareIcon,
  SquareIcon,
  BasePopover,
  ResizablePanelSplitter,
  ResizablePanelGroup,
  ResizablePanel,
  ResizablePanelSplitterLine,
  InfoCircleIcon,
  ExternalLinkIcon,
  TimesIcon,
  SearchIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@finos/legend-art';
import {
  Class,
  Enumeration,
  getAllClassDerivedProperties,
  getAllClassProperties,
  getAllOwnClassProperties,
} from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useDrag } from 'react-dnd';
import {
  type QueryBuilderExplorerTreeNodeData,
  QueryBuilderExplorerTreePropertyNodeData,
  QueryBuilderExplorerTreeSubTypeNodeData,
  QUERY_BUILDER_EXPLORER_TREE_DND_TYPE,
  getQueryBuilderPropertyNodeData,
  getQueryBuilderSubTypeNodeData,
  type QueryBuilderExplorerState,
} from '../stores/QueryBuilderExplorerState.js';
import { prettyPropertyName } from '../stores/QueryBuilderPropertyEditorState.js';
import type { QueryBuilderState } from '../stores/QueryBuilderState.js';
import {
  QueryBuilderSubclassInfoTooltip,
  renderPropertyTypeIcon,
} from './QueryBuilderExplorerPanel.js';
import { QueryBuilderPropertyInfoTooltip } from './QueryBuilderPropertyInfoTooltip.js';

const prettyPropertyNameFromId = (name: string): string => {
  let propNameArray = name.split('.');
  propNameArray = propNameArray.map((p) => prettyPropertyName(p));
  let propName = '';
  propNameArray.forEach((p) => {
    propName = `${propName + p}/`;
  });
  propName = propName.slice(0, -1);
  return propName;
};

const prettyPropertyNameForSubType = (name: string): string => {
  let propNameArray = name.split('@');
  propNameArray = propNameArray
    .map((p) => p.replace(/.*::/, ''))
    .filter((p) => p !== '')
    .map((p) => prettyPropertyName(p));
  let propName = '';
  propNameArray.slice(0, -1).forEach((p) => {
    propName = `${propName}(@${p})/`;
  });
  propNameArray = guaranteeNonNullable(
    propNameArray[propNameArray.length - 1],
  ).split('.');
  propNameArray = propNameArray.map((p) => prettyPropertyName(p));
  propName = `${propName}(@${propNameArray[0]})/`;
  propNameArray.slice(1).forEach((p) => {
    propName = `${propName + p}/`;
  });
  propName = propName.slice(0, -1);
  return propName;
};

const prettyPropertyNameForSubTypeClass = (name: string): string => {
  let propNameArray = name.split('@');
  propNameArray = propNameArray
    .map((p) => p.replace(/.*::/, ''))
    .filter((p) => p !== '')
    .map((p) => prettyPropertyName(p));
  let propName = '';
  propNameArray.forEach((p) => {
    propName = `${propName}@${p}`;
  });
  return propName;
};

export const QueryBuilderTreeNodeViewer = observer(
  (props: {
    node: QueryBuilderExplorerTreeNodeData;
    queryBuilderState: QueryBuilderState;
    explorerState: QueryBuilderExplorerState;
    level: number;
    stepPaddingInRem: number;
  }) => {
    const { node, queryBuilderState, explorerState, level, stepPaddingInRem } =
      props;
    const propertySearchPanelState = explorerState.propertySearchPanelState;
    const [{ isDragging }, dragConnector] = useDrag(
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
        collect: (monitor): { isDragging: boolean } => ({
          isDragging: monitor.isDragging(),
        }),
      }),
      [node],
    );
    const isMultiple =
      (node instanceof QueryBuilderExplorerTreePropertyNodeData &&
        (node.property.multiplicity.upperBound === undefined ||
          node.property.multiplicity.upperBound > 1)) ||
      (node instanceof QueryBuilderExplorerTreeSubTypeNodeData &&
        (node.multiplicity.upperBound === undefined ||
          node.multiplicity.upperBound > 1));
    queryBuilderState.explorerState.propertySearchPanelState.setIsSearchPanelOpen(
      !isDragging,
    );
    const treeData = explorerState.nonNullableTreeData;
    const onNodeSelect = (
      selectedNode: QueryBuilderExplorerTreeNodeData,
    ): void => {
      if (selectedNode.childrenIds.length) {
        selectedNode.isOpen = true;
        if (
          (selectedNode instanceof QueryBuilderExplorerTreePropertyNodeData ||
            selectedNode instanceof QueryBuilderExplorerTreeSubTypeNodeData) &&
          selectedNode.type instanceof Class
        ) {
          (selectedNode instanceof QueryBuilderExplorerTreeSubTypeNodeData
            ? getAllOwnClassProperties(selectedNode.type)
            : getAllClassProperties(selectedNode.type).concat(
                getAllClassDerivedProperties(selectedNode.type),
              )
          ).forEach((property) => {
            const propertyTreeNodeData = getQueryBuilderPropertyNodeData(
              queryBuilderState.graphManagerState,
              property,
              selectedNode,
              guaranteeNonNullable(queryBuilderState.querySetupState.mapping),
            );
            treeData.nodes.set(propertyTreeNodeData.id, propertyTreeNodeData);
          });
          selectedNode.type._subclasses.forEach((subclass) => {
            const subTypeTreeNodeData = getQueryBuilderSubTypeNodeData(
              subclass,
              node,
            );
            treeData.nodes.set(subTypeTreeNodeData.id, subTypeTreeNodeData);
          });
        }
      }
      explorerState.refreshTree();
    };
    const showSelectedNodeInTree = (): void => {
      propertySearchPanelState.setSearchedPropertyName('');
      propertySearchPanelState.refreshPropertyState();
      const ancestors: QueryBuilderExplorerTreeNodeData[] = [];
      let currentNode = node;
      let parentNode = propertySearchPanelState.allMappedPropertyNodes.find(
        (n) =>
          currentNode instanceof QueryBuilderExplorerTreePropertyNodeData &&
          currentNode.parentId === n.id,
      );
      while (parentNode) {
        ancestors.push(parentNode);
        currentNode = parentNode;
        parentNode = propertySearchPanelState.allMappedPropertyNodes.find(
          (n) =>
            currentNode instanceof QueryBuilderExplorerTreePropertyNodeData &&
            currentNode.parentId === n.id,
        );
      }
      while (ancestors.length) {
        const currentAncestor = explorerState.treeData?.nodes.get(
          guaranteeNonNullable(ancestors.pop()).id,
        );
        if (currentAncestor) {
          onNodeSelect(currentAncestor);
        }
      }
      const treeNode = treeData.nodes.get(node.id);
      treeNode?.setIsSelected(true);
      const nodeElement = document.getElementById(
        `query-builder-tree-node-${node.id}`,
      );
      nodeElement?.scrollIntoView();
      setTimeout(() => treeNode?.setIsSelected(false), 5000);
      setTimeout(() => {
        propertySearchPanelState.setIsSearchPanelOpen(false);
      }, 0);
    };
    const [isExpandable, setIsExpandable] = useState(false);
    const nodeExpandIcon = isExpandable ? (
      <ChevronDownIcon />
    ) : (
      <ChevronRightIcon />
    );
    const getChildrenNodes = (): QueryBuilderExplorerTreeNodeData[] => {
      const childNodes: QueryBuilderExplorerTreeNodeData[] = [];
      if (node.childrenIds.length) {
        if (
          (node instanceof QueryBuilderExplorerTreePropertyNodeData ||
            node instanceof QueryBuilderExplorerTreeSubTypeNodeData) &&
          node.type instanceof Class
        ) {
          (node instanceof QueryBuilderExplorerTreeSubTypeNodeData
            ? getAllOwnClassProperties(node.type)
            : getAllClassProperties(node.type)
          ).forEach((property) => {
            const propertyTreeNodeData = getQueryBuilderPropertyNodeData(
              queryBuilderState.graphManagerState,
              property,
              node,
              guaranteeNonNullable(queryBuilderState.querySetupState.mapping),
            );
            if (
              !(propertyTreeNodeData.type instanceof Class) &&
              propertyTreeNodeData.mappingData.mapped
            ) {
              childNodes.push(propertyTreeNodeData);
            }
          });
        }
      }
      return childNodes;
    };
    const parentNode = propertySearchPanelState.allMappedPropertyNodes.find(
      (pn) =>
        node instanceof QueryBuilderExplorerTreePropertyNodeData &&
        node.parentId === pn.id,
    );

    return (
      <div>
        <div
          className="tree-view__node__container"
          ref={dragConnector}
          style={{
            paddingLeft: `${(level - 1) * stepPaddingInRem + 0.5}rem`,
            display: 'flex',
          }}
          onClick={(): void => setIsExpandable(!isExpandable)}
        >
          <div className="tree-view__node__icon query-builder-property-search-panel__node__icon">
            {node.type instanceof Class && (
              <div className="query-builder-property-search-panel__expand-icon">
                {nodeExpandIcon}
              </div>
            )}
            <div className="query-builder-property-search-panel__type-icon">
              {renderPropertyTypeIcon(node.type)}
            </div>
          </div>
          <div className="tree-view__node__label query-builder-property-search-panel__node__label query-builder-property-search-panel__node__label--with-action">
            {parentNode instanceof QueryBuilderExplorerTreeSubTypeNodeData
              ? prettyPropertyNameForSubType(node.id)
              : node instanceof QueryBuilderExplorerTreeSubTypeNodeData
              ? prettyPropertyNameForSubTypeClass(node.id)
              : prettyPropertyNameFromId(node.id)}
            {isMultiple && (
              <div
                className="query-builder-property-search-panel__node__label__multiple"
                title="Multiple values of this property can cause row explosion"
              >
                *
              </div>
            )}
          </div>
          <div className="query-builder-property-search-panel__node__actions">
            {node instanceof QueryBuilderExplorerTreePropertyNodeData && (
              <QueryBuilderPropertyInfoTooltip
                property={node.property}
                path={node.id}
                isMapped={node.mappingData.mapped}
              >
                <div className="query-builder-property-search-panel__node__action query-builder-property-search-panel__node__info">
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
                <div className="query-builder-property-search-panel__node__action query-builder-property-search-panel__node__info">
                  <InfoCircleIcon />
                </div>
              </QueryBuilderSubclassInfoTooltip>
            )}
            <div
              className="query-builder-property-search-panel__node__action"
              title="Show in tree"
              onClick={showSelectedNodeInTree}
            >
              <ExternalLinkIcon />
            </div>
          </div>
        </div>
        {isExpandable &&
          getChildrenNodes().map((childNode) => (
            <QueryBuilderTreeNodeViewer
              key={childNode.id}
              node={childNode}
              queryBuilderState={queryBuilderState}
              level={1}
              stepPaddingInRem={2}
              explorerState={queryBuilderState.explorerState}
            />
          ))}
      </div>
    );
  },
);

export const QueryBuilderPropertySearchPanel = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const explorerState = queryBuilderState.explorerState;
    const propertySearchPanelState = explorerState.propertySearchPanelState;

    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const changePropertyName: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      propertySearchPanelState.setSearchedPropertyName(event.target.value);
      propertySearchPanelState.refreshPropertyState();
      if (propertySearchPanelState.searchedPropertyName.length >= 3) {
        propertySearchPanelState.fetchMappedPropertyNodes(
          propertySearchPanelState.searchedPropertyName,
        );
      }
    };
    const clearPropertyName = (): void => {
      propertySearchPanelState.setSearchedPropertyName('');
      propertySearchPanelState.refreshPropertyState();
    };
    const handleClose = (): void => {
      clearPropertyName();
      setAnchorEl(null);
      propertySearchPanelState.setIsSearchPanelOpen(false);
    };
    const toggleOneManyRowsIncluded = (): void => {
      propertySearchPanelState.setOneManyRowsIncluded(
        !propertySearchPanelState.isOneManyRowsIncluded,
      );
    };
    const toggleClassIncluded = (): void => {
      propertySearchPanelState.setClassIncluded(
        !propertySearchPanelState.isClassIncluded,
      );
    };
    const toggleStringIncluded = (): void => {
      propertySearchPanelState.setStringIncluded(
        !propertySearchPanelState.isStringIncluded,
      );
    };
    const toggleBooleanIncluded = (): void => {
      propertySearchPanelState.setBooleanIncluded(
        !propertySearchPanelState.isBooleanIncluded,
      );
    };
    const toggleNumberIncluded = (): void => {
      propertySearchPanelState.setNumberIncluded(
        !propertySearchPanelState.isNumberIncluded,
      );
    };
    const toggleDateIncluded = (): void => {
      propertySearchPanelState.setDateIncluded(
        !propertySearchPanelState.isDateIncluded,
      );
    };
    const onlyClassIncluded = (): void => {
      propertySearchPanelState.setClassIncluded(true);
      propertySearchPanelState.setStringIncluded(false);
      propertySearchPanelState.setBooleanIncluded(false);
      propertySearchPanelState.setNumberIncluded(false);
      propertySearchPanelState.setDateIncluded(false);
    };
    const onlyStringIncluded = (): void => {
      propertySearchPanelState.setClassIncluded(false);
      propertySearchPanelState.setStringIncluded(true);
      propertySearchPanelState.setBooleanIncluded(false);
      propertySearchPanelState.setNumberIncluded(false);
      propertySearchPanelState.setDateIncluded(false);
    };
    const onlyBooleanIncluded = (): void => {
      propertySearchPanelState.setClassIncluded(false);
      propertySearchPanelState.setStringIncluded(false);
      propertySearchPanelState.setBooleanIncluded(true);
      propertySearchPanelState.setNumberIncluded(false);
      propertySearchPanelState.setDateIncluded(false);
    };
    const onlyNumberIncluded = (): void => {
      propertySearchPanelState.setClassIncluded(false);
      propertySearchPanelState.setStringIncluded(false);
      propertySearchPanelState.setBooleanIncluded(false);
      propertySearchPanelState.setNumberIncluded(true);
      propertySearchPanelState.setDateIncluded(false);
    };
    const onlyDateIncluded = (): void => {
      propertySearchPanelState.setClassIncluded(false);
      propertySearchPanelState.setStringIncluded(false);
      propertySearchPanelState.setBooleanIncluded(false);
      propertySearchPanelState.setNumberIncluded(false);
      propertySearchPanelState.setDateIncluded(true);
    };
    const searchProperty = (
      event: React.MouseEvent<HTMLButtonElement>,
    ): void => {
      if (explorerState.treeData) {
        setAnchorEl(event.currentTarget);
        propertySearchPanelState.setIsSearchPanelOpen(true);
        if (!propertySearchPanelState.allMappedPropertyNodes.length) {
          propertySearchPanelState.fetchAllPropertyNodes();
        }
      }
    };

    return (
      <>
        <button
          className="panel__header__action"
          onClick={searchProperty}
          tabIndex={-1}
          title="Search for property"
        >
          <SearchIcon />
        </button>
        <BasePopover
          open={propertySearchPanelState.isSearchPanelOpen}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
        >
          <div className="query-builder-property-search-panel">
            <div className="query-builder-property-search-panel__header">
              <input
                className={clsx(
                  'query-builder-property-search-panel__input input--dark',
                  {
                    'query-builder-property-search-panel__input--searching':
                      propertySearchPanelState.searchedPropertyName,
                  },
                )}
                onChange={changePropertyName}
                value={propertySearchPanelState.searchedPropertyName}
                placeholder="Search for a property"
              />
              {!propertySearchPanelState.searchedPropertyName ? (
                <div className="query-builder-property-search-panel__input__search__icon">
                  <SearchIcon />
                </div>
              ) : (
                <>
                  <div className="query-builder-property-search-panel__input__search__count">
                    {propertySearchPanelState.filteredPropertyNodes.length}
                  </div>
                  <button
                    className="query-builder-property-search-panel__input__clear-btn"
                    tabIndex={-1}
                    onClick={clearPropertyName}
                    title="Clear"
                  >
                    <TimesIcon />
                  </button>
                </>
              )}
            </div>
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel size={150}>
                <div className="query-builder-property-search-panel__form__section">
                  <div className="query-builder-property-search-panel__form__section__header__label">
                    One many rows
                  </div>
                  <div
                    className={clsx(
                      'query-builder-property-search-panel__form__section__toggler',
                      {
                        'query-builder-property-search-panel__form__section__toggler--disabled':
                          false,
                      },
                    )}
                  >
                    <button
                      className={clsx(
                        'query-builder-property-search-panel__form__section__toggler__btn',
                        {
                          'query-builder-property-search-panel__form__section__toggler__btn--toggled':
                            propertySearchPanelState.isOneManyRowsIncluded,
                        },
                      )}
                      onClick={toggleOneManyRowsIncluded}
                      tabIndex={-1}
                    >
                      {propertySearchPanelState.isOneManyRowsIncluded ? (
                        <CheckSquareIcon />
                      ) : (
                        <SquareIcon />
                      )}
                    </button>
                    <div className="query-builder-property-search-panel__form__section__toggler__prompt">
                      Included
                    </div>
                  </div>
                </div>
                <div className="query-builder-property-search-panel__form__section">
                  <div className="query-builder-property-search-panel__form__section__header__label">
                    Element types
                  </div>
                  <div className="query-builder-property-search-panel__filter__element">
                    <button
                      className={clsx(
                        'query-builder-property-search-panel__form__section__toggler__btn',
                        {
                          'query-builder-property-search-panel__form__section__toggler__btn--toggled':
                            propertySearchPanelState.isClassIncluded,
                        },
                      )}
                      onClick={toggleClassIncluded}
                      tabIndex={-1}
                    >
                      {propertySearchPanelState.isClassIncluded ? (
                        <CheckSquareIcon />
                      ) : (
                        <SquareIcon />
                      )}
                    </button>
                    <div className="query-builder-property-search-panel__form__section__toggler__prompt">
                      Class
                    </div>
                    <div
                      className="query-builder-property-search-panel__only__element"
                      onClick={onlyClassIncluded}
                    >
                      only
                    </div>
                  </div>
                  <div className="query-builder-property-search-panel__filter__element">
                    <button
                      className={clsx(
                        'query-builder-property-search-panel__form__section__toggler__btn',
                        {
                          'query-builder-property-search-panel__form__section__toggler__btn--toggled':
                            propertySearchPanelState.isStringIncluded,
                        },
                      )}
                      onClick={toggleStringIncluded}
                      tabIndex={-1}
                    >
                      {propertySearchPanelState.isStringIncluded ? (
                        <CheckSquareIcon />
                      ) : (
                        <SquareIcon />
                      )}
                    </button>
                    <div className="query-builder-property-search-panel__form__section__toggler__prompt">
                      String
                    </div>
                    <div
                      className="query-builder-property-search-panel__only__element"
                      onClick={onlyStringIncluded}
                    >
                      only
                    </div>
                  </div>
                  <div className="query-builder-property-search-panel__filter__element">
                    <button
                      className={clsx(
                        'query-builder-property-search-panel__form__section__toggler__btn',
                        {
                          'query-builder-property-search-panel__form__section__toggler__btn--toggled':
                            propertySearchPanelState.isBooleanIncluded,
                        },
                      )}
                      onClick={toggleBooleanIncluded}
                      tabIndex={-1}
                    >
                      {propertySearchPanelState.isBooleanIncluded ? (
                        <CheckSquareIcon />
                      ) : (
                        <SquareIcon />
                      )}
                    </button>
                    <div className="query-builder-property-search-panel__form__section__toggler__prompt">
                      Boolean
                    </div>
                    <div
                      className="query-builder-property-search-panel__only__element"
                      onClick={onlyBooleanIncluded}
                    >
                      only
                    </div>
                  </div>
                  <div className="query-builder-property-search-panel__filter__element">
                    <button
                      className={clsx(
                        'query-builder-property-search-panel__form__section__toggler__btn',
                        {
                          'query-builder-property-search-panel__form__section__toggler__btn--toggled':
                            propertySearchPanelState.isNumberIncluded,
                        },
                      )}
                      onClick={toggleNumberIncluded}
                      tabIndex={-1}
                    >
                      {propertySearchPanelState.isNumberIncluded ? (
                        <CheckSquareIcon />
                      ) : (
                        <SquareIcon />
                      )}
                    </button>
                    <div className="query-builder-property-search-panel__form__section__toggler__prompt">
                      Number
                    </div>
                    <div
                      className="query-builder-property-search-panel__only__element"
                      onClick={onlyNumberIncluded}
                    >
                      only
                    </div>
                  </div>
                  <div className="query-builder-property-search-panel__filter__element">
                    <button
                      className={clsx(
                        'query-builder-property-search-panel__form__section__toggler__btn',
                        {
                          'query-builder-property-search-panel__form__section__toggler__btn--toggled':
                            propertySearchPanelState.isDateIncluded,
                        },
                      )}
                      onClick={toggleDateIncluded}
                      tabIndex={-1}
                    >
                      {propertySearchPanelState.isDateIncluded ? (
                        <CheckSquareIcon />
                      ) : (
                        <SquareIcon />
                      )}
                    </button>
                    <div className="query-builder-property-search-panel__form__section__toggler__prompt">
                      Date
                    </div>
                    <div
                      className="query-builder-property-search-panel__only__element"
                      onClick={onlyDateIncluded}
                    >
                      only
                    </div>
                  </div>
                </div>
              </ResizablePanel>
              <ResizablePanelSplitter>
                <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
              </ResizablePanelSplitter>
              <ResizablePanel>
                <div className="query-builder-property-search-panel__content">
                  {propertySearchPanelState.filteredPropertyNodes.map(
                    (node) => (
                      <QueryBuilderTreeNodeViewer
                        key={node.id}
                        node={node}
                        queryBuilderState={queryBuilderState}
                        level={1}
                        stepPaddingInRem={0}
                        explorerState={queryBuilderState.explorerState}
                      />
                    ),
                  )}
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </BasePopover>
      </>
    );
  },
);

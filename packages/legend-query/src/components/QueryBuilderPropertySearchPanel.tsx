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
  TimesIcon,
  SearchIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@finos/legend-art';
import {
  Class,
  Enumeration,
  getAllClassProperties,
  getAllOwnClassProperties,
} from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useDrag } from 'react-dnd';
import { QUERY_BUILDER_PROPERTY_SEARCH_TYPE } from '../QueryBuilder_Const.js';
import {
  type QueryBuilderExplorerTreeNodeData,
  QueryBuilderExplorerTreePropertyNodeData,
  QueryBuilderExplorerTreeSubTypeNodeData,
  QUERY_BUILDER_EXPLORER_TREE_DND_TYPE,
  getQueryBuilderPropertyNodeData,
  type QueryBuilderExplorerState,
} from '../stores/QueryBuilderExplorerState.js';
import { prettyPropertyName } from '../stores/QueryBuilderPropertyEditorState.js';
import type { QueryBuilderState } from '../stores/QueryBuilderState.js';
import {
  QueryBuilderSubclassInfoTooltip,
  renderPropertyTypeIcon,
} from './QueryBuilderExplorerPanel.js';
import { QueryBuilderPropertyInfoTooltip } from './QueryBuilderPropertyInfoTooltip.js';
import { QUERY_BUILDER_TEST_ID } from './QueryBuilder_TestID.js';

const prettyPropertyNameFromNodeId = (name: string): string => {
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

const QueryBuilderTreeNodeViewer = observer(
  (props: {
    node: QueryBuilderExplorerTreeNodeData;
    queryBuilderState: QueryBuilderState;
    explorerState: QueryBuilderExplorerState;
    level: number;
    stepPaddingInRem: number;
  }) => {
    const { node, queryBuilderState, explorerState, level, stepPaddingInRem } =
      props;
    const [isExpandable, setIsExpandable] = useState(false);
    const propertySearchPanelState = explorerState.propertySearchPanelState;
    const [, dragConnector] = useDrag(
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
        end: (): void => {
          propertySearchPanelState.setIsSearchPanelOpen(true);
        },
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
              property,
              node,
              guaranteeNonNullable(
                queryBuilderState.querySetupState
                  .mappingModelCoverageAnalysisResult,
              ),
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
          draggable="true"
          onDrag={(): void =>
            propertySearchPanelState.setIsSearchPanelOpen(false)
          }
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
              : prettyPropertyNameFromNodeId(node.id)}
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
      propertySearchPanelState.setSearchText(event.target.value);
      propertySearchPanelState.refreshPropertyState();
      if (propertySearchPanelState.searchText.length >= 3) {
        propertySearchPanelState.fetchMappedPropertyNodes(
          propertySearchPanelState.searchText,
        );
      }
    };
    const clearPropertyName = (): void => {
      propertySearchPanelState.setSearchText('');
      propertySearchPanelState.refreshPropertyState();
    };
    const handleClose = (): void => {
      clearPropertyName();
      setAnchorEl(null);
      propertySearchPanelState.setIsSearchPanelOpen(false);
    };
    const toggleMultipleRowsIncluded = (): void => {
      propertySearchPanelState.setFilterByMultiple(
        !propertySearchPanelState.filterByMultiple,
      );
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
          <div
            data-testid={
              QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PROPERTY_SEARCH_PANEL
            }
            className="query-builder-property-search-panel"
          >
            <div className="query-builder-property-search-panel__header">
              <input
                className={clsx(
                  'query-builder-property-search-panel__input input--dark',
                  {
                    'query-builder-property-search-panel__input--searching':
                      propertySearchPanelState.searchText,
                  },
                )}
                onChange={changePropertyName}
                value={propertySearchPanelState.searchText}
                placeholder="Search for a property"
              />
              {!propertySearchPanelState.searchText ? (
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
            <div className="query-builder-property-search-panel__content">
              <ResizablePanelGroup orientation="vertical">
                <ResizablePanel size={150}>
                  <div className="query-builder-property-search-panel__content">
                    <div className="query-builder-property-search-panel__form__section">
                      <div className="query-builder-property-search-panel__form__section__header__label">
                        Multiple
                        <div
                          className="query-builder-property-search-panel__info__label"
                          title="Includes properties with multiplicity greater than one"
                        >
                          <InfoCircleIcon />
                        </div>
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
                                propertySearchPanelState.filterByMultiple,
                            },
                          )}
                          onClick={toggleMultipleRowsIncluded}
                          tabIndex={-1}
                        >
                          {propertySearchPanelState.filterByMultiple ? (
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
                                propertySearchPanelState.typeFilters.includes(
                                  QUERY_BUILDER_PROPERTY_SEARCH_TYPE.CLASS,
                                ),
                            },
                          )}
                          onClick={(): void => {
                            propertySearchPanelState.toggleTypeFilter(
                              QUERY_BUILDER_PROPERTY_SEARCH_TYPE.CLASS,
                            );
                          }}
                          tabIndex={-1}
                        >
                          {propertySearchPanelState.typeFilters.includes(
                            QUERY_BUILDER_PROPERTY_SEARCH_TYPE.CLASS,
                          ) ? (
                            <CheckSquareIcon />
                          ) : (
                            <SquareIcon />
                          )}
                        </button>
                        <div className="query-builder-property-search-panel__form__section__toggler__prompt">
                          Class
                        </div>
                      </div>
                      <div className="query-builder-property-search-panel__filter__element">
                        <button
                          className={clsx(
                            'query-builder-property-search-panel__form__section__toggler__btn',
                            {
                              'query-builder-property-search-panel__form__section__toggler__btn--toggled':
                                propertySearchPanelState.typeFilters.includes(
                                  QUERY_BUILDER_PROPERTY_SEARCH_TYPE.STRING,
                                ),
                            },
                          )}
                          onClick={(): void => {
                            propertySearchPanelState.toggleTypeFilter(
                              QUERY_BUILDER_PROPERTY_SEARCH_TYPE.STRING,
                            );
                          }}
                          tabIndex={-1}
                        >
                          {propertySearchPanelState.typeFilters.includes(
                            QUERY_BUILDER_PROPERTY_SEARCH_TYPE.STRING,
                          ) ? (
                            <CheckSquareIcon />
                          ) : (
                            <SquareIcon />
                          )}
                        </button>
                        <div className="query-builder-property-search-panel__form__section__toggler__prompt">
                          String
                        </div>
                      </div>
                      <div className="query-builder-property-search-panel__filter__element">
                        <button
                          className={clsx(
                            'query-builder-property-search-panel__form__section__toggler__btn',
                            {
                              'query-builder-property-search-panel__form__section__toggler__btn--toggled':
                                propertySearchPanelState.typeFilters.includes(
                                  QUERY_BUILDER_PROPERTY_SEARCH_TYPE.BOOLEAN,
                                ),
                            },
                          )}
                          onClick={(): void => {
                            propertySearchPanelState.toggleTypeFilter(
                              QUERY_BUILDER_PROPERTY_SEARCH_TYPE.BOOLEAN,
                            );
                          }}
                          tabIndex={-1}
                        >
                          {propertySearchPanelState.typeFilters.includes(
                            QUERY_BUILDER_PROPERTY_SEARCH_TYPE.BOOLEAN,
                          ) ? (
                            <CheckSquareIcon />
                          ) : (
                            <SquareIcon />
                          )}
                        </button>
                        <div className="query-builder-property-search-panel__form__section__toggler__prompt">
                          Boolean
                        </div>
                      </div>
                      <div className="query-builder-property-search-panel__filter__element">
                        <button
                          className={clsx(
                            'query-builder-property-search-panel__form__section__toggler__btn',
                            {
                              'query-builder-property-search-panel__form__section__toggler__btn--toggled':
                                propertySearchPanelState.typeFilters.includes(
                                  QUERY_BUILDER_PROPERTY_SEARCH_TYPE.NUMBER,
                                ),
                            },
                          )}
                          onClick={(): void => {
                            propertySearchPanelState.toggleTypeFilter(
                              QUERY_BUILDER_PROPERTY_SEARCH_TYPE.NUMBER,
                            );
                          }}
                          tabIndex={-1}
                        >
                          {propertySearchPanelState.typeFilters.includes(
                            QUERY_BUILDER_PROPERTY_SEARCH_TYPE.NUMBER,
                          ) ? (
                            <CheckSquareIcon />
                          ) : (
                            <SquareIcon />
                          )}
                        </button>
                        <div className="query-builder-property-search-panel__form__section__toggler__prompt">
                          Number
                        </div>
                      </div>
                      <div className="query-builder-property-search-panel__filter__element">
                        <button
                          className={clsx(
                            'query-builder-property-search-panel__form__section__toggler__btn',
                            {
                              'query-builder-property-search-panel__form__section__toggler__btn--toggled':
                                propertySearchPanelState.typeFilters.includes(
                                  QUERY_BUILDER_PROPERTY_SEARCH_TYPE.DATE,
                                ),
                            },
                          )}
                          onClick={(): void => {
                            propertySearchPanelState.toggleTypeFilter(
                              QUERY_BUILDER_PROPERTY_SEARCH_TYPE.DATE,
                            );
                          }}
                          tabIndex={-1}
                        >
                          {propertySearchPanelState.typeFilters.includes(
                            QUERY_BUILDER_PROPERTY_SEARCH_TYPE.DATE,
                          ) ? (
                            <CheckSquareIcon />
                          ) : (
                            <SquareIcon />
                          )}
                        </button>
                        <div className="query-builder-property-search-panel__form__section__toggler__prompt">
                          Date
                        </div>
                      </div>
                    </div>
                  </div>
                </ResizablePanel>
                <ResizablePanelSplitter>
                  <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
                </ResizablePanelSplitter>
                <ResizablePanel>
                  <div className="query-builder-property-search-panel__search__content">
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
          </div>
        </BasePopover>
      </>
    );
  },
);

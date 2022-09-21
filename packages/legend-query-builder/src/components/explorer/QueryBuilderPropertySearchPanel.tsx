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

import React, { useMemo, useRef, useState } from 'react';
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
  useDragPreviewLayer,
  PanelLoadingIndicator,
  BlankPanelContent,
  CogIcon,
  Panel,
  BaseRadioGroup,
  QuestionCircleIcon,
} from '@finos/legend-art';
import {
  Class,
  Enumeration,
  getAllClassProperties,
  getAllOwnClassProperties,
} from '@finos/legend-graph';
import { debounce, guaranteeNonNullable } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { useDrag } from 'react-dnd';
import {
  QUERY_BUILDER_PROPERTY_SEARCH_TEXT_MIN_LENGTH,
  QUERY_BUILDER_PROPERTY_SEARCH_TYPE,
  type SEARCH_MODE,
} from '../../stores/QueryBuilderConfig.js';
import {
  type QueryBuilderExplorerTreeNodeData,
  QueryBuilderExplorerTreePropertyNodeData,
  QueryBuilderExplorerTreeSubTypeNodeData,
  QUERY_BUILDER_EXPLORER_TREE_DND_TYPE,
  getQueryBuilderPropertyNodeData,
  type QueryBuilderExplorerState,
} from '../../stores/explorer/QueryBuilderExplorerState.js';
import { prettyPropertyName } from '../../stores/QueryBuilderPropertyEditorState.js';
import type { QueryBuilderState } from '../../stores/QueryBuilderState.js';
import {
  QueryBuilderSubclassInfoTooltip,
  renderPropertyTypeIcon,
} from './QueryBuilderExplorerPanel.js';
import { QueryBuilderPropertyInfoTooltip } from '../shared/QueryBuilderPropertyInfoTooltip.js';
import { QUERY_BUILDER_TEST_ID } from '../QueryBuilder_TestID.js';

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
    const propertySearchPanelState = explorerState.propertySearchState;
    const [, dragConnector, dragPreviewConnector] = useDrag<{
      node?: QueryBuilderExplorerTreePropertyNodeData;
    }>(
      () => ({
        type:
          node instanceof QueryBuilderExplorerTreePropertyNodeData
            ? node.type instanceof Enumeration
              ? QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.ENUM_PROPERTY
              : node.type instanceof Class
              ? QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.CLASS_PROPERTY
              : QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.PRIMITIVE_PROPERTY
            : QUERY_BUILDER_EXPLORER_TREE_DND_TYPE.ROOT,
        item: () =>
          node instanceof QueryBuilderExplorerTreePropertyNodeData
            ? { node }
            : {},
        collect: (monitor) => ({
          isDragging: monitor.isDragging(),
        }),
      }),
      [node],
    );
    useDragPreviewLayer(dragPreviewConnector);
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
                queryBuilderState.explorerState
                  .mappingModelCoverageAnalysisResult,
              ),
            );
            if (
              propertyTreeNodeData &&
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
    const parentNode = propertySearchPanelState.mappedPropertyNodes.find(
      (pn) =>
        node instanceof QueryBuilderExplorerTreePropertyNodeData &&
        node.parentId === pn.id,
    );

    return (
      <div>
        <div
          className="tree-view__node__container query-builder-property-search-panel__node__container"
          ref={dragConnector}
          style={{
            paddingLeft: `${(level - 1) * stepPaddingInRem + 0.5}rem`,
            display: 'flex',
          }}
          onClick={(): void => setIsExpandable(!isExpandable)}
          // Temporarily hide away the panel when we drag-and-drop the properties
          onDrag={(): void =>
            propertySearchPanelState.setIsSearchPanelHidden(true)
          }
          onDragEnd={(): void =>
            propertySearchPanelState.setIsSearchPanelHidden(false)
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
  (props: {
    queryBuilderState: QueryBuilderState;
    triggerElement: HTMLElement | null;
  }) => {
    const { queryBuilderState, triggerElement } = props;
    const explorerState = queryBuilderState.explorerState;
    const propertySearchPanelState = explorerState.propertySearchState;
    const hasHiddenResults =
      propertySearchPanelState.isOverSearchLimit &&
      propertySearchPanelState.filteredPropertyNodes.length !== 0;
    const searchInputRef = useRef<HTMLInputElement>(null);

    const handleEnter = (): void => searchInputRef.current?.focus();

    const debouncedSearch = useMemo(
      () => debounce(() => propertySearchPanelState.search(), 100),
      [propertySearchPanelState],
    );
    const onSearchPropertyTextChange: React.ChangeEventHandler<
      HTMLInputElement
    > = (event) => {
      propertySearchPanelState.setSearchText(event.target.value);
      debouncedSearch();
    };

    const clearSearchPropertyName = (): void => {
      propertySearchPanelState.setSearchText('');
      propertySearchPanelState.resetPropertyState();
    };

    const handleSearchMode = (
      event: React.ChangeEvent<HTMLInputElement>,
    ): void => {
      const searchMode = (event.target as HTMLInputElement)
        .value as SEARCH_MODE;
      propertySearchPanelState.changeModeOfSearch(searchMode);
      propertySearchPanelState.resetPropertyState();
      propertySearchPanelState.fetchMappedPropertyNodes(
        propertySearchPanelState.searchText,
      );
    };

    const handleClose = (): void => {
      clearSearchPropertyName();
      propertySearchPanelState.setIsSearchPanelOpen(false);
    };

    const getDocumentationToImplementSvp = (): void => {
      queryBuilderState.applicationStore.assistantService.setIsOpen(true);
      queryBuilderState.applicationStore.assistantService.setIsSearchPanelTipsOpen(
        false,
      );
      queryBuilderState.applicationStore.assistantService.setSearchText(
        '="How do I use search?"',
      );
      queryBuilderState.applicationStore.assistantService.search();
    };

    const toggleIsMultiple = (): void => {
      propertySearchPanelState.setFilterByMultiple(
        !propertySearchPanelState.filterByMultiple,
      );
    };

    const toggleSearchPanelTip = (): void => {
      propertySearchPanelState.setIsSearchPanelTipsOpen(
        !propertySearchPanelState.isSearchPanelTipsOpen,
      );
    };

    const searchModeRef = useRef<HTMLInputElement>(null);

    return (
      <BasePopover
        open={propertySearchPanelState.isSearchPanelOpen}
        // we need to get rid of the backdrop and the click-away trap
        // to make this popover behave like a popper
        // NOTE: we will cancel the effect of click-away trap using CSS
        hideBackdrop={true}
        PaperProps={{
          classes: {
            root: 'query-builder-property-search-panel__container__root',
          },
        }}
        className={clsx('query-builder-property-search-panel__container', {
          'query-builder-property-search-panel__container--hidden':
            propertySearchPanelState.isSearchPanelHidden,
        })}
        anchorEl={triggerElement}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        TransitionProps={{ onEnter: handleEnter }}
      >
        <div
          data-testid={
            QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PROPERTY_SEARCH_PANEL
          }
          className="query-builder-property-search-panel"
        >
          <div className="query-builder-property-search-panel__header">
            <div className="query-builder-property-search-panel__input__container">
              <input
                ref={searchInputRef}
                className={clsx(
                  'query-builder-property-search-panel__input input--dark',
                  {
                    'query-builder-property-search-panel__input--searching':
                      propertySearchPanelState.searchText,
                  },
                )}
                onChange={onSearchPropertyTextChange}
                value={propertySearchPanelState.searchText}
                placeholder={`Search for a property (min ${QUERY_BUILDER_PROPERTY_SEARCH_TEXT_MIN_LENGTH.toString()} chars)`}
              />
              {!propertySearchPanelState.searchText ? (
                <>
                  <button
                    className="query-builder-property-search-panel__input__cog__icon"
                    tabIndex={-1}
                    onClick={toggleSearchPanelTip}
                    title="View tips for searching"
                  >
                    <CogIcon />
                  </button>
                  <div className="query-builder-property-search-panel__input__search__icon">
                    <SearchIcon />
                  </div>
                </>
              ) : (
                <>
                  {propertySearchPanelState.searchText.length >= 3 && (
                    <div className="query-builder-property-search-panel__input__search__count">
                      {propertySearchPanelState.filteredPropertyNodes.length +
                        (hasHiddenResults ? '+' : '')}
                    </div>
                  )}
                  <button
                    className="query-builder-property-search-panel__input__cog__icon"
                    tabIndex={-1}
                    onClick={toggleSearchPanelTip}
                    title="View tips for searching"
                  >
                    <CogIcon />
                  </button>
                  <button
                    className="query-builder-property-search-panel__input__clear-btn"
                    tabIndex={-1}
                    onClick={clearSearchPropertyName}
                    title="Clear"
                  >
                    <TimesIcon />
                  </button>
                </>
              )}
            </div>
            <button
              className="btn btn--dark query-builder-property-search-panel__close-btn"
              tabIndex={-1}
              title="Close"
              onClick={handleClose}
            >
              <TimesIcon />
            </button>
          </div>
          <div className="query-builder-property-search-panel__content">
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel size={150}>
                <div className="query-builder-property-search-panel__config">
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
                        onClick={toggleIsMultiple}
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
                <div ref={searchModeRef}></div>
                <BasePopover
                  open={Boolean(propertySearchPanelState.isSearchPanelTipsOpen)}
                  anchorEl={searchModeRef.current}
                  onClose={() =>
                    propertySearchPanelState.setIsSearchPanelTipsOpen(false)
                  }
                  anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                >
                  <Panel>
                    <div className="query-builder-property-search-panel__search__mode">
                      <div className="query-builder-property-search-panel__form__section__header__label">
                        Search Mode
                        <button
                          className="virtual-assistant__search__question__icon"
                          tabIndex={-1}
                          onClick={getDocumentationToImplementSvp}
                        >
                          <QuestionCircleIcon />
                        </button>
                      </div>
                      <BaseRadioGroup
                        className="query-builder-property-search-panel__search__mode--radio-group"
                        value={propertySearchPanelState.modeOfSearch}
                        onChange={handleSearchMode}
                        row={false}
                        options={propertySearchPanelState.modeOfSearchOptions}
                        size={1}
                      />
                    </div>
                  </Panel>
                </BasePopover>
                {propertySearchPanelState.searchState.isInProgress && (
                  <PanelLoadingIndicator isLoading={true} />
                )}
                <div className="query-builder-property-search-panel__results">
                  {!propertySearchPanelState.searchState.isInProgress && (
                    <>
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
                    </>
                  )}
                  {propertySearchPanelState.searchState.isInProgress && (
                    <BlankPanelContent>
                      Loading property searches...
                    </BlankPanelContent>
                  )}
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>
      </BasePopover>
    );
  },
);

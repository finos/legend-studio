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

import { useMemo, useRef, useState } from 'react';
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
  useDragPreviewLayer,
  PanelLoadingIndicator,
  BlankPanelContent,
  CogIcon,
  Checkbox,
} from '@finos/legend-art';
import {
  Class,
  Enumeration,
  getAllClassProperties,
  getAllOwnClassProperties,
} from '@finos/legend-graph';
import {
  debounce,
  guaranteeNonNullable,
  prettyCONSTName,
} from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { useDrag } from 'react-dnd';
import { QUERY_BUILDER_PROPERTY_SEARCH_TYPE } from '../../stores/QueryBuilderConfig.js';
import {
  type QueryBuilderExplorerTreeNodeData,
  QueryBuilderExplorerTreePropertyNodeData,
  QueryBuilderExplorerTreeSubTypeNodeData,
  QUERY_BUILDER_EXPLORER_TREE_DND_TYPE,
  getQueryBuilderPropertyNodeData,
  type QueryBuilderExplorerState,
} from '../../stores/explorer/QueryBuilderExplorerState.js';
import type { QueryBuilderState } from '../../stores/QueryBuilderState.js';
import {
  QueryBuilderSubclassInfoTooltip,
  renderPropertyTypeIcon,
} from './QueryBuilderExplorerPanel.js';
import { QueryBuilderPropertyInfoTooltip } from '../shared/QueryBuilderPropertyInfoTooltip.js';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import { FuzzySearchAdvancedConfigMenu } from '@finos/legend-lego/application';

const prettyPropertyNameFromNodeId = (name: string): string => {
  let propNameArray = name.split('.');
  propNameArray = propNameArray.map(prettyCONSTName);
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
    .map((p) => prettyCONSTName(p));
  let propName = '';
  propNameArray.slice(0, -1).forEach((p) => {
    propName = `${propName}(@${p})/`;
  });
  propNameArray = guaranteeNonNullable(
    propNameArray[propNameArray.length - 1],
  ).split('.');
  propNameArray = propNameArray.map((p) => prettyCONSTName(p));
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
    .map((p) => prettyCONSTName(p));
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
    const propertySearchState = explorerState.propertySearchState;
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
    const parentNode = propertySearchState.indexedExplorerTreeNodes.find(
      (pn) =>
        node instanceof QueryBuilderExplorerTreePropertyNodeData &&
        node.parentId === pn.id,
    );
    const propertyName =
      parentNode instanceof QueryBuilderExplorerTreeSubTypeNodeData
        ? prettyPropertyNameForSubType(node.id)
        : node instanceof QueryBuilderExplorerTreeSubTypeNodeData
          ? prettyPropertyNameForSubTypeClass(node.id)
          : prettyPropertyNameFromNodeId(node.id);

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
          onDrag={(): void => propertySearchState.setIsSearchPanelHidden(true)}
          onDragEnd={(): void =>
            propertySearchState.setIsSearchPanelHidden(false)
          }
        >
          <div className="tree-view__node__icon query-builder-property-search-panel__node__icon">
            <div className="query-builder-property-search-panel__type-icon">
              {renderPropertyTypeIcon(node.type)}
            </div>
          </div>
          <div className="tree-view__node__label query-builder-property-search-panel__node__label query-builder-property-search-panel__node__label--with-action">
            {propertyName}
          </div>
          <div className="query-builder-property-search-panel__node__actions">
            {node instanceof QueryBuilderExplorerTreePropertyNodeData && (
              <QueryBuilderPropertyInfoTooltip
                title={propertyName}
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

const QueryBuilderPropertySearchAdditionalConfigMenu = observer(
  (props: {
    includeTaggedValues: boolean;
    handleToggleIncludeTaggedValues: () => void;
  }) => {
    const { includeTaggedValues, handleToggleIncludeTaggedValues } = props;
    return (
      <div className="query-builder-property-search-panel__config__tagged-values">
        <Checkbox
          checked={includeTaggedValues}
          disableRipple={true}
          classes={{
            root: 'query-builder-property-search-panel__config__tagged-values__checkbox',
          }}
          onChange={handleToggleIncludeTaggedValues}
        />
        <button
          className="query-builder-property-search-panel__config__tagged-values__label"
          onClick={handleToggleIncludeTaggedValues}
          tabIndex={-1}
        >
          Include tagged values
        </button>
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
    const propertySearchState = explorerState.propertySearchState;
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchConfigTriggerRef = useRef<HTMLButtonElement>(null);

    // search text
    const debouncedSearchProperty = useMemo(
      () => debounce(() => propertySearchState.search(), 100),
      [propertySearchState],
    );
    const onSearchPropertyTextChange: React.ChangeEventHandler<
      HTMLInputElement
    > = (event) => {
      propertySearchState.setSearchText(event.target.value);
      debouncedSearchProperty();
    };

    // search actions
    const clearSearch = (): void => {
      propertySearchState.resetSearch();
    };
    const toggleSearchConfigMenu = (): void =>
      propertySearchState.setShowSearchConfigurationMenu(
        !propertySearchState.showSearchConfigurationMenu,
      );
    const closeSearchConfigMenu = (): void =>
      propertySearchState.setShowSearchConfigurationMenu(false);

    // life-cycle
    const handleEnter = (): void => searchInputRef.current?.focus();
    const handleClose = (): void => {
      clearSearch();
      propertySearchState.setIsSearchPanelOpen(false);
    };

    return (
      <BasePopover
        open={propertySearchState.isSearchPanelOpen}
        PaperProps={{
          classes: {
            root: 'query-builder-property-search-panel__container__root',
          },
        }}
        className={clsx('query-builder-property-search-panel__container', {
          'query-builder-property-search-panel__container--hidden':
            propertySearchState.isSearchPanelHidden,
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
                      propertySearchState.searchText,
                  },
                )}
                spellCheck={false}
                onChange={onSearchPropertyTextChange}
                value={propertySearchState.searchText}
                placeholder="Search for a property by name or documentation"
              />
              {propertySearchState.searchText && (
                <div className="query-builder-property-search-panel__input__search__count">
                  {propertySearchState.filteredSearchResults.length +
                    (propertySearchState.isOverSearchLimit &&
                    propertySearchState.filteredSearchResults.length !== 0
                      ? '+'
                      : '')}
                </div>
              )}
              <button
                ref={searchConfigTriggerRef}
                className={clsx(
                  'query-builder-property-search-panel__input__search__config__trigger',
                  {
                    'query-builder-property-search-panel__input__search__config__trigger--toggled':
                      propertySearchState.showSearchConfigurationMenu,
                    'query-builder-property-search-panel__input__search__config__trigger--active':
                      propertySearchState.searchConfigurationState
                        .isAdvancedSearchActive,
                  },
                )}
                tabIndex={-1}
                onClick={toggleSearchConfigMenu}
                title="Click to toggle search config menu"
              >
                <CogIcon />
              </button>
              <BasePopover
                open={Boolean(propertySearchState.showSearchConfigurationMenu)}
                TransitionProps={{
                  onEnter: handleEnter,
                }}
                anchorEl={searchConfigTriggerRef.current}
                onClose={closeSearchConfigMenu}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'center',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'center',
                }}
              >
                <FuzzySearchAdvancedConfigMenu
                  configState={propertySearchState.searchConfigurationState}
                  additionalMenuItems={
                    <QueryBuilderPropertySearchAdditionalConfigMenu
                      includeTaggedValues={
                        propertySearchState.searchConfigurationState
                          .includeTaggedValues
                      }
                      handleToggleIncludeTaggedValues={() => {
                        propertySearchState.searchConfigurationState.setIncludeTaggedValues(
                          !propertySearchState.searchConfigurationState
                            .includeTaggedValues,
                        );
                        propertySearchState.initialize();
                        propertySearchState.search();
                      }}
                    />
                  }
                />
              </BasePopover>
              {!propertySearchState.searchText ? (
                <>
                  <div className="query-builder-property-search-panel__input__search__icon">
                    <SearchIcon />
                  </div>
                </>
              ) : (
                <button
                  className="query-builder-property-search-panel__input__clear-btn"
                  tabIndex={-1}
                  onClick={clearSearch}
                  title="Clear"
                >
                  <TimesIcon />
                </button>
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
                      By type
                    </div>
                    <div className="query-builder-property-search-panel__filter__element">
                      <button
                        className={clsx(
                          'query-builder-property-search-panel__form__section__toggler__btn',
                          {
                            'query-builder-property-search-panel__form__section__toggler__btn--toggled':
                              propertySearchState.typeFilters.includes(
                                QUERY_BUILDER_PROPERTY_SEARCH_TYPE.CLASS,
                              ),
                          },
                        )}
                        onClick={(): void => {
                          propertySearchState.toggleFilterForType(
                            QUERY_BUILDER_PROPERTY_SEARCH_TYPE.CLASS,
                          );
                        }}
                        tabIndex={-1}
                      >
                        {propertySearchState.typeFilters.includes(
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
                              propertySearchState.typeFilters.includes(
                                QUERY_BUILDER_PROPERTY_SEARCH_TYPE.STRING,
                              ),
                          },
                        )}
                        onClick={(): void => {
                          propertySearchState.toggleFilterForType(
                            QUERY_BUILDER_PROPERTY_SEARCH_TYPE.STRING,
                          );
                        }}
                        tabIndex={-1}
                      >
                        {propertySearchState.typeFilters.includes(
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
                              propertySearchState.typeFilters.includes(
                                QUERY_BUILDER_PROPERTY_SEARCH_TYPE.BOOLEAN,
                              ),
                          },
                        )}
                        onClick={(): void => {
                          propertySearchState.toggleFilterForType(
                            QUERY_BUILDER_PROPERTY_SEARCH_TYPE.BOOLEAN,
                          );
                        }}
                        tabIndex={-1}
                      >
                        {propertySearchState.typeFilters.includes(
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
                              propertySearchState.typeFilters.includes(
                                QUERY_BUILDER_PROPERTY_SEARCH_TYPE.NUMBER,
                              ),
                          },
                        )}
                        onClick={(): void => {
                          propertySearchState.toggleFilterForType(
                            QUERY_BUILDER_PROPERTY_SEARCH_TYPE.NUMBER,
                          );
                        }}
                        tabIndex={-1}
                      >
                        {propertySearchState.typeFilters.includes(
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
                              propertySearchState.typeFilters.includes(
                                QUERY_BUILDER_PROPERTY_SEARCH_TYPE.DATE,
                              ),
                          },
                        )}
                        onClick={(): void => {
                          propertySearchState.toggleFilterForType(
                            QUERY_BUILDER_PROPERTY_SEARCH_TYPE.DATE,
                          );
                        }}
                        tabIndex={-1}
                      >
                        {propertySearchState.typeFilters.includes(
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
                {propertySearchState.searchState.isInProgress && (
                  <PanelLoadingIndicator isLoading={true} />
                )}
                <div className="query-builder-property-search-panel__results">
                  {!propertySearchState.searchState.isInProgress && (
                    <>
                      {Boolean(
                        propertySearchState.filteredSearchResults.length,
                      ) &&
                        propertySearchState.filteredSearchResults.map(
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
                      {!propertySearchState.filteredSearchResults.length &&
                        propertySearchState.searchText && (
                          <BlankPanelContent>
                            <div className="query-builder-property-search-panel__result-placeholder__text">
                              No result
                            </div>
                            <div className="query-builder-property-search-panel__result-placeholder__tips">
                              Tips: Navigate deeper into the explorer tree to
                              improve the scope and accuracy of the search
                            </div>
                          </BlankPanelContent>
                        )}
                    </>
                  )}
                  {propertySearchState.searchState.isInProgress && (
                    <BlankPanelContent>Searching...</BlankPanelContent>
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

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

import { useState } from 'react';
import {
  clsx,
  CheckSquareIcon,
  SquareIcon,
  BasePopover,
  InfoCircleIcon,
  useDragPreviewLayer,
  PanelLoadingIndicator,
  BlankPanelContent,
  ChevronDownIcon,
  ChevronRightIcon,
  ShareBoxIcon,
  Tooltip,
  BaseRadioGroup,
} from '@finos/legend-art';
import {
  CORE_PURE_PATH,
  Class,
  Enumeration,
  PURE_DOC_TAG,
  getAllClassProperties,
  getAllOwnClassProperties,
} from '@finos/legend-graph';
import {
  ADVANCED_FUZZY_SEARCH_MODE,
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
import { DocumentationLink } from '@finos/legend-lego/application';
import { LEGEND_APPLICATION_DOCUMENTATION_KEY } from '@finos/legend-application';

export const prettyPropertyNameFromNodeId = (name: string): string => {
  let propNameArray = name.split('.');
  propNameArray = propNameArray.map(prettyCONSTName);
  let propName = '';
  propNameArray.forEach((p) => {
    propName = `${propName + p}/`;
  });
  propName = propName.slice(0, -1);
  return propName;
};

export const prettyPropertyNameForSubType = (name: string): string => {
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

export const prettyPropertyNameForSubTypeClass = (name: string): string => {
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

const formatTextWithHighlightedMatches = (
  displayText: string,
  searchText: string,
  className: string,
): React.ReactNode => {
  // Get ranges to highlight
  const highlightRanges: [number, number][] = [];
  searchText
    .split(' ')
    .filter((word) => word.trim().length > 0)
    .forEach((word) => {
      const regex = new RegExp(word, 'gi');
      let match;
      while ((match = regex.exec(displayText))) {
        highlightRanges.push([match.index, match.index + word.length]);
      }
    });

  // Combine any overlapping highlight ranges
  const combinedHighlightRanges: [number, number][] = [];
  highlightRanges.sort((a, b) => a[0] - b[0]);
  highlightRanges.forEach((range) => {
    if (!combinedHighlightRanges.length) {
      combinedHighlightRanges.push(range);
    } else {
      const lastRange =
        combinedHighlightRanges[combinedHighlightRanges.length - 1];
      if (lastRange !== undefined && range[0] <= lastRange[1]) {
        lastRange[1] = Math.max(lastRange[1], range[1]);
      } else {
        combinedHighlightRanges.push(range);
      }
    }
  });

  // Return the property name if there are no highlight ranges
  if (!combinedHighlightRanges.length) {
    return <>{displayText}</>;
  }

  // Create formatted node
  const formattedNode: React.ReactNode[] = [];
  formattedNode.push(
    <>{displayText.substring(0, combinedHighlightRanges[0]![0])}</>,
  );
  combinedHighlightRanges.forEach((range, index) => {
    formattedNode.push(
      <span className={`${className} ${className}--highlight`}>
        {displayText.substring(range[0], range[1])}
      </span>,
    );
    if (
      index < combinedHighlightRanges.length - 1 &&
      range[1] < displayText.length
    ) {
      formattedNode.push(
        <>
          {displayText.substring(
            range[1],
            combinedHighlightRanges[index + 1]![0],
          )}
        </>,
      );
    }
  });
  if (
    combinedHighlightRanges[combinedHighlightRanges.length - 1]![1] <
    displayText.length
  ) {
    formattedNode.push(
      <>
        {displayText.substring(
          combinedHighlightRanges[combinedHighlightRanges.length - 1]![1],
        )}
      </>,
    );
  }
  return formattedNode;
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
    const isExpandable = Boolean(node.childrenIds.length);
    const [isExpanded, setIsExpanded] = useState(false);
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

    const handleHighlightNode = (): void => {
      explorerState.propertySearchState.setIsSearchPanelOpen(false);
      explorerState.propertySearchState.resetSearch();
      explorerState.highlightTreeNode(node.id);
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

    const nodeExpandIcon = isExpandable ? (
      isExpanded ? (
        <ChevronDownIcon />
      ) : (
        <ChevronRightIcon />
      )
    ) : (
      <div />
    );

    const docText: string | null =
      node instanceof QueryBuilderExplorerTreePropertyNodeData
        ? (node.property.taggedValues.find(
            (taggedValue) =>
              taggedValue.tag.ownerReference.value.path ===
                CORE_PURE_PATH.PROFILE_DOC &&
              taggedValue.tag.value.value === PURE_DOC_TAG,
          )?.value ?? null)
        : null;
    const formattedDocText =
      docText !== null
        ? formatTextWithHighlightedMatches(
            docText,
            propertySearchState.searchText,
            'query-builder-property-search-panel__node__doc',
          )
        : null;

    return (
      <>
        <div
          className="tree-view__node__container query-builder-property-search-panel__node__container"
          ref={dragConnector}
          style={{
            paddingLeft: `${(level - 1) * stepPaddingInRem + 0.5}rem`,
            display: 'flex',
          }}
          onClick={(): void => setIsExpanded(!isExpanded)}
          // Temporarily hide away the panel when we drag-and-drop the properties
          onDrag={(): void => propertySearchState.setIsSearchPanelHidden(true)}
          onDragEnd={(): void =>
            propertySearchState.setIsSearchPanelHidden(false)
          }
        >
          <div className="tree-view__node__icon query-builder-property-search-panel__node__icon">
            <div className="query-builder-property-search-panel__expand-icon">
              {nodeExpandIcon}
            </div>
            <div className="query-builder-property-search-panel__type-icon">
              {renderPropertyTypeIcon(node.type)}
            </div>
          </div>
          <div className="query-builder-property-search-panel__node__content">
            <div className="tree-view__node__label query-builder-property-search-panel__node__label">
              {formatTextWithHighlightedMatches(
                propertyName,
                propertySearchState.searchText,
                'query-builder-property-search-panel__node__label',
              )}
            </div>
            <div className="tree-view__node__label query-builder-property-search-panel__node__doc">
              {formattedDocText}
            </div>
          </div>
          <div className="query-builder-property-search-panel__node__actions">
            {node instanceof QueryBuilderExplorerTreePropertyNodeData && (
              <>
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
                <button
                  onClick={handleHighlightNode}
                  title="Show in tree"
                  className="query-builder-property-search-panel__node__action query-builder-property-search-panel__node__highlight"
                >
                  <ShareBoxIcon />
                </button>
              </>
            )}
            {node instanceof QueryBuilderExplorerTreeSubTypeNodeData && (
              <>
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
                <button
                  onClick={handleHighlightNode}
                  title="Show in tree"
                  className="query-builder-property-search-panel__node__action query-builder-property-search-panel__node__highlight"
                >
                  <ShareBoxIcon />
                </button>
              </>
            )}
          </div>
        </div>
        {isExpanded &&
          getChildrenNodes().map((childNode) => (
            <QueryBuilderTreeNodeViewer
              key={`${node.id}>${childNode.id}`}
              node={childNode}
              queryBuilderState={queryBuilderState}
              level={level + 1}
              stepPaddingInRem={2}
              explorerState={queryBuilderState.explorerState}
            />
          ))}
      </>
    );
  },
);

export const QueryBuilderPropertySearchPanel = observer(
  (props: {
    queryBuilderState: QueryBuilderState;
    triggerElement: HTMLElement | null;
    clearSearch: () => void;
  }) => {
    const { queryBuilderState, triggerElement, clearSearch } = props;
    const explorerState = queryBuilderState.explorerState;
    const propertySearchState = explorerState.propertySearchState;

    const handleClose = (): void => {
      clearSearch();
      propertySearchState.setIsSearchPanelOpen(false);
    };

    const handleSearchMode: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ): void => {
      const searchMode = event.target.value as ADVANCED_FUZZY_SEARCH_MODE;
      propertySearchState.searchConfigurationState.setCurrentMode(searchMode);
    };

    const handleToggleIncludeTaggedValues = () => {
      propertySearchState.searchConfigurationState.setIncludeTaggedValues(
        !propertySearchState.searchConfigurationState.includeTaggedValues,
      );
      propertySearchState.initialize();
      propertySearchState.search();
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
        disableAutoFocus={true}
        disableEnforceFocus={true}
        anchorOrigin={{
          vertical: 40,
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
          <div className="query-builder-property-search-panel__content">
            <div className="query-builder-property-search-panel__config">
              <div className="query-builder-property-search-panel__form__section">
                <div className="query-builder-property-search-panel__form__section__header__label">
                  Search Mode
                  <DocumentationLink
                    documentationKey={
                      LEGEND_APPLICATION_DOCUMENTATION_KEY.QUESTION_HOW_TO_USE_ADVANCED_SEARCH_SYNTAX
                    }
                  />
                </div>
                <div className="query-builder-property-search-panel__filter__element">
                  <BaseRadioGroup
                    className="query-builder-property-search-panel__search-mode__options"
                    value={
                      propertySearchState.searchConfigurationState.currentMode
                    }
                    onChange={handleSearchMode}
                    row={false}
                    options={[
                      ADVANCED_FUZZY_SEARCH_MODE.STANDARD,
                      ADVANCED_FUZZY_SEARCH_MODE.INCLUDE,
                      ADVANCED_FUZZY_SEARCH_MODE.EXACT,
                      ADVANCED_FUZZY_SEARCH_MODE.INVERSE,
                    ]}
                    size={1}
                  />
                </div>
              </div>
              <div className="query-builder-property-search-panel__form__section">
                <div className="query-builder-property-search-panel__form__section__header__label">
                  Tagged Values
                  <Tooltip
                    TransitionProps={{
                      timeout: 0,
                    }}
                    title={
                      <div>
                        Include &quot;doc&quot; type tagged values in search
                        results
                      </div>
                    }
                  >
                    <div className="query-builder-property-search-panel__tagged-values__tooltip">
                      <InfoCircleIcon />
                    </div>
                  </Tooltip>
                </div>
                <div className="query-builder-property-search-panel__filter__element">
                  <button
                    className={clsx(
                      'query-builder-property-search-panel__form__section__toggler__btn',
                      {
                        'query-builder-property-search-panel__form__section__toggler__btn--toggled':
                          propertySearchState.searchConfigurationState
                            .includeTaggedValues,
                      },
                    )}
                    onClick={handleToggleIncludeTaggedValues}
                    tabIndex={-1}
                  >
                    {propertySearchState.searchConfigurationState
                      .includeTaggedValues ? (
                      <CheckSquareIcon />
                    ) : (
                      <SquareIcon />
                    )}
                  </button>
                  <div className="query-builder-property-search-panel__form__section__toggler__prompt">
                    Include
                  </div>
                </div>
              </div>
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
            <div className="query-builder-property-search-panel__results__container">
              <div className="query-builder-property-search-panel__results__content">
                {propertySearchState.searchState.isInProgress && (
                  <PanelLoadingIndicator isLoading={true} />
                )}
                {!propertySearchState.searchState.isInProgress && (
                  <>
                    {Boolean(
                      propertySearchState.filteredSearchResults.length,
                    ) &&
                      propertySearchState.filteredSearchResults.map((node) => (
                        <QueryBuilderTreeNodeViewer
                          key={node.id}
                          node={node}
                          queryBuilderState={queryBuilderState}
                          level={1}
                          stepPaddingInRem={0}
                          explorerState={queryBuilderState.explorerState}
                        />
                      ))}
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
            </div>
          </div>
        </div>
      </BasePopover>
    );
  },
);

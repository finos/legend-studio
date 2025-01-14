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

import { useRef, useState } from 'react';
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
  useDragPreviewLayer,
  PanelLoadingIndicator,
  BlankPanelContent,
  ChevronDownIcon,
  ChevronRightIcon,
  ShareBoxIcon,
  Tooltip,
  BaseRadioGroup,
  ClickAwayListener,
} from '@finos/legend-art';
import {
  CORE_PURE_PATH,
  Class,
  ELEMENT_PATH_DELIMITER,
  Enumeration,
  PROPERTY_ACCESSOR,
  PURE_DOC_TAG,
  TYPE_CAST_TOKEN,
  getAllClassProperties,
  getAllOwnClassProperties,
} from '@finos/legend-graph';
import {
  ADVANCED_FUZZY_SEARCH_MODE,
  at,
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
  QUERY_BUILDER_EXPLORER_SEARCH_INPUT_NAME,
  QueryBuilderSubclassInfoTooltip,
  renderPropertyTypeIcon,
} from './QueryBuilderExplorerPanel.js';
import { QueryBuilderPropertyInfoTooltip } from '../shared/QueryBuilderPropertyInfoTooltip.js';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import { DocumentationLink } from '@finos/legend-lego/application';
import { LEGEND_APPLICATION_DOCUMENTATION_KEY } from '@finos/legend-application';

export const prettyPropertyNameFromNodeId = (
  name: string,
  spaceBetweenSlash?: boolean,
): string =>
  name
    .split(TYPE_CAST_TOKEN)
    .map((p) =>
      p.replace(new RegExp(String.raw`.*${ELEMENT_PATH_DELIMITER}`), ''),
    )
    .filter((p) => p !== '')
    .map((p) =>
      p
        .split(PROPERTY_ACCESSOR)
        .map(prettyCONSTName)
        .join(spaceBetweenSlash ? ' / ' : '/'),
    )
    .join(TYPE_CAST_TOKEN);

export const prettyPropertyNameForSubType = (
  name: string,
  spaceBetweenSlash?: boolean,
): string => {
  let propNameArray = name.split(TYPE_CAST_TOKEN);
  propNameArray = propNameArray
    .map((p) =>
      p.replace(new RegExp(String.raw`.*${ELEMENT_PATH_DELIMITER}`), ''),
    )
    .filter((p) => p !== '');
  let propName = propNameArray
    .slice(0, -1)
    .map(
      (p) =>
        `(${TYPE_CAST_TOKEN}${p
          .split(PROPERTY_ACCESSOR)
          .map((sp) => prettyCONSTName(sp))
          .join(spaceBetweenSlash ? ' / ' : '/')})`,
    )
    .join(spaceBetweenSlash ? ' / ' : '/');
  propName += spaceBetweenSlash ? ' / ' : '/';
  propNameArray = guaranteeNonNullable(
    propNameArray[propNameArray.length - 1],
  ).split(PROPERTY_ACCESSOR);
  propNameArray = propNameArray.map((p) => prettyCONSTName(p));
  propName = `${propName}(${TYPE_CAST_TOKEN}${propNameArray[0]})${spaceBetweenSlash ? ' / ' : '/'}`;
  propNameArray.slice(1).forEach((p) => {
    propName = `${propName + p}${spaceBetweenSlash ? ' / ' : '/'}`;
  });
  propName = propName.slice(0, spaceBetweenSlash ? -3 : -1);
  return propName;
};

export const formatTextWithHighlightedMatches = (
  displayText: string,
  searchText: string,
  className: string,
  id: string,
): React.ReactNode => {
  // Get ranges to highlight
  const highlightRanges: [number, number][] = [];
  searchText
    .split(/\/| /)
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
    return <span>{displayText}</span>;
  }

  // Create formatted node
  const formattedNode: React.ReactNode[] = [];
  const highlightRange = at(combinedHighlightRanges, 0)[0];
  if (highlightRange > 0) {
    formattedNode.push(
      <span key={`${id}-0-${displayText.substring(0, highlightRange)}`}>
        {displayText.substring(0, highlightRange)}
      </span>,
    );
  }

  combinedHighlightRanges.forEach((range, index) => {
    formattedNode.push(
      <span
        key={`${id}-${index * 2}-${displayText.substring(range[0], range[1])}`}
        className={`${className}--highlight`}
      >
        {displayText.substring(range[0], range[1])}
      </span>,
    );
    if (
      index < combinedHighlightRanges.length - 1 &&
      range[1] < displayText.length
    ) {
      const highlightRange2 = at(combinedHighlightRanges, index + 1)[0];
      formattedNode.push(
        <span
          key={`${id}-${index * 2 + 1}--${displayText.substring(
            range[1],
            highlightRange2,
          )}`}
        >
          {displayText.substring(range[1], highlightRange2)}
        </span>,
      );
    }
  });

  const highlightRange3 = at(
    combinedHighlightRanges,
    combinedHighlightRanges.length - 1,
  )[1];
  if (highlightRange3 < displayText.length) {
    formattedNode.push(
      <span
        key={`${id}-${combinedHighlightRanges.length * 2 + 2}-${displayText.substring(
          highlightRange3,
        )}`}
      >
        {displayText.substring(highlightRange3)}
      </span>,
    );
  }
  return formattedNode;
};

const QUERY_BUILDER_PROPERTY_SEARCH_LABEL_TEXT_CLASS =
  'query-builder-property-search-panel__node__label';
const QUERY_BUILDER_PROPERTY_SEARCH_DOC_TEXT_CLASS =
  'query-builder-property-search-panel__node__doc';

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
        canDrag: () => !(node.type instanceof Class),
        collect: (monitor) => ({
          isDragging: monitor.isDragging(),
        }),
      }),
      [node],
    );
    const ref = useRef<HTMLDivElement>(null);
    dragConnector(ref);
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
      parentNode?.type instanceof Class && level > 1
        ? prettyCONSTName(node.label)
        : parentNode instanceof QueryBuilderExplorerTreeSubTypeNodeData
          ? prettyPropertyNameForSubType(node.id, true)
          : prettyPropertyNameFromNodeId(node.id, true);

    const nodeExpandIcon = isExpandable ? (
      node.isOpen ? (
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
            QUERY_BUILDER_PROPERTY_SEARCH_DOC_TEXT_CLASS,
            `${node.id}_doc`,
          )
        : null;

    const isMultiple = propertySearchState.isNodeMultiple(node);

    return (
      <>
        <div
          className="tree-view__node__container query-builder-property-search-panel__node__container"
          ref={ref}
          style={{
            paddingLeft: `${(level - 1) * stepPaddingInRem + 0.5}rem`,
            display: 'flex',
          }}
          onClick={(): void => node.setIsOpen(!node.isOpen)}
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
                QUERY_BUILDER_PROPERTY_SEARCH_LABEL_TEXT_CLASS,
                node.id,
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
                  <div
                    title="Property info"
                    className="query-builder-property-search-panel__node__action query-builder-property-search-panel__node__info"
                  >
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
                  <div
                    title="Property info"
                    className="query-builder-property-search-panel__node__action query-builder-property-search-panel__node__info"
                  >
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
        {node.isOpen &&
          getChildrenNodes()
            .filter((childNode) =>
              propertySearchState.isNodeIncludedInFilter(childNode),
            )
            .sort((nodeA, nodeB) => nodeA.label.localeCompare(nodeB.label))
            .map((childNode) => (
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

const QueryBuilderSearchConfigToggleButton = observer(
  (props: {
    label: string;
    enabled: boolean;
    onClick: () => void;
    showOnlyButton?: boolean;
    onOnlyButtonClick?: (() => void) | undefined;
  }) => {
    const { label, enabled, onClick, showOnlyButton, onOnlyButtonClick } =
      props;

    const [isMouseOver, setIsMouseOver] = useState(false);

    return (
      <div
        className="query-builder-property-search-panel__form__section__toggler__btn__container"
        onMouseEnter={() => setIsMouseOver(true)}
        onMouseLeave={() => setIsMouseOver(false)}
      >
        <button
          className={clsx(
            'query-builder-property-search-panel__form__section__toggler__btn',
            {
              'query-builder-property-search-panel__form__section__toggler__btn--toggled':
                enabled,
            },
          )}
          onClick={onClick}
          tabIndex={-1}
        >
          {enabled ? <CheckSquareIcon /> : <SquareIcon />}
          <div className="query-builder-property-search-panel__form__section__toggler__prompt">
            {label}
          </div>
        </button>
        {showOnlyButton && isMouseOver && (
          <button
            className="query-builder-property-search-panel__form__section__toggler__only-btn"
            onClick={onOnlyButtonClick}
          >
            only
          </button>
        )}
      </div>
    );
  },
);

const QueryBuilderSearchConfigToggleButtonGroup = observer(
  (props: {
    header: string;
    headerTooltipText?: string;
    buttons: {
      label: string;
      enabled: boolean;
      onClick: () => void;
      onOnlyButtonClick?: () => void;
    }[];
  }) => {
    const { header, headerTooltipText, buttons } = props;

    return (
      <div className="query-builder-property-search-panel__form__section">
        <div className="query-builder-property-search-panel__form__section__header__label">
          {header}
          {headerTooltipText && (
            <Tooltip
              TransitionProps={{
                timeout: 0,
              }}
              title={<div>{headerTooltipText}</div>}
            >
              <div className="query-builder-property-search-panel__tagged-values__tooltip">
                <InfoCircleIcon />
              </div>
            </Tooltip>
          )}
        </div>
        {buttons.map(({ label, enabled, onClick, onOnlyButtonClick }) => (
          <QueryBuilderSearchConfigToggleButton
            key={label}
            label={label}
            enabled={enabled}
            onClick={onClick}
            showOnlyButton={buttons.length > 1}
            onOnlyButtonClick={onOnlyButtonClick}
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
    clearSearch: () => void;
  }) => {
    const { queryBuilderState, triggerElement, clearSearch } = props;
    const explorerState = queryBuilderState.explorerState;
    const propertySearchState = explorerState.propertySearchState;

    const handleClose = (event: MouseEvent | TouchEvent): void => {
      if (
        event.target instanceof HTMLInputElement &&
        event.target.name === QUERY_BUILDER_EXPLORER_SEARCH_INPUT_NAME
      ) {
        return;
      }
      clearSearch();
      propertySearchState.setIsSearchPanelOpen(false);
    };

    const handleSearchMode: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ): void => {
      const searchMode = event.target.value as ADVANCED_FUZZY_SEARCH_MODE;
      propertySearchState.searchConfigurationState.setCurrentMode(searchMode);
    };

    const handleToggleIncludeSubTypes = () => {
      (async () => {
        propertySearchState.searchConfigurationState.setIncludeSubTypes(
          !propertySearchState.searchConfigurationState.includeSubTypes,
        );
        await propertySearchState.initialize();
        await propertySearchState.search();
      })().catch(
        propertySearchState.queryBuilderState.applicationStore
          .alertUnhandledError,
      );
    };

    const handleToggleIncludeDocumentation = () => {
      (async () => {
        propertySearchState.searchConfigurationState.setIncludeDocumentation(
          !propertySearchState.searchConfigurationState.includeDocumentation,
        );
        await propertySearchState.initialize();
        await propertySearchState.search();
      })().catch(
        propertySearchState.queryBuilderState.applicationStore
          .alertUnhandledError,
      );
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
        hideBackdrop={true}
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
        <ClickAwayListener onClickAway={handleClose}>
          <div
            data-testid={
              QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PROPERTY_SEARCH_PANEL
            }
            className="query-builder-property-search-panel"
          >
            <div className="query-builder-property-search-panel__content">
              <ResizablePanelGroup orientation="vertical">
                <ResizablePanel size={175}>
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
                            propertySearchState.searchConfigurationState
                              .currentMode
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
                    <QueryBuilderSearchConfigToggleButtonGroup
                      header="One-Many rows"
                      buttons={[
                        {
                          label: 'Include',
                          enabled: propertySearchState.includeOneMany,
                          onClick: () =>
                            propertySearchState.setIncludeOneMany(
                              !propertySearchState.includeOneMany,
                            ),
                        },
                      ]}
                    />
                    <QueryBuilderSearchConfigToggleButtonGroup
                      header="Documentation"
                      headerTooltipText={`Include "doc" type tagged values in search results`}
                      buttons={[
                        {
                          label: 'Include',
                          enabled:
                            propertySearchState.searchConfigurationState
                              .includeDocumentation,
                          onClick: handleToggleIncludeDocumentation,
                        },
                      ]}
                    />
                    <QueryBuilderSearchConfigToggleButtonGroup
                      header="Sub-types"
                      buttons={[
                        {
                          label: 'Include',
                          enabled:
                            propertySearchState.searchConfigurationState
                              .includeSubTypes,
                          onClick: handleToggleIncludeSubTypes,
                        },
                      ]}
                    />
                    <QueryBuilderSearchConfigToggleButtonGroup
                      header="By type"
                      buttons={[
                        {
                          label: 'Class',
                          enabled: propertySearchState.typeFilters.includes(
                            QUERY_BUILDER_PROPERTY_SEARCH_TYPE.CLASS,
                          ),
                          onClick: () => {
                            propertySearchState.toggleFilterForType(
                              QUERY_BUILDER_PROPERTY_SEARCH_TYPE.CLASS,
                            );
                          },
                          onOnlyButtonClick: () => {
                            propertySearchState.setFilterOnlyType(
                              QUERY_BUILDER_PROPERTY_SEARCH_TYPE.CLASS,
                            );
                          },
                        },
                        {
                          label: 'Enumeration',
                          enabled: propertySearchState.typeFilters.includes(
                            QUERY_BUILDER_PROPERTY_SEARCH_TYPE.ENUMERATION,
                          ),
                          onClick: () => {
                            propertySearchState.toggleFilterForType(
                              QUERY_BUILDER_PROPERTY_SEARCH_TYPE.ENUMERATION,
                            );
                          },
                          onOnlyButtonClick: () => {
                            propertySearchState.setFilterOnlyType(
                              QUERY_BUILDER_PROPERTY_SEARCH_TYPE.ENUMERATION,
                            );
                          },
                        },
                        {
                          label: 'String',
                          enabled: propertySearchState.typeFilters.includes(
                            QUERY_BUILDER_PROPERTY_SEARCH_TYPE.STRING,
                          ),
                          onClick: () => {
                            propertySearchState.toggleFilterForType(
                              QUERY_BUILDER_PROPERTY_SEARCH_TYPE.STRING,
                            );
                          },
                          onOnlyButtonClick: () => {
                            propertySearchState.setFilterOnlyType(
                              QUERY_BUILDER_PROPERTY_SEARCH_TYPE.STRING,
                            );
                          },
                        },
                        {
                          label: 'Boolean',
                          enabled: propertySearchState.typeFilters.includes(
                            QUERY_BUILDER_PROPERTY_SEARCH_TYPE.BOOLEAN,
                          ),
                          onClick: () => {
                            propertySearchState.toggleFilterForType(
                              QUERY_BUILDER_PROPERTY_SEARCH_TYPE.BOOLEAN,
                            );
                          },
                          onOnlyButtonClick: () => {
                            propertySearchState.setFilterOnlyType(
                              QUERY_BUILDER_PROPERTY_SEARCH_TYPE.BOOLEAN,
                            );
                          },
                        },
                        {
                          label: 'Number',
                          enabled: propertySearchState.typeFilters.includes(
                            QUERY_BUILDER_PROPERTY_SEARCH_TYPE.NUMBER,
                          ),
                          onClick: () => {
                            propertySearchState.toggleFilterForType(
                              QUERY_BUILDER_PROPERTY_SEARCH_TYPE.NUMBER,
                            );
                          },
                          onOnlyButtonClick: () => {
                            propertySearchState.setFilterOnlyType(
                              QUERY_BUILDER_PROPERTY_SEARCH_TYPE.NUMBER,
                            );
                          },
                        },
                        {
                          label: 'Date',
                          enabled: propertySearchState.typeFilters.includes(
                            QUERY_BUILDER_PROPERTY_SEARCH_TYPE.DATE,
                          ),
                          onClick: () => {
                            propertySearchState.toggleFilterForType(
                              QUERY_BUILDER_PROPERTY_SEARCH_TYPE.DATE,
                            );
                          },
                          onOnlyButtonClick: () => {
                            propertySearchState.setFilterOnlyType(
                              QUERY_BUILDER_PROPERTY_SEARCH_TYPE.DATE,
                            );
                          },
                        },
                      ]}
                    />
                  </div>
                </ResizablePanel>
                <ResizablePanelSplitter>
                  <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
                </ResizablePanelSplitter>
                <ResizablePanel>
                  {(propertySearchState.initializationState.isInProgress ||
                    propertySearchState.searchState.isInProgress) && (
                    <PanelLoadingIndicator isLoading={true} />
                  )}
                  <div className="query-builder-property-search-panel__results">
                    {!propertySearchState.initializationState.isInProgress &&
                      !propertySearchState.searchState.isInProgress && (
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
                                  explorerState={
                                    queryBuilderState.explorerState
                                  }
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
                                  Tips: Navigate deeper into the explorer tree
                                  to improve the scope and accuracy of the
                                  search
                                </div>
                              </BlankPanelContent>
                            )}
                        </>
                      )}
                    {propertySearchState.initializationState.isInProgress && (
                      <BlankPanelContent>Initializing...</BlankPanelContent>
                    )}
                    {propertySearchState.searchState.isInProgress && (
                      <BlankPanelContent>Searching...</BlankPanelContent>
                    )}
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </div>
        </ClickAwayListener>
      </BasePopover>
    );
  },
);

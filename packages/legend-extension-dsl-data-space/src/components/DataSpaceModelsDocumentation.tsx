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
import {
  AnchorLinkIcon,
  BasePopover,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  CogIcon,
  ControlledDropdownMenu,
  FilterIcon,
  InfoCircleIcon,
  MenuContent,
  MenuContentItem,
  MoreVerticalIcon,
  SearchIcon,
  TimesIcon,
  Tooltip,
  clsx,
  type TreeNodeContainerProps,
  TreeView,
  PackageIcon,
  CheckSquareIcon,
  MinusSquareIcon,
  EmptySquareIcon,
  CaretRightIcon,
  CaretLeftIcon,
} from '@finos/legend-art';
import { type DataSpaceViewerState } from '../stores/DataSpaceViewerState.js';
import { DataSpaceWikiPlaceholder } from './DataSpacePlaceholder.js';
import {
  DataSpaceAssociationDocumentationEntry,
  DataSpaceBasicDocumentationEntry,
  DataSpaceClassDocumentationEntry,
  DataSpaceEnumerationDocumentationEntry,
  DataSpaceModelDocumentationEntry,
  DataSpacePropertyDocumentationEntry,
  type NormalizedDataSpaceDocumentationEntry,
} from '../graph-manager/action/analytics/DataSpaceAnalysis.js';
import { debounce, isNonNullable, prettyCONSTName } from '@finos/legend-shared';
import { useApplicationStore, useCommands } from '@finos/legend-application';
import {
  CORE_PURE_PATH,
  ELEMENT_PATH_DELIMITER,
  MILESTONING_STEREOTYPE,
  PROPERTY_ACCESSOR,
  getMultiplicityDescription,
} from '@finos/legend-graph';
import { useEffect, useMemo, useRef } from 'react';
import {
  type ModelsDocumentationFilterTreeNodeData,
  type DataSpaceViewerModelsDocumentationState,
  ModelsDocumentationFilterTreeTypeNodeData,
  ModelsDocumentationFilterTreeElementNodeData,
  ModelsDocumentationFilterTreePackageNodeData,
  ModelsDocumentationFilterTreeNodeCheckType,
  uncheckFilterTreeNode,
  checkFilterTreeNode,
  uncheckAllFilterTree,
  ModelsDocumentationFilterTreeRootNodeData,
} from '../stores/DataSpaceModelsDocumentationState.js';
import {
  DataGrid,
  type DataGridCellRendererParams,
} from '@finos/legend-lego/data-grid';
import { FuzzySearchAdvancedConfigMenu } from '@finos/legend-lego/application';
import {
  DATA_SPACE_VIEWER_ACTIVITY_MODE,
  generateAnchorForActivity,
} from '../stores/DataSpaceViewerNavigation.js';

const getMilestoningLabel = (val: string | undefined): string | undefined => {
  switch (val) {
    case MILESTONING_STEREOTYPE.BITEMPORAL:
      return 'Bi-temporal';
    case MILESTONING_STEREOTYPE.BUSINESS_TEMPORAL:
      return 'Business Temporal';
    case MILESTONING_STEREOTYPE.PROCESSING_TEMPORAL:
      return 'Processing Temporal';
    default:
      return undefined;
  }
};

const ElementInfoTooltip: React.FC<{
  entry: DataSpaceModelDocumentationEntry;
  children: React.ReactElement;
}> = (props) => {
  const { entry, children } = props;

  return (
    <Tooltip
      arrow={false}
      placement="bottom-end"
      disableInteractive={true}
      classes={{
        tooltip: 'data-space__viewer__tooltip',
        tooltipPlacementRight: 'data-space__viewer__tooltip--right',
      }}
      TransitionProps={{
        // disable transition
        // NOTE: somehow, this is the only workaround we have, if for example
        // we set `appear = true`, the tooltip will jump out of position
        timeout: 0,
      }}
      title={
        <div className="data-space__viewer__tooltip__content">
          <div className="data-space__viewer__tooltip__item">
            <div className="data-space__viewer__tooltip__item__label">Name</div>
            <div className="data-space__viewer__tooltip__item__value">
              {entry.name}
            </div>
          </div>
          <div className="data-space__viewer__tooltip__item">
            <div className="data-space__viewer__tooltip__item__label">Path</div>
            <div className="data-space__viewer__tooltip__item__value">
              {entry.path}
            </div>
          </div>
          {entry instanceof DataSpaceClassDocumentationEntry &&
            entry.milestoning !== undefined && (
              <div className="data-space__viewer__tooltip__item">
                <div className="data-space__viewer__tooltip__item__label">
                  Milestoning
                </div>
                <div className="data-space__viewer__tooltip__item__value">
                  {getMilestoningLabel(entry.milestoning)}
                </div>
              </div>
            )}
        </div>
      }
    >
      {children}
    </Tooltip>
  );
};

const PropertyInfoTooltip: React.FC<{
  entry: DataSpacePropertyDocumentationEntry;
  elementEntry: DataSpaceModelDocumentationEntry;
  children: React.ReactElement;
}> = (props) => {
  const { entry, elementEntry, children } = props;

  return (
    <Tooltip
      arrow={false}
      placement="bottom-end"
      disableInteractive={true}
      classes={{
        tooltip: 'data-space__viewer__tooltip',
        tooltipPlacementRight: 'data-space__viewer__tooltip--right',
      }}
      TransitionProps={{
        // disable transition
        // NOTE: somehow, this is the only workaround we have, if for example
        // we set `appear = true`, the tooltip will jump out of position
        timeout: 0,
      }}
      title={
        <div className="data-space__viewer__tooltip__content">
          <div className="data-space__viewer__tooltip__item">
            <div className="data-space__viewer__tooltip__item__label">Name</div>
            <div className="data-space__viewer__tooltip__item__value">
              {entry.name}
            </div>
          </div>
          <div className="data-space__viewer__tooltip__item">
            <div className="data-space__viewer__tooltip__item__label">
              Owner
            </div>
            <div className="data-space__viewer__tooltip__item__value">
              {elementEntry.path}
            </div>
          </div>
          {entry.type && (
            <div className="data-space__viewer__tooltip__item">
              <div className="data-space__viewer__tooltip__item__label">
                Type
              </div>
              <div className="data-space__viewer__tooltip__item__value">
                {entry.type}
              </div>
            </div>
          )}
          {entry.multiplicity && (
            <div className="data-space__viewer__tooltip__item">
              <div className="data-space__viewer__tooltip__item__label">
                Multiplicity
              </div>
              <div className="data-space__viewer__tooltip__item__value">
                {getMultiplicityDescription(entry.multiplicity)}
              </div>
            </div>
          )}
          {entry.milestoning && (
            <div className="data-space__viewer__tooltip__item">
              <div className="data-space__viewer__tooltip__item__label">
                Milestoning
              </div>
              <div className="data-space__viewer__tooltip__item__value">
                {getMilestoningLabel(entry.milestoning)}
              </div>
            </div>
          )}
        </div>
      }
    >
      {children}
    </Tooltip>
  );
};

const ElementContentCellRenderer = observer(
  (
    params: DataGridCellRendererParams<NormalizedDataSpaceDocumentationEntry> & {
      dataSpaceViewerState: DataSpaceViewerState;
    },
  ) => {
    const { data, dataSpaceViewerState } = params;
    const applicationStore = useApplicationStore();
    const showHumanizedForm =
      dataSpaceViewerState.modelsDocumentationState.showHumanizedForm;

    if (!data) {
      return null;
    }

    const copyPath = (): void => {
      applicationStore.clipboardService
        .copyTextToClipboard(data.elementEntry.path)
        .catch(applicationStore.alertUnhandledError);
    };
    const label = showHumanizedForm
      ? prettyCONSTName(data.elementEntry.name)
      : data.elementEntry.name;

    if (data.elementEntry instanceof DataSpaceClassDocumentationEntry) {
      return (
        <div
          className="data-space__viewer__models-documentation__grid__cell"
          title={`Class: ${data.elementEntry.path}`}
        >
          <div className="data-space__viewer__models-documentation__grid__cell__label">
            <div className="data-space__viewer__models-documentation__grid__cell__label__icon data-space__viewer__models-documentation__grid__cell__label__icon--class">
              C
            </div>
            <div className="data-space__viewer__models-documentation__grid__cell__label__text">
              {label}
            </div>
            {data.elementEntry.milestoning && (
              <div
                className="data-space__viewer__models-documentation__grid__cell__label__milestoning-badge"
                title={`Milestoning: ${getMilestoningLabel(
                  data.elementEntry.milestoning,
                )}`}
              >
                <ClockIcon />
              </div>
            )}
          </div>
          <div className="data-space__viewer__models-documentation__grid__cell__actions">
            <ElementInfoTooltip entry={data.elementEntry}>
              <div className="data-space__viewer__models-documentation__grid__cell__action">
                <InfoCircleIcon className="data-space__viewer__models-documentation__grid__cell__action__info" />
              </div>
            </ElementInfoTooltip>
            <ControlledDropdownMenu
              className="data-space__viewer__models-documentation__grid__cell__action"
              menuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                transformOrigin: { vertical: 'top', horizontal: 'right' },
                elevation: 7,
              }}
              content={
                <MenuContent>
                  <MenuContentItem onClick={copyPath}>
                    Copy Path
                  </MenuContentItem>
                  <MenuContentItem disabled={true}>
                    Preview Data
                  </MenuContentItem>
                </MenuContent>
              }
            >
              <MoreVerticalIcon />
            </ControlledDropdownMenu>
          </div>
        </div>
      );
    } else if (
      data.elementEntry instanceof DataSpaceEnumerationDocumentationEntry
    ) {
      return (
        <div
          className="data-space__viewer__models-documentation__grid__cell"
          title={`Enumeration: ${data.elementEntry.path}`}
        >
          <div className="data-space__viewer__models-documentation__grid__cell__label">
            <div className="data-space__viewer__models-documentation__grid__cell__label__icon data-space__viewer__models-documentation__grid__cell__label__icon--enumeration">
              E
            </div>
            <div className="data-space__viewer__models-documentation__grid__cell__label__text">
              {label}
            </div>
          </div>
          <div className="data-space__viewer__models-documentation__grid__cell__actions">
            <ElementInfoTooltip entry={data.elementEntry}>
              <div className="data-space__viewer__models-documentation__grid__cell__action">
                <InfoCircleIcon className="data-space__viewer__models-documentation__grid__cell__action__info" />
              </div>
            </ElementInfoTooltip>
            <ControlledDropdownMenu
              className="data-space__viewer__models-documentation__grid__cell__action"
              menuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                transformOrigin: { vertical: 'top', horizontal: 'right' },
                elevation: 7,
              }}
              content={
                <MenuContent>
                  <MenuContentItem onClick={copyPath}>
                    Copy Path
                  </MenuContentItem>
                </MenuContent>
              }
            >
              <MoreVerticalIcon />
            </ControlledDropdownMenu>
          </div>
        </div>
      );
    } else if (
      data.elementEntry instanceof DataSpaceAssociationDocumentationEntry
    ) {
      return (
        <div
          className="data-space__viewer__models-documentation__grid__cell"
          title={`Association: ${data.elementEntry.path}`}
        >
          <div className="data-space__viewer__models-documentation__grid__cell__label">
            <div className="data-space__viewer__models-documentation__grid__cell__label__icon data-space__viewer__models-documentation__grid__cell__label__icon--association">
              A
            </div>
            <div className="data-space__viewer__models-documentation__grid__cell__label__text">
              {label}
            </div>
          </div>
          <div className="data-space__viewer__models-documentation__grid__cell__actions">
            <ElementInfoTooltip entry={data.elementEntry}>
              <div className="data-space__viewer__models-documentation__grid__cell__action">
                <InfoCircleIcon className="data-space__viewer__models-documentation__grid__cell__action__info" />
              </div>
            </ElementInfoTooltip>
            <ControlledDropdownMenu
              className="data-space__viewer__models-documentation__grid__cell__action"
              menuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                transformOrigin: { vertical: 'top', horizontal: 'right' },
                elevation: 7,
              }}
              content={
                <MenuContent>
                  <MenuContentItem onClick={copyPath}>
                    Copy Path
                  </MenuContentItem>
                </MenuContent>
              }
            >
              <MoreVerticalIcon />
            </ControlledDropdownMenu>
          </div>
        </div>
      );
    }
    return null;
  },
);

const SubElementDocContentCellRenderer = observer(
  (
    params: DataGridCellRendererParams<NormalizedDataSpaceDocumentationEntry> & {
      dataSpaceViewerState: DataSpaceViewerState;
    },
  ) => {
    const { data, dataSpaceViewerState } = params;
    const applicationStore = useApplicationStore();
    const showHumanizedForm =
      dataSpaceViewerState.modelsDocumentationState.showHumanizedForm;

    if (!data) {
      return null;
    }

    let label = showHumanizedForm ? prettyCONSTName(data.text) : data.text;
    const isDerivedProperty = label.endsWith('()');
    label = isDerivedProperty ? label.slice(0, -2) : label;

    if (data.entry instanceof DataSpaceModelDocumentationEntry) {
      return null;
    } else if (data.entry instanceof DataSpacePropertyDocumentationEntry) {
      return (
        <div
          className="data-space__viewer__models-documentation__grid__cell"
          title={`${isDerivedProperty ? 'Derived property' : 'Property'}: ${
            data.elementEntry.path
          }${PROPERTY_ACCESSOR}${data.entry.name}`}
        >
          <div className="data-space__viewer__models-documentation__grid__cell__label">
            <div className="data-space__viewer__models-documentation__grid__cell__label__icon data-space__viewer__models-documentation__grid__cell__label__icon--property">
              P
            </div>
            <div className="data-space__viewer__models-documentation__grid__cell__label__text">
              {label}
            </div>
            {isDerivedProperty && (
              <div className="data-space__viewer__models-documentation__grid__cell__label__derived-property-badge">
                ()
              </div>
            )}
            {data.entry.milestoning && (
              <div
                className="data-space__viewer__models-documentation__grid__cell__label__milestoning-badge"
                title={`Milestoning: ${getMilestoningLabel(
                  data.entry.milestoning,
                )}`}
              >
                <ClockIcon />
              </div>
            )}
          </div>
          <div className="data-space__viewer__models-documentation__grid__cell__actions">
            <PropertyInfoTooltip
              entry={data.entry}
              elementEntry={data.elementEntry}
            >
              <div className="data-space__viewer__models-documentation__grid__cell__action">
                <InfoCircleIcon className="data-space__viewer__models-documentation__grid__cell__action__info" />
              </div>
            </PropertyInfoTooltip>
            <ControlledDropdownMenu
              className="data-space__viewer__models-documentation__grid__cell__action"
              menuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                transformOrigin: { vertical: 'top', horizontal: 'right' },
                elevation: 7,
              }}
              content={
                <MenuContent>
                  <MenuContentItem disabled={true}>
                    Preview Data
                  </MenuContentItem>
                </MenuContent>
              }
            >
              <MoreVerticalIcon />
            </ControlledDropdownMenu>
          </div>
        </div>
      );
    } else if (data.entry instanceof DataSpaceBasicDocumentationEntry) {
      const copyValue = (): void => {
        applicationStore.clipboardService
          .copyTextToClipboard(
            data.elementEntry.path + PROPERTY_ACCESSOR + data.entry.name,
          )
          .catch(applicationStore.alertUnhandledError);
      };
      return (
        <div
          className="data-space__viewer__models-documentation__grid__cell"
          title={`Enum: ${data.elementEntry.path}${PROPERTY_ACCESSOR}${data.entry.name}`}
        >
          <div className="data-space__viewer__models-documentation__grid__cell__label">
            <div className="data-space__viewer__models-documentation__grid__cell__label__icon data-space__viewer__models-documentation__grid__cell__label__icon--enum">
              e
            </div>
            <div className="data-space__viewer__models-documentation__grid__cell__label__text">
              {label}
            </div>
          </div>
          <div className="data-space__viewer__models-documentation__grid__cell__actions">
            <ControlledDropdownMenu
              className="data-space__viewer__models-documentation__grid__cell__action"
              menuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                transformOrigin: { vertical: 'top', horizontal: 'right' },
                elevation: 7,
              }}
              content={
                <MenuContent>
                  <MenuContentItem onClick={copyValue}>
                    Copy Value
                  </MenuContentItem>
                </MenuContent>
              }
            >
              <MoreVerticalIcon />
            </ControlledDropdownMenu>
          </div>
        </div>
      );
    }
    return null;
  },
);

const ElementDocumentationCellRenderer = (
  params: DataGridCellRendererParams<NormalizedDataSpaceDocumentationEntry> & {
    dataSpaceViewerState: DataSpaceViewerState;
  },
): React.ReactNode => {
  const data = params.data;
  if (!data) {
    return null;
  }
  return data.documentation.trim() ? (
    data.documentation
  ) : (
    <div className="data-space__viewer__grid__empty-cell">
      No documentation provided
    </div>
  );
};

const DataSpaceModelsDocumentationGridPanel = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const documentationState = dataSpaceViewerState.modelsDocumentationState;
    const darkMode =
      !dataSpaceViewerState.applicationStore.layoutService
        .TEMPORARY__isLightColorThemeEnabled;

    return (
      <div
        className={clsx(
          'data-space__viewer__models-documentation__grid',
          'data-space__viewer__grid',
          {
            'data-space__viewer__models-documentation__grid--shrink':
              documentationState.showFilterPanel,
            'ag-theme-balham': !darkMode,
            'ag-theme-balham-dark': darkMode,
          },
        )}
      >
        <DataGrid
          rowData={documentationState.filteredSearchResults}
          overlayNoRowsTemplate={`<div class="data-space__viewer__grid--empty">No documentation found</div>`}
          // highlight element row
          getRowClass={(params) =>
            params.data?.entry instanceof DataSpaceModelDocumentationEntry
              ? 'data-space__viewer__models-documentation__grid__element-row'
              : undefined
          }
          alwaysShowVerticalScroll={true}
          gridOptions={{
            suppressScrollOnNewData: true,
            getRowId: (rowData) => rowData.data.uuid,
          }}
          suppressFieldDotNotation={true}
          columnDefs={[
            {
              minWidth: 50,
              sortable: true,
              resizable: true,
              cellRendererParams: {
                dataSpaceViewerState,
              },
              cellRenderer: ElementContentCellRenderer,
              headerName: 'Model',
              flex: 1,
            },
            {
              minWidth: 50,
              sortable: false,
              resizable: true,
              cellRendererParams: {
                dataSpaceViewerState,
              },
              cellRenderer: SubElementDocContentCellRenderer,
              headerName: '',
              flex: 1,
            },
            {
              minWidth: 50,
              sortable: false,
              resizable: false,
              headerClass: 'data-space__viewer__grid__last-column-header',
              cellRenderer: ElementDocumentationCellRenderer,
              headerName: 'Documentation',
              flex: 1,
              wrapText: true,
              autoHeight: true,
            },
          ]}
        />
      </div>
    );
  },
);

const getFilterTreeNodeIcon = (
  node: ModelsDocumentationFilterTreeNodeData,
): React.ReactNode | undefined => {
  if (node instanceof ModelsDocumentationFilterTreeElementNodeData) {
    if (node.typePath === CORE_PURE_PATH.CLASS) {
      return (
        <div className="data-space__viewer__models-documentation__filter__tree__node__type-icon data-space__viewer__models-documentation__filter__tree__node__type-icon--class">
          C
        </div>
      );
    } else if (node.typePath === CORE_PURE_PATH.ENUMERATION) {
      return (
        <div className="data-space__viewer__models-documentation__filter__tree__node__type-icon data-space__viewer__models-documentation__filter__tree__node__type-icon--enumeration">
          E
        </div>
      );
    } else if (node.typePath === CORE_PURE_PATH.ASSOCIATION) {
      return (
        <div className="data-space__viewer__models-documentation__filter__tree__node__type-icon data-space__viewer__models-documentation__filter__tree__node__type-icon--association">
          A
        </div>
      );
    }
  } else if (node instanceof ModelsDocumentationFilterTreePackageNodeData) {
    return (
      <div className="data-space__viewer__models-documentation__filter__tree__node__type-icon data-space__viewer__models-documentation__filter__tree__node__type-icon--package">
        <PackageIcon />
      </div>
    );
  } else if (node instanceof ModelsDocumentationFilterTreeTypeNodeData) {
    switch (node.typePath) {
      case CORE_PURE_PATH.CLASS:
        return (
          <div className="data-space__viewer__models-documentation__filter__tree__node__type-icon data-space__viewer__models-documentation__filter__tree__node__type-icon--class">
            C
          </div>
        );
      case CORE_PURE_PATH.ENUMERATION:
        return (
          <div className="data-space__viewer__models-documentation__filter__tree__node__type-icon data-space__viewer__models-documentation__filter__tree__node__type-icon--enumeration">
            E
          </div>
        );
      case CORE_PURE_PATH.ASSOCIATION:
        return (
          <div className="data-space__viewer__models-documentation__filter__tree__node__type-icon data-space__viewer__models-documentation__filter__tree__node__type-icon--association">
            A
          </div>
        );
      default:
        return undefined;
    }
  }
  return undefined;
};

const getFilterNodeCount = (
  node: ModelsDocumentationFilterTreeNodeData,
  documentationState: DataSpaceViewerModelsDocumentationState,
): number | undefined => {
  if (node instanceof ModelsDocumentationFilterTreeElementNodeData) {
    return documentationState.searchResults.filter(
      (result) => node.elementPath === result.elementEntry.path,
    ).length;
  } else if (node instanceof ModelsDocumentationFilterTreePackageNodeData) {
    return documentationState.searchResults.filter(
      (result) =>
        node.packagePath === result.elementEntry.path ||
        result.elementEntry.path.startsWith(
          `${node.packagePath}${ELEMENT_PATH_DELIMITER}`,
        ),
    ).length;
  } else if (node instanceof ModelsDocumentationFilterTreeTypeNodeData) {
    return node.typePath === CORE_PURE_PATH.CLASS
      ? documentationState.searchResults.filter(
          (entry) =>
            entry.elementEntry instanceof DataSpaceClassDocumentationEntry,
        ).length
      : node.typePath === CORE_PURE_PATH.ENUMERATION
        ? documentationState.searchResults.filter(
            (entry) =>
              entry.elementEntry instanceof
              DataSpaceEnumerationDocumentationEntry,
          ).length
        : node.typePath === CORE_PURE_PATH.ASSOCIATION
          ? documentationState.searchResults.filter(
              (entry) =>
                entry.elementEntry instanceof
                DataSpaceAssociationDocumentationEntry,
            ).length
          : undefined;
  } else if (node instanceof ModelsDocumentationFilterTreeRootNodeData) {
    return documentationState.searchResults.length;
  }
  return undefined;
};

const DataSpaceModelsDocumentationFilterTreeNodeContainer = observer(
  (
    props: TreeNodeContainerProps<
      ModelsDocumentationFilterTreeNodeData,
      {
        documentationState: DataSpaceViewerModelsDocumentationState;
        refreshTreeData: () => void;
        uncheckTree: () => void;
        updateFilter: () => void;
      }
    >,
  ) => {
    const { node, level, innerProps } = props;
    const { documentationState, refreshTreeData, uncheckTree, updateFilter } =
      innerProps;
    const isExpandable = Boolean(node.childrenIds.length);
    const expandIcon = isExpandable ? (
      node.isOpen ? (
        <ChevronDownIcon />
      ) : (
        <ChevronRightIcon />
      )
    ) : (
      <div />
    );
    const checkerIcon =
      node.checkType === ModelsDocumentationFilterTreeNodeCheckType.CHECKED ? (
        <CheckSquareIcon />
      ) : node.checkType ===
        ModelsDocumentationFilterTreeNodeCheckType.PARTIALLY_CHECKED ? (
        <MinusSquareIcon />
      ) : (
        <EmptySquareIcon />
      );
    const nodeCount = getFilterNodeCount(node, documentationState);
    const toggleChecker: React.MouseEventHandler = (event) => {
      event.stopPropagation();

      if (
        node.checkType === ModelsDocumentationFilterTreeNodeCheckType.CHECKED
      ) {
        uncheckFilterTreeNode(node);
      } else {
        checkFilterTreeNode(node);
      }

      refreshTreeData();
      updateFilter();
    };
    const toggleExpandNode: React.MouseEventHandler = (event) => {
      event.stopPropagation();

      if (isExpandable) {
        node.setIsOpen(!node.isOpen);
        refreshTreeData();
      }
    };
    const onNodeClick = (): void => {
      uncheckTree();
      checkFilterTreeNode(node);

      if (isExpandable && !node.isOpen) {
        node.setIsOpen(true);
      }
      refreshTreeData();
      updateFilter();
    };

    return (
      <div
        className="tree-view__node__container data-space__viewer__models-documentation__filter__tree__node__container"
        style={{
          paddingLeft: `${(level - 1) * 1.4}rem`,
          display: 'flex',
        }}
        onClick={onNodeClick}
      >
        <div
          className="data-space__viewer__models-documentation__filter__tree__node__expand-icon"
          onClick={toggleExpandNode}
        >
          {expandIcon}
        </div>
        <div
          className="data-space__viewer__models-documentation__filter__tree__node__checker"
          onClick={toggleChecker}
        >
          {checkerIcon}
        </div>
        {getFilterTreeNodeIcon(node)}
        <div className="tree-view__node__label data-space__viewer__models-documentation__filter__tree__node__label">
          {node.label}
        </div>
        {nodeCount !== undefined && (
          <div className="tree-view__node__label data-space__viewer__models-documentation__filter__tree__node__count">
            {nodeCount}
          </div>
        )}
      </div>
    );
  },
);

const DataSpaceModelsDocumentationFilterPanel = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const documentationState = dataSpaceViewerState.modelsDocumentationState;
    const resetAll = (): void => documentationState.resetAllFilters();
    const resetTypeFilter = (): void => documentationState.resetTypeFilter();
    const resetPackageFilter = (): void =>
      documentationState.resetPackageFilter();

    return (
      <div className="data-space__viewer__models-documentation__filter__panel">
        <div className="data-space__viewer__models-documentation__filter__group">
          <div className="data-space__viewer__models-documentation__filter__group__header">
            <div className="data-space__viewer__models-documentation__filter__group__header__label">
              Filter
            </div>
            <div className="data-space__viewer__models-documentation__filter__group__header__actions">
              <button
                className="data-space__viewer__models-documentation__filter__group__header__reset"
                tabIndex={-1}
                disabled={!documentationState.isFilterCustomized}
                onClick={resetAll}
              >
                Reset All
              </button>
            </div>
          </div>
        </div>
        <div className="data-space__viewer__models-documentation__filter__group data-space__viewer__models-documentation__filter__group--by-type">
          <div className="data-space__viewer__models-documentation__filter__group__header">
            <div className="data-space__viewer__models-documentation__filter__group__header__label">
              Filter by Type
            </div>
            <div className="data-space__viewer__models-documentation__filter__group__header__actions">
              <button
                className="data-space__viewer__models-documentation__filter__group__header__reset"
                tabIndex={-1}
                disabled={!documentationState.isTypeFilterCustomized}
                onClick={resetTypeFilter}
              >
                Reset
              </button>
            </div>
          </div>
          <div className="data-space__viewer__models-documentation__filter__group__content">
            <TreeView
              components={{
                TreeNodeContainer:
                  DataSpaceModelsDocumentationFilterTreeNodeContainer,
              }}
              treeData={documentationState.typeFilterTreeData}
              getChildNodes={(node) =>
                node.childrenIds
                  .map((id) =>
                    documentationState.typeFilterTreeData.nodes.get(id),
                  )
                  .filter(isNonNullable)
                  .sort((a, b) => a.label.localeCompare(b.label))
              }
              innerProps={{
                documentationState,
                refreshTreeData: (): void =>
                  documentationState.resetTypeFilterTreeData(),
                uncheckTree: (): void =>
                  uncheckAllFilterTree(documentationState.typeFilterTreeData),
                updateFilter: (): void => documentationState.updateTypeFilter(),
              }}
            />
          </div>
        </div>
        <div className="data-space__viewer__models-documentation__filter__group data-space__viewer__models-documentation__filter__group--by-package">
          <div className="data-space__viewer__models-documentation__filter__group__header">
            <div className="data-space__viewer__models-documentation__filter__group__header__label">
              Filter by Package
            </div>
            <div className="data-space__viewer__models-documentation__filter__group__header__actions">
              <button
                className="data-space__viewer__models-documentation__filter__group__header__reset"
                tabIndex={-1}
                disabled={!documentationState.isPackageFilterCustomized}
                onClick={resetPackageFilter}
              >
                Reset
              </button>
            </div>
          </div>
          <div className="data-space__viewer__models-documentation__filter__group__content">
            <TreeView
              components={{
                TreeNodeContainer:
                  DataSpaceModelsDocumentationFilterTreeNodeContainer,
              }}
              treeData={documentationState.packageFilterTreeData}
              getChildNodes={(node) =>
                node.childrenIds
                  .map((id) =>
                    documentationState.packageFilterTreeData.nodes.get(id),
                  )
                  .filter(isNonNullable)
                  .sort((a, b) => a.label.localeCompare(b.label))
              }
              innerProps={{
                documentationState,
                refreshTreeData: (): void =>
                  documentationState.resetPackageFilterTreeData(),
                uncheckTree: (): void =>
                  uncheckAllFilterTree(
                    documentationState.packageFilterTreeData,
                  ),
                updateFilter: (): void =>
                  documentationState.updatePackageFilter(),
              }}
            />
          </div>
        </div>
      </div>
    );
  },
);

const DataSpaceModelsDocumentationSearchBar = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchConfigTriggerRef = useRef<HTMLButtonElement>(null);
    const documentationState = dataSpaceViewerState.modelsDocumentationState;
    const searchText = documentationState.searchText;
    const debouncedSearch = useMemo(
      () => debounce(() => documentationState.search(), 100),
      [documentationState],
    );
    const onSearchTextChange: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      documentationState.setSearchText(event.target.value);
      debouncedSearch.cancel();
      debouncedSearch();
    };

    // actions
    const clearSearchText = (): void => {
      documentationState.resetSearch();
      documentationState.focusSearchInput();
    };
    const toggleSearchConfigMenu = (): void =>
      documentationState.setShowSearchConfigurationMenu(
        !documentationState.showSearchConfigurationMenu,
      );
    const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
      if (event.code === 'Escape') {
        documentationState.selectSearchInput();
      }
    };

    // search config menu
    const closeSearchConfigMenu = (): void =>
      documentationState.setShowSearchConfigurationMenu(false);
    const onSearchConfigMenuOpen = (): void =>
      documentationState.focusSearchInput();

    useEffect(() => {
      if (searchInputRef.current) {
        documentationState.setSearchInput(searchInputRef.current);
      }
      return () => documentationState.setSearchInput(undefined);
    }, [documentationState]);

    return (
      <div className="data-space__viewer__models-documentation__search">
        <input
          ref={searchInputRef}
          onKeyDown={onKeyDown}
          className="data-space__viewer__models-documentation__search__input input--dark"
          spellCheck={false}
          onChange={onSearchTextChange}
          value={searchText}
          placeholder="Search (Ctrl + Shift + F)"
        />
        <button
          ref={searchConfigTriggerRef}
          className={clsx(
            'data-space__viewer__models-documentation__search__input__config__trigger',
            {
              'data-space__viewer__models-documentation__search__input__config__trigger--toggled':
                documentationState.showSearchConfigurationMenu,
              'data-space__viewer__models-documentation__search__input__config__trigger--active':
                documentationState.searchConfigurationState
                  .isAdvancedSearchActive,
            },
          )}
          tabIndex={-1}
          onClick={toggleSearchConfigMenu}
          title={`${
            documentationState.searchConfigurationState.isAdvancedSearchActive
              ? 'Advanced search is currently active\n'
              : ''
          }Click to toggle search config menu`}
        >
          <CogIcon />
        </button>
        <BasePopover
          open={Boolean(documentationState.showSearchConfigurationMenu)}
          TransitionProps={{
            onEnter: onSearchConfigMenuOpen,
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
            configState={documentationState.searchConfigurationState}
          />
        </BasePopover>
        {!searchText ? (
          <div className="data-space__viewer__models-documentation__search__input__search__icon">
            <SearchIcon />
          </div>
        ) : (
          <button
            className="data-space__viewer__models-documentation__search__input__clear-btn"
            tabIndex={-1}
            onClick={clearSearchText}
            title="Clear"
          >
            <TimesIcon />
          </button>
        )}
      </div>
    );
  },
);

export const DataSpaceModelsDocumentation = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const sectionRef = useRef<HTMLDivElement>(null);
    const anchor = generateAnchorForActivity(
      DATA_SPACE_VIEWER_ACTIVITY_MODE.MODELS_DOCUMENTATION,
    );

    useCommands(dataSpaceViewerState.modelsDocumentationState);

    useEffect(() => {
      if (sectionRef.current) {
        dataSpaceViewerState.layoutState.setWikiPageAnchor(
          anchor,
          sectionRef.current,
        );
      }
      return () => dataSpaceViewerState.layoutState.unsetWikiPageAnchor(anchor);
    }, [dataSpaceViewerState, anchor]);

    const documentationEntries =
      dataSpaceViewerState.dataSpaceAnalysisResult.elementDocs;
    const documentationState = dataSpaceViewerState.modelsDocumentationState;

    const toggleFilterPanel = (): void =>
      documentationState.setShowFilterPanel(
        !documentationState.showFilterPanel,
      );

    return (
      <div ref={sectionRef} className="data-space__viewer__wiki__section">
        <div className="data-space__viewer__wiki__section__header">
          <div className="data-space__viewer__wiki__section__header__label">
            Models Documentation
            <button
              className="data-space__viewer__wiki__section__header__anchor"
              tabIndex={-1}
              onClick={() => dataSpaceViewerState.changeZone(anchor, true)}
            >
              <AnchorLinkIcon />
            </button>
          </div>
        </div>
        <div className="data-space__viewer__wiki__section__content">
          {documentationEntries.length > 0 && (
            <div className="data-space__viewer__models-documentation">
              <div className="data-space__viewer__models-documentation__header">
                <button
                  className="data-space__viewer__models-documentation__filter__toggler"
                  title="Toggle Filter Panel"
                  tabIndex={-1}
                  onClick={toggleFilterPanel}
                >
                  <div className="data-space__viewer__models-documentation__filter__toggler__arrow">
                    {documentationState.showFilterPanel ? (
                      <CaretLeftIcon />
                    ) : (
                      <CaretRightIcon />
                    )}
                  </div>
                  <div className="data-space__viewer__models-documentation__filter__toggler__icon">
                    <FilterIcon />
                  </div>
                </button>
                <DataSpaceModelsDocumentationSearchBar
                  dataSpaceViewerState={dataSpaceViewerState}
                />
              </div>
              <div className="data-space__viewer__models-documentation__content">
                {documentationState.showFilterPanel && (
                  <DataSpaceModelsDocumentationFilterPanel
                    dataSpaceViewerState={dataSpaceViewerState}
                  />
                )}
                <DataSpaceModelsDocumentationGridPanel
                  dataSpaceViewerState={dataSpaceViewerState}
                />
              </div>
            </div>
          )}
          {documentationEntries.length === 0 && (
            <DataSpaceWikiPlaceholder message="(not specified)" />
          )}
        </div>
      </div>
    );
  },
);

/**
 * Copyright (c) 2025-present, Goldman Sachs
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
import {
  CORE_PURE_PATH,
  ELEMENT_PATH_DELIMITER,
  getMultiplicityDescription,
  MILESTONING_STEREOTYPE,
  PROPERTY_ACCESSOR,
} from '@finos/legend-graph';
import {
  type NormalizedDocumentationEntry,
  AssociationDocumentationEntry,
  BasicDocumentationEntry,
  ClassDocumentationEntry,
  EnumerationDocumentationEntry,
  ModelDocumentationEntry,
  PropertyDocumentationEntry,
} from './ModelDocumentationAnalysis.js';
import { debounce, isNonNullable, prettyCONSTName } from '@finos/legend-shared';
import {
  DataGrid,
  type DataGridCellRendererParams,
} from '../data-grid/DataGrid.js';
import {
  useApplicationStore,
  useCommands,
  type GenericLegendApplicationStore,
} from '@finos/legend-application';
import { observer } from 'mobx-react-lite';
import {
  type ModelsDocumentationFilterTreeNodeData,
  type ViewerModelsDocumentationState,
  checkFilterTreeNode,
  ModelsDocumentationFilterTreeElementNodeData,
  ModelsDocumentationFilterTreeNodeCheckType,
  ModelsDocumentationFilterTreePackageNodeData,
  ModelsDocumentationFilterTreeRootNodeData,
  ModelsDocumentationFilterTreeTypeNodeData,
  uncheckAllFilterTree,
  uncheckFilterTreeNode,
} from './ModelDocumentationState.js';
import { FuzzySearchAdvancedConfigMenu } from '../application/FuzzySearchAdvancedConfigMenu.js';
import { useEffect, useMemo, useRef } from 'react';

export const getMilestoningLabel = (
  val: string | undefined,
): string | undefined => {
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
  entry: ModelDocumentationEntry;
  children: React.ReactElement;
}> = (props) => {
  const { entry, children } = props;

  return (
    <Tooltip
      arrow={false}
      placement="bottom-end"
      disableInteractive={true}
      classes={{
        tooltip: 'models-documentation__tooltip',
        tooltipPlacementRight: 'models-documentation__tooltip--right',
      }}
      slotProps={{
        transition: {
          // disable transition
          // NOTE: somehow, this is the only workaround we have, if for example
          // we set `appear = true`, the tooltip will jump out of position
          timeout: 0,
        },
      }}
      title={
        <div className="models-documentation__tooltip__content">
          <div className="models-documentation__tooltip__item">
            <div className="models-documentation__tooltip__item__label">
              Name
            </div>
            <div className="models-documentation__tooltip__item__value">
              {entry.name}
            </div>
          </div>
          <div className="models-documentation__tooltip__item">
            <div className="models-documentation__tooltip__item__label">
              Path
            </div>
            <div className="models-documentation__tooltip__item__value">
              {entry.path}
            </div>
          </div>
          {entry instanceof ClassDocumentationEntry &&
            entry.milestoning !== undefined && (
              <div className="models-documentation__tooltip__item">
                <div className="models-documentation__tooltip__item__label">
                  Milestoning
                </div>
                <div className="models-documentation__tooltip__item__value">
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
  entry: PropertyDocumentationEntry;
  elementEntry: ModelDocumentationEntry;
  children: React.ReactElement;
}> = (props) => {
  const { entry, elementEntry, children } = props;

  return (
    <Tooltip
      arrow={false}
      placement="bottom-end"
      disableInteractive={true}
      classes={{
        tooltip: 'models-documentation__tooltip',
        tooltipPlacementRight: 'models-documentation__tooltip--right',
      }}
      slotProps={{
        transition: {
          // disable transition
          // NOTE: somehow, this is the only workaround we have, if for example
          // we set `appear = true`, the tooltip will jump out of position
          timeout: 0,
        },
      }}
      title={
        <div className="models-documentation__tooltip__content">
          <div className="models-documentation__tooltip__item">
            <div className="models-documentation__tooltip__item__label">
              Name
            </div>
            <div className="models-documentation__tooltip__item__value">
              {entry.name}
            </div>
          </div>
          <div className="models-documentation__tooltip__item">
            <div className="models-documentation__tooltip__item__label">
              Owner
            </div>
            <div className="models-documentation__tooltip__item__value">
              {elementEntry.path}
            </div>
          </div>
          {entry.type && (
            <div className="models-documentation__tooltip__item">
              <div className="models-documentation__tooltip__item__label">
                Type
              </div>
              <div className="models-documentation__tooltip__item__value">
                {entry.type}
              </div>
            </div>
          )}
          {entry.multiplicity && (
            <div className="models-documentation__tooltip__item">
              <div className="models-documentation__tooltip__item__label">
                Multiplicity
              </div>
              <div className="models-documentation__tooltip__item__value">
                {getMultiplicityDescription(entry.multiplicity)}
              </div>
            </div>
          )}
          {entry.milestoning && (
            <div className="models-documentation__tooltip__item">
              <div className="models-documentation__tooltip__item__label">
                Milestoning
              </div>
              <div className="models-documentation__tooltip__item__value">
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

export const ElementContentCellRenderer = observer(
  (
    params: DataGridCellRendererParams<NormalizedDocumentationEntry> & {
      modelsDocumentationState: ViewerModelsDocumentationState;
    },
  ) => {
    const { data, modelsDocumentationState } = params;
    const applicationStore = useApplicationStore();
    const showHumanizedForm = modelsDocumentationState.showHumanizedForm;

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

    if (data.elementEntry instanceof ClassDocumentationEntry) {
      return (
        <div
          className="models-documentation__grid__cell"
          title={`Class: ${data.elementEntry.path}`}
        >
          <div className="models-documentation__grid__cell__label">
            <div className="models-documentation__grid__cell__label__icon models-documentation__grid__cell__label__icon--class">
              C
            </div>
            <div className="models-documentation__grid__cell__label__text">
              {label}
            </div>
            {data.elementEntry.milestoning && (
              <div
                className="models-documentation__grid__cell__label__milestoning-badge"
                title={`Milestoning: ${getMilestoningLabel(
                  data.elementEntry.milestoning,
                )}`}
              >
                <ClockIcon />
              </div>
            )}
          </div>
          <div className="models-documentation__grid__cell__actions">
            <ElementInfoTooltip entry={data.elementEntry}>
              <div className="models-documentation__grid__cell__action">
                <InfoCircleIcon className="models-documentation__grid__cell__action__info" />
              </div>
            </ElementInfoTooltip>
            <ControlledDropdownMenu
              className="models-documentation__grid__cell__action"
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
    } else if (data.elementEntry instanceof EnumerationDocumentationEntry) {
      return (
        <div
          className="models-documentation__grid__cell"
          title={`Enumeration: ${data.elementEntry.path}`}
        >
          <div className="models-documentation__grid__cell__label">
            <div className="models-documentation__grid__cell__label__icon models-documentation__grid__cell__label__icon--enumeration">
              E
            </div>
            <div className="models-documentation__grid__cell__label__text">
              {label}
            </div>
          </div>
          <div className="models-documentation__grid__cell__actions">
            <ElementInfoTooltip entry={data.elementEntry}>
              <div className="models-documentation__grid__cell__action">
                <InfoCircleIcon className="models-documentation__grid__cell__action__info" />
              </div>
            </ElementInfoTooltip>
            <ControlledDropdownMenu
              className="models-documentation__grid__cell__action"
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
    } else if (data.elementEntry instanceof AssociationDocumentationEntry) {
      return (
        <div
          className="models-documentation__grid__cell"
          title={`Association: ${data.elementEntry.path}`}
        >
          <div className="models-documentation__grid__cell__label">
            <div className="models-documentation__grid__cell__label__icon models-documentation__grid__cell__label__icon--association">
              A
            </div>
            <div className="models-documentation__grid__cell__label__text">
              {label}
            </div>
          </div>
          <div className="models-documentation__grid__cell__actions">
            <ElementInfoTooltip entry={data.elementEntry}>
              <div className="models-documentation__grid__cell__action">
                <InfoCircleIcon className="models-documentation__grid__cell__action__info" />
              </div>
            </ElementInfoTooltip>
            <ControlledDropdownMenu
              className="models-documentation__grid__cell__action"
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

export const SubElementDocContentCellRenderer = observer(
  (
    params: DataGridCellRendererParams<NormalizedDocumentationEntry> & {
      modelsDocumentationState: ViewerModelsDocumentationState;
    },
  ) => {
    const { data, modelsDocumentationState } = params;
    const applicationStore = useApplicationStore();
    const showHumanizedForm = modelsDocumentationState.showHumanizedForm;

    if (!data) {
      return null;
    }

    let label = showHumanizedForm ? prettyCONSTName(data.text) : data.text;
    const isDerivedProperty = label.endsWith('()');
    label = isDerivedProperty ? label.slice(0, -2) : label;

    if (data.entry instanceof ModelDocumentationEntry) {
      return null;
    } else if (data.entry instanceof PropertyDocumentationEntry) {
      return (
        <div
          className="models-documentation__grid__cell"
          title={`${isDerivedProperty ? 'Derived property' : 'Property'}: ${
            data.elementEntry.path
          }${PROPERTY_ACCESSOR}${data.entry.name}`}
        >
          <div className="models-documentation__grid__cell__label">
            <div className="models-documentation__grid__cell__label__icon models-documentation__grid__cell__label__icon--property">
              P
            </div>
            <div className="models-documentation__grid__cell__label__text">
              {label}
            </div>
            {isDerivedProperty && (
              <div className="models-documentation__grid__cell__label__derived-property-badge">
                ()
              </div>
            )}
            {data.entry.milestoning && (
              <div
                className="models-documentation__grid__cell__label__milestoning-badge"
                title={`Milestoning: ${getMilestoningLabel(
                  data.entry.milestoning,
                )}`}
              >
                <ClockIcon />
              </div>
            )}
          </div>
          <div className="models-documentation__grid__cell__actions">
            <PropertyInfoTooltip
              entry={data.entry}
              elementEntry={data.elementEntry}
            >
              <div className="models-documentation__grid__cell__action">
                <InfoCircleIcon className="models-documentation__grid__cell__action__info" />
              </div>
            </PropertyInfoTooltip>
            <ControlledDropdownMenu
              className="models-documentation__grid__cell__action"
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
    } else if (data.entry instanceof BasicDocumentationEntry) {
      const copyValue = (): void => {
        applicationStore.clipboardService
          .copyTextToClipboard(
            data.elementEntry.path + PROPERTY_ACCESSOR + data.entry.name,
          )
          .catch(applicationStore.alertUnhandledError);
      };
      return (
        <div
          className="models-documentation__grid__cell"
          title={`Enum: ${data.elementEntry.path}${PROPERTY_ACCESSOR}${data.entry.name}`}
        >
          <div className="models-documentation__grid__cell__label">
            <div className="models-documentation__grid__cell__label__icon models-documentation__grid__cell__label__icon--enum">
              e
            </div>
            <div className="models-documentation__grid__cell__label__text">
              {label}
            </div>
          </div>
          <div className="models-documentation__grid__cell__actions">
            <ControlledDropdownMenu
              className="models-documentation__grid__cell__action"
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

export const ElementDocumentationCellRenderer = (
  params: DataGridCellRendererParams<NormalizedDocumentationEntry> & {},
): React.ReactNode => {
  const data = params.data;
  if (!data) {
    return null;
  }
  return data.documentation.trim() ? (
    data.documentation
  ) : (
    <div className="models-documentation__grid__empty-cell">
      No documentation provided
    </div>
  );
};

export const ModelsDocumentationGridPanel = observer(
  (props: {
    modelsDocumentationState: ViewerModelsDocumentationState;
    applicationStore: GenericLegendApplicationStore;
  }) => {
    const { modelsDocumentationState, applicationStore } = props;
    const documentationState = modelsDocumentationState;
    const darkMode =
      !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;

    return (
      <div
        className={clsx('models-documentation__viewer__grid', {
          'models-documentation__grid': documentationState.showFilterPanel,
          'ag-theme-balham': !darkMode,
          'ag-theme-balham-dark': darkMode,
        })}
      >
        <DataGrid
          rowData={documentationState.filteredSearchResults}
          overlayNoRowsTemplate={`<div class="models-documentation__grid--empty">No documentation found</div>`}
          // highlight element row
          getRowClass={(params) =>
            params.data?.entry instanceof ModelDocumentationEntry
              ? 'models-documentation__grid__element-row'
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
                modelsDocumentationState,
                applicationStore,
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
                modelsDocumentationState,
                applicationStore,
              },
              cellRenderer: SubElementDocContentCellRenderer,
              headerName: '',
              flex: 1,
            },
            {
              minWidth: 50,
              sortable: false,
              resizable: false,
              headerClass: 'models-documentation__grid__last-column-header',
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

export const getFilterTreeNodeIcon = (
  node: ModelsDocumentationFilterTreeNodeData,
): React.ReactNode | undefined => {
  if (node instanceof ModelsDocumentationFilterTreeElementNodeData) {
    if (node.typePath === CORE_PURE_PATH.CLASS) {
      return (
        <div className="models-documentation__filter__tree__node__type-icon models-documentation__filter__tree__node__type-icon--class">
          C
        </div>
      );
    } else if (node.typePath === CORE_PURE_PATH.ENUMERATION) {
      return (
        <div className="models-documentation__filter__tree__node__type-icon models-documentation__filter__tree__node__type-icon--enumeration">
          E
        </div>
      );
    } else if (node.typePath === CORE_PURE_PATH.ASSOCIATION) {
      return (
        <div className="models-documentation__filter__tree__node__type-icon models-documentation__filter__tree__node__type-icon--association">
          A
        </div>
      );
    }
  } else if (node instanceof ModelsDocumentationFilterTreePackageNodeData) {
    return (
      <div className="models-documentation__filter__tree__node__type-icon models-documentation__filter__tree__node__type-icon--package">
        <PackageIcon />
      </div>
    );
  } else if (node instanceof ModelsDocumentationFilterTreeTypeNodeData) {
    switch (node.typePath) {
      case CORE_PURE_PATH.CLASS:
        return (
          <div className="models-documentation__filter__tree__node__type-icon models-documentation__filter__tree__node__type-icon--class">
            C
          </div>
        );
      case CORE_PURE_PATH.ENUMERATION:
        return (
          <div className="models-documentation__filter__tree__node__type-icon models-documentation__filter__tree__node__type-icon--enumeration">
            E
          </div>
        );
      case CORE_PURE_PATH.ASSOCIATION:
        return (
          <div className="models-documentation__filter__tree__node__type-icon models-documentation__filter__tree__node__type-icon--association">
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
  documentationState: ViewerModelsDocumentationState,
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
          (entry) => entry.elementEntry instanceof ClassDocumentationEntry,
        ).length
      : node.typePath === CORE_PURE_PATH.ENUMERATION
        ? documentationState.searchResults.filter(
            (entry) =>
              entry.elementEntry instanceof EnumerationDocumentationEntry,
          ).length
        : node.typePath === CORE_PURE_PATH.ASSOCIATION
          ? documentationState.searchResults.filter(
              (entry) =>
                entry.elementEntry instanceof AssociationDocumentationEntry,
            ).length
          : undefined;
  } else if (node instanceof ModelsDocumentationFilterTreeRootNodeData) {
    return documentationState.searchResults.length;
  }
  return undefined;
};

const ModelsDocumentationFilterTreeNodeContainer = observer(
  (
    props: TreeNodeContainerProps<
      ModelsDocumentationFilterTreeNodeData,
      {
        documentationState: ViewerModelsDocumentationState;
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
        className="tree-view__node__container models-documentation__filter__tree__node__container"
        style={{
          paddingLeft: `${(level - 1) * 1.4}rem`,
          display: 'flex',
        }}
        onClick={onNodeClick}
      >
        <div
          className="models-documentation__filter__tree__node__expand-icon"
          onClick={toggleExpandNode}
        >
          {expandIcon}
        </div>
        <div
          className="models-documentation__filter__tree__node__checker"
          onClick={toggleChecker}
        >
          {checkerIcon}
        </div>
        {getFilterTreeNodeIcon(node)}
        <div className="tree-view__node__label models-documentation__filter__tree__node__label">
          {node.label}
        </div>
        {nodeCount !== undefined && (
          <div className="tree-view__node__label models-documentation__filter__tree__node__count">
            {nodeCount}
          </div>
        )}
      </div>
    );
  },
);

const ModelsDocumentationFilterPanel = observer(
  (props: { modelsDocumentationState: ViewerModelsDocumentationState }) => {
    const { modelsDocumentationState } = props;
    const documentationState = modelsDocumentationState;
    const resetAll = (): void => documentationState.resetAllFilters();
    const resetTypeFilter = (): void => documentationState.resetTypeFilter();
    const resetPackageFilter = (): void =>
      documentationState.resetPackageFilter();

    return (
      <div className="models-documentation__filter__panel">
        <div className="models-documentation__filter__group">
          <div className="models-documentation__filter__group__header">
            <div className="models-documentation__filter__group__header__label">
              Filter
            </div>
            <div className="models-documentation__filter__group__header__actions">
              <button
                className="models-documentation__filter__group__header__reset"
                tabIndex={-1}
                disabled={!documentationState.isFilterCustomized}
                onClick={resetAll}
              >
                Reset All
              </button>
            </div>
          </div>
        </div>
        <div className="models-documentation__filter__group models-documentation__filter__group--by-type">
          <div className="models-documentation__filter__group__header">
            <div className="models-documentation__filter__group__header__label">
              Filter by Type
            </div>
            <div className="models-documentation__filter__group__header__actions">
              <button
                className="models-documentation__filter__group__header__reset"
                tabIndex={-1}
                disabled={!documentationState.isTypeFilterCustomized}
                onClick={resetTypeFilter}
              >
                Reset
              </button>
            </div>
          </div>
          <div className="models-documentation__filter__group__content">
            <TreeView
              components={{
                TreeNodeContainer: ModelsDocumentationFilterTreeNodeContainer,
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
        <div className="models-documentation__filter__group models-documentation__filter__group--by-package">
          <div className="models-documentation__filter__group__header">
            <div className="models-documentation__filter__group__header__label">
              Filter by Package
            </div>
            <div className="models-documentation__filter__group__header__actions">
              <button
                className="models-documentation__filter__group__header__reset"
                tabIndex={-1}
                disabled={!documentationState.isPackageFilterCustomized}
                onClick={resetPackageFilter}
              >
                Reset
              </button>
            </div>
          </div>
          <div className="models-documentation__filter__group__content">
            <TreeView
              components={{
                TreeNodeContainer: ModelsDocumentationFilterTreeNodeContainer,
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

const ModelsDocumentationSearchBar = observer(
  (props: { modelsDocumentationState: ViewerModelsDocumentationState }) => {
    const { modelsDocumentationState } = props;
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchConfigTriggerRef = useRef<HTMLButtonElement>(null);
    const documentationState = modelsDocumentationState;
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
      <div className="models-documentation__search">
        <input
          ref={searchInputRef}
          onKeyDown={onKeyDown}
          className="models-documentation__search__input input"
          spellCheck={false}
          onChange={onSearchTextChange}
          value={searchText}
          placeholder="Search (Ctrl + Shift + F)"
        />
        <button
          ref={searchConfigTriggerRef}
          className={clsx(
            'models-documentation__search__input__config__trigger',
            {
              'models-documentation__search__input__config__trigger--toggled':
                documentationState.showSearchConfigurationMenu,
              'models-documentation__search__input__config__trigger--active':
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
          slotProps={{
            transition: {
              onEnter: onSearchConfigMenuOpen,
            },
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
          <div className="models-documentation__search__input__search__icon">
            <SearchIcon />
          </div>
        ) : (
          <button
            className="models-documentation__search__input__clear-btn"
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

const ProductWikiPlaceholder: React.FC<{ message: string }> = (props) => (
  <div className="models-documentation__viewer__wiki__placeholder">
    {props.message}
  </div>
);

export const ModelsDocumentation = observer(
  (props: {
    modelsDocumentationState: ViewerModelsDocumentationState;
    applicationStore: GenericLegendApplicationStore;
    title?: string | undefined;
  }) => {
    const { modelsDocumentationState, applicationStore, title } = props;
    const sectionRef = useRef<HTMLDivElement>(null);
    const elementDocs = modelsDocumentationState.elementDocs;

    useCommands(modelsDocumentationState);

    const toggleFilterPanel = (): void =>
      modelsDocumentationState.setShowFilterPanel(
        !modelsDocumentationState.showFilterPanel,
      );

    return (
      <div
        ref={sectionRef}
        className="models-documentation__viewer__wiki__section"
      >
        <div className="models-documentation__viewer__wiki__section__header">
          <div className="models-documentation__viewer__wiki__section__header__label">
            {title ?? 'Models Documentation'}
            <button
              className="models-documentation__viewer__wiki__section__header__anchor"
              tabIndex={-1}
            >
              <AnchorLinkIcon />
            </button>
          </div>
        </div>
        <div className="models-documentation__viewer__wiki__section__content">
          {elementDocs.length > 0 && (
            <div className="models-documentation">
              <div className="models-documentation__header">
                <button
                  className="models-documentation__filter__toggler"
                  title="Toggle Filter Panel"
                  tabIndex={-1}
                  onClick={toggleFilterPanel}
                >
                  <div className="models-documentation__filter__toggler__arrow">
                    {modelsDocumentationState.showFilterPanel ? (
                      <CaretLeftIcon />
                    ) : (
                      <CaretRightIcon />
                    )}
                  </div>
                  <div className="models-documentation__filter__toggler__icon">
                    <FilterIcon />
                  </div>
                </button>
                <ModelsDocumentationSearchBar
                  modelsDocumentationState={modelsDocumentationState}
                />
              </div>
              <div className="models-documentation__content">
                {modelsDocumentationState.showFilterPanel && (
                  <ModelsDocumentationFilterPanel
                    modelsDocumentationState={modelsDocumentationState}
                  />
                )}
                <ModelsDocumentationGridPanel
                  modelsDocumentationState={modelsDocumentationState}
                  applicationStore={applicationStore}
                />
              </div>
            </div>
          )}
          {elementDocs.length === 0 && (
            <ProductWikiPlaceholder message="(not specified)" />
          )}
        </div>
      </div>
    );
  },
);

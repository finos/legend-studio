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
  DropdownMenu,
  InfoCircleIcon,
  MenuContent,
  MenuContentItem,
  MoreVerticalIcon,
  SearchIcon,
  Tooltip,
  clsx,
} from '@finos/legend-art';
import { type DataSpaceViewerState } from '../stores/DataSpaceViewerState.js';
import { AgGridReact } from '@ag-grid-community/react';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import { DataSpaceWikiPlaceholder } from './DataSpacePlaceholder.js';
import type { ICellRendererParams } from '@ag-grid-community/core';
import {
  DataSpaceAssociationDocumentationEntry,
  DataSpaceBasicDocumentationEntry,
  DataSpaceClassDocumentationEntry,
  DataSpaceEnumerationDocumentationEntry,
  DataSpaceModelDocumentationEntry,
  DataSpacePropertyDocumentationEntry,
  type NormalizedDataSpaceDocumentationEntry,
} from '../graphManager/action/analytics/DataSpaceAnalysis.js';
import { prettyCONSTName } from '@finos/legend-shared';
import { useApplicationStore } from '@finos/legend-application';
import {
  MILESTONING_STEREOTYPE,
  PROPERTY_ACCESSOR,
  getMultiplicityDescription,
} from '@finos/legend-graph';

const MIN_NUMBER_OF_ROWS_FOR_AUTO_HEIGHT = 20;

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
    params: ICellRendererParams<NormalizedDataSpaceDocumentationEntry> & {
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
        <div className="data-space__viewer__models-documentation__grid__cell">
          <div className="data-space__viewer__models-documentation__grid__cell__label">
            <div className="data-space__viewer__models-documentation__grid__cell__label__icon data-space__viewer__models-documentation__grid__cell__label__icon--class">
              C
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
            <DropdownMenu
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
            </DropdownMenu>
          </div>
        </div>
      );
    } else if (
      data.elementEntry instanceof DataSpaceEnumerationDocumentationEntry
    ) {
      return (
        <div className="data-space__viewer__models-documentation__grid__cell">
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
            <DropdownMenu
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
            </DropdownMenu>
          </div>
        </div>
      );
    } else if (
      data.elementEntry instanceof DataSpaceAssociationDocumentationEntry
    ) {
      return (
        <div className="data-space__viewer__models-documentation__grid__cell">
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
            <DropdownMenu
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
            </DropdownMenu>
          </div>
        </div>
      );
    }
    return null;
  },
);

const SubElementDocContentCellRenderer = observer(
  (
    params: ICellRendererParams<NormalizedDataSpaceDocumentationEntry> & {
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

    const label = showHumanizedForm ? prettyCONSTName(data.text) : data.text;

    if (data.entry instanceof DataSpaceModelDocumentationEntry) {
      return null;
    } else if (data.entry instanceof DataSpacePropertyDocumentationEntry) {
      return (
        <div className="data-space__viewer__models-documentation__grid__cell">
          <div className="data-space__viewer__models-documentation__grid__cell__label">
            <div className="data-space__viewer__models-documentation__grid__cell__label__icon data-space__viewer__models-documentation__grid__cell__label__icon--property">
              P
            </div>
            <div className="data-space__viewer__models-documentation__grid__cell__label__text">
              {label}
            </div>
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
            <DropdownMenu
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
            </DropdownMenu>
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
        <div className="data-space__viewer__models-documentation__grid__cell">
          <div className="data-space__viewer__models-documentation__grid__cell__label">
            <div className="data-space__viewer__models-documentation__grid__cell__label__icon data-space__viewer__models-documentation__grid__cell__label__icon--enum">
              e
            </div>
            <div className="data-space__viewer__models-documentation__grid__cell__label__text">
              {label}
            </div>
          </div>
          <div className="data-space__viewer__models-documentation__grid__cell__actions">
            <DropdownMenu
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
            </DropdownMenu>
          </div>
        </div>
      );
    }
    return null;
  },
);

const ElementDocumentationCellRenderer = (
  params: ICellRendererParams<NormalizedDataSpaceDocumentationEntry> & {
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

export const DataSpaceModelsDocumentation = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const documentationEntries =
      dataSpaceViewerState.dataSpaceAnalysisResult.elementDocs;
    const autoHeight =
      documentationEntries.length <= MIN_NUMBER_OF_ROWS_FOR_AUTO_HEIGHT;

    return (
      <div className="data-space__viewer__wiki__section">
        <div className="data-space__viewer__wiki__section__header">
          <div className="data-space__viewer__wiki__section__header__label">
            Models Documentation
            <div className="data-space__viewer__wiki__section__header__anchor">
              <AnchorLinkIcon />
            </div>
          </div>
        </div>
        <div className="data-space__viewer__wiki__section__content">
          {documentationEntries.length > 0 && (
            <div
              className={clsx('data-space__viewer__models-documentation', {
                'data-space__viewer__models-documentation--auto-height':
                  autoHeight,
              })}
            >
              <div className="data-space__viewer__models-documentation__search">
                <div className="data-space__viewer__models-documentation__search__input-group">
                  <input className="data-space__viewer__models-documentation__search__input-group__input input" />
                  <div className="data-space__viewer__models-documentation__search__input-group__icon">
                    <SearchIcon />
                  </div>
                </div>
              </div>
              <div className="data-space__viewer__models-documentation__grid data-space__viewer__grid ag-theme-balham-dark">
                <AgGridReact
                  domLayout={autoHeight ? 'autoHeight' : 'normal'}
                  rowData={documentationEntries}
                  // highlight element row
                  getRowClass={(params) =>
                    params.data?.entry instanceof
                    DataSpaceModelDocumentationEntry
                      ? 'data-space__viewer__models-documentation__grid__element-row'
                      : undefined
                  }
                  gridOptions={{
                    suppressScrollOnNewData: true,
                    getRowId: (rowData) => rowData.data.uuid,
                  }}
                  modules={[ClientSideRowModelModule]}
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
                      headerClass:
                        'data-space__viewer__grid__last-column-header',
                      cellRenderer: ElementDocumentationCellRenderer,
                      headerName: 'Documentation',
                      flex: 1,
                      wrapText: true,
                      autoHeight: true,
                    },
                  ]}
                />
              </div>
            </div>
          )}
          {documentationEntries.length === 0 && (
            <DataSpaceWikiPlaceholder message="No documentation provided" />
          )}
        </div>
      </div>
    );
  },
);

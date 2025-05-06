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
  AnchorLinkIcon,
  ChevronDownIcon,
  clsx,
  MarkdownTextViewer,
  QuestionCircleIcon,
  ExternalLinkIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import {
  DATA_PRODUCT_VIEWER_ACTIVITY_MODE,
  generateAnchorForActivity,
} from '../../stores/lakehouse/DataProductViewerNavigation.js';
import { useEffect, useRef } from 'react';
import type { DataProductViewerState } from '../../stores/lakehouse/DataProductViewerState.js';
import { useApplicationStore } from '@finos/legend-application';
import {
  DataProductGroupAccess,
  type DataProductGroupAccessState,
} from '../../stores/lakehouse/DataProductDataAccessState.js';
import {
  DataGrid,
  type DataGridCellRendererParams,
} from '@finos/legend-lego/data-grid';
import type { V1_LakehouseAccessPoint } from '@finos/legend-graph';
import { DataContractCreator } from './entitlements/DataContractCreator.js';

export const DataProductMarkdownTextViewer: React.FC<{ value: string }> = (
  props,
) => (
  <MarkdownTextViewer
    className="data-space__viewer__markdown-text-viewer"
    value={{
      value: props.value,
    }}
    components={{
      h1: 'h2',
      h2: 'h3',
      h3: 'h4',
    }}
  />
);

const TDSColumnDocumentationCellRenderer = (
  params: DataGridCellRendererParams<V1_LakehouseAccessPoint>,
): React.ReactNode => {
  const data = params.data;
  if (!data) {
    return null;
  }
  return data.description?.trim() ? (
    data.description
  ) : (
    <div className="data-space__viewer__grid__empty-cell">
      No description to provide
    </div>
  );
};

const TDSColumnMoreInfoCellRenderer = (
  params: DataGridCellRendererParams<V1_LakehouseAccessPoint>,
): React.ReactNode => {
  const data = params.data;
  if (!data) {
    return null;
  }
  return (
    <div className="data-space__viewer__grid__empty-cell">
      <ChevronDownIcon />
    </div>
  );
};

export const DataProductGroupAccessViewer = observer(
  (props: {
    dataViewer: DataProductViewerState;
    accessGroupState: DataProductGroupAccessState;
  }) => {
    const { accessGroupState } = props;
    const accessPoints = accessGroupState.group.accessPoints;

    const handleClick = (): void => {
      accessGroupState.handleClick();
    };

    const renderAccess = (val: DataProductGroupAccess): React.ReactNode => {
      switch (val) {
        case DataProductGroupAccess.UNKNOWN:
          return (
            <button className="data-space__viewer__access-group__item__header-access-btn data-space__viewer__access-group__item__header-access-btn--unknown">
              UNKNOWN
            </button>
          );
        case DataProductGroupAccess.NO_ACCESS:
          return (
            <button
              onClick={handleClick}
              className="data-space__viewer__access-group__item__header-access-btn data-space__viewer__access-group__item__header-access-btn--no-access"
            >
              REQUEST ACCESS
            </button>
          );
        case DataProductGroupAccess.PENDING:
          return (
            <button
              onClick={handleClick}
              className="data-space__viewer__access-group__item__header-access-btn data-space__viewer__access-group__item__header-access-btn--pending"
            >
              <ExternalLinkIcon />
              <div>PENDING</div>
            </button>
          );
        case DataProductGroupAccess.COMPLETED:
          return (
            <button className="data-space__viewer__access-group__item__header-access-btn data-space__viewer__access-group__item__header-access-btn--entitled">
              ENTITLED
            </button>
          );

        default:
          return null;
      }
    };
    return (
      <div className="data-space__viewer__access-group__item">
        <div className="data-space__viewer__access-group__item__header">
          <div className="data-space__viewer__access-group__item__header-main">
            <div className="data-space__viewer__access-group__item__header__title">
              {accessGroupState.group.id}
            </div>
            <div className="data-space__viewer__access-group__item__header__type">
              LAKEHOUSE
            </div>
            <button
              className="data-space__viewer__access-group__item__header__anchor"
              tabIndex={-1}
              // onClick={() => dataSpaceViewerState.changeZone(anchor, true)}
            >
              <AnchorLinkIcon />
            </button>
          </div>
          <div className="data-space__viewer__access-group__item__header-access">
            {renderAccess(accessGroupState.access)}
          </div>
        </div>
        <div className="data-space__viewer__access-group__item__description">
          <DataProductMarkdownTextViewer
            value={accessGroupState.group.description ?? ''}
          />
        </div>
        <div className="data-space__viewer__access-group__item__content">
          <div className="data-space__viewer__access-group__item__content__tab__content">
            <div
              className={clsx(
                'data-space__viewer__access-group__tds__column-specs',
                'data-space__viewer__grid',
                {
                  'ag-theme-balham': true,
                },
              )}
            >
              <DataGrid
                rowData={accessPoints}
                gridOptions={{
                  suppressScrollOnNewData: true,
                  getRowId: (rowData) => rowData.data.id,
                }}
                suppressFieldDotNotation={true}
                columnDefs={[
                  {
                    minWidth: 50,
                    sortable: true,
                    resizable: true,
                    field: 'id',
                    headerValueGetter: () => `Access Points`,
                    flex: 1,
                  },
                  {
                    minWidth: 50,
                    sortable: false,
                    resizable: true,
                    cellRenderer: TDSColumnDocumentationCellRenderer,
                    headerName: 'Description',
                    flex: 1,
                    wrapText: true,
                    autoHeight: true,
                  },
                  {
                    minWidth: 50,
                    sortable: false,
                    resizable: false,
                    headerClass: 'data-space__viewer__grid__last-column-header',
                    cellRenderer: TDSColumnMoreInfoCellRenderer,
                    headerName: 'More Info',
                    flex: 1,
                  },
                ]}
                onRowDataUpdated={(params) => {
                  params.api.refreshCells({ force: true });
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  },
);

export const DataProducteDataAccess = observer(
  (props: { dataSpaceViewerState: DataProductViewerState }) => {
    const { dataSpaceViewerState } = props;
    const applicationStore = useApplicationStore();
    const documentationUrl = 'todo.com';
    const sectionRef = useRef<HTMLDivElement>(null);
    const anchor = generateAnchorForActivity(
      DATA_PRODUCT_VIEWER_ACTIVITY_MODE.DATA_ACCESS,
    );
    useEffect(() => {
      if (sectionRef.current) {
        dataSpaceViewerState.layoutState.setWikiPageAnchor(
          anchor,
          sectionRef.current,
        );
      }
      return () => dataSpaceViewerState.layoutState.unsetWikiPageAnchor(anchor);
    }, [dataSpaceViewerState, anchor]);

    useEffect(() => {
      dataSpaceViewerState.accessState.fetchGroupState();
    }, [dataSpaceViewerState]);

    const seeDocumentation = (): void => {
      applicationStore.navigationService.navigator.visitAddress(
        documentationUrl,
      );
    };

    return (
      <div ref={sectionRef} className="data-space__viewer__wiki__section">
        <div className="data-space__viewer__wiki__section__header">
          <div className="data-space__viewer__wiki__section__header__label">
            Data Access
            <button
              className="data-space__viewer__wiki__section__header__anchor"
              tabIndex={-1}
              onClick={() => dataSpaceViewerState.changeZone(anchor, true)}
            >
              <AnchorLinkIcon />
            </button>
          </div>
          {Boolean(documentationUrl) && (
            <button
              className="data-space__viewer__wiki__section__header__documentation"
              tabIndex={-1}
              onClick={seeDocumentation}
              title="See Documentation"
            >
              <QuestionCircleIcon />
            </button>
          )}
        </div>
        <div className="data-space__viewer__wiki__section__content">
          <div className="data-space__viewer__data-access">
            {dataSpaceViewerState.accessState.accessGroupStates.map(
              (groupState) => (
                <DataProductGroupAccessViewer
                  key={groupState.id}
                  accessGroupState={groupState}
                  dataViewer={dataSpaceViewerState}
                />
              ),
            )}
            {dataSpaceViewerState.dataContractAccessPointGroup && (
              <DataContractCreator
                onClose={() =>
                  dataSpaceViewerState.setDataContractAccessPointGroup(
                    undefined,
                  )
                }
                accessGroupPoint={
                  dataSpaceViewerState.dataContractAccessPointGroup
                }
                viewerState={dataSpaceViewerState}
              />
            )}
          </div>
        </div>
      </div>
    );
  },
);

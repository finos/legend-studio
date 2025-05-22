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
  clsx,
  MarkdownTextViewer,
  QuestionCircleIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import {
  DATA_PRODUCT_VIEWER_ACTIVITY_MODE,
  generateAnchorForActivity,
} from '../../../stores/lakehouse/DataProductViewerNavigation.js';
import { useEffect, useRef, useState } from 'react';
import type { DataProductViewerState } from '../../../stores/lakehouse/DataProductViewerState.js';
import { useApplicationStore } from '@finos/legend-application';
import {
  DataProductGroupAccess,
  type DataProductGroupAccessState,
} from '../../../stores/lakehouse/DataProductDataAccessState.js';
import {
  DataGrid,
  type DataGridCellRendererParams,
} from '@finos/legend-lego/data-grid';
import {
  type V1_RawLambda,
  V1_RenderStyle,
  type V1_LakehouseAccessPoint,
} from '@finos/legend-graph';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import {
  CODE_EDITOR_LANGUAGE,
  CODE_EDITOR_THEME,
} from '@finos/legend-code-editor';
import { Button, Tab, Tabs } from '@mui/material';
import { useLegendMarketplaceBaseStore } from '../../../application/LegendMarketplaceFrameworkProvider.js';
import { type PlainObject } from '@finos/legend-shared';
import { DataContractCreator } from '../entitlements/EntitlementsDataContractCreator.js';
import { EntitlementsDataContractViewer } from '../entitlements/EntitlementsDataContractViewer.js';
import { EntitlementsDataContractViewerState } from '../../../stores/lakehouse/entitlements/EntitlementsDataContractViewerState.js';

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
  const store = useLegendMarketplaceBaseStore();
  const enum MoreInfoTabs {
    GRAMMAR = 'Grammar',
  }
  const [activeTab, setActiveTab] = useState(MoreInfoTabs.GRAMMAR);
  const handleTabChange = (
    event: React.SyntheticEvent,
    newValue: MoreInfoTabs,
  ) => {
    setActiveTab(newValue);
  };
  const [accessPointGrammar, setAccessPointGrammar] =
    useState<string>('Loading ...');

  useEffect(() => {
    if (!data) {
      return;
    }

    const fetchGrammar = async () => {
      try {
        const grammar = await store.engineServerClient.JSONToGrammar_lambda(
          data.func as unknown as PlainObject<V1_RawLambda>,
          V1_RenderStyle.PRETTY,
        );

        setAccessPointGrammar(grammar);
      } catch {
        throw new Error('Error fetching access point grammar');
      }
    };

    fetchGrammar().catch((error) => {
      throw new Error(`Error fetching access point grammar: ${error.message}`);
    });
  }, [data, store]);

  if (!data) {
    return null;
  }

  return (
    <div>
      <Tabs value={activeTab} onChange={handleTabChange}>
        <Tab label={MoreInfoTabs.GRAMMAR} value={MoreInfoTabs.GRAMMAR} />
      </Tabs>

      <div
        className="data-space__viewer__more-info__container"
        style={{ height: '200px', width: '100%' }}
      >
        <CodeEditor
          inputValue={accessPointGrammar}
          isReadOnly={true}
          language={CODE_EDITOR_LANGUAGE.TEXT}
          hideMinimap={true}
          hideGutter={true}
          hideActionBar={true}
          lightTheme={CODE_EDITOR_THEME.GITHUB_LIGHT}
          extraEditorOptions={{ scrollBeyondLastLine: false, wordWrap: 'on' }}
        />
      </div>
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
            <Button
              variant="contained"
              color="info"
              loading={accessGroupState.fetchingAccessState.isInProgress}
            >
              UNKNOWN
            </Button>
          );
        case DataProductGroupAccess.NO_ACCESS:
          return (
            <Button
              variant="contained"
              color="error"
              onClick={handleClick}
              loading={accessGroupState.fetchingAccessState.isInProgress}
            >
              REQUEST ACCESS
            </Button>
          );
        case DataProductGroupAccess.PENDING_MANAGER_APPROVAL:
        case DataProductGroupAccess.PENDING_DATA_OWNER_APPROVAL:
          return (
            <Button
              variant="contained"
              color="primary"
              onClick={handleClick}
              loading={accessGroupState.fetchingAccessState.isInProgress}
            >
              <div>
                {val === DataProductGroupAccess.PENDING_MANAGER_APPROVAL
                  ? 'PENDING MANAGER APPROVAL'
                  : 'PENDING DATA OWNER APPROVAL'}
              </div>
            </Button>
          );
        case DataProductGroupAccess.COMPLETED:
          return (
            <Button
              variant="contained"
              color="success"
              loading={accessGroupState.fetchingAccessState.isInProgress}
            >
              ENTITLED
            </Button>
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
                    cellRenderer: 'agGroupCellRenderer',
                    headerName: 'More Info',
                    flex: 1,
                  },
                ]}
                onRowDataUpdated={(params) => {
                  params.api.refreshCells({ force: true });
                }}
                masterDetail={true}
                detailCellRenderer={TDSColumnMoreInfoCellRenderer}
                detailRowHeight={200}
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
                accessPointGroup={
                  dataSpaceViewerState.dataContractAccessPointGroup
                }
                viewerState={dataSpaceViewerState}
              />
            )}
            {dataSpaceViewerState.dataContract && (
              <EntitlementsDataContractViewer
                currentViewer={
                  new EntitlementsDataContractViewerState(
                    dataSpaceViewerState.dataContract,
                    dataSpaceViewerState.lakeServerClient,
                  )
                }
                onClose={() => dataSpaceViewerState.setDataContract(undefined)}
              />
            )}
          </div>
        </div>
      </div>
    );
  },
);

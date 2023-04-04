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
  PanelLoadingIndicator,
  QuestionCircleIcon,
} from '@finos/legend-art';
import { type DataSpaceViewerState } from '../stores/DataSpaceViewerState.js';
import { useApplicationStore } from '@finos/legend-application';
import { DataSpaceWikiPlaceholder } from './DataSpacePlaceholder.js';
import { useEffect } from 'react';
import { flowResult } from 'mobx';
import { AgGridReact } from '@ag-grid-community/react';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import {
  DatasetEntitlementAccessApprovedReport,
  DatasetEntitlementAccessGrantedReport,
  DatasetEntitlementAccessNotGrantedReport,
  DatasetEntitlementAccessRequestedReport,
  DatasetEntitlementUnsupportedReport,
} from '@finos/legend-graph';

export const DataSpaceDataAccess = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const dataAccessState = dataSpaceViewerState.dataAccessState;
    const applicationStore = useApplicationStore();
    const analysisResult = dataSpaceViewerState.dataSpaceAnalysisResult;
    const documentationUrl = analysisResult.supportInfo?.documentationUrl;

    const seeDocumentation = (): void => {
      if (documentationUrl) {
        applicationStore.navigationService.navigator.visitAddress(
          documentationUrl,
        );
      }
    };

    useEffect(() => {
      flowResult(dataAccessState.fetchDatasetSpecifications()).catch(
        applicationStore.alertUnhandledError,
      );
      flowResult(dataAccessState.fetchDatasetEntitlementReports()).catch(
        applicationStore.alertUnhandledError,
      );
    }, [
      applicationStore,
      dataAccessState,
      dataSpaceViewerState.currentExecutionContext,
    ]);

    return (
      <div className="data-space__viewer__wiki__section">
        <div className="data-space__viewer__wiki__section__header">
          <div className="data-space__viewer__wiki__section__header__label">
            Data Access
            <div className="data-space__viewer__wiki__section__header__anchor">
              <AnchorLinkIcon />
            </div>
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
          <PanelLoadingIndicator
            isLoading={
              dataAccessState.fetchDatasetSpecificationsState.isInProgress ||
              dataAccessState.fetchDatasetEntitlementReportsState.isInProgress
            }
          />
          <div className="data-space__viewer__data-access">
            {dataAccessState.datasets.length > 0 && (
              <DataSpaceWikiPlaceholder message="View Data Access (Work in Progress)" />
            )}
            {dataAccessState.datasets.length === 0 && (
              <>
                <div className="data-space__viewer__data-access__chart"></div>
                <div className="data-space__viewer__data-access__grid data-space__viewer__grid ag-theme-balham-dark">
                  <AgGridReact
                    rowData={dataAccessState.datasets}
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
                        valueGetter: (params) =>
                          params.data?.specification.name,
                        headerName: 'Dataset',
                        flex: 1,
                      },
                      {
                        minWidth: 50,
                        sortable: true,
                        resizable: true,
                        valueGetter: (params) =>
                          params.data?.specification.type,
                        headerName: 'Type',
                        flex: 1,
                      },
                      {
                        minWidth: 50,
                        sortable: true,
                        resizable: true,
                        headerName: 'Access Status',
                        valueGetter: (params) => {
                          const entitlementReport =
                            params.data?.entitlementReport;
                          if (
                            entitlementReport instanceof
                            DatasetEntitlementAccessGrantedReport
                          ) {
                            return 'Access Granted';
                          } else if (
                            entitlementReport instanceof
                            DatasetEntitlementAccessApprovedReport
                          ) {
                            return 'Access Approved';
                          } else if (
                            entitlementReport instanceof
                            DatasetEntitlementAccessRequestedReport
                          ) {
                            return 'Access Requested';
                          } else if (
                            entitlementReport instanceof
                            DatasetEntitlementAccessNotGrantedReport
                          ) {
                            return '(x) Access Not Granted';
                          } else if (
                            entitlementReport instanceof
                            DatasetEntitlementUnsupportedReport
                          ) {
                            return '(unsupported)';
                          }
                          return '';
                        },
                        flex: 1,
                        wrapText: true,
                        autoHeight: true,
                      },
                    ]}
                  />
                </div>
                <DataSpaceWikiPlaceholder message="No documentation provided" />
              </>
            )}
          </div>
        </div>
      </div>
    );
  },
);

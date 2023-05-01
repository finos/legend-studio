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
import { useEffect, useRef } from 'react';
import { flowResult } from 'mobx';
import {
  DatasetEntitlementAccessApprovedReport,
  DatasetEntitlementAccessGrantedReport,
  DatasetEntitlementAccessNotGrantedReport,
  DatasetEntitlementAccessRequestedReport,
  DatasetEntitlementUnsupportedReport,
} from '@finos/legend-graph';
import { DataGrid } from '@finos/legend-lego/data-grid';
import {
  DATA_SPACE_VIEWER_ACTIVITY_MODE,
  generateAnchorForActivity,
} from '../stores/DataSpaceViewerNavigation.js';

const DataAccessOverview = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const dataAccessState = dataSpaceViewerState.dataAccessState;
    const applicationStore = useApplicationStore();

    useEffect(() => {
      flowResult(dataAccessState.fetchDatasetSpecifications())
        .then(() => dataAccessState.fetchDatasetEntitlementReports())
        .catch(applicationStore.alertUnhandledError);
    }, [
      applicationStore,
      dataAccessState,
      dataSpaceViewerState.currentExecutionContext,
    ]);

    return (
      <div className="data-space__viewer__data-access__overview">
        <PanelLoadingIndicator
          isLoading={
            dataAccessState.fetchDatasetSpecificationsState.isInProgress ||
            dataAccessState.fetchDatasetEntitlementReportsState.isInProgress
          }
        />
        <div className="data-space__viewer__data-access__chart"></div>
        <div className="data-space__viewer__data-access__grid data-space__viewer__grid ag-theme-balham-dark">
          <DataGrid
            rowData={dataAccessState.datasets}
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
                valueGetter: (params) => params.data?.specification.name,
                headerName: 'Dataset',
                flex: 1,
              },
              {
                minWidth: 50,
                sortable: true,
                resizable: true,
                valueGetter: (params) => params.data?.specification.type,
                headerName: 'Type',
                flex: 1,
              },
              {
                minWidth: 50,
                sortable: true,
                resizable: true,
                headerName: 'Access Status',
                valueGetter: (params) => {
                  const entitlementReport = params.data?.entitlementReport;
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
              },
            ]}
          />
        </div>
      </div>
    );
  },
);

export const DataSpaceDataAccess = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const applicationStore = useApplicationStore();
    const analysisResult = dataSpaceViewerState.dataSpaceAnalysisResult;
    const documentationUrl = analysisResult.supportInfo?.documentationUrl;
    const sectionRef = useRef<HTMLDivElement>(null);
    const anchor = generateAnchorForActivity(
      DATA_SPACE_VIEWER_ACTIVITY_MODE.DATA_ACCESS,
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
      if (documentationUrl) {
        applicationStore.navigationService.navigator.visitAddress(
          documentationUrl,
        );
      }
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
            {!dataSpaceViewerState.TEMPORARY__enableExperimentalFeatures && (
              <DataSpaceWikiPlaceholder message="View Data Access (Work in Progress)" />
            )}
            {dataSpaceViewerState.TEMPORARY__enableExperimentalFeatures && (
              <DataAccessOverview dataSpaceViewerState={dataSpaceViewerState} />
            )}
          </div>
        </div>
      </div>
    );
  },
);

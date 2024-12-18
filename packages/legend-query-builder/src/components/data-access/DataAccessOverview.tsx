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

import { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { useApplicationStore } from '@finos/legend-application';
import type {
  DataAccessState,
  DatasetAccessInfo,
} from '../../stores/data-access/DataAccessState.js';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  MinusCircleIcon,
  PanelLoadingIndicator,
  RefreshIcon,
  TimesCircleIcon,
  clsx,
} from '@finos/legend-art';
import {
  DataGrid,
  type DataGridCellRendererParams,
} from '@finos/legend-lego/data-grid';
import {
  DatasetEntitlementAccessApprovedReport,
  DatasetEntitlementAccessGrantedReport,
  DatasetEntitlementAccessNotGrantedReport,
  DatasetEntitlementAccessRequestedReport,
  DatasetEntitlementUnsupportedReport,
} from '@finos/legend-graph';
import { Chart as ChartJS, DoughnutController, ArcElement } from 'chart.js';
import { getNullableFirstEntry } from '@finos/legend-shared';
import type { QueryBuilder_LegendApplicationPlugin_Extension } from '../../stores/QueryBuilder_LegendApplicationPlugin_Extension.js';

ChartJS.register(DoughnutController, ArcElement);

const DataAccessOverviewChart = observer(
  (props: { dataAccessState: DataAccessState }) => {
    const { dataAccessState } = props;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<ChartJS>(null);
    const entitlementCheckInfo = dataAccessState.entitlementCheckInfo;
    const total = entitlementCheckInfo.total;
    const accessGrantedCount =
      getNullableFirstEntry(entitlementCheckInfo.data)?.count ?? 0;
    const accessGrantedPercentage =
      getNullableFirstEntry(entitlementCheckInfo.data)?.percentage ?? 0;

    useEffect(() => {
      if (canvasRef.current && !chartRef.current) {
        chartRef.current = new ChartJS(canvasRef.current, {
          type: 'doughnut',
          data: {
            labels: [],
            datasets: [],
          },
          options: {
            responsive: true,
            resizeDelay: 0,
            maintainAspectRatio: false,
            cutout: '75%',
          },
        });
      }

      return () => {
        chartRef.current?.destroy();
        chartRef.current = null;
      };
    }, []);

    useEffect(() => {
      if (chartRef.current) {
        chartRef.current.data = {
          labels: entitlementCheckInfo.data.map((item) => item.label),
          datasets: [
            {
              data: entitlementCheckInfo.data.map((item) => item.count),
              backgroundColor: entitlementCheckInfo.data.map(
                (item) => item.color,
              ),
              hoverBorderWidth: 0,
              borderWidth: 0,
            },
          ],
        };
        chartRef.current.options = {
          ...chartRef.current.options,
          plugins: {
            tooltip: {
              enabled: entitlementCheckInfo.total !== 0,
              usePointStyle: false,
              boxPadding: 5,
              callbacks: {
                labelPointStyle: () => ({
                  pointStyle: 'rectRounded',
                  rotation: 0,
                }),
              },
            },
          },
        };
        chartRef.current.update('resize');
      }
    }, [entitlementCheckInfo]);

    return (
      <div className="data-access-overview__chart">
        <div className="data-access-overview__chart__container">
          <canvas ref={canvasRef} />
          <div className="data-access-overview__chart__stats">
            <div className="data-access-overview__chart__stats__percentage">
              {total === 0 ? 0 : accessGrantedPercentage}%
            </div>
            <div className="data-access-overview__chart__stats__tally">
              {total === 0 ? 0 : accessGrantedCount}/{total}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

const AccessStatusCellRenderer = observer(
  (
    params: DataGridCellRendererParams<DatasetAccessInfo> & {
      dataAccessState: DataAccessState;
    },
  ) => {
    const { data, dataAccessState } = params;
    const applicationStore = useApplicationStore();

    if (!data) {
      return null;
    }

    if (
      data.entitlementReport instanceof DatasetEntitlementAccessGrantedReport
    ) {
      return (
        <div className="data-access-overview__grid__access-status-cell">
          <div className="data-access-overview__grid__access-status-cell__content">
            <div className="data-access-overview__grid__access-status-cell__icon data-access-overview__grid__access-status-cell__icon--access-granted">
              <CheckCircleIcon />
            </div>
            <div className="data-access-overview__grid__access-status-cell__text">
              Access Granted
            </div>
          </div>
        </div>
      );
    } else if (
      data.entitlementReport instanceof DatasetEntitlementAccessApprovedReport
    ) {
      return (
        <div className="data-access-overview__grid__access-status-cell">
          <div className="data-access-overview__grid__access-status-cell__content">
            <div className="data-access-overview__grid__access-status-cell__icon data-access-overview__grid__access-status-cell__icon--access-approved">
              <MinusCircleIcon />
            </div>
            <div className="data-access-overview__grid__access-status-cell__text">
              Access Approved
            </div>
          </div>
        </div>
      );
    } else if (
      data.entitlementReport instanceof DatasetEntitlementAccessRequestedReport
    ) {
      return (
        <div className="data-access-overview__grid__access-status-cell">
          <div className="data-access-overview__grid__access-status-cell__content">
            <div className="data-access-overview__grid__access-status-cell__icon data-access-overview__grid__access-status-cell__icon--access-requested">
              <ExclamationCircleIcon />
            </div>
            <div className="data-access-overview__grid__access-status-cell__text">
              Access Requested
            </div>
          </div>
        </div>
      );
    } else if (
      data.entitlementReport instanceof DatasetEntitlementAccessNotGrantedReport
    ) {
      const plugins = applicationStore.pluginManager
        .getApplicationPlugins()
        .flatMap(
          (plugin) =>
            (
              plugin as QueryBuilder_LegendApplicationPlugin_Extension
            ).getExtraDatasetEntitlementAccessNotGrantedReportActionConfigurations?.() ??
            [],
        );
      let action: React.ReactNode | undefined;
      for (const plugin of plugins) {
        action = plugin.renderer(data, dataAccessState);
        if (action) {
          break;
        }
      }
      return (
        <div className="data-access-overview__grid__access-status-cell">
          <div className="data-access-overview__grid__access-status-cell__content">
            <div className="data-access-overview__grid__access-status-cell__icon data-access-overview__grid__access-status-cell__icon--access-not-granted">
              <TimesCircleIcon />
            </div>
            <div className="data-access-overview__grid__access-status-cell__text">
              Access Not Granted
            </div>
          </div>
          {action && (
            <div className="data-access-overview__grid__access-status-cell__action">
              {action}
            </div>
          )}
        </div>
      );
    } else if (
      data.entitlementReport instanceof DatasetEntitlementUnsupportedReport
    ) {
      return (
        <div className="data-access-overview__grid__empty-cell">
          (unsupported)
        </div>
      );
    }

    return null;
  },
);

const DataAccessOverviewGrid = observer(
  (props: { dataAccessState: DataAccessState }) => {
    const { dataAccessState } = props;
    const darkMode =
      !dataAccessState.applicationStore.layoutService
        .TEMPORARY__isLightColorThemeEnabled;

    return (
      <div
        className={clsx('data-access-overview__grid', {
          'ag-theme-balham': !darkMode,
          'ag-theme-balham-dark': darkMode,
        })}
      >
        <DataGrid
          rowData={dataAccessState.datasets}
          gridOptions={{
            suppressScrollOnNewData: true,
            getRowId: (rowData) => rowData.data.uuid,
          }}
          columnDefs={[
            {
              minWidth: 50,
              sortable: true,
              resizable: true,
              field: 'specification.name',
              headerName: 'Dataset',
              flex: 1,
            },
            {
              minWidth: 50,
              sortable: true,
              resizable: true,
              field: 'specification.type',
              headerName: 'Type',
              flex: 1,
            },
            {
              minWidth: 50,
              sortable: true,
              resizable: true,
              headerName: 'Access Status',
              cellRendererParams: {
                dataAccessState,
              },
              cellRenderer: AccessStatusCellRenderer,
              flex: 1,
            },
          ]}
        />
      </div>
    );
  },
);

export const DataAccessOverview = observer(
  (props: {
    dataAccessState: DataAccessState;
    compact?: boolean | undefined;
  }) => {
    const { dataAccessState, compact } = props;
    const applicationStore = useApplicationStore();

    useEffect(() => {
      // NOTE: @YannanGao-gs - force refresh for now, let's investigate why the data is empty
      // when we fetched it from cache
      dataAccessState.refresh().catch(applicationStore.alertUnhandledError);
      // dataAccessState.intialize().catch(applicationStore.alertUnhandledError);
    }, [applicationStore, dataAccessState]);

    const renderWarehouseEntitlementTab = (): React.ReactNode => {
      const plugins = applicationStore.pluginManager
        .getApplicationPlugins()
        .flatMap(
          (plugin) =>
            (
              plugin as QueryBuilder_LegendApplicationPlugin_Extension
            ).getWarehouseEntitlementRenders?.() ?? [],
        );
      let warehouseEntitlementRender: React.ReactNode;
      for (const plugin of plugins) {
        warehouseEntitlementRender = plugin.renderer(dataAccessState);
        if (warehouseEntitlementRender) {
          break;
        }
      }
      return warehouseEntitlementRender;
    };
    const warehouseEntitlementTab = renderWarehouseEntitlementTab();

    return (
      <div
        className={clsx('data-access-overview', {
          'data-access-overview--compact': Boolean(compact),
        })}
      >
        <PanelLoadingIndicator
          isLoading={
            dataAccessState.surveyDatasetsState.isInProgress ||
            dataAccessState.checkEntitlementsState.isInProgress
          }
        />
        <div className="data-access-overview__actions">
          {Boolean(
            dataAccessState.datasets.find(
              (dataset) =>
                dataset.entitlementReport instanceof
                DatasetEntitlementUnsupportedReport,
            ),
          ) && (
            <div className="data-access-overview__actions__warning">
              Use case is not fully supported!
            </div>
          )}
          <button
            className="data-access-overview__actions__refresh-btn btn--dark"
            tabIndex={-1}
            title="Refresh"
            onClick={() => {
              dataAccessState
                .refresh()
                .catch(applicationStore.alertUnhandledError);
            }}
          >
            <RefreshIcon />
          </button>
        </div>
        <div className="data-access-overview__datasets">
          <div className="data-access-overview__header">
            DATASET ENTITLEMENTS
          </div>
          <DataAccessOverviewChart dataAccessState={dataAccessState} />
          <DataAccessOverviewGrid dataAccessState={dataAccessState} />
        </div>
        {warehouseEntitlementTab}
      </div>
    );
  },
);

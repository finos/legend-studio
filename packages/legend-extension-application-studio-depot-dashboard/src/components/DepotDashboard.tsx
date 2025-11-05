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

import { useEffect } from 'react';
import {
  useDepotSetupStore,
  withDepotSetupStore,
} from './DepotDashboardProvider.js';
import {
  ActivityBarMenu,
  generateViewVersionRoute,
} from '@finos/legend-application-studio';
import {
  AssistantIcon,
  CheckCircleIcon,
  CircleNotchIcon,
  clsx,
  CustomSelectorInput,
  InfoCircleIcon,
  WarningIcon,
} from '@finos/legend-art';
import {
  DataGrid,
  type DataGridCellRendererParams,
} from '@finos/legend-lego/data-grid';
import type { ColDef, ValueGetterParams } from 'ag-grid-community';
import {
  DATA_PRODUCT_DASHBOARD_HEADER,
  type DataProductDepotDashboardState,
  type DataProductEntityState,
  getDataProductGridValue,
} from '../stores/DepotDashboardStore.js';
import { observer } from 'mobx-react-lite';
import { flowResult } from 'mobx';
import {
  V1_dataProductAccessPointsHaveTitleAndDescription,
  V1_dataProductAcessPointGroupsHasTitleAndDescription,
  V1_dataProductHasTitleAndDescription,
} from '@finos/legend-graph';
import { DepotScope } from '@finos/legend-server-depot';

const EmptyCellRenderer = (col: string, message: string) => (
  <div
    className="no-value-cell"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      color: '#f59e0b', // amber color
      fontStyle: 'italic',
      fontSize: '12px',
    }}
    title={`No value provided for ${col}`}
  >
    <WarningIcon style={{ width: '14px', height: '14px', color: '#f59e0b' }} />
    <span>{message}</span>
  </div>
);

const DataProductValueRender = (value: string | number) => {
  return <div style={{ color: 'inherit' }}>{value}</div>;
};

const DataProductCellRenderer = (
  _param: DataGridCellRendererParams<DataProductEntityState>,
  col: DATA_PRODUCT_DASHBOARD_HEADER,
  value: string | number | false | undefined,
) => {
  if (value === false) {
    return EmptyCellRenderer(col, 'No value provided');
  }
  if (value === undefined) {
    return null;
  }

  return (
    <div style={{ color: 'inherit' }}>{DataProductValueRender(value)}</div>
  );
};

const ProjectIdCellRenderer = (
  params: DataGridCellRendererParams<DataProductEntityState>,
) => {
  const entityState = params.data;
  const projectId = entityState?.projectId;

  const getProjectUrl = (
    _entityState: DataProductEntityState,
    _projectId: string,
  ): string => {
    return _entityState.store.applicationStore.navigationService.navigator.generateAddress(
      generateViewVersionRoute(
        _projectId,
        _entityState.summary.versionId,
        _entityState.summary.path,
      ),
    );
  };

  const handleClick = (event: React.MouseEvent) => {
    if (!projectId) {
      return;
    }
    event.preventDefault();
    const url = getProjectUrl(entityState, projectId);
    entityState.store.applicationStore.navigationService.navigator.visitAddress(
      url,
    );
  };

  return (
    <div className="project-id-cell">
      {projectId ? (
        <a
          href="#"
          onClick={handleClick}
          className="project-id-link"
          style={{
            color: '#3b82f6', // blue color
            textDecoration: 'underline',
            cursor: 'pointer',
          }}
          title={`Open project: ${projectId}`}
        >
          {projectId}
        </a>
      ) : (
        <span style={{ color: '#6b7280' }}>-</span>
      )}
    </div>
  );
};

const buildColumnDefs = (): ColDef<DataProductEntityState>[] => {
  return [
    {
      headerName: '#',
      valueGetter: (params: ValueGetterParams<DataProductEntityState>) =>
        params.node?.rowIndex !== null ? (params.node?.rowIndex ?? 0) + 1 : '',
      width: 70,
      pinned: 'left',
    },
    {
      headerName: DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_NAME,
      valueGetter: (params: ValueGetterParams<DataProductEntityState>) => {
        return params.data?.name;
      },
      minWidth: 250,
    },
    {
      headerName: DATA_PRODUCT_DASHBOARD_HEADER.PROJECT_ID,
      cellRenderer: ProjectIdCellRenderer,
      minWidth: 250,
    },
    {
      headerName: DATA_PRODUCT_DASHBOARD_HEADER.PROJECT_GAV,
      valueGetter: (params: ValueGetterParams<DataProductEntityState>) =>
        params.data?.gaProject,
      minWidth: 250,
    },
    {
      headerName: DATA_PRODUCT_DASHBOARD_HEADER.PROJECT_VERSION,
      valueGetter: (params: ValueGetterParams<DataProductEntityState>) =>
        params.data?.summary.versionId,
      minWidth: 250,
    },
    {
      headerName: DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_PACKAGE,
      valueGetter: (params: ValueGetterParams<DataProductEntityState>) =>
        params.data?.package,
      minWidth: 250,
    },
    {
      headerName:
        DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_HAS_TITLE_DESCRIPTION,
      valueGetter: (params: ValueGetterParams<DataProductEntityState>) => {
        const dataProduct = params.data?.dataProduct;
        if (dataProduct) {
          return V1_dataProductHasTitleAndDescription(dataProduct)
            ? 'Yes'
            : 'No';
        }
        return null;
      },
      minWidth: 200,
    },
    {
      headerName:
        DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_HAS_ACESS_POINT_GROUP_TITLE_DESCRIPTION,
      valueGetter: (params: ValueGetterParams<DataProductEntityState>) => {
        const dataProduct = params.data?.dataProduct;
        if (dataProduct) {
          return V1_dataProductAcessPointGroupsHasTitleAndDescription(
            dataProduct,
          )
            ? 'Yes'
            : 'No';
        }
        return null;
      },
      minWidth: 200,
    },
    {
      headerName:
        DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_HAS_ACCESS_POINT_TITLE_DESCRIPTION,
      valueGetter: (params: ValueGetterParams<DataProductEntityState>) => {
        const dataProduct = params.data?.dataProduct;
        if (dataProduct) {
          return V1_dataProductAccessPointsHaveTitleAndDescription(dataProduct)
            ? 'Yes'
            : 'No';
        }
        return null;
      },
      minWidth: 200,
    },
    // title/description
    {
      headerName: DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_TITLE,
      cellRenderer: (
        params: DataGridCellRendererParams<DataProductEntityState>,
      ) => {
        return DataProductCellRenderer(
          params,
          DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_TITLE,
          getDataProductGridValue(
            params.data?.dataProduct,
            DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_TITLE,
          ),
        );
      },
      minWidth: 250,
    },
    {
      headerName: DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_DESCRIPTION,
      cellRenderer: (
        params: DataGridCellRendererParams<DataProductEntityState>,
      ) => {
        return DataProductCellRenderer(
          params,
          DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_DESCRIPTION,
          getDataProductGridValue(
            params.data?.dataProduct,
            DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_DESCRIPTION,
          ),
        );
      },
      minWidth: 300,
    },
    {
      headerName: DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_APG_Number,
      valueGetter: (params: ValueGetterParams<DataProductEntityState>) =>
        getDataProductGridValue(
          params.data?.dataProduct,
          DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_APG_Number,
        ),
      minWidth: 150,
    },
    {
      headerName: DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_APG_IDS,
      valueGetter: (params: ValueGetterParams<DataProductEntityState>) =>
        getDataProductGridValue(
          params.data?.dataProduct,
          DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_APG_IDS,
        ),
      minWidth: 300,
    },
    {
      headerName: DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_APG_TITLE,
      valueGetter: (params: ValueGetterParams<DataProductEntityState>) =>
        getDataProductGridValue(
          params.data?.dataProduct,
          DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_APG_TITLE,
        ),
      minWidth: 300,
    },
    {
      headerName: DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_APG_DESCRIPTION,
      valueGetter: (params: ValueGetterParams<DataProductEntityState>) =>
        getDataProductGridValue(
          params.data?.dataProduct,
          DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_APG_DESCRIPTION,
        ),
      minWidth: 300,
    },
    {
      headerName: DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_APG_NUMBER_OF_APS,
      valueGetter: (params: ValueGetterParams<DataProductEntityState>) =>
        getDataProductGridValue(
          params.data?.dataProduct,
          DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_APG_NUMBER_OF_APS,
        ),
      minWidth: 200,
    },

    {
      headerName: DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_REGIONS,
      cellRenderer: (
        params: DataGridCellRendererParams<DataProductEntityState>,
      ) => {
        return DataProductCellRenderer(
          params,
          DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_REGIONS,
          getDataProductGridValue(
            params.data?.dataProduct,
            DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_REGIONS,
          ),
        );
      },
      minWidth: 300,
    },
    {
      headerName: DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_DELIVERY_FREQUENCY,
      cellRenderer: (
        params: DataGridCellRendererParams<DataProductEntityState>,
      ) => {
        return DataProductCellRenderer(
          params,
          DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_DELIVERY_FREQUENCY,
          getDataProductGridValue(
            params.data?.dataProduct,
            DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_DELIVERY_FREQUENCY,
          ),
        );
      },
      minWidth: 300,
    },
    {
      headerName: DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_HAS_ICON,
      cellRenderer: (
        params: DataGridCellRendererParams<DataProductEntityState>,
      ) => {
        return DataProductCellRenderer(
          params,
          DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_HAS_ICON,
          getDataProductGridValue(
            params.data?.dataProduct,
            DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_HAS_ICON,
          ),
        );
      },
      minWidth: 300,
    },

    {
      headerName: DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_HAS_SAMPLE_VALUES,
      cellRenderer: (
        params: DataGridCellRendererParams<DataProductEntityState>,
      ) => {
        return DataProductCellRenderer(
          params,
          DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_HAS_SAMPLE_VALUES,
          getDataProductGridValue(
            params.data?.dataProduct,
            DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_HAS_SAMPLE_VALUES,
          ),
        );
      },
      minWidth: 300,
    },

    {
      headerName: DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_HAS_EXPERTISE,
      cellRenderer: (
        params: DataGridCellRendererParams<DataProductEntityState>,
      ) => {
        return DataProductCellRenderer(
          params,
          DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_HAS_EXPERTISE,
          getDataProductGridValue(
            params.data?.dataProduct,
            DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_HAS_EXPERTISE,
          ),
        );
      },
      minWidth: 300,
    },

    {
      headerName: DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_STEREOTYPES,
      cellRenderer: (
        params: DataGridCellRendererParams<DataProductEntityState>,
      ) => {
        return DataProductCellRenderer(
          params,
          DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_STEREOTYPES,
          getDataProductGridValue(
            params.data?.dataProduct,
            DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_STEREOTYPES,
          ),
        );
      },
      minWidth: 300,
    },

    {
      headerName: DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_TAGGED_VALUES,
      cellRenderer: (
        params: DataGridCellRendererParams<DataProductEntityState>,
      ) => {
        return DataProductCellRenderer(
          params,
          DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_TAGGED_VALUES,
          getDataProductGridValue(
            params.data?.dataProduct,
            DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_TAGGED_VALUES,
          ),
        );
      },
      minWidth: 300,
    },
  ];
};

// Enhanced progress header component with warning
const ProgressHeader = observer(
  (props: { dataProductDepotState: DataProductDepotDashboardState }) => {
    const { dataProductDepotState } = props;
    const progress = dataProductDepotState.fetchProgress;
    const isLoading = dataProductDepotState.fetchingProductsState.isInProgress;
    const isComplete =
      progress.fetched === progress.total && progress.total > 0;
    const hasWarning = dataProductDepotState.hasMaxCallsWarning;
    const warningMessage = dataProductDepotState.maxCallsWarningMessage;

    return (
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: '#2d3748', // Dark background
            border: '1px solid #4a5568', // Dark border
            borderRadius: '6px',
            marginBottom: hasWarning ? '8px' : '16px',
            fontSize: '14px',
            color: '#e2e8f0', // Light text color
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isLoading ? (
              <CircleNotchIcon
                className="spinning"
                style={{ color: '#60a5fa' }}
              />
            ) : isComplete ? (
              <CheckCircleIcon style={{ color: '#34d399' }} />
            ) : (
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: '#fbbf24',
                }}
              />
            )}
            <span style={{ fontWeight: '500', color: '#f7fafc' }}>
              Data Products: {progress.fetched} / {progress.total} fetched
            </span>
            {progress.total > 0 && (
              <span style={{ color: '#a0aec0' }}>({progress.percentage}%)</span>
            )}
          </div>

          {progress.total > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '100px',
                  height: '6px',
                  backgroundColor: '#4a5568',
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${progress.percentage}%`,
                    height: '100%',
                    backgroundColor: isComplete ? '#34d399' : '#60a5fa',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <span
                style={{ fontSize: '12px', color: '#a0aec0', minWidth: '60px' }}
              >
                {isLoading
                  ? 'Loading...'
                  : isComplete
                    ? 'Complete'
                    : 'In Progress'}
              </span>
            </div>
          )}
        </div>
        {hasWarning && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              backgroundColor: '#451a03',
              border: '1px solid #f59e0b',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '14px',
            }}
          >
            <WarningIcon
              style={{
                color: '#fbbf24',
                width: '16px',
                height: '16px',
                flexShrink: 0,
              }}
            />
            <div>
              <div
                style={{
                  fontWeight: '500',
                  color: '#fef3c7',
                  marginBottom: '2px',
                }}
              >
                Maximum Fetch Limit Reached
              </div>
              <div style={{ color: '#fde68a', fontSize: '13px' }}>
                {warningMessage}
              </div>
            </div>
            <InfoCircleIcon
              style={{
                color: '#fbbf24',
                width: '14px',
                height: '14px',
                marginLeft: 'auto',
                flexShrink: 0,
              }}
              title="This limit is set by MAX_CALLS in the store configuration"
            />
          </div>
        )}
      </div>
    );
  },
);

export const DepotDashboard = withDepotSetupStore(
  observer(() => {
    const depotSetupStore = useDepotSetupStore();
    const dataProductDepotState = depotSetupStore.dataProductDepotState;
    const applicationStore = depotSetupStore.applicationStore;
    const dataProductOption = {
      value: 'Data Product',
      label: 'Data Product',
    };
    const options = [dataProductOption];

    // Toggle handler
    const handleScopeToggle = (scope: DepotScope) => {
      flowResult(dataProductDepotState.handleScopeChange(scope)).catch(
        depotSetupStore.applicationStore.alertUnhandledError,
      );
    };

    const handleWorkspaceSnapshotToggle = () => {
      dataProductDepotState.setIncludeWorkspaceSnapshot(
        !dataProductDepotState.includeWorkspaceSnapshot,
      );
      flowResult(dataProductDepotState.init()).catch(
        depotSetupStore.applicationStore.alertUnhandledError,
      );
    };

    useEffect(() => {
      flowResult(dataProductDepotState.init()).catch(
        depotSetupStore.applicationStore.alertUnhandledError,
      );
    }, [
      dataProductDepotState,
      depotSetupStore.applicationStore.alertUnhandledError,
    ]);

    const toggleAssistant = (): void =>
      applicationStore.assistantService.toggleAssistant();
    return (
      <div className="app__page">
        <div className="depot-dashboard">
          <div className="depot-dashboard__body">
            <div className="activity-bar">
              <ActivityBarMenu />
            </div>
            <div className="depot-dashboard__container">
              <h1 className="depot-dashboard__title__header">
                Depot Dashboard
              </h1>
              <div className="depot-dashboard__options__panel">
                <ProgressHeader dataProductDepotState={dataProductDepotState} />
                <div
                  style={{
                    marginBottom: '1rem',
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontWeight: 500 }}>Scope:</span>
                  <button
                    type="button"
                    className={clsx('scope-toggle-btn', {
                      'scope-toggle-btn--active':
                        dataProductDepotState.scope === DepotScope.RELEASES,
                    })}
                    onClick={() => handleScopeToggle(DepotScope.RELEASES)}
                  >
                    Releases
                  </button>
                  <button
                    type="button"
                    className={clsx('scope-toggle-btn', {
                      'scope-toggle-btn--active':
                        dataProductDepotState.scope === DepotScope.SNAPSHOT,
                    })}
                    onClick={() => handleScopeToggle(DepotScope.SNAPSHOT)}
                  >
                    Snapshots
                  </button>
                  {dataProductDepotState.scope === DepotScope.SNAPSHOT && (
                    <label
                      style={{
                        marginLeft: '2rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontWeight: 500,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={dataProductDepotState.includeWorkspaceSnapshot}
                        onChange={handleWorkspaceSnapshotToggle}
                        style={{ accentColor: '#2563eb' }}
                      />
                      Include workspace snapshots
                    </label>
                  )}
                </div>
                <div className="panel__content__form__section__header__label">
                  Element Type
                </div>
                <CustomSelectorInput
                  options={options}
                  disabled={true}
                  isLoading={false}
                  onChange={(
                    option: { label: string; value: string } | null,
                  ) => {
                    //
                  }}
                  value={dataProductOption}
                  placeholder={'Choose an Element'}
                  className="depot-dashboard__selector"
                  darkMode={true}
                />
              </div>
              <div className="depot-dashboard__result__values__table">
                <div
                  className={clsx('query-builder__result__tds-grid', {
                    'ag-theme-balham-dark': true,
                  })}
                >
                  <DataGrid
                    rowData={
                      dataProductDepotState.dataProductEntitiesStates ?? null
                    }
                    gridOptions={{
                      suppressScrollOnNewData: true,
                      getRowId: (data) => `${data.data.id}`,
                      rowSelection: {
                        mode: 'multiRow',
                        checkboxes: false,
                        headerCheckbox: false,
                      },
                      suppressHorizontalScroll: false,
                      alwaysShowHorizontalScroll: true,
                      animateRows: true, // Smooth animations when rows update
                      rowBuffer: 10, // Keep extra rows rendered for smooth scrolling
                      onFirstDataRendered: (params) => {
                        dataProductDepotState.setGridApi(params.api);
                      },
                    }}
                    suppressFieldDotNotation={true}
                    suppressClipboardPaste={false}
                    suppressContextMenu={false}
                    defaultColDef={{
                      filter: true, // Enable filters for all columns
                      sortable: true, // Enable sorting for all columns
                      resizable: true, // Allow column resizing
                      floatingFilter: true, // Show floating filter row below headers
                    }}
                    columnDefs={buildColumnDefs()}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="editor__status-bar">
            <div className="editor__status-bar__left"></div>
            <div className="editor__status-bar__right">
              <button
                className={clsx(
                  'editor__status-bar__action editor__status-bar__action__toggler',
                  {
                    'editor__status-bar__action__toggler--active':
                      !applicationStore.assistantService.isHidden,
                  },
                )}
                onClick={toggleAssistant}
                tabIndex={-1}
                title="Toggle assistant"
              >
                <AssistantIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }),
);

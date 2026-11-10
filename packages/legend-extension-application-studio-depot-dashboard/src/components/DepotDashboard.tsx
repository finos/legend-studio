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
  DEPOT_DASHBOARD_ELEMENT_TYPE,
  GENERATION_SPECIFICATION_DASHBOARD_HEADER,
  type DataProductDepotDashboardState,
  type DataProductEntityState,
  type DepotDashboardStore,
  type GenerationSpecificationEntityState,
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

type DepotDashboardProjectRow = {
  projectId: string | undefined;
  summary: { versionId: string; path: string };
  store: DepotDashboardStore;
};

const ProjectIdCellRenderer = (
  params: DataGridCellRendererParams<DepotDashboardProjectRow>,
) => {
  const entityState = params.data;
  const projectId = entityState?.projectId;

  const getProjectUrl = (
    _entityState: DepotDashboardProjectRow,
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
            params.data?.store.applicationStore,
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
            params.data?.store.applicationStore,
          ),
        );
      },
      minWidth: 300,
    },
    {
      headerName: DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_APG_NUMBER,
      valueGetter: (params: ValueGetterParams<DataProductEntityState>) =>
        getDataProductGridValue(
          params.data?.dataProduct,
          DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_APG_NUMBER,
          params.data?.store.applicationStore,
        ),
      minWidth: 150,
    },
    {
      headerName: DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_APG_IDS,
      valueGetter: (params: ValueGetterParams<DataProductEntityState>) =>
        getDataProductGridValue(
          params.data?.dataProduct,
          DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_APG_IDS,
          params.data?.store.applicationStore,
        ),
      minWidth: 300,
    },
    {
      headerName: DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_APG_TITLE,
      valueGetter: (params: ValueGetterParams<DataProductEntityState>) =>
        getDataProductGridValue(
          params.data?.dataProduct,
          DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_APG_TITLE,
          params.data?.store.applicationStore,
        ),
      minWidth: 300,
    },
    {
      headerName: DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_APG_DESCRIPTION,
      valueGetter: (params: ValueGetterParams<DataProductEntityState>) =>
        getDataProductGridValue(
          params.data?.dataProduct,
          DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_APG_DESCRIPTION,
          params.data?.store.applicationStore,
        ),
      minWidth: 300,
    },
    {
      headerName: DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_APG_NUMBER_OF_APS,
      valueGetter: (params: ValueGetterParams<DataProductEntityState>) =>
        getDataProductGridValue(
          params.data?.dataProduct,
          DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_APG_NUMBER_OF_APS,
          params.data?.store.applicationStore,
        ),
      minWidth: 200,
    },
    {
      headerName: DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_HAS_MODEL_APG,
      valueGetter: (params: ValueGetterParams<DataProductEntityState>) =>
        getDataProductGridValue(
          params.data?.dataProduct,
          DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_HAS_MODEL_APG,
          params.data?.store.applicationStore,
        ),
      minWidth: 200,
    },
    {
      headerName:
        DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_HAS_MODEL_APG_FEATURED_ELEMENTS,
      valueGetter: (params: ValueGetterParams<DataProductEntityState>) =>
        getDataProductGridValue(
          params.data?.dataProduct,
          DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_HAS_MODEL_APG_FEATURED_ELEMENTS,
          params.data?.store.applicationStore,
        ),
      minWidth: 250,
    },
    {
      headerName: DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_HAS_NATIVE_APG,
      valueGetter: (params: ValueGetterParams<DataProductEntityState>) =>
        getDataProductGridValue(
          params.data?.dataProduct,
          DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_HAS_NATIVE_APG,
          params.data?.store.applicationStore,
        ),
      minWidth: 200,
    },
    {
      headerName:
        DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_HAS_ENTERPRISE_GROUP,
      cellRenderer: (
        params: DataGridCellRendererParams<DataProductEntityState>,
      ) => {
        return DataProductCellRenderer(
          params,
          DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_HAS_ENTERPRISE_GROUP,
          getDataProductGridValue(
            params.data?.dataProduct,
            DATA_PRODUCT_DASHBOARD_HEADER.DATA_PRODUCT_HAS_ENTERPRISE_GROUP,
            params.data?.store.applicationStore,
          ),
        );
      },
      minWidth: 300,
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
            params.data?.store.applicationStore,
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
            params.data?.store.applicationStore,
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
            params.data?.store.applicationStore,
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
            params.data?.store.applicationStore,
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
            params.data?.store.applicationStore,
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
            params.data?.store.applicationStore,
          ),
        );
      },
      minWidth: 300,
    },
  ];
};

const buildGenerationSpecificationColumnDefs =
  (): ColDef<GenerationSpecificationEntityState>[] => [
    {
      headerName: '#',
      valueGetter: (
        params: ValueGetterParams<GenerationSpecificationEntityState>,
      ) =>
        params.node?.rowIndex !== null ? (params.node?.rowIndex ?? 0) + 1 : '',
      width: 70,
      pinned: 'left',
    },
    {
      headerName: GENERATION_SPECIFICATION_DASHBOARD_HEADER.NAME,
      valueGetter: (
        params: ValueGetterParams<GenerationSpecificationEntityState>,
      ) => params.data?.name,
      minWidth: 250,
    },
    {
      headerName:
        GENERATION_SPECIFICATION_DASHBOARD_HEADER.GENERATION_ELEMENT_COUNT,
      valueGetter: (
        params: ValueGetterParams<GenerationSpecificationEntityState>,
      ) => params.data?.generationSpecification?.generationNodes.length,
      filter: 'agNumberColumnFilter',
      minWidth: 180,
    },
    {
      headerName:
        GENERATION_SPECIFICATION_DASHBOARD_HEADER.FILE_GENERATION_COUNT,
      valueGetter: (
        params: ValueGetterParams<GenerationSpecificationEntityState>,
      ) => params.data?.generationSpecification?.fileGenerations.length,
      filter: 'agNumberColumnFilter',
      minWidth: 180,
    },
    {
      headerName: DATA_PRODUCT_DASHBOARD_HEADER.PROJECT_ID,
      cellRenderer: ProjectIdCellRenderer,
      minWidth: 250,
    },
    {
      headerName: DATA_PRODUCT_DASHBOARD_HEADER.PROJECT_GAV,
      valueGetter: (
        params: ValueGetterParams<GenerationSpecificationEntityState>,
      ) => params.data?.gaProject,
      minWidth: 250,
    },
    {
      headerName: DATA_PRODUCT_DASHBOARD_HEADER.PROJECT_VERSION,
      valueGetter: (
        params: ValueGetterParams<GenerationSpecificationEntityState>,
      ) => params.data?.summary.versionId,
      minWidth: 150,
    },
    {
      headerName: GENERATION_SPECIFICATION_DASHBOARD_HEADER.PACKAGE,
      valueGetter: (
        params: ValueGetterParams<GenerationSpecificationEntityState>,
      ) => params.data?.package,
      minWidth: 250,
    },
    {
      headerName: GENERATION_SPECIFICATION_DASHBOARD_HEADER.GENERATION_ELEMENTS,
      valueGetter: (
        params: ValueGetterParams<GenerationSpecificationEntityState>,
      ) =>
        params.data?.generationSpecification?.generationNodes
          .map((node) => node.generationElement)
          .join(', '),
      minWidth: 400,
    },
    {
      headerName: GENERATION_SPECIFICATION_DASHBOARD_HEADER.FILE_GENERATIONS,
      valueGetter: (
        params: ValueGetterParams<GenerationSpecificationEntityState>,
      ) => params.data?.generationSpecification?.fileGenerations.join(', '),
      minWidth: 400,
    },
  ];

// Enhanced progress header component with warning
const ProgressHeader = observer(
  (props: {
    label: string;
    isLoading: boolean;
    source: Pick<
      DataProductDepotDashboardState,
      'fetchProgress' | 'hasMaxCallsWarning' | 'maxCallsWarningMessage'
    >;
  }) => {
    const { label, isLoading, source } = props;
    const progress = source.fetchProgress;
    const isComplete =
      progress.fetched === progress.total && progress.total > 0;
    const hasWarning = source.hasMaxCallsWarning;
    const warningMessage = source.maxCallsWarningMessage;

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
              {label}: {progress.fetched} / {progress.total} fetched
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
    const generationSpecificationDepotState =
      depotSetupStore.generationSpecificationDepotState;
    const isGenerationSpecification =
      depotSetupStore.elementType ===
      DEPOT_DASHBOARD_ELEMENT_TYPE.GENERATION_SPECIFICATION;
    // the scope controls act on the element type on display
    const scopedState = isGenerationSpecification
      ? generationSpecificationDepotState
      : dataProductDepotState;
    const applicationStore = depotSetupStore.applicationStore;
    // Track the active color theme so the AG-Grid skin and the selector follow
    // the rest of the app instead of being locked to dark. Computed reads on
    // `layoutService` stay reactive because this component is an `observer`.
    const darkMode =
      !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;
    const options = Object.values(DEPOT_DASHBOARD_ELEMENT_TYPE).map(
      (elementType) => ({ value: elementType, label: elementType }),
    );
    const selectedOption = {
      value: depotSetupStore.elementType,
      label: depotSetupStore.elementType,
    };

    // Toggle handler
    const handleScopeToggle = (scope: DepotScope) => {
      flowResult(scopedState.handleScopeChange(scope)).catch(
        depotSetupStore.applicationStore.alertUnhandledError,
      );
    };

    const handleWorkspaceSnapshotToggle = () => {
      scopedState.setIncludeWorkspaceSnapshot(
        !scopedState.includeWorkspaceSnapshot,
      );
      flowResult(scopedState.init()).catch(
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

    // generation specifications are fetched the first time they are shown
    useEffect(() => {
      if (
        isGenerationSpecification &&
        generationSpecificationDepotState.fetchingSummaryState.isInInitialState
      ) {
        flowResult(generationSpecificationDepotState.init()).catch(
          depotSetupStore.applicationStore.alertUnhandledError,
        );
      }
    }, [
      isGenerationSpecification,
      generationSpecificationDepotState,
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
                {isGenerationSpecification ? (
                  <ProgressHeader
                    label="Generation Specifications"
                    isLoading={
                      generationSpecificationDepotState.fetchingSummaryState
                        .isInProgress
                    }
                    source={generationSpecificationDepotState}
                  />
                ) : (
                  <ProgressHeader
                    label="Data Products"
                    isLoading={
                      dataProductDepotState.fetchingProductsState.isInProgress
                    }
                    source={dataProductDepotState}
                  />
                )}
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
                        scopedState.scope === DepotScope.RELEASES,
                    })}
                    onClick={() => handleScopeToggle(DepotScope.RELEASES)}
                  >
                    Releases
                  </button>
                  <button
                    type="button"
                    className={clsx('scope-toggle-btn', {
                      'scope-toggle-btn--active':
                        scopedState.scope === DepotScope.SNAPSHOT,
                    })}
                    onClick={() => handleScopeToggle(DepotScope.SNAPSHOT)}
                  >
                    Snapshots
                  </button>
                  {scopedState.scope === DepotScope.SNAPSHOT && (
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
                        checked={scopedState.includeWorkspaceSnapshot}
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
                  inputId="depot-dashboard-element-type"
                  options={options}
                  isLoading={false}
                  onChange={(
                    option: {
                      label: string;
                      value: DEPOT_DASHBOARD_ELEMENT_TYPE;
                    } | null,
                  ) => {
                    if (option) {
                      depotSetupStore.setElementType(option.value);
                    }
                  }}
                  value={selectedOption}
                  placeholder={'Choose an Element'}
                  className="depot-dashboard__selector"
                  darkMode={darkMode}
                />
              </div>
              <div className="depot-dashboard__result__values__table">
                <div
                  className={clsx('query-builder__result__tds-grid', {
                    'ag-theme-balham': !darkMode,
                    'ag-theme-balham-dark': darkMode,
                  })}
                >
                  {isGenerationSpecification ? (
                    <DataGrid
                      key="generation-specifications"
                      rowData={
                        generationSpecificationDepotState.entityStates ?? null
                      }
                      gridOptions={{
                        suppressScrollOnNewData: true,
                        getRowId: (data) => `${data.data.id}`,
                        suppressHorizontalScroll: false,
                        alwaysShowHorizontalScroll: true,
                        rowBuffer: 10,
                        onFirstDataRendered: (params) => {
                          generationSpecificationDepotState.setGridApi(
                            params.api,
                          );
                        },
                      }}
                      suppressFieldDotNotation={true}
                      suppressClipboardPaste={false}
                      suppressContextMenu={false}
                      defaultColDef={{
                        filter: true,
                        sortable: true,
                        resizable: true,
                        floatingFilter: true,
                      }}
                      columnDefs={buildGenerationSpecificationColumnDefs()}
                    />
                  ) : (
                    <DataGrid
                      key="data-products"
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
                  )}
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

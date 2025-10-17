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
  CaretDownIcon,
  clsx,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
  InfoCircleOutlineIcon,
  MarkdownTextViewer,
  QuestionCircleIcon,
  CustomSelectorInput,
  DataCubeIcon,
  PythonIcon,
  SQLIcon,
  PowerBiIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  type DataGridColumnDefinition,
  DataGrid,
} from '@finos/legend-lego/data-grid';
import {
  type V1_RelationTypeColumn,
  extractElementNameFromPath,
  V1_AdHocDeploymentDataProductOrigin,
  V1_AppliedFunction,
  V1_AppliedProperty,
  V1_CBoolean,
  V1_CByteArray,
  V1_CDateTime,
  V1_CDecimal,
  V1_CFloat,
  V1_CInteger,
  V1_CStrictDate,
  V1_CStrictTime,
  V1_CString,
  V1_DataProductOriginType,
  V1_EnumValue,
  V1_getGenericTypeFullPath,
  V1_SdlcDeploymentDataProductOrigin,
  V1_transformDataContractToLiteDatacontract,
} from '@finos/legend-graph';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import {
  CODE_EDITOR_LANGUAGE,
  CODE_EDITOR_THEME,
} from '@finos/legend-code-editor';
import {
  Box,
  Button,
  ButtonGroup,
  Menu,
  MenuItem,
  Tab,
  Tabs,
  Tooltip,
} from '@mui/material';
import { useAuth } from 'react-oidc-context';
import { guaranteeNonNullable, isNonEmptyString } from '@finos/legend-shared';
import { type DataProductDataAccessState } from '../../stores/DataProduct/DataProductDataAccessState.js';
import type { DataProductViewerState } from '../../stores/DataProduct/DataProductViewerState.js';
import {
  generateAnchorForSection,
  DATA_PRODUCT_VIEWER_SECTION,
} from '../../stores/ProductViewerNavigation.js';
import { EntitlementsDataContractViewerState } from '../../stores/DataProduct/EntitlementsDataContractViewerState.js';
import { EntitlementsDataContractCreator } from './DataContract/EntitlementsDataContractCreator.js';
import { EntitlementsDataContractViewer } from './DataContract/EntitlementsDataContractViewer.js';
import { DataProductSubscriptionViewer } from './Subscriptions/DataProductSubscriptionsViewer.js';
import {
  type DataProductAPGState,
  AccessPointGroupAccess,
} from '../../stores/DataProduct/DataProductAPGState.js';
import type { DataProductAccessPointState } from '../../stores/DataProduct/DataProductAccessPointState.js';

const WORK_IN_PROGRESS = 'Work in progress';
const DEFAULT_CONSUMER_WAREHOUSE = 'LAKEHOUSE_CONSUMER_DEFAULT_WH';
const LAKEHOUSE_CONSUMER_DATA_CUBE_SOURCE_TYPE = 'lakehouseConsumer';
const MAX_GRID_AUTO_HEIGHT_ROWS = 10; // Maximum number of rows to show before switching to normal height (scrollable grid)

export const DataProductMarkdownTextViewer: React.FC<{ value: string }> = (
  props,
) => (
  <MarkdownTextViewer
    className="data-product__viewer__markdown-text-viewer"
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

export const TabMessageScreen = observer((props: { message: string }) => {
  const { message } = props;

  return (
    <Box className="data-product__viewer__tab-screen">
      <span>{message}</span>
    </Box>
  );
});

export const PowerBiScreen = observer(
  (props: {
    accessPointState: DataProductAccessPointState;
    dataAccessState: DataProductDataAccessState | undefined;
  }) => {
    const { accessPointState, dataAccessState } = props;

    if (
      !(
        dataAccessState?.entitlementsDataProductDetails.origin instanceof
        V1_SdlcDeploymentDataProductOrigin
      ) ||
      !accessPointState.apgState.dataProductViewerState.openPowerBi
    ) {
      return (
        <TabMessageScreen message="Adhoc data products not supported in Power BI" />
      );
    }

    const loadPowerBi = (): void => {
      if (dataAccessState.dataProductViewerState.openPowerBi) {
        const apg = accessPointState.apgState.apg.id;
        dataAccessState.dataProductViewerState.openPowerBi(apg);
      }
    };

    return (
      <div className="data-product__viewer__tab-screen">
        <button
          onClick={loadPowerBi}
          tabIndex={-1}
          className="data-product__viewer__tab-screen__btn"
          title="Open in Power BI"
        >
          Open in Power BI
        </button>
      </div>
    );
  },
);

export const DataCubeScreen = observer(
  (props: {
    accessPointState: DataProductAccessPointState;
    dataAccessState: DataProductDataAccessState | undefined;
  }) => {
    const { accessPointState, dataAccessState } = props;

    const auth = useAuth();
    const [selectedEnvironment, setSelectedEnvironment] = useState<string>('');

    useEffect(() => {
      const fetchEnvironments = async (): Promise<void> => {
        if (dataAccessState?.ingestEnvironmentFetchState.isInInitialState) {
          await dataAccessState.fetchIngestEnvironmentDetails(
            auth.user?.access_token,
          );
        }
      };
      // eslint-disable-next-line no-void
      void fetchEnvironments();
    }, [auth.user?.access_token, dataAccessState]);

    const loadDataCube = (): void => {
      const origin = dataAccessState?.entitlementsDataProductDetails.origin;
      //paths
      const path = accessPointState.apgState.dataProductViewerState.getPath();
      const accessPointName = accessPointState.accessPoint.id;
      const accessPointPath = [
        guaranteeNonNullable(path),
        guaranteeNonNullable(accessPointName),
      ];

      const baseSource = {
        _type: LAKEHOUSE_CONSUMER_DATA_CUBE_SOURCE_TYPE,
        warehouse: DEFAULT_CONSUMER_WAREHOUSE,
        environment: selectedEnvironment,
        paths: accessPointPath,
      };

      let sourceData: Record<string, unknown>;
      const deploymentId =
        dataAccessState?.entitlementsDataProductDetails.deploymentId;
      if (origin instanceof V1_SdlcDeploymentDataProductOrigin) {
        sourceData = {
          ...baseSource,
          dpCoordinates: {
            groupId: origin.group,
            artifactId: origin.artifact,
            versionId: origin.version,
          },
        };
      } else if (
        origin instanceof V1_AdHocDeploymentDataProductOrigin &&
        deploymentId !== undefined
      ) {
        sourceData = {
          ...baseSource,
          origin: { _type: V1_DataProductOriginType.AD_HOC_DEPLOYMENT },
          deploymentId,
        };
      } else {
        accessPointState.apgState.applicationStore.notificationService.notifyError(
          new Error(
            'Failed to open DataCube: unsupported data product origin.',
          ),
        );
        return;
      }
      if (accessPointState.apgState.dataProductViewerState.openDataCube) {
        accessPointState.apgState.dataProductViewerState.openDataCube(
          sourceData,
        );
      }
    };

    return (
      <div className="data-product__viewer__tab-screen">
        <CustomSelectorInput
          className="data-product__viewer__tab-screen__dropdown"
          options={dataAccessState?.environmentDropDownValues.map((env) => ({
            label: env,
            value: env,
          }))}
          isLoading={dataAccessState?.ingestEnvironmentFetchState.isInProgress}
          onChange={(newValue: { label: string; value: string } | null) => {
            setSelectedEnvironment(newValue?.value ?? '');
          }}
          value={
            selectedEnvironment
              ? {
                  label: selectedEnvironment,
                  value: selectedEnvironment,
                }
              : null
          }
          placeholder={`Choose an Environment`}
          isClearable={false}
          escapeClearsValue={true}
        />
        <button
          onClick={loadDataCube}
          tabIndex={-1}
          disabled={!selectedEnvironment}
          className="data-product__viewer__tab-screen__btn"
          title="Open in Datacube"
        >
          Open in Datacube
        </button>
      </div>
    );
  },
);

const AccessPointTable = observer(
  (props: {
    accessPointState: DataProductAccessPointState;
    dataAccessState: DataProductDataAccessState | undefined;
  }): React.ReactNode => {
    const { accessPointState, dataAccessState } = props;

    const enum DataProductTabs {
      COLUMNS = 'Columns',
      GRAMMAR = 'Grammar',
      DATACUBE = 'Datacube',
      POWER_BI = 'Power BI',
      PYTHON = 'Python',
      SQL = 'SQL',
    }
    const [selectedTab, setSelectedTab] = useState(DataProductTabs.COLUMNS);
    const handleTabChange = (
      _: React.SyntheticEvent,
      newValue: DataProductTabs,
    ) => {
      setSelectedTab(newValue);
    };

    const relationColumnDefs: DataGridColumnDefinition<V1_RelationTypeColumn>[] =
      [
        {
          headerName: 'Column Name',
          field: 'name',
          flex: 1,
        },
        {
          headerName: 'Column Type',
          flex: 1,
          valueGetter: (_params) =>
            _params.data
              ? `${extractElementNameFromPath(
                  V1_getGenericTypeFullPath(_params.data.genericType),
                )}${
                  _params.data.genericType.typeVariableValues.length > 0
                    ? `(${_params.data.genericType.typeVariableValues
                        .map((valueSpec) => {
                          // TODO: Move V1_stringifyValueSpecification out of
                          // @finos/legend-query-builder so it can be used in other packages
                          if (
                            valueSpec instanceof V1_CDateTime ||
                            valueSpec instanceof V1_CStrictDate ||
                            valueSpec instanceof V1_CStrictTime ||
                            valueSpec instanceof V1_CString ||
                            valueSpec instanceof V1_CBoolean ||
                            valueSpec instanceof V1_CByteArray ||
                            valueSpec instanceof V1_CDecimal ||
                            valueSpec instanceof V1_CFloat ||
                            valueSpec instanceof V1_CFloat ||
                            valueSpec instanceof V1_CInteger ||
                            valueSpec instanceof V1_EnumValue
                          ) {
                            return valueSpec.value.toString();
                          } else if (valueSpec instanceof V1_AppliedProperty) {
                            return valueSpec.property;
                          } else if (valueSpec instanceof V1_AppliedFunction) {
                            return valueSpec.function;
                          } else {
                            return '';
                          }
                        })
                        .join(',')})`
                    : ''
                }`
              : '',
        },
      ];

    return (
      <div>
        <div className="data-product__viewer__tabs-bar">
          <Tabs
            value={selectedTab}
            onChange={handleTabChange}
            className="data-product__viewer__tabs"
          >
            <Tab
              className={clsx('data-product__viewer__tab', {
                'data-product__viewer__tab--selected':
                  selectedTab === DataProductTabs.COLUMNS,
              })}
              label={<span>Column Specifications</span>}
              value={DataProductTabs.COLUMNS}
            />
            <Tab
              className={clsx('data-product__viewer__tab', {
                'data-product__viewer__tab--selected':
                  selectedTab === DataProductTabs.GRAMMAR,
              })}
              label={<span>Grammar</span>}
              value={DataProductTabs.GRAMMAR}
            />
            <Tab
              className={clsx('data-product__viewer__tab', {
                'data-product__viewer__tab--selected':
                  selectedTab === DataProductTabs.DATACUBE,
              })}
              label={
                <span className="label-container">
                  <DataCubeIcon.Cube
                    className={clsx('data-product__viewer__tab-icon', {
                      'data-product__viewer__tab-icon--selected':
                        selectedTab === DataProductTabs.DATACUBE,
                    })}
                  />
                  <span>Datacube</span>
                </span>
              }
              value={DataProductTabs.DATACUBE}
            />
            <Tab
              className={clsx('data-product__viewer__tab', {
                'data-product__viewer__tab--selected':
                  selectedTab === DataProductTabs.POWER_BI,
              })}
              label={
                <span className="label-container">
                  <PowerBiIcon
                    className={clsx('data-product__viewer__tab-icon', {
                      'data-product__viewer__tab-icon--selected':
                        selectedTab === DataProductTabs.POWER_BI,
                    })}
                  />
                  <span>Power BI</span>
                </span>
              }
              value={DataProductTabs.POWER_BI}
            />
            <Tab
              className={clsx('data-product__viewer__tab', {
                'data-product__viewer__tab--selected':
                  selectedTab === DataProductTabs.PYTHON,
              })}
              label={
                <span className="label-container">
                  <PythonIcon
                    className={clsx('data-product__viewer__tab-icon', {
                      'data-product__viewer__tab-icon--selected':
                        selectedTab === DataProductTabs.PYTHON,
                    })}
                  />
                  <span>Python</span>
                </span>
              }
              value={DataProductTabs.PYTHON}
            />
            <Tab
              className={clsx('data-product__viewer__tab', {
                'data-product__viewer__tab--selected':
                  selectedTab === DataProductTabs.SQL,
              })}
              label={
                <span className="label-container">
                  <SQLIcon
                    className={clsx('data-product__viewer__tab-icon', {
                      'data-product__viewer__tab-icon--selected':
                        selectedTab === DataProductTabs.SQL,
                    })}
                  />
                  <span>SQL</span>
                </span>
              }
              value={DataProductTabs.SQL}
            />
          </Tabs>
        </div>
        <div className="access_group_gap" />
        <Box className="data-product__viewer__more-info__container">
          {selectedTab === DataProductTabs.COLUMNS && (
            <>
              {accessPointState.fetchingRelationTypeState.isInProgress ? (
                <Box className="data-product__viewer__more-info__loading-indicator">
                  <CubesLoadingIndicator isLoading={true}>
                    <CubesLoadingIndicatorIcon />
                  </CubesLoadingIndicator>
                </Box>
              ) : accessPointState.fetchingRelationTypeState.hasCompleted ? (
                <Box
                  className={clsx(
                    'data-product__viewer__more-info__columns-grid ag-theme-balham',
                    {
                      'data-product__viewer__more-info__columns-grid--auto-height':
                        (accessPointState.relationType?.columns.length ?? 0) <=
                        MAX_GRID_AUTO_HEIGHT_ROWS,
                      'data-product__viewer__more-info__columns-grid--auto-height--empty':
                        (accessPointState.relationType?.columns.length ?? 0) ===
                        0,
                      'data-product__viewer__more-info__columns-grid--auto-height--non-empty':
                        (accessPointState.relationType?.columns.length ?? 0) >
                          0 &&
                        (accessPointState.relationType?.columns.length ?? 0) <=
                          MAX_GRID_AUTO_HEIGHT_ROWS,
                    },
                  )}
                >
                  <DataGrid
                    rowData={accessPointState.relationType?.columns ?? []}
                    columnDefs={relationColumnDefs}
                    domLayout={
                      (accessPointState.relationType?.columns.length ?? 0) >
                      MAX_GRID_AUTO_HEIGHT_ROWS
                        ? 'normal'
                        : 'autoHeight'
                    }
                  />
                </Box>
              ) : (
                <TabMessageScreen message="Unable to fetch access point columns" />
              )}
            </>
          )}
          {selectedTab === DataProductTabs.GRAMMAR && (
            <>
              {accessPointState.fetchingGrammarState.isInProgress ? (
                <Box className="data-product__viewer__more-info__loading-indicator">
                  <CubesLoadingIndicator isLoading={true}>
                    <CubesLoadingIndicatorIcon />
                  </CubesLoadingIndicator>
                </Box>
              ) : accessPointState.fetchingGrammarState.hasCompleted ? (
                <Box className="data-product__viewer__more-info__grammar">
                  <CodeEditor
                    inputValue={
                      accessPointState.grammar ?? 'Unable to fetch grammar'
                    }
                    isReadOnly={true}
                    language={CODE_EDITOR_LANGUAGE.TEXT}
                    hideMinimap={true}
                    hideGutter={true}
                    hideActionBar={true}
                    lightTheme={CODE_EDITOR_THEME.GITHUB_LIGHT}
                    extraEditorOptions={{
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                    }}
                  />
                </Box>
              ) : (
                <TabMessageScreen message="Unable to fetch access point grammar" />
              )}
            </>
          )}
          {selectedTab === DataProductTabs.DATACUBE && (
            <DataCubeScreen
              accessPointState={accessPointState}
              dataAccessState={dataAccessState}
            />
          )}
          {selectedTab === DataProductTabs.POWER_BI && (
            <PowerBiScreen
              accessPointState={accessPointState}
              dataAccessState={dataAccessState}
            />
          )}
          {selectedTab === DataProductTabs.PYTHON && (
            <TabMessageScreen message={WORK_IN_PROGRESS} />
          )}
          {selectedTab === DataProductTabs.SQL && (
            <TabMessageScreen message={WORK_IN_PROGRESS} />
          )}
        </Box>
      </div>
    );
  },
);

export const DataProductAccessPointGroupViewer = observer(
  (props: {
    apgState: DataProductAPGState;
    dataAccessState: DataProductDataAccessState | undefined;
  }) => {
    const { apgState, dataAccessState } = props;
    const accessPointStates = apgState.accessPointStates;

    const auth = useAuth();
    const [showSubscriptionsModal, setShowSubscriptionsModal] = useState(false);
    const [isEntitledButtonGroupMenuOpen, setIsEntitledButtonGroupMenuOpen] =
      useState(false);
    const requestAccessButtonGroupRef = useRef<HTMLDivElement | null>(null);

    const entitlementsDataContractViewerState = useMemo(() => {
      return dataAccessState?.dataContract
        ? new EntitlementsDataContractViewerState(
            V1_transformDataContractToLiteDatacontract(
              dataAccessState.dataContract,
            ),
            apgState.applicationStore,
            dataAccessState.lakehouseContractServerClient,
            apgState.dataProductViewerState.userSearchService,
          )
        : undefined;
    }, [
      apgState.applicationStore,
      apgState.dataProductViewerState.userSearchService,
      dataAccessState?.dataContract,
      dataAccessState?.lakehouseContractServerClient,
    ]);
    useEffect(() => {
      if (
        dataAccessState?.lakehouseContractServerClient &&
        apgState.access === AccessPointGroupAccess.APPROVED &&
        apgState.associatedContract &&
        apgState.fetchingSubscriptionsState.isInInitialState
      ) {
        apgState.fetchSubscriptions(
          apgState.associatedContract.guid,
          dataAccessState.lakehouseContractServerClient,
          auth.user?.access_token,
        );
      }
    }, [apgState, auth.user?.access_token, dataAccessState]);
    const handleContractsClick = (): void => {
      if (dataAccessState) {
        apgState.handleContractClick(dataAccessState);
      }
    };

    const handleSubscriptionsClick = (): void => {
      setShowSubscriptionsModal(true);
    };
    const renderAccess = (val: AccessPointGroupAccess): React.ReactNode => {
      let buttonLabel: string | undefined = undefined;
      let onClick: (() => void) | undefined = undefined;
      let buttonColor: 'info' | 'primary' | 'warning' | 'success' | undefined =
        undefined;
      switch (val) {
        case AccessPointGroupAccess.UNKNOWN:
          buttonLabel = 'UNKNOWN';
          buttonColor = 'info';
          break;
        case AccessPointGroupAccess.NO_ACCESS:
        case AccessPointGroupAccess.DENIED:
          buttonLabel = 'REQUEST ACCESS';
          onClick = handleContractsClick;
          buttonColor = 'primary';
          break;
        case AccessPointGroupAccess.PENDING_MANAGER_APPROVAL:
          buttonLabel = 'PENDING MANAGER APPROVAL';
          onClick = handleContractsClick;
          buttonColor = 'warning';
          break;
        case AccessPointGroupAccess.PENDING_DATA_OWNER_APPROVAL:
          buttonLabel = 'PENDING DATA OWNER APPROVAL';
          onClick = handleContractsClick;
          buttonColor = 'warning';
          break;
        case AccessPointGroupAccess.APPROVED:
          buttonLabel = 'ENTITLED';
          onClick = handleContractsClick;
          buttonColor = 'success';
          break;
        case AccessPointGroupAccess.ENTERPRISE:
          buttonLabel = 'ENTERPRISE ACCESS';
          buttonColor = 'success';
          break;
        default:
          buttonLabel = undefined;
      }

      if (buttonLabel === undefined) {
        return null;
      }
      const tooltipText = dataAccessState?.dataAccessPlugins
        .flatMap((plugin) => plugin.getExtraAccessPointGroupAccessInfo?.(val))
        .filter(isNonEmptyString)[0];

      return (
        <>
          <ButtonGroup
            variant="contained"
            color={buttonColor ?? 'primary'}
            ref={requestAccessButtonGroupRef}
          >
            <Button
              onClick={onClick}
              loading={
                apgState.fetchingAccessState.isInProgress ||
                apgState.handlingContractsState.isInProgress ||
                apgState.fetchingUserAccessState.isInProgress
              }
              disabled={dataAccessState === undefined}
              title={
                dataAccessState === undefined
                  ? 'Data access state not configured'
                  : undefined
              }
              sx={{ cursor: onClick === undefined ? 'default' : 'pointer' }}
            >
              {buttonLabel}
              {tooltipText !== undefined && (
                <Tooltip
                  className="data-product__viewer__access-group__item__access__tooltip__icon"
                  title={tooltipText}
                  arrow={true}
                  slotProps={{
                    tooltip: {
                      className:
                        'data-product__viewer__access-group__item__access__tooltip',
                    },
                  }}
                >
                  <InfoCircleOutlineIcon />
                </Tooltip>
              )}
            </Button>
            <Button
              size="small"
              onClick={() => setIsEntitledButtonGroupMenuOpen((prev) => !prev)}
              title={
                dataAccessState === undefined
                  ? 'Data access state not configured'
                  : 'More options'
              }
              loading={
                apgState.fetchingAccessState.isInProgress ||
                apgState.handlingContractsState.isInProgress ||
                apgState.fetchingUserAccessState.isInProgress
              }
              disabled={dataAccessState === undefined}
            >
              <CaretDownIcon />
            </Button>
          </ButtonGroup>
          <Menu
            anchorEl={requestAccessButtonGroupRef.current}
            open={isEntitledButtonGroupMenuOpen}
            onClose={() => setIsEntitledButtonGroupMenuOpen(false)}
          >
            {val !== AccessPointGroupAccess.NO_ACCESS &&
              val !== AccessPointGroupAccess.DENIED && (
                <MenuItem
                  onClick={() => {
                    dataAccessState?.setDataContractAccessPointGroup(
                      apgState.apg,
                    );
                    setIsEntitledButtonGroupMenuOpen(false);
                  }}
                >
                  Request Access for Others
                </MenuItem>
              )}
            <MenuItem
              onClick={() => {
                handleSubscriptionsClick();
                setIsEntitledButtonGroupMenuOpen(false);
              }}
            >
              Manage Subscriptions
            </MenuItem>
          </Menu>
        </>
      );
    };

    return (
      <div className="data-product__viewer__access-group__item">
        <div className="data-product__viewer__access-group__item__header">
          <div className="data-product__viewer__access-group__item__header-main">
            <div className="data-product__viewer__access-group__item__header__title">
              {apgState.apg.id}
            </div>
            <div className="data-product__viewer__access-group__item__header__type">
              LAKEHOUSE
            </div>
            <button
              className="data-product__viewer__access-group__item__header__anchor"
              tabIndex={-1}
            >
              <AnchorLinkIcon />
            </button>
          </div>
          <Box className="data-product__viewer__access-group__item__header__actions">
            {renderAccess(apgState.access)}
          </Box>
        </div>
        <div className="data-product__viewer__access-group__item__description">
          <DataProductMarkdownTextViewer
            value={apgState.apg.description ?? ''}
          />
        </div>
        <div className="data-product__viewer__access-group__item__content">
          <div className="data-product__viewer__access-group__item__content__tab__content">
            {accessPointStates.map((accessPointState) => (
              <div
                key={accessPointState.accessPoint.id}
                className="data-product__viewer__access-point-section access_group_gap"
              >
                <div className="data-product__viewer__access-point__info">
                  <div className="data-product__viewer__access-point__name">
                    <strong>{accessPointState.accessPoint.id}</strong>
                  </div>
                  <div className="data-product__viewer__access-point__description">
                    {accessPointState.accessPoint.description?.trim() ?? (
                      <span className="data-product__viewer__grid__empty-cell">
                        No description to provide
                      </span>
                    )}
                  </div>
                </div>
                <div className="data-product__viewer__access-point__tabs">
                  <AccessPointTable
                    accessPointState={accessPointState}
                    dataAccessState={dataAccessState}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        {dataAccessState?.dataContractAccessPointGroup === apgState.apg && (
          <EntitlementsDataContractCreator
            open={true}
            onClose={() =>
              dataAccessState.setDataContractAccessPointGroup(undefined)
            }
            apgState={apgState}
            dataAccessState={dataAccessState}
            token={auth.user?.access_token}
          />
        )}
        {entitlementsDataContractViewerState && dataAccessState && (
          <EntitlementsDataContractViewer
            open={true}
            onClose={() => dataAccessState.setDataContract(undefined)}
            currentViewer={entitlementsDataContractViewerState}
            apgState={apgState}
            getContractTaskUrl={dataAccessState.getContractTaskUrl}
            getDataProductUrl={dataAccessState.getDataProductUrl}
          />
        )}
        {dataAccessState && apgState.associatedContract !== false && (
          <DataProductSubscriptionViewer
            open={showSubscriptionsModal}
            apgState={apgState}
            dataAccessState={dataAccessState}
            onClose={() => setShowSubscriptionsModal(false)}
          />
        )}
      </div>
    );
  },
);
export const DataProducteDataAccess = observer(
  (props: {
    dataProductViewerState: DataProductViewerState;
    dataProductDataAccessState: DataProductDataAccessState | undefined;
  }) => {
    const { dataProductViewerState, dataProductDataAccessState } = props;
    const documentationUrl = 'todo.com';
    const sectionRef = useRef<HTMLDivElement>(null);
    const anchor = generateAnchorForSection(
      DATA_PRODUCT_VIEWER_SECTION.DATA_ACCESS,
    );
    useEffect(() => {
      if (sectionRef.current) {
        dataProductViewerState.layoutState.setWikiPageAnchor(
          anchor,
          sectionRef.current,
        );
      }
      return () =>
        dataProductViewerState.layoutState.unsetWikiPageAnchor(anchor);
    }, [dataProductViewerState, anchor]);

    const seeDocumentation = (): void => {
      dataProductViewerState.applicationStore.navigationService.navigator.visitAddress(
        documentationUrl,
      );
    };

    return (
      <div ref={sectionRef} className="data-product__viewer__wiki__section">
        <div className="data-product__viewer__wiki__section__header">
          <div className="data-product__viewer__wiki__section__header__label">
            Data Access
            <button
              className="data-product__viewer__wiki__section__header__anchor"
              tabIndex={-1}
              onClick={() => dataProductViewerState.changeZone(anchor, true)}
            >
              <AnchorLinkIcon />
            </button>
          </div>
          {Boolean(documentationUrl) && (
            <button
              className="data-product__viewer__wiki__section__header__documentation"
              tabIndex={-1}
              onClick={seeDocumentation}
              title="See Documentation"
            >
              <QuestionCircleIcon />
            </button>
          )}
        </div>
        <div className="data-product__viewer__wiki__section__content">
          <div className="data-product__viewer__data-access">
            {dataProductViewerState.apgStates.map((groupState) => (
              <DataProductAccessPointGroupViewer
                key={groupState.id}
                apgState={groupState}
                dataAccessState={dataProductDataAccessState}
              />
            ))}
          </div>
        </div>
      </div>
    );
  },
);

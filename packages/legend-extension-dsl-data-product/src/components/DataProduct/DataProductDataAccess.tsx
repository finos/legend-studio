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
  SQLIcon,
  Modal,
  PowerBiIcon,
  ModalHeader,
  ModalBody,
  TimesIcon,
  EmptyWindowRestoreIcon,
  WindowMaximizeIcon,
  Dialog,
  ExpandMoreIcon,
  GitBranchIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  type DataGridColumnDefinition,
  DataGrid,
  type DataGridApi,
} from '@finos/legend-lego/data-grid';
import {
  type V1_RelationTypeColumn,
  extractElementNameFromPath,
  V1_AccessPointGroupReference,
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
  V1_LakehouseAccessPoint,
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
  Chip,
  CircularProgress,
  Menu,
  MenuItem,
  Tab,
  Tabs,
  Tooltip,
} from '@mui/material';
import { useAuth } from 'react-oidc-context';
import {
  assertErrorThrown,
  assertNonNullable,
  guaranteeNonNullable,
  isEmpty,
  isNonEmptyString,
  isNonNullable,
  LogEvent,
  noop,
} from '@finos/legend-shared';
import {
  type DataProductAccessPointCodeConfiguration,
  type DataProductDataAccessState,
} from '../../stores/DataProduct/DataProductDataAccessState.js';
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
import {
  buildIngestDeploymentServerConfigOption,
  getIngestDeploymentServerConfigName,
  type IngestDeploymentServerConfig,
  type IngestDeploymentServerConfigOption,
} from '@finos/legend-server-lakehouse';
import { SQLPlaygroundEditorResultPanel } from '@finos/legend-lego/sql-playground';
import { DSL_DATA_PRODUCT_DOCUMENTATION_KEY } from '../../__lib__/DSL_DataProduct_Documentation.js';
import { DataProductSqlPlaygroundPanelState } from '../../stores/DataProduct/DataProductSqlPlaygroundPanelState.js';
import { flowResult } from 'mobx';
import {
  DATAPRODUCT_TYPE,
  DataProductTelemetryHelper,
  PRODUCT_INTEGRATION_TYPE,
} from '../../__lib__/DataProductTelemetryHelper.js';

const WORK_IN_PROGRESS = 'Work in progress';
const NOT_SUPPORTED = 'Not Supported';
const DEFAULT_CONSUMER_WAREHOUSE = 'LAKEHOUSE_CONSUMER_DEFAULT_WH';
const LAKEHOUSE_CONSUMER_DATA_CUBE_SOURCE_TYPE = 'lakehouseConsumer';
const LEGEND_SQL_DOCUMENTATION = 'LEGEND_SQL_DOCUMENTATION';
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
      <span className="message-text">{message}</span>
    </Box>
  );
});

const PowerBiScreen = observer(
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
        if (
          dataAccessState.entitlementsDataProductDetails.origin instanceof
          V1_SdlcDeploymentDataProductOrigin
        ) {
          const {
            group: groupId,
            artifact: artifactId,
            version: versionId,
          } = dataAccessState.entitlementsDataProductDetails.origin;

          DataProductTelemetryHelper.logEvent_OpenIntegratedProduct(
            dataAccessState.applicationStore.telemetryService,
            {
              origin: {
                type: DATAPRODUCT_TYPE.SDLC,
                groupId,
                artifactId,
                versionId,
              },
              deploymentId:
                dataAccessState.entitlementsDataProductDetails.deploymentId,
              productIntegrationType: PRODUCT_INTEGRATION_TYPE.POWER_BI,
              name: dataAccessState.entitlementsDataProductDetails.dataProduct
                .name,
              accessPointGroup: apg,
              environmentClassification:
                dataAccessState.entitlementsDataProductDetails
                  .lakehouseEnvironment?.type,
            },
            undefined,
          );
        }
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

export const SqlPlaygroundScreen = observer(
  (props: {
    playgroundState: DataProductSqlPlaygroundPanelState;
    dataAccessState: DataProductDataAccessState | undefined;
    accessPointState: DataProductAccessPointState;
    advancedMode: boolean;
  }) => {
    const { playgroundState, dataAccessState, accessPointState, advancedMode } =
      props;
    if (!dataAccessState) {
      return (
        <TabMessageScreen message="Sql playground is not supported for this data product or environment." />
      );
    }
    const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
    const [isMaximized, setIsMaximized] = useState(true);
    const toggleMaximize = (): void => setIsMaximized(!isMaximized);
    const openSqlModal = (): void => {
      setIsSqlModalOpen(true);
    };
    const closeSqlModal = (): void => {
      setIsSqlModalOpen(false);
    };
    const loadSqlQuery = (): void => {
      const accessPointGroup = accessPointState.apgState.apg.id;
      const accessPointName = accessPointState.accessPoint.id;
      DataProductTelemetryHelper.logEvent_OpenIntegratedProduct(
        dataAccessState.applicationStore.telemetryService,
        {
          origin:
            dataAccessState.entitlementsDataProductDetails.origin instanceof
            V1_SdlcDeploymentDataProductOrigin
              ? {
                  type: DATAPRODUCT_TYPE.SDLC,
                  groupId:
                    dataAccessState.entitlementsDataProductDetails.origin.group,
                  artifactId:
                    dataAccessState.entitlementsDataProductDetails.origin
                      .artifact,
                  versionId:
                    dataAccessState.entitlementsDataProductDetails.origin
                      .version,
                }
              : {
                  type: DATAPRODUCT_TYPE.ADHOC,
                },
          deploymentId:
            dataAccessState.entitlementsDataProductDetails.deploymentId,
          name: dataAccessState.entitlementsDataProductDetails.dataProduct.name,
          productIntegrationType: PRODUCT_INTEGRATION_TYPE.SQL,
          environmentClassification:
            dataAccessState.entitlementsDataProductDetails.lakehouseEnvironment
              ?.type,
          accessPointGroup: accessPointGroup,
          accessPointPath: accessPointName,
        },
        undefined,
      );
      openSqlModal();
    };
    const resolvedUserEnv = dataAccessState.resolvedUserEnv;
    const dataProductOrigin =
      dataAccessState.entitlementsDataProductDetails.origin;
    const targetEnvironment =
      accessPointState.accessPoint instanceof V1_LakehouseAccessPoint &&
      accessPointState.accessPoint.targetEnvironment
        ? accessPointState.accessPoint.targetEnvironment.toLocaleLowerCase()
        : undefined;
    const connectionString =
      dataProductOrigin instanceof V1_SdlcDeploymentDataProductOrigin &&
      targetEnvironment
        ? `${dataAccessState.dataProductViewerState.dataProductConfig?.legendJdbcLink}${dataProductOrigin.group}:${dataProductOrigin.artifact}:${dataProductOrigin.version}?options='--compute=${targetEnvironment}--environment=${resolvedUserEnv?.environmentName}--warehouse=${DEFAULT_CONSUMER_WAREHOUSE}'`
        : undefined;
    const openDocs = (): void => {
      const docLink =
        dataAccessState.applicationStore.documentationService.getDocEntry(
          LEGEND_SQL_DOCUMENTATION,
        )?.url;
      if (docLink) {
        dataAccessState.applicationStore.navigationService.navigator.visitAddress(
          docLink,
        );
      }
    };
    useEffect(() => {
      playgroundState.init(dataAccessState, accessPointState);
    }, [playgroundState, accessPointState, dataAccessState]);
    useEffect(() => {
      if (isSqlModalOpen && !playgroundState.dataProductExplorerState) {
        flowResult(playgroundState.initializeDataProductExplorer())
          .then(() => {
            if (playgroundState.dataProductExplorerState) {
              return flowResult(
                playgroundState.dataProductExplorerState.fetchProjectData(),
              );
            }
            return undefined;
          })
          .catch(dataAccessState.applicationStore.alertUnhandledError);
      }
    }, [isSqlModalOpen, playgroundState, dataAccessState]);
    return (
      <div className="data-product__viewer__tab-screen">
        <button
          onClick={loadSqlQuery}
          tabIndex={-1}
          className="data-product__viewer__tab-screen__btn"
          title="Open SQL Playground"
        >
          Open SQL Playground
        </button>
        <button
          disabled={!connectionString}
          onClick={() => {
            if (connectionString) {
              dataAccessState.applicationStore.clipboardService
                .copyTextToClipboard(connectionString)
                .then(() =>
                  dataAccessState.applicationStore.notificationService.notifySuccess(
                    'Copied connection string to clipboard',
                  ),
                )
                .catch(dataAccessState.applicationStore.alertUnhandledError);
            }
          }}
          tabIndex={-1}
          className="data-product__viewer__tab-screen__btn_with_icon"
          title="Copy Connection String"
        >
          Copy Connection String
          <InfoCircleOutlineIcon
            className="data-product__viewer__tab-screen__icon"
            title="See Documentation"
            onClick={openDocs}
          />
        </button>
        {isSqlModalOpen && (
          <Dialog
            open={isSqlModalOpen}
            onClose={noop}
            maxWidth={false}
            classes={{
              root: 'sql-editor-modal__root-container',
              container: 'sql-editor-modal__container',
              paper: clsx(
                'sql-editor-modal__paper',
                isMaximized
                  ? 'sql-editor-modal__paper--maximized'
                  : 'sql-editor-modal__paper--windowed',
              ),
            }}
          >
            <Modal className={'sql-editor-modal'}>
              <div className="sql-playground-modal-header">
                <ModalHeader title="SQL PLAYGROUND" />
                <div className="sql-playground-modal-header-actions">
                  <button
                    className="sql-playground-modal__action"
                    tabIndex={-1}
                    onClick={toggleMaximize}
                    title={isMaximized ? 'Minimize' : 'Maximize'}
                  >
                    {isMaximized ? (
                      <EmptyWindowRestoreIcon />
                    ) : (
                      <WindowMaximizeIcon />
                    )}
                  </button>
                  <button
                    className="sql-playground-modal__action"
                    tabIndex={-1}
                    onClick={closeSqlModal}
                    title="Close"
                  >
                    <TimesIcon />
                  </button>
                </div>
              </div>
              <ModalBody>
                <div className="sql-playground__layout">
                  {playgroundState.dataProductExplorerState && (
                    <SQLPlaygroundEditorResultPanel
                      playgroundState={playgroundState}
                      advancedMode={advancedMode}
                      schemaExplorerState={
                        playgroundState.dataProductExplorerState
                      }
                      showSchemaExplorer={true}
                    />
                  )}
                </div>
              </ModalBody>
            </Modal>
          </Dialog>
        )}
      </div>
    );
  },
);

const DataCubeScreen = observer(
  (props: {
    accessPointState: DataProductAccessPointState;
    dataAccessState: DataProductDataAccessState | undefined;
  }) => {
    const { accessPointState, dataAccessState } = props;
    const openDataCube = (sourceData: object) => {
      if (dataAccessState) {
        DataProductTelemetryHelper.logEvent_OpenIntegratedProduct(
          dataAccessState.applicationStore.telemetryService,
          {
            origin:
              dataAccessState.entitlementsDataProductDetails.origin instanceof
              V1_SdlcDeploymentDataProductOrigin
                ? {
                    type: DATAPRODUCT_TYPE.SDLC,
                    groupId:
                      dataAccessState.entitlementsDataProductDetails.origin
                        .group,
                    artifactId:
                      dataAccessState.entitlementsDataProductDetails.origin
                        .artifact,
                    versionId:
                      dataAccessState.entitlementsDataProductDetails.origin
                        .version,
                  }
                : {
                    type: DATAPRODUCT_TYPE.ADHOC,
                  },
            deploymentId:
              dataAccessState.entitlementsDataProductDetails.deploymentId,
            name: dataAccessState.entitlementsDataProductDetails.dataProduct
              .name,
            productIntegrationType: PRODUCT_INTEGRATION_TYPE.DATA_CUBE,
            accessPointPath: (
              (sourceData as Record<string, unknown>).paths as string[]
            ).at(1),
            environmentClassification:
              dataAccessState.entitlementsDataProductDetails
                .lakehouseEnvironment?.type,
          },
          undefined,
        );
      }
      accessPointState.apgState.dataProductViewerState.openDataCube?.(
        sourceData,
      );
    };
    if (!dataAccessState) {
      return <TabMessageScreen message={NOT_SUPPORTED} />;
    }
    const dataProductOrigin =
      dataAccessState.entitlementsDataProductDetails.origin;
    if (
      !dataProductOrigin ||
      !accessPointState.apgState.dataProductViewerState.openDataCube
    ) {
      return <TabMessageScreen message={WORK_IN_PROGRESS} />;
    }
    const envs = dataAccessState.filteredDataProductQueryEnvs;
    const resolvedUserEnv = dataAccessState.resolvedUserEnv;
    const [selectedEnvironment, setSelectedEnvironment] =
      useState<IngestDeploymentServerConfig | null>(null);
    const envOptions = envs
      .map(buildIngestDeploymentServerConfigOption)
      .sort((a, b) =>
        a.value.environmentName.localeCompare(b.value.environmentName),
      );

    const loadDataCube = (): void => {
      try {
        const dataCubeEnv = selectedEnvironment ?? resolvedUserEnv;
        assertNonNullable(dataCubeEnv, 'Env required to Open Data Cube');
        //paths
        const path =
          accessPointState.apgState.dataProductViewerState.product.path;
        const accessPointName = accessPointState.accessPoint.id;
        const accessPointPath = [
          guaranteeNonNullable(path),
          guaranteeNonNullable(accessPointName),
        ];
        const deploymentId =
          dataAccessState.entitlementsDataProductDetails.deploymentId;
        const sourceData: Record<string, unknown> = {
          _type: LAKEHOUSE_CONSUMER_DATA_CUBE_SOURCE_TYPE,
          warehouse: DEFAULT_CONSUMER_WAREHOUSE,
          environment: getIngestDeploymentServerConfigName(dataCubeEnv),
          paths: accessPointPath,
          deploymentId: deploymentId,
        };
        if (dataProductOrigin instanceof V1_SdlcDeploymentDataProductOrigin) {
          sourceData.origin = {
            _type: V1_DataProductOriginType.SDLC_DEPLOYMENT,
            dpCoordinates: {
              groupId: dataProductOrigin.group,
              artifactId: dataProductOrigin.artifact,
              versionId: dataProductOrigin.version,
            },
          };
        } else if (
          dataProductOrigin instanceof V1_AdHocDeploymentDataProductOrigin
        ) {
          sourceData.origin = {
            _type: V1_DataProductOriginType.AD_HOC_DEPLOYMENT,
          };
        } else {
          accessPointState.apgState.applicationStore.notificationService.notifyError(
            new Error(
              'Failed to open DataCube: unsupported data product origin.',
            ),
          );
          return;
        }
        openDataCube(sourceData);
      } catch (error) {
        assertErrorThrown(error);
        accessPointState.apgState.applicationStore.notificationService.notifyError(
          error,
        );
      }
    };

    return (
      <div className="data-product__viewer__tab-screen">
        {!resolvedUserEnv && (
          <CustomSelectorInput
            className="data-product__viewer__tab-screen__dropdown"
            options={envOptions}
            isLoading={dataAccessState.ingestEnvironmentFetchState.isInProgress}
            onChange={(newValue: IngestDeploymentServerConfigOption | null) => {
              setSelectedEnvironment(newValue?.value ?? null);
            }}
            value={
              selectedEnvironment
                ? buildIngestDeploymentServerConfigOption(selectedEnvironment)
                : null
            }
            placeholder={`Choose an Environment`}
            isClearable={false}
            escapeClearsValue={true}
          />
        )}
        <button
          onClick={loadDataCube}
          tabIndex={-1}
          disabled={!(selectedEnvironment ?? resolvedUserEnv)}
          className="data-product__viewer__tab-screen__btn"
          title="Open in Datacube"
        >
          Open in Datacube
        </button>
      </div>
    );
  },
);

const LineageScreen = observer(
  (props: {
    accessPointState: DataProductAccessPointState;
    dataAccessState: DataProductDataAccessState | undefined;
  }) => {
    const { accessPointState, dataAccessState } = props;
    const dataProductName = dataAccessState?.product.name;
    const accessPointName = accessPointState.accessPoint.id;
    const openLineageAction = (
      dataProduct: string,
      accessPointGroup: string,
    ) => {
      if (
        dataAccessState?.entitlementsDataProductDetails.origin instanceof
        V1_SdlcDeploymentDataProductOrigin
      ) {
        const {
          group: groupId,
          artifact: artifactId,
          version: versionId,
        } = dataAccessState.entitlementsDataProductDetails.origin;

        DataProductTelemetryHelper.logEvent_OpenIntegratedProduct(
          dataAccessState.applicationStore.telemetryService,
          {
            origin: {
              type: DATAPRODUCT_TYPE.SDLC,
              groupId,
              artifactId,
              versionId,
            },
            deploymentId:
              dataAccessState.entitlementsDataProductDetails.deploymentId,
            productIntegrationType: PRODUCT_INTEGRATION_TYPE.REGISTRY,
            name: dataAccessState.entitlementsDataProductDetails.dataProduct
              .name,
          },
          undefined,
        );
      }
      dataAccessState?.dataProductViewerState.openLineage?.(
        dataProduct,
        accessPointGroup,
      );
    };

    const validAccessPointLineage =
      dataAccessState?.dataProductViewerState.openLineage &&
      dataProductName &&
      accessPointName;
    if (
      !(
        dataAccessState?.entitlementsDataProductDetails.origin instanceof
        V1_SdlcDeploymentDataProductOrigin
      )
    ) {
      return (
        <TabMessageScreen message="Lineage not supported for Adhoc Data Products" />
      );
    } else if (!dataAccessState.dataProductViewerState.openLineage) {
      return <TabMessageScreen message="Lineage has not been configured" />;
    } else if (!accessPointState.registryMetadata?.id) {
      return (
        <TabMessageScreen message="Lineage has not been registered for this access point" />
      );
    }
    return (
      <div className="data-product__viewer__tab-screen">
        <button
          onClick={() => {
            if (validAccessPointLineage) {
              openLineageAction(dataProductName, accessPointName);
            }
          }}
          tabIndex={-1}
          disabled={!validAccessPointLineage}
          className="data-product__viewer__tab-screen__btn"
          title="Open Lineage Viewer"
        >
          Open Lineage Viewer
        </button>
      </div>
    );
  },
);

const enum DataProductAccessPointTabs {
  COLUMNS = 'Columns',
  GRAMMAR = 'Grammar',
  LINEAGE = 'Lineage',
  DATACUBE = 'Datacube',
  POWER_BI = 'Power BI',
  SQL = 'SQL',
}

const AccessPointTable = observer(
  (props: {
    accessPointState: DataProductAccessPointState;
    dataAccessState: DataProductDataAccessState | undefined;
  }): React.ReactNode => {
    const { accessPointState, dataAccessState } = props;
    const [gridApi, setGridApi] =
      useState<DataGridApi<V1_RelationTypeColumn> | null>(null);
    const [selectedTab, setSelectedTab] = useState<
      DataProductAccessPointTabs | string
    >(DataProductAccessPointTabs.COLUMNS);
    const playgroundState = useMemo(() => {
      return new DataProductSqlPlaygroundPanelState(
        accessPointState.apgState.dataProductViewerState,
      );
    }, [accessPointState]);
    const handleTabChange = (
      _: React.SyntheticEvent,
      newValue: DataProductAccessPointTabs | string,
    ) => {
      setSelectedTab(newValue);
    };
    const userEnv = dataAccessState?.resolvedUserEnv;
    const codeExtensions: DataProductAccessPointCodeConfiguration[] = useMemo(
      () =>
        dataAccessState?.dataAccessPlugins
          .map((plugin) =>
            plugin.getExtraDataProductAccessPointCodeConfiguration?.(),
          )
          .flat()
          .filter(isNonNullable) ?? [],
      [dataAccessState?.dataAccessPlugins],
    );

    useEffect(() => {
      if (
        userEnv &&
        !accessPointState.relationElement &&
        accessPointState.apgState.access === AccessPointGroupAccess.ENTERPRISE
      ) {
        accessPointState
          .fetchSampleDataFromEngine(
            guaranteeNonNullable(getIngestDeploymentServerConfigName(userEnv)),
          )
          .catch((error) => {
            accessPointState.apgState.applicationStore.logService.error(
              LogEvent.create(`error fetching sample data`),
              `Error fetching access point: ${accessPointState.accessPoint.id} sample data from engine: ${error.message}`,
            );
          });
      }
    }, [accessPointState, userEnv]);

    useEffect(() => {
      if (gridApi) {
        gridApi.refreshCells({ force: true });
      }
    }, [gridApi, accessPointState.relationElement]);

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
        {
          headerName: 'Column Sample Values',
          flex: 1,
          wrapText: true,
          autoHeight: true,
          valueGetter: (_params) => {
            if (!_params.data || !accessPointState.relationElement) {
              return 'No sample values provided';
            }
            const columnName = _params.data.name;
            const columnIndex =
              accessPointState.relationElement.columns.indexOf(columnName);
            if (columnIndex === -1) {
              return 'No sample values provided';
            }
            const sampleValues = accessPointState.relationElement.rows
              .map((row) => row.values[columnIndex])
              .filter((value) => value !== undefined && !isEmpty(value));
            return sampleValues.join(', ');
          },
        },
      ];
    const renderTab = (
      _selectedTab: DataProductAccessPointTabs | string,
    ): React.ReactNode => {
      switch (_selectedTab) {
        case DataProductAccessPointTabs.COLUMNS:
          return (
            <>
              {accessPointState.fetchingRelationTypeState.isInProgress ||
              accessPointState.fetchingRelationElement.isInProgress ? (
                <Box className="data-product__viewer__more-info__loading-indicator">
                  <CubesLoadingIndicator isLoading={true}>
                    <CubesLoadingIndicatorIcon />
                  </CubesLoadingIndicator>
                </Box>
              ) : accessPointState.fetchingRelationTypeState.hasCompleted &&
                accessPointState.fetchingRelationElement.hasCompleted ? (
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
                    onGridReady={(params) => {
                      setGridApi(params.api);
                      if (!accessPointState.relationType?.columns.length) {
                        accessPointState.apgState.dataProductViewerState.layoutState.markGridAsRendered();
                      }
                    }}
                    onFirstDataRendered={() => {
                      if (
                        accessPointState.relationType?.columns.length !==
                          undefined &&
                        accessPointState.relationType.columns.length > 0
                      ) {
                        accessPointState.apgState.dataProductViewerState.layoutState.markGridAsRendered();
                      }
                    }}
                  />
                </Box>
              ) : (
                <TabMessageScreen message="Unable to fetch access point columns" />
              )}
            </>
          );
        case DataProductAccessPointTabs.GRAMMAR:
          return (
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
                    language={CODE_EDITOR_LANGUAGE.PURE}
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
          );
        case DataProductAccessPointTabs.LINEAGE:
          return (
            <LineageScreen
              accessPointState={accessPointState}
              dataAccessState={dataAccessState}
            />
          );
        case DataProductAccessPointTabs.DATACUBE:
          return (
            <DataCubeScreen
              accessPointState={accessPointState}
              dataAccessState={dataAccessState}
            />
          );
        case DataProductAccessPointTabs.POWER_BI:
          return (
            <PowerBiScreen
              accessPointState={accessPointState}
              dataAccessState={dataAccessState}
            />
          );
        case DataProductAccessPointTabs.SQL:
          return (
            dataAccessState && (
              <SqlPlaygroundScreen
                playgroundState={playgroundState}
                dataAccessState={dataAccessState}
                accessPointState={accessPointState}
                advancedMode={true}
              />
            )
          );
        default:
          const ext = codeExtensions.find((e) => e.key === _selectedTab);
          return ext ? ext.renderer(accessPointState, dataAccessState) : null;
      }
    };

    const tabs = [
      {
        key: DataProductAccessPointTabs.COLUMNS,
        label: 'Column Specifications',
        icon: null,
      },
      {
        key: DataProductAccessPointTabs.GRAMMAR,
        label: 'Grammar',
        icon: null,
      },
      {
        key: DataProductAccessPointTabs.LINEAGE,
        label: 'Lineage',
        icon: <GitBranchIcon />,
      },
      {
        key: DataProductAccessPointTabs.DATACUBE,
        label: 'Datacube',
        icon: <DataCubeIcon.Cube />,
      },
      {
        key: DataProductAccessPointTabs.POWER_BI,
        label: 'Power BI',
        icon: <PowerBiIcon />,
      },
      {
        key: DataProductAccessPointTabs.SQL,
        label: 'SQL',
        icon: <SQLIcon />,
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
            {tabs.map((tab) => (
              <Tab
                key={tab.key}
                className={clsx('data-product__viewer__tab', {
                  'data-product__viewer__tab--selected':
                    selectedTab === tab.key,
                })}
                value={tab.key}
                label={
                  !tab.icon ? (
                    <span>{tab.label}</span>
                  ) : (
                    <span className="label-container">
                      {tab.icon}
                      <span>{tab.label}</span>
                    </span>
                  )
                }
              />
            ))}
            {codeExtensions.map((ext) => (
              <Tab
                key={ext.key}
                className={clsx('data-product__viewer__tab', {
                  'data-product__viewer__tab--selected':
                    selectedTab === ext.key,
                })}
                value={ext.key}
                label={
                  !ext.icon ? (
                    <span>{ext.label}</span>
                  ) : (
                    <span className="label-container">
                      {ext.icon}
                      <span>{ext.label}</span>
                    </span>
                  )
                }
              />
            ))}
          </Tabs>
        </div>
        <div className="access_group_gap" />
        <Box className="data-product__viewer__more-info__container">
          {renderTab(selectedTab)}
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
    const sectionRef = useRef<HTMLDivElement>(null);
    const anchor = generateAnchorForSection(`apg-${apgState.apg.id}`);

    useEffect(() => {
      if (sectionRef.current) {
        apgState.dataProductViewerState.layoutState.setWikiPageAnchor(
          anchor,
          sectionRef.current,
        );
      }
      return () =>
        apgState.dataProductViewerState.layoutState.unsetWikiPageAnchor(anchor);
    }, [apgState, anchor]);

    const entitlementsDataContractViewerState = useMemo(() => {
      return dataAccessState?.contractViewerContractAndSubscription &&
        dataAccessState.contractViewerContractAndSubscription.dataContract
          .resource instanceof V1_AccessPointGroupReference &&
        dataAccessState.contractViewerContractAndSubscription.dataContract
          .resource.accessPointGroup === apgState.apg.id
        ? new EntitlementsDataContractViewerState(
            V1_transformDataContractToLiteDatacontract(
              dataAccessState.contractViewerContractAndSubscription
                .dataContract,
            ),
            dataAccessState.contractViewerContractAndSubscription.subscriptions?.[0],
            apgState.applicationStore,
            dataAccessState.lakehouseContractServerClient,
            apgState.dataProductViewerState.graphManagerState,
            apgState.dataProductViewerState.userSearchService,
          )
        : undefined;
    }, [
      apgState.apg.id,
      apgState.applicationStore,
      apgState.dataProductViewerState.graphManagerState,
      apgState.dataProductViewerState.userSearchService,
      dataAccessState?.contractViewerContractAndSubscription,
      dataAccessState?.lakehouseContractServerClient,
    ]);

    useEffect(() => {
      if (
        dataAccessState?.lakehouseContractServerClient &&
        apgState.apgContracts.length > 0
      ) {
        apgState.fetchSubscriptions(
          apgState.apgContracts,
          dataAccessState.lakehouseContractServerClient,
          auth.user?.access_token,
        );
      }
    }, [
      apgState,
      apgState.fetchingSubscriptionsState,
      apgState.apgContracts,
      auth.user?.access_token,
      dataAccessState?.lakehouseContractServerClient,
    ]);

    const handleContractsClick = (): void => {
      if (dataAccessState) {
        const dataProductPath =
          dataAccessState.dataProductViewerState.product.path;
        const accessPointGroup = apgState.apg.id;
        DataProductTelemetryHelper.logEvent_requestContract(
          dataAccessState.applicationStore.telemetryService,
          dataProductPath,
          accessPointGroup,
        );
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
          if (apgState.isEntitlementsSyncing) {
            buttonLabel = 'ENTITLEMENTS SYNCING';
            onClick = handleContractsClick;
            buttonColor = 'success';
          } else {
            buttonLabel = 'ENTITLED';
            onClick = handleContractsClick;
            buttonColor = 'success';
          }
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
      const tooltipText =
        val === AccessPointGroupAccess.APPROVED &&
        apgState.isEntitlementsSyncing
          ? 'Your contract has been approved but your entitlements are still syncing. The status will refresh automatically once your entitlements have synced.'
          : dataAccessState?.dataAccessPlugins
              .flatMap((plugin) =>
                plugin.getExtraAccessPointGroupAccessInfo?.(val),
              )
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
              {apgState.isEntitlementsSyncing && (
                <CircularProgress
                  size={16}
                  sx={{ marginLeft: 1, color: 'inherit' }}
                />
              )}
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
                    dataAccessState?.setContractCreatorAPG(apgState.apg);
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
      <div
        ref={sectionRef}
        className="data-product__viewer__access-group__item"
      >
        <div className="data-product__viewer__access-group__item__header">
          <div className="data-product__viewer__access-group__item__header-main">
            <div className="data-product__viewer__access-group__item__header__title">
              {apgState.apg.title ?? apgState.apg.id}
            </div>
            <div className="data-product__viewer__access-group__item__header__type">
              LAKEHOUSE
            </div>
            <button
              className="data-product__viewer__access-group__item__header__anchor"
              tabIndex={-1}
              onClick={() => {
                apgState.dataProductViewerState.changeZone(anchor, true);
                apgState.dataProductViewerState.copyLinkToClipboard(anchor);
              }}
            >
              <AnchorLinkIcon />
            </button>
            <button
              onClick={() => apgState.setIsCollapsed(!apgState.isCollapsed)}
              title={apgState.isCollapsed ? 'Expand' : 'Collapse'}
            >
              <ExpandMoreIcon
                className={clsx(
                  'data-product__viewer__access-group__item__header__caret',
                  {
                    'data-product__viewer__access-group__item__header__caret--collapsed':
                      apgState.isCollapsed,
                  },
                )}
              />
            </button>
          </div>
          <Box className="data-product__viewer__access-group__item__header__actions">
            {renderAccess(apgState.access)}
          </Box>
        </div>
        {!apgState.isCollapsed && (
          <div className="data-product__viewer__access-group__item__collapsible-content">
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
                      <div className="data-product__viewer__access-point__details">
                        <div className="data-product__viewer__access-point__name">
                          <strong>
                            {accessPointState.accessPoint.title ??
                              accessPointState.accessPoint.id}
                          </strong>
                        </div>
                        <div className="data-product__viewer__access-point__description">
                          {accessPointState.accessPoint.description?.trim() ?? (
                            <span className="data-product__viewer__grid__empty-cell">
                              No description to provide
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="data-product__viewer__access-point__tags">
                        {accessPointState.registryMetadata?.ads && (
                          <Chip
                            className="data-product__viewer__wiki__tags__chip"
                            label="ADS"
                            title="Authorized Data Source"
                          />
                        )}
                        {accessPointState.registryMetadata?.pde && (
                          <Chip
                            className="data-product__viewer__wiki__tags__chip"
                            label="PDE"
                            title="Point of Data Entry"
                          />
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
          </div>
        )}
        {dataAccessState?.contractCreatorAPG === apgState.apg && (
          <EntitlementsDataContractCreator
            open={true}
            onClose={() => dataAccessState.setContractCreatorAPG(undefined)}
            apgState={apgState}
            dataAccessState={dataAccessState}
            tokenProvider={() => auth.user?.access_token}
          />
        )}
        {entitlementsDataContractViewerState && dataAccessState && (
          <EntitlementsDataContractViewer
            open={true}
            onClose={() =>
              dataAccessState.setContractViewerContractAndSubscription(
                undefined,
              )
            }
            currentViewer={entitlementsDataContractViewerState}
            onRefresh={() => {
              if (apgState.associatedUserContract) {
                apgState.fetchUserAccessStatus(
                  apgState.associatedUserContract.guid,
                  dataAccessState.lakehouseContractServerClient,
                  () => auth.user?.access_token,
                );
              }
            }}
            getContractTaskUrl={dataAccessState.getContractTaskUrl}
            getDataProductUrl={dataAccessState.getDataProductUrl}
          />
        )}
        {dataAccessState && apgState.associatedUserContract !== false && (
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

    const documentationUrl =
      dataProductViewerState.applicationStore.documentationService.getDocEntry(
        DSL_DATA_PRODUCT_DOCUMENTATION_KEY.DATA_ACCESS,
      )?.url;
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
      if (documentationUrl) {
        dataProductViewerState.applicationStore.navigationService.navigator.visitAddress(
          documentationUrl,
        );
      }
    };

    return (
      <div ref={sectionRef} className="data-product__viewer__wiki__section">
        <div className="data-product__viewer__wiki__section__header">
          <div className="data-product__viewer__wiki__section__header__label">
            Data Access
            <button
              className="data-product__viewer__wiki__section__header__anchor"
              tabIndex={-1}
              onClick={() => {
                dataProductViewerState.changeZone(anchor, true);
                dataProductViewerState.copyLinkToClipboard(anchor);
              }}
            >
              <AnchorLinkIcon />
            </button>
            <button
              onClick={() => dataProductViewerState.toggleAllApgGroupCollapse()}
              title={
                dataProductViewerState.isAllApgsCollapsed
                  ? 'Expand All'
                  : 'Collapse All'
              }
            >
              <ExpandMoreIcon
                className={clsx(
                  'data-product__viewer__access-group__item__header__caret',
                  {
                    'data-product__viewer__access-group__item__header__caret--collapsed':
                      dataProductViewerState.isAllApgsCollapsed,
                  },
                )}
              />
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

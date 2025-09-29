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
  DataCubeIcon,
  PythonIcon,
  SQLIcon,
  TableIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  type DataGridCellRendererParams,
  type DataGridColumnDefinition,
  DataGrid,
} from '@finos/legend-lego/data-grid';
import {
  type V1_LakehouseAccessPoint,
  type V1_RelationType,
  type V1_RelationTypeColumn,
  extractElementNameFromPath,
  PureClientVersion,
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
  V1_EnumValue,
  V1_getGenericTypeFullPath,
  V1_LambdaReturnTypeInput,
  V1_LegendSDLC,
  V1_Protocol,
  V1_PureGraphManager,
  V1_PureModelContextPointer,
  V1_relationTypeModelSchema,
  V1_RenderStyle,
  V1_SdlcDeploymentDataProductOrigin,
  V1_serializeRawValueSpecification,
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
import {
  assertErrorThrown,
  guaranteeNonNullable,
  guaranteeType,
  isNonEmptyString,
} from '@finos/legend-shared';
import { resolveVersion } from '@finos/legend-server-depot';
import { deserialize } from 'serializr';
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
export const WorkInProgressNotice: React.FC = () => (
  <Box className="data-product__viewer__work-in-progress">
    <span>Work in progress</span>
  </Box>
);
const TDSColumnCellRenderer = (props: {
  params: DataGridCellRendererParams<V1_LakehouseAccessPoint>;
  apgState: DataProductAPGState;
  dataAccessState: DataProductDataAccessState | undefined;
}): React.ReactNode => {
  const { params, apgState, dataAccessState } = props;
  const dataProductViewerState = apgState.dataProductViewerState;
  const data = params.data;
  const enum DataProductTabs {
    COLUMNS = 'Columns',
    GRAMMAR = 'Grammar',
    DATACUBE = 'Datacube',
    BUSINESS_INTELLIGENCE = 'Business Intelligence',
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
  const [accessPointGrammar, setAccessPointGrammar] =
    useState<string>('Loading ...');
  const [accessPointRelationType, setAccessPointRelationType] = useState<
    V1_RelationType | undefined
  >();
  const [loadingAccessPointDetails, setLoadingAccessPointDetails] =
    useState<boolean>(false);

  useEffect(() => {
    if (!data) {
      return;
    }
    const fetchAccessPointGrammar = async () => {
      try {
        const grammar =
          await dataProductViewerState.engineServerClient.JSONToGrammar_lambda(
            V1_serializeRawValueSpecification(data.func),
            V1_RenderStyle.PRETTY,
          );
        setAccessPointGrammar(grammar);
      } catch {
        throw new Error('Error fetching access point grammar');
      }
    };
    const fetchAccessPointRelationType = async () => {
      try {
        const projectGAV = dataProductViewerState.projectGAV;
        const entitlementsOrigin =
          dataAccessState?.entitlementsDataProductDetails.origin;
        const model =
          projectGAV !== undefined
            ? new V1_PureModelContextPointer(
                // TODO: remove as backend should handle undefined protocol input
                new V1_Protocol(
                  V1_PureGraphManager.PURE_PROTOCOL_NAME,
                  PureClientVersion.VX_X_X,
                ),
                new V1_LegendSDLC(
                  projectGAV.groupId,
                  projectGAV.artifactId,
                  resolveVersion(projectGAV.versionId),
                ),
              )
            : entitlementsOrigin instanceof
                  V1_AdHocDeploymentDataProductOrigin ||
                entitlementsOrigin === undefined
              ? guaranteeType(
                  dataProductViewerState.graphManagerState.graphManager,
                  V1_PureGraphManager,
                ).getFullGraphModelData(
                  dataProductViewerState.graphManagerState.graph,
                )
              : entitlementsOrigin instanceof V1_SdlcDeploymentDataProductOrigin
                ? new V1_PureModelContextPointer(
                    // TODO: remove as backend should handle undefined protocol input
                    new V1_Protocol(
                      V1_PureGraphManager.PURE_PROTOCOL_NAME,
                      PureClientVersion.VX_X_X,
                    ),
                    new V1_LegendSDLC(
                      entitlementsOrigin.group,
                      entitlementsOrigin.artifact,
                      resolveVersion(entitlementsOrigin.version),
                    ),
                  )
                : undefined;
        const relationTypeInput = new V1_LambdaReturnTypeInput(
          guaranteeNonNullable(
            model,
            `Unable to get model from data product origin of type ${entitlementsOrigin?.constructor.name}`,
          ),
          data.func,
        );
        const relationType = deserialize(
          V1_relationTypeModelSchema,
          await dataProductViewerState.engineServerClient.lambdaRelationType(
            V1_LambdaReturnTypeInput.serialization.toJson(relationTypeInput),
          ),
        );
        setAccessPointRelationType(relationType);
      } catch (error) {
        assertErrorThrown(error);
        throw new Error(
          `Error fetching access point relation type: ${error.message}`,
        );
      }
    };
    const fetchAccessPointDetails = async () => {
      return Promise.all([
        fetchAccessPointGrammar(),
        fetchAccessPointRelationType(),
      ]);
    };
    setLoadingAccessPointDetails(true);
    fetchAccessPointDetails()
      .catch((error) => {
        assertErrorThrown(error);
        apgState.applicationStore.notificationService.notifyError(error);
      })
      .finally(() => {
        setLoadingAccessPointDetails(false);
      });
  }, [
    apgState.applicationStore.notificationService,
    data,
    dataAccessState?.entitlementsDataProductDetails.origin,
    dataProductViewerState.engineServerClient,
    dataProductViewerState.graphManagerState.graph,
    dataProductViewerState.graphManagerState.graphManager,
    dataProductViewerState.projectGAV,
  ]);

  if (!data) {
    return null;
  }
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
                selectedTab === DataProductTabs.BUSINESS_INTELLIGENCE,
            })}
            label={
              <span className="label-container">
                <TableIcon
                  className={clsx('data-product__viewer__tab-icon', {
                    'data-product__viewer__tab-icon--selected':
                      selectedTab === DataProductTabs.BUSINESS_INTELLIGENCE,
                  })}
                />
                <span>Business Intelligence</span>
              </span>
            }
            value={DataProductTabs.BUSINESS_INTELLIGENCE}
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
        {loadingAccessPointDetails && (
          <Box className="data-product__viewer__more-info__loading-indicator">
            <CubesLoadingIndicator isLoading={true}>
              <CubesLoadingIndicatorIcon />
            </CubesLoadingIndicator>
          </Box>
        )}
        {!loadingAccessPointDetails && (
          <>
            {selectedTab === DataProductTabs.COLUMNS && (
              <Box
                className={clsx(
                  'data-product__viewer__more-info__columns-grid ag-theme-balham',
                  {
                    'data-product__viewer__more-info__columns-grid--auto-height':
                      (accessPointRelationType?.columns.length ?? 0) <=
                      MAX_GRID_AUTO_HEIGHT_ROWS,
                    'data-product__viewer__more-info__columns-grid--auto-height--empty':
                      (accessPointRelationType?.columns.length ?? 0) === 0,
                    'data-product__viewer__more-info__columns-grid--auto-height--non-empty':
                      (accessPointRelationType?.columns.length ?? 0) > 0 &&
                      (accessPointRelationType?.columns.length ?? 0) <=
                        MAX_GRID_AUTO_HEIGHT_ROWS,
                  },
                )}
              >
                <DataGrid
                  rowData={accessPointRelationType?.columns ?? []}
                  columnDefs={relationColumnDefs}
                  domLayout={
                    (accessPointRelationType?.columns.length ?? 0) >
                    MAX_GRID_AUTO_HEIGHT_ROWS
                      ? 'normal'
                      : 'autoHeight'
                  }
                />
              </Box>
            )}
            {selectedTab === DataProductTabs.GRAMMAR && (
              <Box className="data-product__viewer__more-info__grammar">
                <CodeEditor
                  inputValue={accessPointGrammar}
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
            )}
            {selectedTab === DataProductTabs.DATACUBE && (
              <WorkInProgressNotice />
            )}
            {selectedTab === DataProductTabs.BUSINESS_INTELLIGENCE && (
              <WorkInProgressNotice />
            )}
            {selectedTab === DataProductTabs.PYTHON && <WorkInProgressNotice />}
            {selectedTab === DataProductTabs.SQL && <WorkInProgressNotice />}
          </>
        )}
      </Box>
    </div>
  );
};
export const DataProductAccessPointGroupViewer = observer(
  (props: {
    apgState: DataProductAPGState;
    dataAccessState: DataProductDataAccessState | undefined;
  }) => {
    const { apgState, dataAccessState } = props;
    const accessPoints = apgState.apg.accessPoints;

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
            {accessPoints.map((accessPoint) => (
              <div
                key={accessPoint.id}
                className="data-product__viewer__access-point-section access_group_gap"
              >
                <div className="data-product__viewer__access-point__info">
                  <div className="data-product__viewer__access-point__name">
                    <strong>{accessPoint.id}</strong>
                  </div>
                  <div className="data-product__viewer__access-point__description">
                    {accessPoint.description?.trim() ?? (
                      <span className="data-product__viewer__grid__empty-cell">
                        No description to provide
                      </span>
                    )}
                  </div>
                </div>
                <div className="data-product__viewer__access-point__tabs">
                  <TDSColumnCellRenderer
                    params={
                      {
                        data: accessPoint,
                      } as DataGridCellRendererParams<V1_LakehouseAccessPoint>
                    }
                    apgState={apgState}
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

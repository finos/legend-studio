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
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import {
  DATA_PRODUCT_VIEWER_SECTION,
  generateAnchorForSection,
} from '../../../stores/lakehouse/DataProductViewerNavigation.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DataProductViewerState } from '../../../stores/lakehouse/DataProductViewerState.js';
import { useApplicationStore } from '@finos/legend-application';
import {
  AccessPointGroupAccess,
  type DataProductGroupAccessState,
} from '../../../stores/lakehouse/DataProductDataAccessState.js';
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
import { useLegendMarketplaceBaseStore } from '../../../application/LegendMarketplaceFrameworkProvider.js';
import { EntitlementsDataContractCreator } from '../entitlements/EntitlementsDataContractCreator.js';
import { EntitlementsDataContractViewer } from '../../../components/DataContractViewer/EntitlementsDataContractViewer.js';
import { EntitlementsDataContractViewerState } from '../../../stores/lakehouse/entitlements/EntitlementsDataContractViewerState.js';
import { useAuth } from 'react-oidc-context';
import { DataProductSubscriptionViewer } from '../subscriptions/DataProductSubscriptionsViewer.js';
import {
  assertErrorThrown,
  guaranteeNonNullable,
  guaranteeType,
  isNonEmptyString,
} from '@finos/legend-shared';
import { resolveVersion } from '@finos/legend-server-depot';
import { deserialize } from 'serializr';

const MAX_GRID_AUTO_HEIGHT_ROWS = 10; // Maximum number of rows to show before switching to normal height (scrollable grid)

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

const TDSColumnMoreInfoCellRenderer = (props: {
  params: DataGridCellRendererParams<V1_LakehouseAccessPoint>;
  accessGroupState: DataProductGroupAccessState;
}): React.ReactNode => {
  const { params, accessGroupState } = props;
  const data = params.data;
  const store = useLegendMarketplaceBaseStore();
  const enum MoreInfoTabs {
    COLUMNS = 'Columns',
    GRAMMAR = 'Grammar',
  }
  const [selectedTab, setSelectedTab] = useState(MoreInfoTabs.COLUMNS);
  const handleTabChange = (
    event: React.SyntheticEvent,
    newValue: MoreInfoTabs,
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
        const grammar = await store.engineServerClient.JSONToGrammar_lambda(
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
        const origin =
          accessGroupState.accessState.viewerState
            .entitlementsDataProductDetails.origin;
        const model =
          origin instanceof V1_AdHocDeploymentDataProductOrigin
            ? guaranteeType(
                accessGroupState.accessState.viewerState.graphManagerState
                  .graphManager,
                V1_PureGraphManager,
              ).getFullGraphModelData(
                accessGroupState.accessState.viewerState.graphManagerState
                  .graph,
              )
            : origin instanceof V1_SdlcDeploymentDataProductOrigin
              ? new V1_PureModelContextPointer(
                  // TODO: remove as backend should handle undefined protocol input
                  new V1_Protocol(
                    V1_PureGraphManager.PURE_PROTOCOL_NAME,
                    PureClientVersion.VX_X_X,
                  ),
                  new V1_LegendSDLC(
                    origin.group,
                    origin.artifact,
                    resolveVersion(origin.version),
                  ),
                )
              : undefined;
        const relationTypeInput = new V1_LambdaReturnTypeInput(
          guaranteeNonNullable(
            model,
            `Unable to get model from data product origin of type ${origin?.constructor.name}`,
          ),
          data.func,
        );
        const relationType = deserialize(
          V1_relationTypeModelSchema,
          await store.engineServerClient.lambdaRelationType(
            V1_LambdaReturnTypeInput.serialization.toJson(relationTypeInput),
          ),
        );
        setAccessPointRelationType(relationType);
      } catch {
        throw new Error('Error fetching access point relation type');
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
        accessGroupState.accessState.viewerState.applicationStore.notificationService.notifyError(
          error,
        );
      })
      .finally(() => {
        setLoadingAccessPointDetails(false);
      });
  }, [data, store, accessGroupState]);

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
      <Tabs value={selectedTab} onChange={handleTabChange}>
        <Tab label={MoreInfoTabs.COLUMNS} value={MoreInfoTabs.COLUMNS} />
        <Tab label={MoreInfoTabs.GRAMMAR} value={MoreInfoTabs.GRAMMAR} />
      </Tabs>
      <Box className="data-space__viewer__more-info__container">
        {loadingAccessPointDetails && (
          <Box className="data-space__viewer__more-info__loading-indicator">
            <CubesLoadingIndicator isLoading={true}>
              <CubesLoadingIndicatorIcon />
            </CubesLoadingIndicator>
          </Box>
        )}
        {!loadingAccessPointDetails && (
          <>
            {selectedTab === MoreInfoTabs.COLUMNS && (
              <Box
                className={clsx('data-space__viewer__more-info__columns-grid', {
                  'data-space__viewer__more-info__columns-grid--auto-height':
                    (accessPointRelationType?.columns.length ?? 0) <=
                    MAX_GRID_AUTO_HEIGHT_ROWS,
                  'data-space__viewer__more-info__columns-grid--auto-height--empty':
                    (accessPointRelationType?.columns.length ?? 0) === 0,
                  'data-space__viewer__more-info__columns-grid--auto-height--non-empty':
                    (accessPointRelationType?.columns.length ?? 0) > 0 &&
                    (accessPointRelationType?.columns.length ?? 0) <=
                      MAX_GRID_AUTO_HEIGHT_ROWS,
                })}
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
            {selectedTab === MoreInfoTabs.GRAMMAR && (
              <Box className="data-space__viewer__more-info__grammar">
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
          </>
        )}
      </Box>
    </div>
  );
};

export const DataProductAccessPointGroupViewer = observer(
  (props: { accessGroupState: DataProductGroupAccessState }) => {
    const { accessGroupState } = props;
    const accessPoints = accessGroupState.group.accessPoints;

    const auth = useAuth();
    const [showSubscriptionsModal, setShowSubscriptionsModal] = useState(false);
    const [isEntitledButtonGroupMenuOpen, setIsEntitledButtonGroupMenuOpen] =
      useState(false);
    const requestAccessButtonGroupRef = useRef<HTMLDivElement | null>(null);

    const entitlementsDataContractViewerState = useMemo(
      () =>
        accessGroupState.accessState.viewerState.dataContract
          ? new EntitlementsDataContractViewerState(
              V1_transformDataContractToLiteDatacontract(
                accessGroupState.accessState.viewerState.dataContract,
              ),
              accessGroupState.accessState.viewerState.lakeServerClient,
            )
          : undefined,
      [
        accessGroupState.accessState.viewerState.dataContract,
        accessGroupState.accessState.viewerState.lakeServerClient,
      ],
    );

    useEffect(() => {
      if (
        accessGroupState.access === AccessPointGroupAccess.APPROVED &&
        accessGroupState.associatedContract &&
        accessGroupState.fetchingSubscriptionsState.isInInitialState
      ) {
        accessGroupState.fetchSubscriptions(
          accessGroupState.associatedContract.guid,
          auth.user?.access_token,
        );
      }
    }, [accessGroupState, auth.user?.access_token]);

    const handleContractsClick = (): void => {
      accessGroupState.handleContractClick();
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

      const tooltipText =
        accessGroupState.accessState.viewerState.applicationStore.pluginManager
          .getApplicationPlugins()
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
                accessGroupState.fetchingAccessState.isInProgress ||
                accessGroupState.handlingContractsState.isInProgress ||
                accessGroupState.fetchingUserAccessStatus.isInProgress
              }
              sx={{ cursor: onClick === undefined ? 'default' : 'pointer' }}
            >
              {buttonLabel}
              {tooltipText !== undefined && (
                <Tooltip
                  className="data-space__viewer__access-group__item__access__tooltip__icon"
                  title={tooltipText}
                  arrow={true}
                  slotProps={{
                    tooltip: {
                      className:
                        'data-space__viewer__access-group__item__access__tooltip',
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
              title="More options"
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
                    accessGroupState.accessState.viewerState.setDataContractAccessPointGroup(
                      accessGroupState.group,
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
            >
              <AnchorLinkIcon />
            </button>
          </div>
          <Box className="data-space__viewer__access-group__item__header__actions">
            {renderAccess(accessGroupState.access)}
          </Box>
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
                'ag-theme-balham',
                {
                  'data-space__viewer__grid--auto-height':
                    accessPoints.length <= MAX_GRID_AUTO_HEIGHT_ROWS,
                  'data-space__viewer__grid--auto-height--non-empty':
                    accessPoints.length > 0 &&
                    accessPoints.length <= MAX_GRID_AUTO_HEIGHT_ROWS,
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
                domLayout={
                  accessPoints.length > MAX_GRID_AUTO_HEIGHT_ROWS
                    ? 'normal'
                    : 'autoHeight'
                }
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
                detailCellRenderer={(
                  params: DataGridCellRendererParams<V1_LakehouseAccessPoint>,
                ) => (
                  <TDSColumnMoreInfoCellRenderer
                    params={params}
                    accessGroupState={accessGroupState}
                  />
                )}
                detailRowAutoHeight={true}
              />
            </div>
          </div>
        </div>
        {accessGroupState.accessState.viewerState
          .dataContractAccessPointGroup === accessGroupState.group && (
          <EntitlementsDataContractCreator
            open={true}
            onClose={() =>
              accessGroupState.accessState.viewerState.setDataContractAccessPointGroup(
                undefined,
              )
            }
            accessGroupState={accessGroupState}
          />
        )}
        {entitlementsDataContractViewerState && (
          <EntitlementsDataContractViewer
            open={true}
            currentViewer={entitlementsDataContractViewerState}
            dataProductGroupAccessState={accessGroupState}
            legendMarketplaceStore={
              accessGroupState.accessState.viewerState.lakehouseStore
                .marketplaceBaseStore
            }
            onClose={() =>
              accessGroupState.accessState.viewerState.setDataContract(
                undefined,
              )
            }
            initialSelectedUser={
              accessGroupState.accessState.viewerState.applicationStore
                .identityService.currentUser
            }
          />
        )}
        {accessGroupState.associatedContract !== false && (
          <DataProductSubscriptionViewer
            open={showSubscriptionsModal}
            accessGroupState={accessGroupState}
            onClose={() => setShowSubscriptionsModal(false)}
          />
        )}
      </div>
    );
  },
);

export const DataProducteDataAccess = observer(
  (props: { dataProductViewerState: DataProductViewerState }) => {
    const { dataProductViewerState } = props;
    const applicationStore = useApplicationStore();
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
              onClick={() => dataProductViewerState.changeZone(anchor, true)}
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
            {dataProductViewerState.accessState.accessGroupStates.map(
              (groupState) => (
                <DataProductAccessPointGroupViewer
                  key={groupState.id}
                  accessGroupState={groupState}
                />
              ),
            )}
          </div>
        </div>
      </div>
    );
  },
);

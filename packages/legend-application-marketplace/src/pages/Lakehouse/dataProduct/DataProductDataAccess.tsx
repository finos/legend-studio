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
  ArrowDownIcon,
  clsx,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
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
  V1_serializeRawValueSpecification,
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
} from '@mui/material';
import { useLegendMarketplaceBaseStore } from '../../../application/LegendMarketplaceFrameworkProvider.js';
import { DataContractCreator } from '../entitlements/EntitlementsDataContractCreator.js';
import { EntitlementsDataContractViewer } from '../entitlements/EntitlementsDataContractViewer.js';
import { EntitlementsDataContractViewerState } from '../../../stores/lakehouse/entitlements/EntitlementsDataContractViewerState.js';
import { useAuth } from 'react-oidc-context';
import { DataProductSubscriptionViewer } from '../subscriptions/DataProductSubscriptionsViewer.js';
import { assertErrorThrown, guaranteeType } from '@finos/legend-shared';
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
        const model = accessGroupState.accessState.viewerState.isSandboxProduct
          ? guaranteeType(
              accessGroupState.accessState.viewerState.graphManagerState
                .graphManager,
              V1_PureGraphManager,
            ).getFullGraphModelData(
              accessGroupState.accessState.viewerState.graphManagerState.graph,
            )
          : new V1_PureModelContextPointer(
              // TODO: remove as backend should handle undefined protocol input
              new V1_Protocol(
                V1_PureGraphManager.PURE_PROTOCOL_NAME,
                PureClientVersion.VX_X_X,
              ),
              new V1_LegendSDLC(
                accessGroupState.accessState.viewerState.project.groupId,
                accessGroupState.accessState.viewerState.project.artifactId,
                resolveVersion(
                  accessGroupState.accessState.viewerState.project.versionId,
                ),
              ),
            );
        const relationTypeInput = new V1_LambdaReturnTypeInput(
          model,
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
    const entitledButtonGroupRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      if (
        accessGroupState.access === DataProductGroupAccess.COMPLETED &&
        accessGroupState.associatedContract &&
        accessGroupState.fetchingSubscriptionsState.isInInitialState
      ) {
        accessGroupState.fetchSubscriptions(
          accessGroupState.associatedContract.guid,
          auth.user?.access_token,
        );
      }
    });

    const handleContractsClick = (): void => {
      accessGroupState.handleContractClick();
    };

    const handleSubscriptionsClick = (): void => {
      setShowSubscriptionsModal(true);
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
              onClick={handleContractsClick}
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
              onClick={handleContractsClick}
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
            <>
              <ButtonGroup
                variant="contained"
                color="success"
                ref={entitledButtonGroupRef}
              >
                <Button
                  onClick={handleContractsClick}
                  loading={accessGroupState.fetchingAccessState.isInProgress}
                >
                  ENTITLED
                </Button>
                <Button
                  size="small"
                  onClick={() =>
                    setIsEntitledButtonGroupMenuOpen((prev) => !prev)
                  }
                >
                  <ArrowDownIcon />
                </Button>
              </ButtonGroup>
              <Menu
                anchorEl={entitledButtonGroupRef.current}
                open={isEntitledButtonGroupMenuOpen}
                onClose={() => setIsEntitledButtonGroupMenuOpen(false)}
              >
                <MenuItem
                  onClick={() =>
                    accessGroupState.accessState.viewerState.setDataContractAccessPointGroup(
                      accessGroupState.group,
                    )
                  }
                >
                  Request Access for Others
                </MenuItem>
              </Menu>
            </>
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
            >
              <AnchorLinkIcon />
            </button>
          </div>
          <Box className="data-space__viewer__access-group__item__header__actions">
            <Box className="data-space__viewer__access-group__item__header__data-contract">
              {renderAccess(accessGroupState.access)}
            </Box>
            {accessGroupState.access === DataProductGroupAccess.COMPLETED && (
              <Box className="data-space__viewer__access-group__item__header__subscription">
                <Button
                  variant="outlined"
                  color="info"
                  loading={accessGroupState.fetchingAccessState.isInProgress}
                  onClick={handleSubscriptionsClick}
                >
                  SUBSCRIPTIONS
                </Button>
              </Box>
            )}
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
          .dataContractAccessPointGroup !== undefined && (
          <DataContractCreator
            open={true}
            onClose={() =>
              accessGroupState.accessState.viewerState.setDataContractAccessPointGroup(
                undefined,
              )
            }
            accessGroupState={accessGroupState}
          />
        )}
        {accessGroupState.accessState.viewerState.dataContract && (
          <EntitlementsDataContractViewer
            open={true}
            currentViewer={
              new EntitlementsDataContractViewerState(
                accessGroupState.accessState.viewerState.dataContract,
                accessGroupState.accessState.viewerState.lakeServerClient,
              )
            }
            dataProductGroupAccessState={accessGroupState}
            dataProductViewerState={accessGroupState.accessState.viewerState}
            onClose={() =>
              accessGroupState.accessState.viewerState.setDataContract(
                undefined,
              )
            }
          />
        )}
        <DataProductSubscriptionViewer
          open={showSubscriptionsModal}
          accessGroupState={accessGroupState}
          onClose={() => setShowSubscriptionsModal(false)}
        />
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
    const anchor = generateAnchorForActivity(
      DATA_PRODUCT_VIEWER_ACTIVITY_MODE.DATA_ACCESS,
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

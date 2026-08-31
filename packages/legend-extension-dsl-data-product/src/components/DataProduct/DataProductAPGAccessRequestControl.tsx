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
import React, { useMemo, useRef, useState } from 'react';
import {
  Button,
  ButtonGroup,
  CircularProgress,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import { CaretDownIcon, InfoCircleOutlineIcon } from '@finos/legend-art';
import { isNonEmptyString } from '@finos/legend-shared';
import {
  V1_AccessPointGroupReference,
  V1_transformDataContractToLiteDatacontract,
} from '@finos/legend-graph';
import {
  type DataProductAPGState,
  AccessPointGroupAccess,
} from '../../stores/DataProduct/DataProductAPGState.js';
import type { DataProductDataAccessState } from '../../stores/DataProduct/DataProductDataAccessState.js';
import { DataContractViewerState } from '../../stores/DataProduct/DataAccess/DataContractViewerState.js';
import { EntitlementsDataContractCreator } from './DataContract/EntitlementsDataContractCreator.js';
import {
  type ContractErrorLayer,
  DataAccessRequestViewer,
  buildContractErrorsRoot,
} from './DataContract/DataAccessRequestViewer.js';
import { DataProductSubscriptionViewer } from './Subscriptions/DataProductSubscriptionsViewer.js';
import { DataProductTelemetryHelper } from '../../__lib__/DataProductTelemetryHelper.js';

/**
 * Renders the "Request Access" button group (with menu) and all associated
 * dialogs (contract creator, contract viewer, permit viewer, subscription
 * viewer) for a single access point group. Shows the same UI as the LH
 * DataProduct viewer's APG card, and can be dropped into any host that has a
 * fully wired `DataProductAPGState` + `DataProductDataAccessState`.
 */
export const DataProductAPGAccessRequestControl = observer(
  (props: {
    apgState: DataProductAPGState;
    dataAccessState: DataProductDataAccessState;
    tokenProvider: () => string | undefined;
  }) => {
    const { apgState, dataAccessState, tokenProvider } = props;

    const contractViewerContractAndSubscription =
      dataAccessState.contractViewerContractAndSubscription;
    const dataAccessRequestViewerState =
      dataAccessState.dataAccessRequestViewerState;

    const [showSubscriptionsModal, setShowSubscriptionsModal] = useState(false);
    const [isEntitledButtonGroupMenuOpen, setIsEntitledButtonGroupMenuOpen] =
      useState(false);
    const requestAccessButtonGroupRef = useRef<HTMLDivElement | null>(null);

    const apgContractErrors = useMemo(() => {
      const missingIngests = dataAccessState.missingIngests;
      const ingestLayer: ContractErrorLayer | undefined =
        missingIngests.length === 0
          ? undefined
          : {
              title: `Ingest${missingIngests.length === 1 ? '' : 's'} Not Found:`,
              errorItems: missingIngests,
            };
      return buildContractErrorsRoot([ingestLayer]);
    }, [dataAccessState.missingIngests]);

    const dataContractViewerState = useMemo(() => {
      return contractViewerContractAndSubscription &&
        contractViewerContractAndSubscription.dataContract.resource instanceof
          V1_AccessPointGroupReference &&
        contractViewerContractAndSubscription.dataContract.resource
          .accessPointGroup === apgState.apg.id
        ? new DataContractViewerState(
            V1_transformDataContractToLiteDatacontract(
              contractViewerContractAndSubscription.dataContract,
            ),
            (contractId: string, taskId: string) =>
              dataAccessState.getContractTaskUrl(contractId, taskId),
            contractViewerContractAndSubscription.subscriptions?.[0],
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
      contractViewerContractAndSubscription,
      dataAccessState,
    ]);

    const handleContractsClick = (): void => {
      const dataProductPath =
        dataAccessState.dataProductViewerState.product.path;
      const accessPointGroup = apgState.apg.id;
      DataProductTelemetryHelper.logEvent_requestContract(
        dataAccessState.applicationStore.telemetryService,
        dataProductPath,
        accessPointGroup,
      );
      apgState.handleContractClick(dataAccessState);
    };

    const handleSubscriptionsClick = (): void => {
      setShowSubscriptionsModal(true);
    };

    const renderAccess = (val: AccessPointGroupAccess): React.ReactNode => {
      let buttonLabel: string | undefined = undefined;
      let onClick: (() => void) | undefined = undefined;
      let buttonColor:
        | 'info'
        | 'primary'
        | 'warning'
        | 'success'
        | 'error'
        | undefined = undefined;
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
        case AccessPointGroupAccess.SUBMITTED_FOR_APPROVALS:
          buttonLabel = 'SUBMITTED FOR APPROVALS';
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
        (val === AccessPointGroupAccess.APPROVED ||
          val === AccessPointGroupAccess.ENTERPRISE) &&
        apgState.isEntitlementsSyncing
          ? 'Your contract has been approved but your entitlements are still syncing. The status will refresh automatically once your entitlements have synced.'
          : dataAccessState.dataAccessPlugins
              .flatMap((plugin) =>
                plugin.getExtraAccessPointGroupAccessInfo?.(val),
              )
              .find(isNonEmptyString);

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
                apgState.fetchingUserAccessState.isInProgress ||
                apgState.fetchingDataRequestAccessState.isInProgress
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
              title="More options"
              disabled={
                apgState.fetchingAccessState.isInProgress ||
                apgState.handlingContractsState.isInProgress ||
                apgState.fetchingUserAccessState.isInProgress ||
                apgState.fetchingDataRequestAccessState.isInProgress
              }
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
                    dataAccessState.setContractCreatorAPG(apgState.apg);
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
      <>
        {renderAccess(apgState.access)}
        {dataAccessState.contractCreatorAPG === apgState.apg && (
          <EntitlementsDataContractCreator
            open={true}
            onClose={() => dataAccessState.setContractCreatorAPG(undefined)}
            apgState={apgState}
            dataAccessState={dataAccessState}
            tokenProvider={tokenProvider}
          />
        )}
        {dataContractViewerState && (
          <DataAccessRequestViewer
            open={true}
            onClose={() =>
              dataAccessState.setContractViewerContractAndSubscription(
                undefined,
              )
            }
            viewerState={dataContractViewerState}
            onRefresh={() => {
              if (apgState.associatedUserContract) {
                apgState.fetchUserAccessStatus(
                  apgState.associatedUserContract.guid,
                  dataAccessState.lakehouseContractServerClient,
                  tokenProvider,
                );
              }
            }}
            getDataProductUrl={dataAccessState.getDataProductUrl}
            contractErrors={apgContractErrors}
          />
        )}
        {dataAccessRequestViewerState && (
          <DataAccessRequestViewer
            open={true}
            onClose={() =>
              dataAccessState.setDataAccessRequestViewerState(undefined)
            }
            viewerState={dataAccessRequestViewerState}
            getDataProductUrl={dataAccessState.getDataProductUrl}
            contractErrors={apgContractErrors}
          />
        )}
        {apgState.associatedUserContract !== false && (
          <DataProductSubscriptionViewer
            open={showSubscriptionsModal}
            apgState={apgState}
            dataAccessState={dataAccessState}
            onClose={() => setShowSubscriptionsModal(false)}
          />
        )}
      </>
    );
  },
);

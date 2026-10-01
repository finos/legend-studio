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
  type V1_AccessPointGroup,
  type V1_OrganizationalScope,
  V1_ModelAccessPointGroup,
} from '@finos/legend-graph';
import { observer } from 'mobx-react-lite';
import { type ReactNode, useMemo, useState } from 'react';
import { flowResult } from 'mobx';
import {
  Button,
  ButtonGroup,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import { LakehouseResiliencyDisclaimer } from './LakehouseResiliencyDisclaimer.js';
import { guaranteeNonNullable, isNonNullable } from '@finos/legend-shared';
import {
  DataAccessRequestType,
  type ContractConsumerTypeRendererConfig,
  type DataProductDataAccessState,
} from '../../../stores/DataProduct/DataProductDataAccessState.js';
import {
  AccessPointGroupAccess,
  type DataProductAPGState,
} from '../../../stores/DataProduct/DataProductAPGState.js';
import { DataProductTelemetryHelper } from '../../../__lib__/DataProductTelemetryHelper.js';

export const EntitlementsDataContractCreator = observer(
  (props: {
    open: boolean;
    onClose: () => void;
    tokenProvider: () => string | undefined;
    apgState: DataProductAPGState;
    dataAccessState: DataProductDataAccessState;
    headerContent: ReactNode;
    overrideTargetApgs?: V1_AccessPointGroup[] | undefined;
  }) => {
    const {
      open,
      onClose,
      tokenProvider,
      apgState,
      dataAccessState,
      headerContent,
      overrideTargetApgs,
    } = props;
    const viewerState = dataAccessState.dataProductViewerState;
    const isBulkMode =
      overrideTargetApgs !== undefined && overrideTargetApgs.length > 0;
    const accessPointGroup = isBulkMode
      ? undefined
      : guaranteeNonNullable(
          dataAccessState.contractCreatorAPG,
          'Cannot show DataContractCreator. No access point group is selected.',
        );
    const targetApgs: V1_AccessPointGroup[] = useMemo(
      () =>
        isBulkMode
          ? guaranteeNonNullable(overrideTargetApgs)
          : [guaranteeNonNullable(accessPointGroup)],
      [isBulkMode, overrideTargetApgs, accessPointGroup],
    );
    const anyTargetIsModelAPG = useMemo(
      () => targetApgs.some((apg) => apg instanceof V1_ModelAccessPointGroup),
      [targetApgs],
    );
    const consumerTypeRendererConfigs: ContractConsumerTypeRendererConfig[] =
      useMemo(
        () =>
          dataAccessState.dataAccessPlugins
            .map((plugin) => plugin.getContractConsumerTypeRendererConfigs?.())
            .flat()
            .filter(isNonNullable)
            .filter(
              (rendererConfig: ContractConsumerTypeRendererConfig) =>
                isBulkMode ||
                apgState.access !== AccessPointGroupAccess.ENTERPRISE ||
                rendererConfig.enableForEnterpriseAPGs,
            )
            .filter((rendererConfig: ContractConsumerTypeRendererConfig) =>
              isBulkMode
                ? !anyTargetIsModelAPG ||
                  rendererConfig.type !== 'System Account'
                : !(apgState.apg instanceof V1_ModelAccessPointGroup) ||
                  rendererConfig.type !== 'System Account',
            ),
        [
          apgState.access,
          apgState.apg,
          dataAccessState.dataAccessPlugins,
          isBulkMode,
          anyTargetIsModelAPG,
        ],
      );
    const [selectedConsumerType, setSelectedConsumerType] = useState<string>(
      consumerTypeRendererConfigs[0]?.type ?? '',
    );
    const [consumer, setConsumer] = useState<
      V1_OrganizationalScope | undefined
    >();
    const [description, setDescription] = useState<string>();
    const [isValid, setIsValid] = useState<boolean>(false);

    const currentConsumerTypeResult = useMemo(
      () =>
        consumerTypeRendererConfigs
          .find((config) => config.type === selectedConsumerType)
          ?.createContractRenderer(
            apgState,
            setConsumer,
            setDescription,
            setIsValid,
          ),
      [apgState, consumerTypeRendererConfigs, selectedConsumerType],
    );

    const currentConsumerTypeComponent = currentConsumerTypeResult?.component;
    const currentRequestType =
      currentConsumerTypeResult?.requestType ?? DataAccessRequestType.CONTRACT;

    const onCreate = (): void => {
      if (isValid && consumer && description) {
        if (isBulkMode) {
          if (currentRequestType === DataAccessRequestType.WORKFLOW) {
            flowResult(
              dataAccessState.createWorkflowRequestsForAPGs(
                consumer,
                description,
                targetApgs,
                tokenProvider,
                selectedConsumerType,
              ),
            ).catch(viewerState.applicationStore.alertUnhandledError);
          } else {
            flowResult(
              dataAccessState.createContractsForAPGs(
                consumer,
                description,
                targetApgs,
                tokenProvider,
                selectedConsumerType,
              ),
            ).catch(viewerState.applicationStore.alertUnhandledError);
          }
          onClose();
        } else if (currentRequestType === DataAccessRequestType.WORKFLOW) {
          flowResult(
            dataAccessState.createWorkflowRequest(
              consumer,
              description,
              guaranteeNonNullable(accessPointGroup),
              tokenProvider,
              selectedConsumerType,
            ),
          ).catch(viewerState.applicationStore.alertUnhandledError);
        } else {
          flowResult(
            dataAccessState.createContract(
              consumer,
              description,
              guaranteeNonNullable(accessPointGroup),
              tokenProvider,
              selectedConsumerType,
            ),
          ).catch(viewerState.applicationStore.alertUnhandledError);
        }
      }
    };

    return (
      <Dialog open={open} onClose={onClose} fullWidth={true} maxWidth="md">
        <DialogTitle>Data Contract Request</DialogTitle>
        <DialogContent className="marketplace-lakehouse-entitlements__data-contract-creator__content">
          <CubesLoadingIndicator
            isLoading={
              dataAccessState.creatingContractState.isInProgress ||
              dataAccessState.creatingWorkflowRequestState.isInProgress
            }
          >
            <CubesLoadingIndicatorIcon />
          </CubesLoadingIndicator>
          {!dataAccessState.creatingContractState.isInProgress &&
            !dataAccessState.creatingWorkflowRequestState.isInProgress && (
              <>
                <div>{headerContent}</div>
                <LakehouseResiliencyDisclaimer
                  applicationStore={viewerState.applicationStore}
                />
                <ButtonGroup
                  className="marketplace-lakehouse-entitlements__data-contract-creator__consumer-type-btn-group"
                  variant="contained"
                >
                  {consumerTypeRendererConfigs.map((config) => (
                    <Button
                      key={config.type}
                      variant={
                        selectedConsumerType === config.type
                          ? 'contained'
                          : 'outlined'
                      }
                      onClick={(): void => {
                        if (config.type !== selectedConsumerType) {
                          setSelectedConsumerType(config.type);
                          DataProductTelemetryHelper.logEvent_ChangeContractConsumerType(
                            viewerState.applicationStore.telemetryService,
                            config.type,
                            viewerState.product.path,
                            isBulkMode
                              ? targetApgs.map((apg) => apg.id).join(',')
                              : guaranteeNonNullable(accessPointGroup).id,
                          );
                        }
                      }}
                    >
                      {config.type}
                    </Button>
                  ))}
                </ButtonGroup>
                {currentConsumerTypeComponent}
              </>
            )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={onCreate}
            variant="contained"
            disabled={
              !isValid ||
              !consumer ||
              !description ||
              dataAccessState.creatingContractState.isInProgress ||
              dataAccessState.creatingWorkflowRequestState.isInProgress
            }
          >
            Create
          </Button>
          <Button
            onClick={onClose}
            variant="outlined"
            disabled={
              dataAccessState.creatingContractState.isInProgress ||
              dataAccessState.creatingWorkflowRequestState.isInProgress
            }
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    );
  },
);

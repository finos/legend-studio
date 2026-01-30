/**
 * Copyright (c) 2026-present, Goldman Sachs
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
import { withLegendMarketplaceProductViewerStore } from '../../../application/providers/LegendMarketplaceProductViewerStoreProvider.js';
import { useParams } from '@finos/legend-application/browser';
import {
  generateContractPagePath,
  generateLakehouseDataProductPath,
  type LakehouseDataContractTaskPathParams,
  LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN,
} from '../../../__lib__/LegendMarketplaceNavigation.js';
import { assertErrorThrown, guaranteeNonNullable } from '@finos/legend-shared';
import { useAuth } from 'react-oidc-context';
import { LegendMarketplacePage } from '../../LegendMarketplacePage.js';
import {
  EntitlementsDataContractContent,
  EntitlementsDataContractViewerState,
} from '@finos/legend-extension-dsl-data-product';
import { useCallback, useEffect, useState } from 'react';
import { useLegendMarketplaceBaseStore } from '../../../application/providers/LegendMarketplaceFrameworkProvider.js';
import {
  GraphManagerState,
  V1_ApprovalType,
  V1_dataContractsResponseModelSchema,
  V1_TaskStatusChangeResponseModelSchema,
  V1_transformDataContractToLiteDatacontract,
  V1_UserApprovalStatus,
} from '@finos/legend-graph';
import { deserialize } from 'serializr';
import { Box, Button } from '@mui/material';
import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';

export const LakehouseDataContractTask =
  withLegendMarketplaceProductViewerStore(
    observer(() => {
      const marketplaceBaseStore = useLegendMarketplaceBaseStore();
      const params = useParams<LakehouseDataContractTaskPathParams>();
      const auth = useAuth();
      const currentUser =
        marketplaceBaseStore.applicationStore.identityService.currentUser;
      const [contractViewerState, setContractViewerState] = useState<
        EntitlementsDataContractViewerState | undefined
      >(undefined);
      const [isLoading, setIsLoading] = useState(false);

      const contractId = guaranteeNonNullable(
        params[LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_CONTRACT_ID],
      );
      const [currentTaskId, setCurrentTaskId] = useState<string>(
        guaranteeNonNullable(
          params[LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_CONTRACT_TASK_ID],
        ),
      );

      const associatedTask = contractViewerState?.associatedTasks?.find(
        (task) => task.rec.taskId === currentTaskId,
      );
      const isTaskPending =
        associatedTask?.rec.status === V1_UserApprovalStatus.PENDING;
      const userCanApprove =
        isTaskPending && associatedTask.assignees.includes(currentUser);
      const initialUser = associatedTask?.rec.consumer;

      const navigateToNextTaskIfNeeded = useCallback(() => {
        if (!contractViewerState?.associatedTasks) {
          return;
        }

        const consumer = contractViewerState.associatedTasks.find(
          (task) => task.rec.taskId === currentTaskId,
        )?.rec.consumer;

        const privilegeManagerTask = contractViewerState.associatedTasks.find(
          (task) =>
            task.rec.consumer === consumer &&
            task.rec.type ===
              V1_ApprovalType.CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
        );

        if (
          privilegeManagerTask?.rec.status === V1_UserApprovalStatus.APPROVED
        ) {
          const dataOwnerTask = contractViewerState.associatedTasks.find(
            (task) =>
              task.rec.consumer === consumer &&
              task.rec.type === V1_ApprovalType.DATA_OWNER_APPROVAL,
          );

          if (dataOwnerTask && dataOwnerTask.rec.taskId !== currentTaskId) {
            setCurrentTaskId(dataOwnerTask.rec.taskId);
          }
        }
      }, [contractViewerState?.associatedTasks, currentTaskId]);

      useEffect(() => {
        if (
          contractViewerState?.associatedTasks &&
          contractViewerState.initializationState.hasCompleted
        ) {
          navigateToNextTaskIfNeeded();
        }
      }, [
        contractViewerState?.associatedTasks,
        contractViewerState?.initializationState.hasCompleted,
        navigateToNextTaskIfNeeded,
      ]);

      useEffect(() => {
        const fetchAndInitializeContract = async () => {
          try {
            const rawContract =
              await marketplaceBaseStore.lakehouseContractServerClient.getDataContract(
                contractId,
                false,
                auth.user?.access_token,
              );

            const contractResponse = deserialize(
              V1_dataContractsResponseModelSchema(
                marketplaceBaseStore.applicationStore.pluginManager.getPureProtocolProcessorPlugins(),
              ),
              rawContract,
            );
            const dataContracts = contractResponse.dataContracts;
            if (dataContracts?.[0]?.dataContract) {
              const dataContract = dataContracts[0]?.dataContract;
              const liteDataContract =
                V1_transformDataContractToLiteDatacontract(dataContract);

              const viewerState = new EntitlementsDataContractViewerState(
                liteDataContract,
                undefined,
                marketplaceBaseStore.applicationStore,
                marketplaceBaseStore.lakehouseContractServerClient,
                new GraphManagerState(
                  marketplaceBaseStore.applicationStore.pluginManager,
                  marketplaceBaseStore.applicationStore.logService,
                ),
                marketplaceBaseStore.userSearchService,
              );

              setContractViewerState(viewerState);
            }
          } catch (error) {
            assertErrorThrown(error);
            marketplaceBaseStore.applicationStore.notificationService.notifyError(
              `Error fetching contract: ${error.message}`,
            );
          }
        };
        // eslint-disable-next-line no-void
        void fetchAndInitializeContract();
      }, [contractId, auth.user?.access_token, marketplaceBaseStore]);

      const handleRefresh = async (): Promise<void> => {
        if (contractViewerState) {
          contractViewerState.init(auth.user?.access_token);
        }
      };

      const handleApprove = async () => {
        const response =
          await marketplaceBaseStore.lakehouseContractServerClient.approveTask(
            currentTaskId,
            auth.user?.access_token,
          );
        const change = deserialize(
          V1_TaskStatusChangeResponseModelSchema,
          response,
        );

        if (change.errorMessage) {
          throw new Error(`Unable to approve task: ${change.errorMessage}`);
        }

        marketplaceBaseStore.applicationStore.notificationService.notifySuccess(
          'Task has been approved',
        );

        await handleRefresh();
      };

      const handleDeny = async () => {
        const response =
          await marketplaceBaseStore.lakehouseContractServerClient.denyTask(
            currentTaskId,
            auth.user?.access_token,
          );
        const change = deserialize(
          V1_TaskStatusChangeResponseModelSchema,
          response,
        );

        if (change.errorMessage) {
          throw new Error(`Unable to deny task: ${change.errorMessage}`);
        }

        marketplaceBaseStore.applicationStore.notificationService.notifySuccess(
          'Task has been denied',
        );

        await handleRefresh();
      };

      const handleApproveClick = () => {
        if (!isLoading) {
          setIsLoading(true);
          handleApprove()
            .catch((error) => {
              assertErrorThrown(error);
              marketplaceBaseStore.applicationStore.notificationService.notifyError(
                `Error approving task: ${error.message}`,
              );
            })
            .finally(() => {
              setIsLoading(false);
            });
        }
      };

      const handleDenyClick = () => {
        if (!isLoading) {
          setIsLoading(true);
          handleDeny()
            .catch((error) => {
              assertErrorThrown(error);
              marketplaceBaseStore.applicationStore.notificationService.notifyError(
                `Error denying task: ${error.message}`,
              );
            })
            .finally(() => {
              setIsLoading(false);
            });
        }
      };

      return (
        <LegendMarketplacePage className="marketplace-lakehouse-single-contract-viewer">
          <CubesLoadingIndicator isLoading={isLoading}>
            <CubesLoadingIndicatorIcon />
          </CubesLoadingIndicator>
          {contractViewerState && (
            <div className="marketplace-lakehouse-single-contract-viewer__container">
              {associatedTask !== undefined && (
                <Box className="marketplace-lakehouse-single-contract-viewer__action-btns">
                  <Button
                    variant="contained"
                    color="success"
                    onClick={handleApproveClick}
                    title={
                      !isTaskPending
                        ? 'Task does not require review'
                        : userCanApprove
                          ? ''
                          : 'You are not assigned to review this task'
                    }
                    disabled={!userCanApprove || isLoading}
                  >
                    Approve Task
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={handleDenyClick}
                    title={
                      !isTaskPending
                        ? 'Task does not require review'
                        : userCanApprove
                          ? ''
                          : 'You are not assigned to review this task'
                    }
                    disabled={!userCanApprove || isLoading}
                  >
                    Deny Task
                  </Button>
                </Box>
              )}
              <EntitlementsDataContractContent
                currentViewer={contractViewerState}
                getContractTaskUrl={(
                  contractIdParam: string,
                  taskIdParam: string,
                ) =>
                  marketplaceBaseStore.applicationStore.navigationService.navigator.generateAddress(
                    generateContractPagePath(contractIdParam, taskIdParam),
                  )
                }
                getDataProductUrl={(
                  dataProductId: string,
                  deploymentId: number,
                ) =>
                  marketplaceBaseStore.applicationStore.navigationService.navigator.generateAddress(
                    generateLakehouseDataProductPath(
                      dataProductId,
                      deploymentId,
                    ),
                  )
                }
                initialSelectedUser={initialUser}
                onRefresh={handleRefresh}
                isReadOnly={true}
              />
            </div>
          )}
        </LegendMarketplacePage>
      );
    }),
  );

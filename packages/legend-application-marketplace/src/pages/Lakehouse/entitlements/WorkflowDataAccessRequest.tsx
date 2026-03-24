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
import {
  ActionAlertActionType,
  ActionAlertType,
} from '@finos/legend-application';
import { withLegendMarketplaceProductViewerStore } from '../../../application/providers/LegendMarketplaceProductViewerStoreProvider.js';
import { useParams } from '@finos/legend-application/browser';
import {
  generateLakehouseDataProductPath,
  type WorkflowDataAccessRequestPathParams,
  LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN,
} from '../../../__lib__/LegendMarketplaceNavigation.js';
import { assertErrorThrown, guaranteeNonNullable } from '@finos/legend-shared';
import { useAuth } from 'react-oidc-context';
import { LegendMarketplacePage } from '../../LegendMarketplacePage.js';
import { useEffect, useState } from 'react';
import { useLegendMarketplaceBaseStore } from '../../../application/providers/LegendMarketplaceFrameworkProvider.js';
import {
  GraphManagerState,
  V1_RawWorkflowTask,
  V1_WorkflowTaskStatus,
} from '@finos/legend-graph';
import { Box, Button, TextField } from '@mui/material';
import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import {
  DataAccessRequestContent,
  WorkflowDataAccessRequestState,
} from '@finos/legend-extension-dsl-data-product';
import { flowResult } from 'mobx';

export const WorkflowDataAccessRequestTask =
  withLegendMarketplaceProductViewerStore(
    observer(() => {
      const marketplaceBaseStore = useLegendMarketplaceBaseStore();
      const params = useParams<WorkflowDataAccessRequestPathParams>();
      const auth = useAuth();
      const currentUser =
        marketplaceBaseStore.applicationStore.identityService.currentUser;

      const [workflowState, setWorkflowState] = useState<
        WorkflowDataAccessRequestState | undefined
      >(undefined);
      const [isLoading, setIsLoading] = useState(false);

      const dataAccessRequestId = guaranteeNonNullable(
        params[LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_ACCESS_REQUEST_ID],
      );

      // Find the first OPEN task, preferring workflow server tasks as source of truth
      const getActionableTask = (): V1_RawWorkflowTask | undefined => {
        if (!workflowState) {
          return undefined;
        }
        // Prefer workflow server tasks
        const { privilegeManagerTask, dataOwnerTask } =
          workflowState.workflowTasks;
        const workflowServerTask = [privilegeManagerTask, dataOwnerTask].find(
          (task) => task !== undefined && task.status === 'OPEN',
        );
        if (workflowServerTask) {
          return workflowServerTask;
        }
        // Fallback to dataRequestWithWorkflow tasks
        const fallbackTask = workflowState.dataRequestWithWorkflow?.workflows
          .flatMap((wf) => wf.tasks)
          .find((task) => task.status === V1_WorkflowTaskStatus.OPEN);
        if (fallbackTask) {
          // Find the matching raw workflow task by taskId, or build a minimal one from the fallback
          const matchingRaw = [privilegeManagerTask, dataOwnerTask].find(
            (t) => t?.taskId === fallbackTask.taskId,
          );
          if (matchingRaw) {
            return matchingRaw;
          }
          // Create a minimal V1_RawWorkflowTask from the fallback
          const raw = new V1_RawWorkflowTask();
          raw.taskId = fallbackTask.taskId;
          raw.status = fallbackTask.status;
          raw.potentialAssignees = fallbackTask.assignees;
          raw.completed = false;
          return raw;
        }
        return undefined;
      };

      const actionableTask = getActionableTask();

      const userCanAction =
        actionableTask?.potentialAssignees.includes(currentUser);

      useEffect(() => {
        const fetchAndInitialize = async () => {
          try {
            setIsLoading(true);

            const state = new WorkflowDataAccessRequestState(
              dataAccessRequestId,
              marketplaceBaseStore.applicationStore,
              marketplaceBaseStore.lakehouseContractServerClient,
              marketplaceBaseStore.lakehouseWorkflowServerClient,
              new GraphManagerState(
                marketplaceBaseStore.applicationStore.pluginManager,
                marketplaceBaseStore.applicationStore.logService,
              ),
              marketplaceBaseStore.userSearchService,
            );

            setWorkflowState(state);
            await flowResult(state.init(auth.user?.access_token));
          } catch (error) {
            assertErrorThrown(error);
            marketplaceBaseStore.applicationStore.notificationService.notifyError(
              `Error fetching data access request: ${error.message}`,
            );
          } finally {
            setIsLoading(false);
          }
        };
        // eslint-disable-next-line no-void
        void fetchAndInitialize();
      }, [dataAccessRequestId, auth.user?.access_token, marketplaceBaseStore]);

      const handleRefresh = async (): Promise<void> => {
        if (workflowState) {
          workflowState.init(auth.user?.access_token);
        }
      };

      const handleApprove = async (justification: string) => {
        if (!actionableTask || !currentUser) {
          return;
        }
        await marketplaceBaseStore.lakehouseWorkflowServerClient.approveTask(
          actionableTask.taskId,
          currentUser,
          justification,
          auth.user?.access_token,
        );

        marketplaceBaseStore.applicationStore.notificationService.notifySuccess(
          'Request has been approved',
        );

        await handleRefresh();
      };

      const handleDeny = async (justification: string) => {
        if (!actionableTask || !currentUser) {
          return;
        }
        await marketplaceBaseStore.lakehouseWorkflowServerClient.rejectTask(
          actionableTask.taskId,
          currentUser,
          justification,
          auth.user?.access_token,
        );

        marketplaceBaseStore.applicationStore.notificationService.notifySuccess(
          'Request has been denied',
        );

        await handleRefresh();
      };

      const handleApproveClick = () => {
        let justification = '';
        marketplaceBaseStore.applicationStore.alertService.setActionAlertInfo({
          title: 'Approve Request',
          message:
            'Please provide a business justification for approving this request.',
          prompt: (
            <TextField
              fullWidth={true}
              autoFocus={true}
              multiline={true}
              minRows={3}
              placeholder="Business Justification"
              onChange={(e) => {
                justification = e.target.value;
              }}
              sx={{ marginTop: 2 }}
            />
          ),
          type: ActionAlertType.STANDARD,
          actions: [
            {
              label: 'Approve',
              type: ActionAlertActionType.PROCEED_WITH_CAUTION,
              handler: () => {
                if (!isLoading) {
                  setIsLoading(true);
                  handleApprove(justification)
                    .catch((error) => {
                      assertErrorThrown(error);
                      marketplaceBaseStore.applicationStore.notificationService.notifyError(
                        `Error approving request: ${error.message}`,
                      );
                    })
                    .finally(() => {
                      setIsLoading(false);
                    });
                }
              },
            },
            {
              label: 'Cancel',
              type: ActionAlertActionType.PROCEED,
              default: true,
            },
          ],
        });
      };

      const handleDenyClick = () => {
        let justification = '';
        marketplaceBaseStore.applicationStore.alertService.setActionAlertInfo({
          title: 'Deny Request',
          message:
            'Please provide a business justification for denying this request.',
          prompt: (
            <TextField
              fullWidth={true}
              autoFocus={true}
              multiline={true}
              minRows={3}
              placeholder="Business Justification"
              onChange={(e) => {
                justification = e.target.value;
              }}
              sx={{ marginTop: 2 }}
            />
          ),
          type: ActionAlertType.CAUTION,
          actions: [
            {
              label: 'Deny',
              type: ActionAlertActionType.PROCEED_WITH_CAUTION,
              handler: () => {
                if (!isLoading) {
                  setIsLoading(true);
                  handleDeny(justification)
                    .catch((error) => {
                      assertErrorThrown(error);
                      marketplaceBaseStore.applicationStore.notificationService.notifyError(
                        `Error denying request: ${error.message}`,
                      );
                    })
                    .finally(() => {
                      setIsLoading(false);
                    });
                }
              },
            },
            {
              label: 'Cancel',
              type: ActionAlertActionType.PROCEED,
              default: true,
            },
          ],
        });
      };

      return (
        <LegendMarketplacePage className="marketplace-lakehouse-single-contract-viewer">
          <CubesLoadingIndicator isLoading={isLoading}>
            <CubesLoadingIndicatorIcon />
          </CubesLoadingIndicator>
          {workflowState?.dataRequestWithWorkflow && (
            <div className="marketplace-lakehouse-single-contract-viewer__container">
              {actionableTask !== undefined && (
                <Box className="marketplace-lakehouse-single-contract-viewer__action-btns">
                  <Button
                    variant="contained"
                    color="success"
                    onClick={handleApproveClick}
                    title={
                      userCanAction
                        ? ''
                        : 'You are not assigned to review this task'
                    }
                    disabled={!userCanAction || isLoading}
                  >
                    Approve Request
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={handleDenyClick}
                    title={
                      userCanAction
                        ? ''
                        : 'You are not assigned to review this task'
                    }
                    disabled={!userCanAction || isLoading}
                  >
                    Deny Request
                  </Button>
                </Box>
              )}
              <DataAccessRequestContent
                viewerState={workflowState}
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
                onRefresh={handleRefresh}
                isReadOnly={true}
              />
            </div>
          )}
        </LegendMarketplacePage>
      );
    }),
  );

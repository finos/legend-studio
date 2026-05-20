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
  generatePermitDataAccessRequestPagePath,
  type WorkflowDataAccessRequestPathParams,
  LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN,
} from '../../../__lib__/LegendMarketplaceNavigation.js';
import { assertErrorThrown, guaranteeNonNullable } from '@finos/legend-shared';
import { useAuth } from 'react-oidc-context';
import { LegendMarketplacePage } from '../../LegendMarketplacePage.js';
import { useEffect, useState } from 'react';
import { useLegendMarketplaceBaseStore } from '../../../application/providers/LegendMarketplaceFrameworkProvider.js';
import { Box, Button, TextField } from '@mui/material';
import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import {
  DataAccessRequestContent,
  PermitDataAccessRequestState,
} from '@finos/legend-extension-dsl-data-product';
import { flowResult } from 'mobx';
import {
  V1_deserializeDataRequestsWithWorkflowResponse,
  V1_PermitTaskAction,
} from '@finos/legend-graph';

export const PermitDataAccessRequestTask =
  withLegendMarketplaceProductViewerStore(
    observer(() => {
      const marketplaceBaseStore = useLegendMarketplaceBaseStore();
      const params = useParams<WorkflowDataAccessRequestPathParams>();
      const auth = useAuth();
      const currentUser =
        marketplaceBaseStore.applicationStore.identityService.currentUser;

      const [permitState, setPermitState] =
        useState<PermitDataAccessRequestState>();
      const [isLoading, setIsLoading] = useState(false);

      const dataAccessRequestId = guaranteeNonNullable(
        params[LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.DATA_ACCESS_REQUEST_ID],
      );

      // Find the first OPEN task
      const getActionableTask = () => {
        if (!permitState) {
          return undefined;
        }
        return permitState.getFirstOpenTask();
      };

      const actionableTask = getActionableTask();
      const userCanAction = actionableTask?.assignees.includes(currentUser);

      useEffect(() => {
        const fetchAndInitialize = async () => {
          try {
            setIsLoading(true);

            const pluginManager =
              marketplaceBaseStore.applicationStore.pluginManager;
            const permitClient =
              marketplaceBaseStore.permitWorkflowServerClient;

            const state = new PermitDataAccessRequestState(
              dataAccessRequestId,
              marketplaceBaseStore.applicationStore,
              permitClient,
              marketplaceBaseStore.userSearchService,
              {
                authServerClient:
                  marketplaceBaseStore.lakehouseContractServerClient,
                fetchFresh: async (token) => {
                  const raw = await permitClient.getDataRequestWithWorkflow(
                    dataAccessRequestId,
                    token,
                  );
                  return V1_deserializeDataRequestsWithWorkflowResponse(
                    raw,
                    pluginManager.getPureProtocolProcessorPlugins(),
                  )[0];
                },
                getTaskPageUrl: (id) =>
                  marketplaceBaseStore.applicationStore.navigationService.navigator.generateAddress(
                    generatePermitDataAccessRequestPagePath(id),
                  ),
              },
            );

            setPermitState(state);
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
        if (permitState) {
          setIsLoading(true);
          permitState.initializationState.reset();
          await flowResult(permitState.init(auth.user?.access_token));
          setIsLoading(false);
        }
      };

      const handleApprove = async (justification: string) => {
        if (!actionableTask || !permitState) {
          return;
        }
        await flowResult(
          permitState.performTaskAction(
            actionableTask.taskId,
            V1_PermitTaskAction.APPROVE,
            justification,
            auth.user?.access_token,
          ),
        );
        marketplaceBaseStore.applicationStore.notificationService.notifySuccess(
          'Request has been approved',
        );
        await handleRefresh();
      };

      const handleDeny = async (justification: string) => {
        if (!actionableTask || !permitState) {
          return;
        }
        await flowResult(
          permitState.performTaskAction(
            actionableTask.taskId,
            V1_PermitTaskAction.REJECT,
            justification,
            auth.user?.access_token,
          ),
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
                if (!justification.trim()) {
                  marketplaceBaseStore.applicationStore.notificationService.notifyError(
                    'Business justification is required for approval',
                  );
                  return;
                }
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
                if (!justification.trim()) {
                  marketplaceBaseStore.applicationStore.notificationService.notifyError(
                    'Business justification is required for denial',
                  );
                  return;
                }
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
          {permitState?.dataRequestWithWorkflow && (
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
                viewerState={permitState}
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

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
import { Button, Typography, CircularProgress } from '@mui/material';
import { LegendMarketplacePage } from '../LegendMarketplacePage.js';
import { useCallback, useEffect, useState } from 'react';
import type {
  Subscription,
  ProductSubscription,
  SubscriptionRequest,
} from '@finos/legend-server-marketplace';
import {
  DataGrid,
  type DataGridCellRendererParams,
} from '@finos/legend-lego/data-grid';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';

import { flowResult } from 'mobx';
import { UserSearchInput } from '@finos/legend-art';
import type { LegendUser } from '@finos/legend-shared';
import {
  useLegendMarketplaceSubscriptionsStore,
  withLegendMarketplaceSubscriptionsStore,
} from '../../application/providers/LegendMarketplaceSubscriptionsStoreProvider.js';

export const LegendMarketplaceSubscriptions =
  withLegendMarketplaceSubscriptionsStore(
    observer(() => {
      const marketplaceStore = useLegendMarketplaceBaseStore();
      const subscriptionStore = useLegendMarketplaceSubscriptionsStore();
      const [userSearchEnabled, setUserSearchEnabled] =
        useState<boolean>(false);
      const initialUser =
        marketplaceStore.applicationStore.identityService.currentUser;

      const fetchSubscriptions = useCallback(
        async (user: string) => {
          flowResult(subscriptionStore.fetchSubscription(user)).catch(
            marketplaceStore.applicationStore.alertUnhandledError,
          );
        },
        [
          subscriptionStore,
          marketplaceStore.applicationStore.alertUnhandledError,
        ],
      );

      const cancelSubscription = () => {
        const orderItems: Record<number, ProductSubscription[]> = {};
        subscriptionStore.selectedSubscriptions.forEach((s) => {
          const subscription: ProductSubscription = {
            providerName: s.carrierVendor,
            productName: s.serviceName,
            category: s.itemName,
            price: s.price,
            servicepriceId: s.servicepriceId ?? 0,
            model: s.model,
          };
          if (s.permId in orderItems) {
            orderItems[s.permId]?.push(subscription);
          } else {
            orderItems[s.permId] = [subscription];
          }
        });
        const cancellationRequest: SubscriptionRequest = {
          ordered_by: initialUser,
          kerberos: subscriptionStore.selectedUser.id,
          order_items: orderItems,
        };

        flowResult(
          subscriptionStore.cancelSubscription(cancellationRequest),
        ).catch(marketplaceStore.applicationStore.alertUnhandledError);
      };

      useEffect(() => {
        flowResult(subscriptionStore.refresh()).catch(
          marketplaceStore.applicationStore.alertUnhandledError,
        );
      }, [
        subscriptionStore,
        marketplaceStore.applicationStore.alertUnhandledError,
      ]);

      return (
        <LegendMarketplacePage className="legend-marketplace-home">
          <div className="legend-marketplace-subscriptions-content">
            <div className="legend-marketplace-subscriptions-content__search-section">
              <Typography variant="h2" fontWeight="bold">
                Subscriptions
              </Typography>
              {userSearchEnabled ? (
                <UserSearchInput
                  className="legend-marketplace-subscriptions__user-input"
                  userValue={subscriptionStore.selectedUser}
                  setUserValue={(_user: LegendUser): void => {
                    subscriptionStore.setSelectedUser(_user);
                    fetchSubscriptions(_user.id).catch(
                      marketplaceStore.applicationStore.alertUnhandledError,
                    );
                  }}
                  userSearchService={marketplaceStore.userSearchService}
                  label="Search user"
                  required={true}
                  variant="outlined"
                  fullWidth={true}
                />
              ) : (
                <Button
                  variant="contained"
                  className="legend-marketplace-subscriptions-content_button"
                  onClick={() => setUserSearchEnabled(!userSearchEnabled)}
                >
                  Change User
                </Button>
              )}
              <Button
                className="legend-marketplace-subscriptions-content__cancel-button"
                disabled={
                  subscriptionStore.selectedSubscriptions.length <= 0 ||
                  subscriptionStore.cancelSubscriptionState.isInProgress
                }
                onClick={cancelSubscription}
                variant="contained"
                color="secondary"
                startIcon={
                  subscriptionStore.cancelSubscriptionState.isInProgress ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : null
                }
                sx={{ minWidth: 180 }}
              >
                {subscriptionStore.cancelSubscriptionState.isInProgress
                  ? 'Cancelling...'
                  : 'Cancel Subscription'}
              </Button>
            </div>

            {subscriptionStore.fetchSubscriptionState.isInProgress ? (
              <CircularProgress size={25} />
            ) : (
              <div
                className="legend-marketplace-subscriptions-content__subscription-grid ag-theme-balham"
                style={{ height: '1000px', width: '100%', fontSize: '14px' }}
              >
                <DataGrid
                  rowData={subscriptionStore.subscriptionFeeds}
                  columnDefs={[
                    {
                      minWidth: 50,
                      headerName: 'Carrier Vendor',
                      field: 'carrierVendor',
                      spanRows: true,
                      suppressHeaderMenuButton: true,
                      flex: 1,
                    },
                    {
                      minWidth: 50,
                      headerName: 'Product',
                      field: 'model',
                      spanRows: true,
                      suppressHeaderMenuButton: true,
                      flex: 1,
                    },
                    {
                      minWidth: 50,
                      headerName: 'Source Vendor',
                      field: 'sourceVendor',
                      suppressHeaderMenuButton: true,
                      flex: 1,
                    },
                    {
                      minWidth: 50,
                      headerName: 'Item Type',
                      field: 'itemName',
                      suppressHeaderMenuButton: true,
                      flex: 1,
                    },
                    {
                      minWidth: 50,
                      headerName: 'Service',
                      field: 'serviceName',
                      suppressHeaderMenuButton: true,
                      flex: 1,
                    },
                    {
                      minWidth: 50,
                      headerName: 'Cost (USD)',
                      field: 'annualAmount',
                      suppressHeaderMenuButton: true,
                      flex: 1,
                    },
                    {
                      minWidth: 50,
                      headerName: 'Cost Code',
                      field: 'costCode',
                      suppressHeaderMenuButton: true,
                      flex: 1,
                    },
                    {
                      minWidth: 60,
                      headerName: 'Cancel Subscription',
                      suppressHeaderMenuButton: true,
                      flex: 1,
                      cellRenderer: (
                        params: DataGridCellRendererParams<Subscription>,
                      ) => (
                        <input
                          type="checkbox"
                          checked={subscriptionStore.selectedSubscriptions.some(
                            (sub) => sub.id === params.data?.id,
                          )}
                          onChange={(e) => {
                            if (e.target.checked) {
                              subscriptionStore.addSelectedSubscriptions(
                                params.data ?? null,
                              );
                            } else {
                              subscriptionStore.removeSelectedSubscription(
                                params.data ?? null,
                              );
                            }
                          }}
                        />
                      ),
                    },
                  ]}
                  enableCellSpan={true}
                  defaultColDef={{
                    headerStyle: {
                      fontSize: '18px',
                      backgroundColor: '#dce3e8',
                    },
                  }}
                />
              </div>
            )}
          </div>
        </LegendMarketplacePage>
      );
    }),
  );

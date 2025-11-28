/**
 * Copyright (c) 2025-present, Goldman Sachs
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

import React, { useCallback, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Collapse,
} from '@mui/material';
import { flowResult } from 'mobx';
import {
  RefreshIcon,
  ShoppingCartIcon,
  ClockIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@finos/legend-art';
import { LegendMarketplacePage } from '../LegendMarketplacePage.js';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';
import {
  type TerminalProductOrder,
  OrderCategory,
  OrderStatus,
} from '@finos/legend-server-marketplace';
import { assertErrorThrown } from '@finos/legend-shared';
import {
  useLegendMarketplaceOrdersStore,
  withLegendMarketplaceOrdersStore,
} from '../../application/providers/LegendMarketplaceYourOrdersStoreProvider.js';

const OrderStatusChip: React.FC<{ status: OrderStatus | undefined }> = ({
  status,
}) => {
  switch (status) {
    case OrderStatus.IN_PROGRESS:
      return (
        <Chip
          icon={<ClockIcon />}
          label={status.toString()}
          variant="filled"
          size="small"
          className={'order-status-chip--open'}
        />
      );
    case OrderStatus.OPEN:
      return (
        <Chip
          icon={<ClockIcon />}
          label={status.toString()}
          variant="filled"
          size="small"
          className={'order-status-chip--open'}
        />
      );
    case OrderStatus.COMPLETED:
      return (
        <Chip
          icon={<CheckCircleIcon />}
          label={status.toString()}
          variant="filled"
          size="small"
          className={'order-status-chip--closed'}
        />
      );
    default:
      return (
        <Chip
          icon={<CheckCircleIcon />}
          label={OrderStatus.IN_PROGRESS.toString()}
          variant="filled"
          size="small"
          className={'order-status-chip--open'}
        />
      );
  }
};

const StageChip: React.FC<{ stage: string | null }> = ({ stage }) => {
  if (!stage) {
    return <Typography className="order-row__stage">Pending</Typography>;
  }

  return <Typography className="order-row__stage">{stage}</Typography>;
};

const OrderTableRow: React.FC<{ order: TerminalProductOrder }> = observer(
  ({ order }) => {
    const [expanded, setExpanded] = React.useState(false);

    return (
      <>
        <TableRow onClick={() => setExpanded(!expanded)}>
          <TableCell>
            <Box className="order-row__id-cell">
              <IconButton size="small" className="expand-button">
                {expanded ? (
                  <ChevronDownIcon size={16} />
                ) : (
                  <ChevronRightIcon size={16} />
                )}
              </IconButton>
              <Typography className="order-id">#{order.order_id}</Typography>
            </Box>
          </TableCell>

          <TableCell>
            <OrderStatusChip status={order.workflow_details?.workflow_status} />
          </TableCell>

          <TableCell>
            <Typography className="order-row__date">
              {order.created_at.split('T')[0]}
            </Typography>
          </TableCell>

          <TableCell align="center">
            <Typography className="order-row__items-count">
              {order.service_pricing_items.length}
            </Typography>
          </TableCell>

          <TableCell align="right">
            <Typography className="order-row__total-cost">
              {order.order_cost}
            </Typography>
          </TableCell>

          <TableCell align="center">
            <StageChip stage={order.workflow_details?.current_stage ?? null} />
          </TableCell>
        </TableRow>

        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
            <Collapse in={expanded} timeout="auto" unmountOnExit={true}>
              <Box className="order-details">
                <Typography className="order-details__title">
                  Order Items ({order.service_pricing_items.length})
                </Typography>
                <Box className="order-details__items-table">
                  <Table size="medium">
                    <TableHead>
                      <TableRow>
                        <TableCell align="left">
                          <Typography>Product</Typography>
                        </TableCell>
                        <TableCell align="left">
                          <Typography>Provider</Typography>
                        </TableCell>
                        <TableCell align="left">
                          <Typography>Category</Typography>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {order.order_category === OrderCategory.TERMINAL ? (
                        <TableRow key={`${order.vendor_profile_id}`}>
                          <TableCell align="left">
                            <Typography className="order-details__product-name">
                              {order.vendor_profile_name}
                            </Typography>
                          </TableCell>
                          <TableCell align="left">
                            <Typography className="order-details__provider-name">
                              {order.vendor_name}
                            </Typography>
                          </TableCell>
                          <TableCell align="left">
                            <Typography className="order-details__category-name">
                              {'Terminal'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        order.service_pricing_items.map((item, index) => (
                          <TableRow
                            key={`${item.service_pricing_id || `item-${item.service_pricing_name}`}-${order.order_id}`}
                          >
                            <TableCell align="left">
                              <Typography className="order-details__product-name">
                                {item.service_pricing_name}
                              </Typography>
                            </TableCell>
                            <TableCell align="left">
                              <Typography className="order-details__provider-name">
                                {order.vendor_name}
                              </Typography>
                            </TableCell>
                            <TableCell align="left">
                              <Typography className="order-details__category-name">
                                {item.service_pricing_id ===
                                order.vendor_profile_id
                                  ? 'Terminal'
                                  : 'Add-on'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Box>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      </>
    );
  },
);

export const LegendMarketplaceYourOrders: React.FC =
  withLegendMarketplaceOrdersStore(
    observer(() => {
      const baseStore = useLegendMarketplaceBaseStore();
      const ordersStore = useLegendMarketplaceOrdersStore();

      // Helper function to safely execute flow operations
      const executeFlowSafely = useCallback(
        (flowFn: () => Generator<Promise<unknown>, void, unknown>) => {
          flowResult(flowFn()).catch((error) => {
            assertErrorThrown(error);
            baseStore.applicationStore.alertUnhandledError(error);
          });
        },
        [baseStore.applicationStore],
      );

      const handleTabChange = useCallback(
        (_event: React.SyntheticEvent, newValue: 'open' | 'closed') => {
          ordersStore.setSelectedTab(newValue);
          if (
            newValue === 'open' &&
            ordersStore.fetchOpenOrdersState.isInInitialState
          ) {
            executeFlowSafely(() => ordersStore.fetchOpenOrders());
          } else if (
            newValue === 'closed' &&
            ordersStore.fetchClosedOrdersState.isInInitialState
          ) {
            executeFlowSafely(() => ordersStore.fetchClosedOrders());
          }
        },
        [ordersStore, executeFlowSafely],
      );

      const handleRefresh = useCallback(() => {
        executeFlowSafely(() => ordersStore.refreshCurrentOrders());
      }, [ordersStore, executeFlowSafely]);

      useEffect(() => {
        // Load open orders by default
        if (ordersStore.openOrders.length === 0) {
          executeFlowSafely(() => ordersStore.fetchOpenOrders());
        }
      }, [ordersStore, executeFlowSafely]);

      const currentOrders = ordersStore.currentOrders;
      const isLoading = ordersStore.currentFetchState.isInProgress;

      return (
        <LegendMarketplacePage className="legend-marketplace-your-orders">
          <Box className="legend-marketplace-your-orders__content">
            <Box className="legend-marketplace-your-orders__header-section">
              <Typography variant="h1">Your Orders</Typography>
              <Button
                variant="outlined"
                startIcon={
                  isLoading ? <CircularProgress size={25} /> : <RefreshIcon />
                }
                onClick={handleRefresh}
                disabled={isLoading}
                className="legend-marketplace-your-orders__refresh-button"
              >
                {isLoading ? 'Refreshing...' : 'Refresh'}
              </Button>
            </Box>

            <Box className="orders-tabs">
              <Tabs
                value={ordersStore.selectedTab}
                onChange={handleTabChange}
                aria-label="order status tabs"
              >
                <Tab
                  label={`In Progress (${ordersStore.openOrders.length})`}
                  value="open"
                />
                <Tab
                  label={`Completed (${ordersStore.closedOrders.length})`}
                  value="closed"
                />
              </Tabs>
            </Box>

            {isLoading ? (
              <Box className="orders-loading">
                <CircularProgress size={40} />
                <Typography className="loading-text">
                  Loading your orders...
                </Typography>
              </Box>
            ) : currentOrders.length === 0 ? (
              <Box className="orders-empty">
                <ShoppingCartIcon size={48} className="empty-icon" />
                <Typography className="empty-title">
                  No{' '}
                  {ordersStore.selectedTab === 'open' ? 'active' : 'completed'}{' '}
                  orders found
                </Typography>
                <Typography className="empty-description">
                  {ordersStore.selectedTab === 'open'
                    ? "You don't have any orders in progress. Start shopping to place your first order!"
                    : "You don't have any completed orders yet. Your completed orders will appear here."}
                </Typography>
              </Box>
            ) : (
              <TableContainer
                component={Paper}
                className="orders-table-container"
              >
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Order ID</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Order Date</TableCell>
                      <TableCell align="center">Items</TableCell>
                      <TableCell align="right">Total Cost</TableCell>
                      <TableCell align="center">Stage</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentOrders.map((order) => (
                      <OrderTableRow key={order.order_id} order={order} />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </LegendMarketplacePage>
      );
    }),
  );

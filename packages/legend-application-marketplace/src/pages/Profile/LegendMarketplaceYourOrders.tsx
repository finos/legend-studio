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

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Tooltip,
  TextField,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { flowResult } from 'mobx';
import {
  ShoppingCartIcon,
  ChevronDownIcon,
  TimesCircleIcon,
  OpenNewTabIcon,
  SearchIcon,
  CopyIcon,
  CloseIcon,
} from '@finos/legend-art';
import { LegendMarketplacePage } from '../LegendMarketplacePage.js';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';
import {
  type TerminalProductOrder,
  OrderStatus,
} from '@finos/legend-server-marketplace';
import { assertErrorThrown, isNullable } from '@finos/legend-shared';
import {
  useLegendMarketplaceOrdersStore,
  withLegendMarketplaceOrdersStore,
} from '../../application/providers/LegendMarketplaceYourOrdersStoreProvider.js';
import { ProgressTracker } from '../../components/orders/ProgressTracker.js';
import { CancelOrderDialog } from '../../components/orders/CancelOrderDialog.js';
import {
  formatOrderDate,
  canCancelOrder,
  formatTimestamp,
  getCurrentStageTrackingUrl,
  getClosureInfo,
} from '../../stores/orders/OrderHelpers.js';

const getEmptyOrdersTitle = (
  hasSearchTerm: boolean,
  selectedTab: 'open' | 'closed',
): string => {
  if (hasSearchTerm) {
    return 'No orders match your search';
  }
  return `No ${selectedTab === 'open' ? 'active' : 'completed'} orders found`;
};

const getEmptyOrdersDescription = (
  hasSearchTerm: boolean,
  selectedTab: 'open' | 'closed',
): string => {
  if (hasSearchTerm) {
    return 'Try adjusting your search terms and try again.';
  }
  return selectedTab === 'open'
    ? "You don't have any orders in progress. Start shopping to place your first order!"
    : "You don't have any completed orders yet. Your completed orders will appear here.";
};

const filterOrdersBySearchTerm = (
  orders: TerminalProductOrder[],
  searchTerm: string,
): TerminalProductOrder[] => {
  const query = searchTerm.trim().toLowerCase();
  if (!query) {
    return orders;
  }
  return orders.filter(
    (order) =>
      order.order_id.toLowerCase().includes(query) ||
      (order.ordered_by_name || order.ordered_by)
        .toLowerCase()
        .includes(query) ||
      (order.ordered_for_name || order.ordered_for)
        .toLowerCase()
        .includes(query) ||
      order.service_pricing_items.some((item) =>
        item.entity_name.toLowerCase().includes(query),
      ),
  );
};

const OrderAccordion: React.FC<{
  order: TerminalProductOrder;
  isOpenOrder: boolean;
}> = observer(({ order, isOpenOrder }) => {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const ordersStore = useLegendMarketplaceOrdersStore();
  const baseStore = useLegendMarketplaceBaseStore();

  const isCancellable = canCancelOrder(order);
  const trackingUrl = getCurrentStageTrackingUrl(order);
  const closureInfo = getClosureInfo(order);

  const handleCancelClick = (): void => {
    setCancelDialogOpen(true);
  };

  const handleCopyOrderId = (e: React.MouseEvent): void => {
    e.stopPropagation();
    baseStore.applicationStore.clipboardService
      .copyTextToClipboard(order.order_id)
      .then(() =>
        baseStore.applicationStore.notificationService.notifySuccess(
          'Order ID copied to clipboard',
          undefined,
          2500,
        ),
      )
      .catch(baseStore.applicationStore.alertUnhandledError);
  };

  const formatCurrency = (
    amount: number | string | null | undefined,
  ): string => {
    const numAmount =
      isNullable(amount) || amount === 'null'
        ? 0
        : typeof amount === 'string'
          ? parseFloat(amount)
          : amount;
    return numAmount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };

  return (
    <>
      <Accordion
        defaultExpanded={true}
        sx={{ '&:before': { display: 'none' }, mb: 2 }}
      >
        <AccordionSummary
          expandIcon={<ChevronDownIcon />}
          aria-controls={`${order.order_id}-content`}
          id={`${order.order_id}-header`}
          className="legend-marketplace-order-accordion__summary"
        >
          <Box className="legend-marketplace-order-accordion__summary-content">
            <Box className="legend-marketplace-order-accordion__summary-field">
              <Typography
                variant="caption"
                className="legend-marketplace-order-accordion__summary-label"
              >
                Order #
              </Typography>
              <Box className="legend-marketplace-order-accordion__summary-value-row">
                <Typography
                  variant="body2"
                  className="legend-marketplace-order-accordion__summary-value"
                >
                  {order.order_id}
                </Typography>
                <Tooltip title="Copy Order ID" arrow={true}>
                  <IconButton
                    size="small"
                    onClick={handleCopyOrderId}
                    aria-label="Copy Order ID"
                    className="legend-marketplace-order-accordion__copy-order-id-button"
                  >
                    <CopyIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            <Box className="legend-marketplace-order-accordion__summary-field">
              <Typography
                variant="caption"
                className="legend-marketplace-order-accordion__summary-label"
              >
                Ordered By
              </Typography>
              <Typography
                variant="body2"
                className="legend-marketplace-order-accordion__summary-value"
              >
                {order.ordered_by_name || order.ordered_by}
              </Typography>
            </Box>

            <Box className="legend-marketplace-order-accordion__summary-field">
              <Typography
                variant="caption"
                className="legend-marketplace-order-accordion__summary-label"
              >
                Ordered For
              </Typography>
              <Typography
                variant="body2"
                className="legend-marketplace-order-accordion__summary-value"
              >
                {order.ordered_for_name || order.ordered_for}
              </Typography>
            </Box>

            <Box className="legend-marketplace-order-accordion__summary-field">
              <Typography
                variant="caption"
                className="legend-marketplace-order-accordion__summary-label"
              >
                Date Ordered
              </Typography>
              <Typography
                variant="body2"
                className="legend-marketplace-order-accordion__summary-value"
              >
                {formatOrderDate(order.created_at)}
              </Typography>
            </Box>

            <Box className="legend-marketplace-order-accordion__summary-field">
              <Typography
                variant="caption"
                className="legend-marketplace-order-accordion__summary-label"
              >
                Total Cost (monthly)
              </Typography>
              <Typography
                variant="body2"
                className="legend-marketplace-order-accordion__summary-value"
              >
                {formatCurrency(order.order_cost)}
              </Typography>
            </Box>

            <Box className="legend-marketplace-order-accordion__summary-field">
              <Typography
                variant="caption"
                className="legend-marketplace-order-accordion__summary-label"
              >
                Order Type
              </Typography>
              <Typography
                variant="body2"
                className="legend-marketplace-order-accordion__summary-value"
              >
                {order.order_type}
              </Typography>
            </Box>

            {!isOpenOrder && (
              <Box className="legend-marketplace-order-accordion__summary-field">
                <Typography
                  variant="caption"
                  className="legend-marketplace-order-accordion__summary-label"
                >
                  Status
                </Typography>
                <Typography
                  variant="body2"
                  className="legend-marketplace-order-accordion__summary-value legend-marketplace-order-accordion__summary-value--status"
                >
                  {order.status || 'N/A'}
                </Typography>
              </Box>
            )}

            {isOpenOrder && (
              <Box className="legend-marketplace-order-accordion__summary-actions">
                <Tooltip
                  title={
                    !trackingUrl
                      ? 'Tracking link is not yet available for this order'
                      : ''
                  }
                  arrow={true}
                >
                  <span>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<OpenNewTabIcon />}
                      disabled={!trackingUrl}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (trackingUrl) {
                          baseStore.applicationStore.navigationService.navigator.visitAddress(
                            trackingUrl,
                          );
                        }
                      }}
                      className="legend-marketplace-order-accordion__track-button"
                    >
                      Track Order
                    </Button>
                  </span>
                </Tooltip>
                <Tooltip
                  title={
                    !isCancellable
                      ? 'Order cancellation is not available once the order has reached the fulfillment stage'
                      : ''
                  }
                  arrow={true}
                >
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<TimesCircleIcon />}
                    disabled={!isCancellable}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelClick();
                    }}
                    className="legend-marketplace-order-accordion__cancel-button"
                  >
                    Cancel Order
                  </Button>
                </Tooltip>
              </Box>
            )}
          </Box>
        </AccordionSummary>

        <AccordionDetails className="legend-marketplace-order-accordion__details">
          <Box className="legend-marketplace-order-accordion__details-container">
            {!isOpenOrder && closureInfo && (
              <Box className="legend-marketplace-order-accordion__closure-info">
                <Typography
                  variant="h6"
                  className="legend-marketplace-order-accordion__closure-title"
                >
                  Closure Information
                </Typography>
                <Box className="legend-marketplace-order-accordion__closure-details">
                  <Box className="legend-marketplace-order-accordion__closure-row">
                    <Typography
                      variant="body2"
                      className="legend-marketplace-order-accordion__closure-label"
                    >
                      Closed At Stage:
                    </Typography>
                    <Typography
                      variant="body2"
                      className="legend-marketplace-order-accordion__closure-value"
                    >
                      {closureInfo.stageLabel}
                    </Typography>
                  </Box>
                  <Box className="legend-marketplace-order-accordion__closure-row">
                    <Typography
                      variant="body2"
                      className="legend-marketplace-order-accordion__closure-label"
                    >
                      Closure Reason:
                    </Typography>
                    <Typography
                      variant="body2"
                      className="legend-marketplace-order-accordion__closure-value"
                    >
                      {closureInfo.reason ?? 'N/A'}
                    </Typography>
                  </Box>
                  <Box className="legend-marketplace-order-accordion__closure-row">
                    <Typography
                      variant="body2"
                      className="legend-marketplace-order-accordion__closure-label"
                    >
                      Closed By:
                    </Typography>
                    <Typography
                      variant="body2"
                      className="legend-marketplace-order-accordion__closure-value"
                    >
                      {closureInfo.actionedBy ?? 'N/A'}
                    </Typography>
                  </Box>
                  <Box className="legend-marketplace-order-accordion__closure-row">
                    <Typography
                      variant="body2"
                      className="legend-marketplace-order-accordion__closure-label"
                    >
                      Closure Date:
                    </Typography>
                    <Typography
                      variant="body2"
                      className="legend-marketplace-order-accordion__closure-value"
                    >
                      {closureInfo.actionedTimestamp
                        ? formatTimestamp(closureInfo.actionedTimestamp)
                        : 'N/A'}
                    </Typography>
                  </Box>
                  {closureInfo.comment && (
                    <Box className="legend-marketplace-order-accordion__closure-row">
                      <Typography
                        variant="body2"
                        className="legend-marketplace-order-accordion__closure-label"
                      >
                        Comment:
                      </Typography>
                      <Typography
                        variant="body2"
                        className="legend-marketplace-order-accordion__closure-value"
                      >
                        {closureInfo.comment}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            )}

            <Box className="legend-marketplace-order-accordion__items-section">
              <Stack spacing={2}>
                {order.service_pricing_items.map((item, index) => (
                  <Box
                    key={item.entity_id}
                    className="legend-marketplace-order-accordion__item"
                  >
                    <Box className="legend-marketplace-order-accordion__vendor-chips-row">
                      <Typography
                        variant="caption"
                        className="legend-marketplace-order-accordion__vendor-name"
                      >
                        {order.vendor_name}
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={1}
                        className="legend-marketplace-order-accordion__chips-container"
                      >
                        <Chip
                          label={item.entity_type}
                          size="small"
                          className={
                            item.entity_id === order.vendor_profile_id
                              ? 'legend-marketplace-order-accordion__chip-terminal'
                              : 'legend-marketplace-order-accordion__chip-addon'
                          }
                        />
                        <Chip
                          label={item.entity_category}
                          size="small"
                          className="legend-marketplace-order-accordion__chip-category"
                        />
                        <Chip
                          label={`${formatCurrency(item.entity_cost)} per month`}
                          size="small"
                          className="legend-marketplace-order-accordion__chip-price"
                        />
                      </Stack>
                    </Box>
                    <Typography
                      variant="h6"
                      className="legend-marketplace-order-accordion__product-name"
                    >
                      {item.entity_name}
                    </Typography>
                    {index === order.service_pricing_items.length - 1 &&
                      order.business_justification && (
                        <Typography
                          variant="body2"
                          className="legend-marketplace-order-accordion__business-justification"
                        >
                          Business Justification: {order.business_justification}
                        </Typography>
                      )}
                  </Box>
                ))}
              </Stack>
            </Box>

            <Box className="legend-marketplace-order-accordion__progress-tracker-section">
              {order.workflow_details && <ProgressTracker order={order} />}
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

      <CancelOrderDialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        order={order}
        orderStore={ordersStore}
      />
    </>
  );
});

export const LegendMarketplaceYourOrders: React.FC =
  withLegendMarketplaceOrdersStore(
    observer(() => {
      const baseStore = useLegendMarketplaceBaseStore();
      const ordersStore = useLegendMarketplaceOrdersStore();

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

      useEffect(() => {
        if (ordersStore.openOrders.length === 0) {
          executeFlowSafely(() => ordersStore.fetchOpenOrders());
        }
      }, [ordersStore, executeFlowSafely]);

      const [searchTerm, setSearchTerm] = useState('');

      const currentOrders = ordersStore.currentOrders;
      const isLoading = ordersStore.currentFetchState.isInProgress;

      const filteredOrders = useMemo(
        () => filterOrdersBySearchTerm(currentOrders, searchTerm),
        [currentOrders, searchTerm],
      );

      return (
        <LegendMarketplacePage className="legend-marketplace-your-orders">
          <Box className="legend-marketplace-your-orders__content">
            <Box className="legend-marketplace-your-orders__header-section">
              <Typography variant="h1">Your Orders</Typography>
              <TextField
                variant="outlined"
                size="small"
                label="Search Your Orders"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="legend-marketplace-your-orders__search-field"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                    endAdornment: searchTerm && (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          aria-label="Clear search"
                          onClick={() => setSearchTerm('')}
                        >
                          <CloseIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>

            <Box className="legend-marketplace-your-orders__tabs">
              <Tabs
                value={ordersStore.selectedTab}
                onChange={handleTabChange}
                aria-label="order status tabs"
              >
                <Tab label="In Progress" value="open" />
                <Tab label="Completed" value="closed" />
              </Tabs>
            </Box>

            {isLoading ? (
              <Box className="legend-marketplace-your-orders__loading">
                <CircularProgress size={40} />
                <Typography className="legend-marketplace-your-orders__loading-text">
                  Loading your orders...
                </Typography>
              </Box>
            ) : filteredOrders.length === 0 ? (
              <Box className="legend-marketplace-your-orders__empty">
                <ShoppingCartIcon
                  size={48}
                  className="legend-marketplace-your-orders__empty-icon"
                />
                <Typography
                  variant="h3"
                  className="legend-marketplace-your-orders__empty-title"
                >
                  {getEmptyOrdersTitle(
                    Boolean(searchTerm.trim()),
                    ordersStore.selectedTab,
                  )}
                </Typography>
                <Typography className="legend-marketplace-your-orders__empty-description">
                  {getEmptyOrdersDescription(
                    Boolean(searchTerm.trim()),
                    ordersStore.selectedTab,
                  )}
                </Typography>
              </Box>
            ) : (
              <Stack
                spacing={2}
                className="legend-marketplace-your-orders__orders-list"
              >
                {filteredOrders.map((order) => {
                  const isOpenOrder =
                    order.workflow_details?.workflow_status ===
                      OrderStatus.IN_PROGRESS ||
                    order.workflow_details?.workflow_status ===
                      OrderStatus.OPEN;
                  return (
                    <OrderAccordion
                      key={order.order_id}
                      order={order}
                      isOpenOrder={isOpenOrder}
                    />
                  );
                })}
              </Stack>
            )}
          </Box>
        </LegendMarketplacePage>
      );
    }),
  );

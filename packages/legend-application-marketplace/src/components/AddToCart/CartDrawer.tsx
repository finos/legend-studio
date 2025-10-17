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

import { observer } from 'mobx-react-lite';
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  CircularProgress,
} from '@mui/material';
import { CloseIcon, TrashIcon } from '@finos/legend-art';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';
import { CartStore } from '../../stores/cart/CartStore.js';

export const CartDrawer = observer((): React.ReactNode => {
  const baseStore = useLegendMarketplaceBaseStore();
  const cart = baseStore.cartStore;

  return (
    <Drawer
      anchor="right"
      open={cart.open}
      onClose={() => cart.setOpen(false)}
      PaperProps={{
        className: 'legend-marketplace-cart-drawer',
        sx: {
          width: { xs: '100vw', sm: '400px' },
          maxWidth: '90vw',
          marginTop: 'var(--legend-marketplace-header-height)',
          height: 'calc(100% - var(--legend-marketplace-header-height))',
        },
      }}
    >
      <Box className="legend-marketplace-cart-drawer__header">
        <Typography
          variant="h6"
          className="legend-marketplace-cart-drawer__title"
        >
          Cart ({cart.cartSummary.total_items}) -{' '}
          {cart.cartSummary.formatted_total_cost}
        </Typography>
        <IconButton onClick={() => cart.setOpen(false)} size="medium">
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider />

      <Box className="legend-marketplace-cart-drawer__business-reason">
        <Typography
          variant="subtitle1"
          className="legend-marketplace-cart-drawer__business-reason__title"
        >
          Please Choose a Business Reason
          <span style={{ color: 'red', marginLeft: '4px' }}>*</span>
        </Typography>

        <FormControl
          fullWidth={true}
          required={true}
          size="medium"
          className="legend-marketplace-cart-drawer__business-reason__select"
        >
          <InputLabel id="business-reason-label">Select a Reason</InputLabel>
          <Select
            labelId="business-reason-label"
            label="Select a Reason"
            value={cart.businessReason ?? ''}
            onChange={(e) =>
              cart.setBusinessReason(
                e.target.value ? String(e.target.value) : undefined,
              )
            }
          >
            {Object.values(CartStore.BUSINESS_REASONS).map((reason) => (
              <MenuItem key={reason} value={reason}>
                {reason}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Divider />

      <Box className="legend-marketplace-cart-drawer__content">
        {cart.loadingState.isInProgress && (
          <Box className="legend-marketplace-cart-drawer__loading">
            <CircularProgress size={24} />
            <Typography variant="body2" sx={{ mt: 1 }}>
              Loading cart...
            </Typography>
          </Box>
        )}

        {!cart.loadingState.isInProgress &&
          cart.cartSummary.total_items <= 0 && (
            <Box className="legend-marketplace-cart-drawer__empty">
              <Typography variant="body2" color="text.secondary">
                Your cart is empty
              </Typography>
            </Box>
          )}

        {!cart.loadingState.isInProgress &&
          cart.cartSummary.total_items > 0 && (
            <Box className="legend-marketplace-cart-drawer__items">
              {Object.values(cart.items).map((value) =>
                value.map((item) => (
                  <Box
                    key={`${item.providerName}-${item.cartId}`}
                    className="legend-marketplace-cart-drawer__item-card"
                  >
                    <Box className="legend-marketplace-cart-drawer__item-card__header">
                      <Box className="legend-marketplace-cart-drawer__item-card__title-section">
                        <Chip
                          size="small"
                          label={item.providerName}
                          className="legend-marketplace-cart-drawer__item-card__provider"
                          variant="filled"
                        />
                        <Typography
                          variant="h6"
                          className="legend-marketplace-cart-drawer__item-card__name"
                        >
                          {item.productName}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => cart.deleteCartItem(item.cartId)}
                        className="legend-marketplace-cart-drawer__item-card__remove-btn"
                        disabled={cart.loadingState.isInProgress}
                      >
                        <TrashIcon />
                      </IconButton>
                    </Box>

                    <Box className="legend-marketplace-cart-drawer__item-card__content">
                      <Box className="legend-marketplace-cart-drawer__item-card__price-section">
                        <Typography
                          variant="h6"
                          className="legend-marketplace-cart-drawer__item-card__price"
                        >
                          {item.price.toLocaleString('en-US', {
                            style: 'currency',
                            currency: 'USD',
                          })}
                        </Typography>
                        <Typography
                          variant="caption"
                          className="legend-marketplace-cart-drawer__item-card__price-suffix"
                        >
                          /access
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                )),
              )}
            </Box>
          )}
      </Box>

      <Divider />

      <Box className="legend-marketplace-cart-drawer__footer">
        <Button
          variant="outlined"
          disabled={
            !cart.cartSummary.total_items ||
            cart.submitState.isInProgress ||
            cart.loadingState.isInProgress
          }
          onClick={() => {
            cart.clearCart();
          }}
          size="small"
          className="legend-marketplace-cart-drawer__clear-button"
        >
          {cart.loadingState.isInProgress ? 'Clearing...' : 'Clear Cart'}
        </Button>
        <Button
          variant="contained"
          color="primary"
          disabled={
            !cart.cartSummary.total_items ||
            !cart.businessReason ||
            cart.submitState.isInProgress
          }
          onClick={() => {
            cart.submitOrder();
          }}
          size="small"
          className="legend-marketplace-cart-drawer__order-button"
        >
          {cart.submitState.isInProgress ? (
            <>
              <CircularProgress size={16} sx={{ mr: 1 }} />
              Submitting...
            </>
          ) : (
            'Order Now'
          )}
        </Button>
      </Box>
    </Drawer>
  );
});

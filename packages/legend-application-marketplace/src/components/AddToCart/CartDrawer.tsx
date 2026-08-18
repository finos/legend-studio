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
import { useCallback, useEffect, useRef, useState } from 'react';
import { flowResult } from 'mobx';
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
  ButtonGroup,
  Chip,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  CloseIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  InfoCircleIcon,
  clsx,
} from '@finos/legend-art';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';
import {
  type CartVendorGroup,
  CartStore,
} from '../../stores/cart/CartStore.js';
import { useApplicationStore } from '@finos/legend-application';
import { type CartItem } from '@finos/legend-server-marketplace';
import {
  formatCardPrice,
  formatItemPrice,
} from '../ProviderCard/orderProfileUtils.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MANDATORY_ADDON_TOOLTIP =
  'This is a mandatory add-on included with the vendor profile.';

// ─── Cart Item Card (Add-on) ─────────────────────────────────────────────────

const CartAddonCard = (props: {
  item: CartItem;
  vendorGroup: CartItem[];
  isLastAddon: boolean;
  onDelete: (item: CartItem, vendorGroup: CartItem[]) => void;
  disabled: boolean;
}): React.ReactNode => {
  const { item, vendorGroup, isLastAddon, onDelete, disabled } = props;

  const removeButton = (
    <IconButton
      size="small"
      onClick={() => onDelete(item, vendorGroup)}
      className="legend-marketplace-cart-drawer__addon-card__remove-btn"
      disabled={disabled}
      aria-label={`Remove ${item.productName}`}
    >
      <TrashIcon />
    </IconButton>
  );

  return (
    <Box
      className={clsx('legend-marketplace-cart-drawer__addon-card', {
        'legend-marketplace-cart-drawer__addon-card--last': isLastAddon,
      })}
    >
      <Box className="legend-marketplace-cart-drawer__addon-card__header">
        <Box className="legend-marketplace-cart-drawer__addon-card__name-row">
          <Typography
            variant="body2"
            className="legend-marketplace-cart-drawer__addon-card__name"
          >
            {item.productName}
          </Typography>
          {item.isMandatory && (
            <Tooltip
              title={MANDATORY_ADDON_TOOLTIP}
              arrow={true}
              placement="top"
            >
              <span className="legend-marketplace-cart-drawer__addon-card__mandatory-indicator">
                <InfoCircleIcon />
              </span>
            </Tooltip>
          )}
        </Box>
        {item.isMandatory ? (
          <Tooltip title={MANDATORY_ADDON_TOOLTIP} arrow={true} placement="top">
            <span>{removeButton}</span>
          </Tooltip>
        ) : (
          removeButton
        )}
      </Box>
      <Box className="legend-marketplace-cart-drawer__addon-card__category-price-row">
        <Chip
          size="small"
          label={item.category}
          className="legend-marketplace-cart-drawer__addon-card__category-chip"
        />
        <Typography
          variant="body2"
          className="legend-marketplace-cart-drawer__addon-card__price"
        >
          {formatItemPrice(item.price)}
          <span className="legend-marketplace-cart-drawer__addon-card__price-suffix">
            /month
          </span>
        </Typography>
      </Box>
    </Box>
  );
};

// ─── Cart Summary Bar ────────────────────────────────────────────────────────

const CartSummaryBar = (props: { formattedTotal: string }): React.ReactNode => {
  const { formattedTotal } = props;
  return (
    <Box className="legend-marketplace-cart-drawer__summary-bar">
      <Typography className="legend-marketplace-cart-drawer__summary-bar__label">
        Monthly Total
      </Typography>
      <Box className="legend-marketplace-cart-drawer__summary-bar__right">
        <Typography className="legend-marketplace-cart-drawer__summary-bar__total">
          {formattedTotal}
        </Typography>
      </Box>
    </Box>
  );
};

// ─── Vendor Group Header (Parent Card) ───────────────────────────────────────

const CartVendorGroupHeader = (props: {
  parentItem: CartItem | undefined;
  displayParent: CartVendorGroup['displayParent'];
  vendorGroup: CartItem[];
  addons: CartItem[];
  addonTotalPrice: number;
  addonLabel: string;
  isExpanded: boolean;
  isSynthetic: boolean;
  onToggle: () => void;
  onDelete: (item: CartItem, vendorGroup: CartItem[]) => void;
  onDeleteSyntheticGroup: (vendorGroup: CartItem[]) => void;
  disabled: boolean;
}): React.ReactNode => {
  const {
    parentItem,
    displayParent,
    vendorGroup,
    addons,
    addonTotalPrice,
    addonLabel,
    isExpanded,
    isSynthetic,
    onToggle,
    onDelete,
    onDeleteSyntheticGroup,
    disabled,
  } = props;

  return (
    <Box className="legend-marketplace-cart-drawer__vendor-group">
      <Box
        className={clsx('legend-marketplace-cart-drawer__item-card', {
          'legend-marketplace-cart-drawer__item-card--synthetic': isSynthetic,
        })}
      >
        <Box className="legend-marketplace-cart-drawer__item-card__header">
          <Box className="legend-marketplace-cart-drawer__item-card__title-section">
            <Typography
              variant="body2"
              className="legend-marketplace-cart-drawer__item-card__provider-name"
            >
              {displayParent.providerName}
            </Typography>
            <Tooltip title={displayParent.productName} placement="top">
              <Typography
                variant="h6"
                className="legend-marketplace-cart-drawer__item-card__name"
              >
                {displayParent.productName}
              </Typography>
            </Tooltip>
          </Box>
          <IconButton
            size="small"
            onClick={
              isSynthetic
                ? () => onDeleteSyntheticGroup(vendorGroup)
                : () => {
                    if (parentItem) {
                      onDelete(parentItem, vendorGroup);
                    }
                  }
            }
            className="legend-marketplace-cart-drawer__item-card__remove-btn"
            disabled={disabled}
            aria-label={
              isSynthetic
                ? `Remove all items under ${displayParent.productName}`
                : `Remove ${displayParent.productName}`
            }
          >
            <TrashIcon />
          </IconButton>
        </Box>

        <Box className="legend-marketplace-cart-drawer__item-card__content">
          <Box className="legend-marketplace-cart-drawer__item-card__category-price-row">
            <Chip
              size="small"
              label={displayParent.categoryLabel}
              className={clsx(
                'legend-marketplace-cart-drawer__item-card__category',
                {
                  'legend-marketplace-cart-drawer__item-card__category--owned':
                    isSynthetic,
                },
              )}
            />
            {isSynthetic ? (
              <span className="legend-marketplace-cart-drawer__item-card__subscribed-badge">
                Already Subscribed
              </span>
            ) : (
              <Box className="legend-marketplace-cart-drawer__item-card__price-section">
                <Typography
                  variant="body2"
                  className="legend-marketplace-cart-drawer__item-card__price"
                >
                  {formatItemPrice(displayParent.monthlyPrice ?? 0)}
                </Typography>
                <Typography
                  variant="caption"
                  className="legend-marketplace-cart-drawer__item-card__price-suffix"
                >
                  /month
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {addons.length > 0 && (
          <Box
            className="legend-marketplace-cart-drawer__vendor-group__toggle"
            onClick={onToggle}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggle();
              }
            }}
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} add-ons for ${displayParent.productName}`}
          >
            <span className="legend-marketplace-cart-drawer__vendor-group__chevron">
              {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
            </span>
            <Typography
              variant="body2"
              className="legend-marketplace-cart-drawer__vendor-group__summary"
            >
              {addonLabel}
              {!isExpanded && ` – ${formatCardPrice(addonTotalPrice)}`}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

// ─── Main CartDrawer ─────────────────────────────────────────────────────────

export const CartDrawer = observer((): React.ReactNode => {
  const baseStore = useLegendMarketplaceBaseStore();
  const applicationStore = useApplicationStore();
  const cart = baseStore.cartStore;

  // Track which vendor groups are expanded (all expanded by default)
  const [expandedVendors, setExpandedVendors] = useState<Set<number>>(
    new Set<number>(),
  );
  const knownVendorIdsRef = useRef<Set<number>>(new Set<number>());

  // Refresh cart when drawer opens
  useEffect(() => {
    if (cart.open) {
      flowResult(cart.refresh()).catch((error) => {
        baseStore.applicationStore.notificationService.notifyError(
          `Failed to refresh cart: ${error}`,
        );
      });
    }
  }, [cart, cart.open, baseStore.applicationStore]);

  // Initialize all vendor groups as expanded when items change
  useEffect(() => {
    const currentVendorIds = new Set(cart.vendorGroupIds);
    setExpandedVendors((previousExpanded) => {
      const nextExpanded = new Set<number>();
      for (const vpId of previousExpanded) {
        if (currentVendorIds.has(vpId)) {
          nextExpanded.add(vpId);
        }
      }
      for (const vpId of currentVendorIds) {
        if (!knownVendorIdsRef.current.has(vpId)) {
          nextExpanded.add(vpId);
        }
      }
      return nextExpanded;
    });
    knownVendorIdsRef.current = currentVendorIds;
  }, [cart.vendorGroupIds]);

  const toggleVendor = useCallback((vpId: number) => {
    setExpandedVendors((prev) => {
      const next = new Set(prev);
      if (next.has(vpId)) {
        next.delete(vpId);
      } else {
        next.add(vpId);
      }
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedVendors(new Set());
  }, []);

  const expandAll = useCallback(() => {
    setExpandedVendors(new Set(cart.vendorGroupIds));
  }, [cart.vendorGroupIds]);

  const vendorGroups = cart.vendorGroups;

  const handleDeleteItem = useCallback(
    (item: CartItem, vendorGroup: CartItem[]) => {
      cart.requestDeleteItemConfirmation(item, vendorGroup);
    },
    [cart],
  );

  const handleDeleteSyntheticGroup = useCallback(
    (vendorGroup: CartItem[]) => {
      cart.requestDeleteGroupConfirmation(vendorGroup);
    },
    [cart],
  );

  const vendorGroupCount = cart.vendorGroupIds.length;

  return (
    <Drawer
      anchor="right"
      open={cart.open}
      onClose={() => cart.setOpen(false)}
      slotProps={{
        paper: {
          className: 'legend-marketplace-cart-drawer',
          sx: {
            width: { xs: '100vw', sm: '400px' },
            maxWidth: '90vw',
            marginTop: 'var(--legend-marketplace-header-height)',
            height: 'calc(100% - var(--legend-marketplace-header-height))',
          },
        },
      }}
    >
      <Box className="legend-marketplace-cart-drawer__header">
        <Typography
          variant="h6"
          className="legend-marketplace-cart-drawer__title"
        >
          Cart ({cart.cartSummary.total_items})
        </Typography>
        <IconButton
          onClick={() => cart.setOpen(false)}
          size="medium"
          aria-label="Close cart"
          className="legend-marketplace-cart-drawer__close-btn"
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Collapse / Expand All controls */}
      {!cart.loadingState.isInProgress &&
        cart.cartSummary.total_items > 0 &&
        vendorGroupCount > 1 && (
          <Box className="legend-marketplace-cart-drawer__expand-controls">
            <ButtonGroup
              size="small"
              aria-label="Expand or collapse vendor groups"
              className="legend-marketplace-cart-drawer__expand-controls__group"
            >
              <Button onClick={collapseAll} aria-label="Collapse all">
                Collapse All
              </Button>
              <Button onClick={expandAll} aria-label="Expand all">
                Expand All
              </Button>
            </ButtonGroup>
          </Box>
        )}

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
              {vendorGroups.map(
                ({
                  vpId,
                  parentItem,
                  displayParent,
                  addons,
                  groupItems,
                  isSynthetic,
                  addonTotalPrice,
                  addonLabel,
                }) => (
                  <Box key={vpId}>
                    <CartVendorGroupHeader
                      parentItem={parentItem}
                      displayParent={displayParent}
                      vendorGroup={groupItems}
                      addons={addons}
                      addonTotalPrice={addonTotalPrice}
                      addonLabel={addonLabel}
                      isExpanded={expandedVendors.has(vpId)}
                      isSynthetic={isSynthetic}
                      onToggle={() => toggleVendor(vpId)}
                      onDelete={handleDeleteItem}
                      onDeleteSyntheticGroup={handleDeleteSyntheticGroup}
                      disabled={cart.loadingState.isInProgress}
                    />
                    {expandedVendors.has(vpId) &&
                      addons.map((addon, index) => (
                        <CartAddonCard
                          key={`${vpId}-${addon.cartId}`}
                          item={addon}
                          vendorGroup={groupItems}
                          isLastAddon={index === addons.length - 1}
                          onDelete={handleDeleteItem}
                          disabled={cart.loadingState.isInProgress}
                        />
                      ))}
                  </Box>
                ),
              )}
            </Box>
          )}
      </Box>

      {!cart.loadingState.isInProgress && cart.cartSummary.total_items > 0 && (
        <CartSummaryBar
          formattedTotal={cart.cartSummary.formatted_total_cost}
        />
      )}

      <Divider />

      <Box className="legend-marketplace-cart-drawer__footer">
        <Box className="legend-marketplace-cart-drawer__business-reason">
          <Typography
            variant="subtitle1"
            className="legend-marketplace-cart-drawer__business-reason__title"
          >
            {'Please Choose a Business Reason'}
            <span className="legend-marketplace-cart-drawer__business-reason__required">
              *
            </span>
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
              MenuProps={{
                anchorOrigin: { vertical: 'top', horizontal: 'left' },
                transformOrigin: { vertical: 'bottom', horizontal: 'left' },
              }}
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
        <Box className="legend-marketplace-cart-drawer__footer__actions">
          <Button
            variant="outlined"
            disabled={
              !cart.cartSummary.total_items ||
              cart.submitState.isInProgress ||
              cart.loadingState.isInProgress
            }
            onClick={() => cart.requestClearCartConfirmation()}
            size="small"
            className="legend-marketplace-cart-drawer__clear-button"
          >
            Clear Cart
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
              flowResult(cart.submitOrder()).catch(
                applicationStore.alertUnhandledError,
              );
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
        {cart.cartSummary.total_items > 0 && !cart.businessReason && (
          <Typography className="legend-marketplace-cart-drawer__order-button-helper">
            Select a business reason to continue.
          </Typography>
        )}
      </Box>
    </Drawer>
  );
});

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

import { type JSX, useCallback, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Radio,
  Typography,
} from '@mui/material';
import {
  CheckCircleIcon,
  InfoCircleIcon,
  ShoppingCartIcon,
} from '@finos/legend-art';
import type {
  TraderProfile,
  TraderProfileItem,
} from '@finos/legend-server-marketplace';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';
import { observer } from 'mobx-react-lite';
import { flowResult } from 'mobx';
import { toastManager } from '../Toast/CartToast.js';
import { assertErrorThrown } from '@finos/legend-shared';
import { MAX_PRODUCT_IMAGE_COUNT } from '../../stores/lakehouse/dataProducts/ProductCardState.js';
import { OrderProfileDetailModal } from './OrderProfileDetailModal.js';
import {
  formatCardPrice,
  formatItemPrice,
  formatProfileSummaryLine,
  getItemSummary,
  OrderProfileLabel,
} from './orderProfileUtils.js';

// Modal for multiselect: lets user pick one terminal to include
const MultiselectModal = observer(
  (props: {
    profile: TraderProfile;
    open: boolean;
    onClose: () => void;
    onConfirm: (selectedTerminals: TraderProfileItem[]) => void;
  }): JSX.Element => {
    const { profile, open, onClose, onConfirm } = props;
    const terminalItems = profile.items.filter(
      (item) => item.isTerminal && !item.isOwned,
    );
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const handleConfirm = useCallback((): void => {
      const selectedItem = terminalItems.find((item) => item.id === selectedId);
      onConfirm(selectedItem ? [selectedItem] : []);
    }, [terminalItems, selectedId, onConfirm]);

    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth={true}
        className="order-profile-multiselect-modal"
        aria-labelledby="order-profile-multiselect-title"
      >
        <DialogTitle id="order-profile-multiselect-title">
          {OrderProfileLabel.SELECT_TERMINAL_TITLE}
        </DialogTitle>
        <DialogContent dividers={true}>
          <Typography
            variant="body2"
            className="order-profile-multiselect-modal__description"
          >
            Choose one terminal to include from{' '}
            <strong>{profile.productName}</strong>.{' '}
            {OrderProfileLabel.SELECT_TERMINAL_DESCRIPTION}
          </Typography>
          <List dense={false}>
            {terminalItems.map((item) => (
              <ListItemButton
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                selected={selectedId === item.id}
                className={`order-profile-multiselect-modal__list-item${selectedId === item.id ? 'order-profile-multiselect-modal__list-item--selected' : ''}`}
              >
                <Radio
                  checked={selectedId === item.id}
                  onChange={() => setSelectedId(item.id)}
                  size="small"
                  className="order-profile-multiselect-modal__radio"
                  inputProps={{ 'aria-labelledby': `terminal-item-${item.id}` }}
                />
                <ListItemText
                  id={`terminal-item-${item.id}`}
                  disableTypography={true}
                  primary={
                    <Box className="order-profile-multiselect-modal__item-primary">
                      <Typography
                        variant="body1"
                        className="order-profile-multiselect-modal__item-name"
                      >
                        {item.productName}
                      </Typography>
                      <Typography
                        variant="body2"
                        className="order-profile-multiselect-modal__item-price"
                      >
                        {formatItemPrice(item.price)}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    item.model !== undefined && item.model !== null ? (
                      <Typography
                        variant="caption"
                        className="order-profile-multiselect-modal__item-model"
                      >
                        {OrderProfileLabel.MODEL_PREFIX}
                        {item.model}
                      </Typography>
                    ) : undefined
                  }
                />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} variant="outlined">
            {OrderProfileLabel.CANCEL}
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            disabled={selectedId === null}
          >
            {OrderProfileLabel.ADD_TO_CART}
          </Button>
        </DialogActions>
      </Dialog>
    );
  },
);

export const LegendMarketplaceOrderProfileCard = observer(
  (props: { traderProfile: TraderProfile }): JSX.Element => {
    const { traderProfile } = props;
    const [isAddingToCart, setIsAddingToCart] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showMultiselectModal, setShowMultiselectModal] = useState(false);

    const legendMarketplaceBaseStore = useLegendMarketplaceBaseStore();
    const applicationStore = legendMarketplaceBaseStore.applicationStore;
    const assetUrl = applicationStore.config.assetsBaseUrl;

    const [imageUrl] = useState(() => {
      const randomIndex =
        Math.floor(Math.random() * MAX_PRODUCT_IMAGE_COUNT) + 1;
      return `${assetUrl}/images${randomIndex}.jpg`;
    });

    const items = traderProfile.items;
    const { terminalCount, addOnCount } = getItemSummary(items);

    // --- Multiselect price calculation ---
    let multiselectTotalPrice: number | undefined = undefined;
    if (traderProfile.multiselect) {
      // Find all vendor profiles (terminals)
      const vendorProfiles = items.filter((item) => item.isTerminal);
      if (vendorProfiles.length > 0) {
        // Find the highest price vendor profile
        const highestVendor = vendorProfiles.reduce((max, curr) => {
          if (!max) {
            return curr;
          }
          return curr.price > max.price ? curr : max;
        }, vendorProfiles[0]);
        if (highestVendor) {
          // Find all add-ons (service pricing) associated with this vendor profile (by model)
          const addOns = items.filter(
            (item) => !item.isTerminal && item.model === highestVendor.model,
          );
          const addOnsTotal = addOns.reduce(
            (sum, item) => sum + (item.price || 0),
            0,
          );
          multiselectTotalPrice = (highestVendor.price || 0) + addOnsTotal;
        }
      }
    }

    const addItemsToCart = async (
      itemsToAdd: TraderProfileItem[],
    ): Promise<void> => {
      for (const item of itemsToAdd) {
        if (item.isOwned) {
          continue;
        }
        await flowResult(
          legendMarketplaceBaseStore.cartStore.addToCartWithAPI(
            {
              id: item.id,
              productName: item.productName,
              providerName: item.providerName,
              category: item.category,
              price: item.price,
              description: item.description ?? '',
              isOwned: 'false',
              ...(item.model !== undefined && item.model !== null
                ? { model: item.model }
                : {}),
              skipWorkflow: true,
              ...(item.isMandatory !== undefined
                ? { isMandatory: item.isMandatory }
                : {}),
              ...(item.vendorProfileId !== undefined
                ? { vendorProfileId: item.vendorProfileId }
                : {}),
              ...(item.permissionId !== undefined
                ? { permissionId: item.permissionId }
                : {}),
            },
            true,
          ),
        );
      }
    };

    const handleAddToCart = async (): Promise<void> => {
      if (traderProfile.isOwned) {
        return;
      }
      if (traderProfile.multiselect) {
        setShowMultiselectModal(true);
        return;
      }
      setIsAddingToCart(true);
      try {
        const nonOwnedItems = items.filter((item) => !item.isOwned);
        const vendorProfiles = nonOwnedItems.filter((item) => item.isTerminal);
        const addOns = nonOwnedItems.filter((item) => !item.isTerminal);
        await addItemsToCart(vendorProfiles);
        await addItemsToCart(addOns);
        toastManager.success(
          `Order profile ${traderProfile.productName} has been successfully added to cart.`,
        );
      } catch (error) {
        assertErrorThrown(error);
        toastManager.error(
          `Failed to add ${traderProfile.productName} to cart: ${error.message}`,
        );
      } finally {
        setIsAddingToCart(false);
      }
    };

    const handleMultiselectConfirm = async (
      selectedTerminals: TraderProfileItem[],
    ): Promise<void> => {
      setShowMultiselectModal(false);
      setIsAddingToCart(true);
      try {
        const selectedModel = selectedTerminals[0]?.model ?? null;
        const addOnItems = items.filter(
          (item) =>
            !item.isTerminal &&
            !item.isOwned &&
            (selectedModel === null || item.model === selectedModel),
        );
        // Add the selected vendor profile first; only add its associated add-ons after success
        await addItemsToCart(selectedTerminals);
        await addItemsToCart(addOnItems);
        toastManager.success(
          `Order profile ${traderProfile.productName} has been successfully added to cart.`,
        );
      } catch (error) {
        assertErrorThrown(error);
        toastManager.error(
          `Failed to add ${traderProfile.productName} to cart: ${error.message}`,
        );
      } finally {
        setIsAddingToCart(false);
      }
    };

    const nonOwnedItems = items.filter((item) => !item.isOwned);
    const nonOwnedTerminals = nonOwnedItems.filter((item) => item.isTerminal);
    const isInCart = traderProfile.multiselect
      ? nonOwnedTerminals.some((terminal) => {
          const selectedModel = terminal.model ?? null;
          const bundleItems = [
            terminal,
            ...items.filter(
              (item) =>
                !item.isTerminal &&
                !item.isOwned &&
                (selectedModel === null || item.model === selectedModel),
            ),
          ];

          return bundleItems.every((item) =>
            legendMarketplaceBaseStore.cartStore.isItemInCart(item.id),
          );
        })
      : nonOwnedItems.length > 0 &&
        nonOwnedItems.every((item) =>
          legendMarketplaceBaseStore.cartStore.isItemInCart(item.id),
        );

    return (
      <>
        <Card className="legend-marketplace-terminal-card legend-marketplace-order-profile-card">
          <CardActionArea className="legend-marketplace-terminal-card__action">
            <CardMedia
              component="img"
              className="legend-marketplace-terminal-card__image"
              height="140"
              image={imageUrl}
              alt="order profile"
            />
            <Chip
              label={OrderProfileLabel.CHIP_LABEL}
              className="legend-marketplace-terminal-card__category-chip"
            />
            <CardContent className="legend-marketplace-terminal-card__content">
              <Typography
                variant="subtitle2"
                className="legend-marketplace-terminal-card__provider legend-marketplace-order-profile-card__summary"
              >
                {formatProfileSummaryLine(terminalCount, addOnCount)}
              </Typography>
              <Box className="legend-marketplace-order-profile-card__title-row">
                <Typography
                  variant="h6"
                  className="legend-marketplace-terminal-card__title"
                >
                  {traderProfile.productName.toUpperCase()}
                </Typography>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDetailModal(true);
                  }}
                  className="legend-marketplace-order-profile-card__info-button"
                  aria-label="View profile details"
                >
                  <InfoCircleIcon />
                </IconButton>
              </Box>
            </CardContent>
          </CardActionArea>

          <CardActions className="legend-marketplace-terminal-card__action-buttons">
            {traderProfile.isOwned ? (
              <Box className="legend-marketplace-terminal-card__owned-access">
                {OrderProfileLabel.ALREADY_HAVE_ACCESS} &nbsp;
                <CheckCircleIcon />
              </Box>
            ) : (
              <>
                <Button
                  variant="outlined"
                  className="legend-marketplace-terminal-card__add-to-cart-button"
                  onClick={() => {
                    handleAddToCart().catch(() => {});
                  }}
                  disabled={isAddingToCart || isInCart}
                >
                  {isAddingToCart && (
                    <>
                      {OrderProfileLabel.ADDING} &nbsp;
                      <CircularProgress size={16} />
                    </>
                  )}
                  {!isAddingToCart && isInCart && (
                    <>
                      {OrderProfileLabel.IN_CART} &nbsp;
                      <Box className="legend-marketplace-terminal-card__in-cart-check">
                        <CheckCircleIcon />
                      </Box>
                    </>
                  )}
                  {!isAddingToCart && !isInCart && (
                    <>
                      {OrderProfileLabel.ADD_TO_CART} &nbsp;
                      <ShoppingCartIcon />
                    </>
                  )}
                </Button>
                {typeof (traderProfile.multiselect
                  ? multiselectTotalPrice
                  : traderProfile.price) === 'number' && (
                  <Chip
                    label={formatCardPrice(
                      traderProfile.multiselect &&
                        multiselectTotalPrice !== undefined
                        ? multiselectTotalPrice
                        : traderProfile.price,
                    )}
                    className="legend-marketplace-terminal-card__price"
                  />
                )}
              </>
            )}
          </CardActions>
        </Card>

        {traderProfile.multiselect &&
        typeof multiselectTotalPrice === 'number' ? (
          <OrderProfileDetailModal
            profile={traderProfile}
            open={showDetailModal}
            onClose={() => setShowDetailModal(false)}
            multiselectTotalPrice={multiselectTotalPrice}
          />
        ) : (
          <OrderProfileDetailModal
            profile={traderProfile}
            open={showDetailModal}
            onClose={() => setShowDetailModal(false)}
          />
        )}

        <MultiselectModal
          profile={traderProfile}
          open={showMultiselectModal}
          onClose={() => setShowMultiselectModal(false)}
          onConfirm={(selectedTerminals) => {
            handleMultiselectConfirm(selectedTerminals).catch(() => {});
          }}
        />
      </>
    );
  },
);

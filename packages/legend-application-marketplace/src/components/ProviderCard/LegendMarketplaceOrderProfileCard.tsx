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

import { type JSX, useState } from 'react';
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
  IconButton,
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
import { OrderProfileDetailModal } from './OrderProfileDetailModal.js';
import { OrderProfileMultiselectModal } from './OrderProfileMultiselectModal.js';
import {
  calculateMultiselectTotalPrice,
  formatAddToCartErrorMessage,
  formatAddToCartSuccessMessage,
  formatCardPrice,
  formatProfileSummaryLine,
  getItemSummary,
  getRandomImageUrl,
  OrderProfileLabel,
} from './orderProfileUtils.js';

export const LegendMarketplaceOrderProfileCard = observer(
  (props: { traderProfile: TraderProfile }): JSX.Element => {
    const { traderProfile } = props;
    const [isAddingToCart, setIsAddingToCart] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showMultiselectModal, setShowMultiselectModal] = useState(false);

    const legendMarketplaceBaseStore = useLegendMarketplaceBaseStore();
    const { cartStore, applicationStore } = legendMarketplaceBaseStore;
    const assetUrl = applicationStore.config.assetsBaseUrl;

    const [imageUrl] = useState(() => getRandomImageUrl(assetUrl));

    const items = traderProfile.items;
    const { terminalCount, addOnCount } = getItemSummary(items);

    const multiselectTotalPrice = traderProfile.multiselect
      ? calculateMultiselectTotalPrice(items)
      : undefined;

    const displayPrice = traderProfile.multiselect
      ? (multiselectTotalPrice ?? traderProfile.price)
      : traderProfile.price;

    const isInCart = cartStore.isOrderProfileInCart(traderProfile);

    const executeCartAction = async (
      action: () => Promise<void>,
    ): Promise<void> => {
      setIsAddingToCart(true);
      try {
        await action();
        toastManager.success(
          formatAddToCartSuccessMessage(traderProfile.productName),
        );
      } catch (error) {
        assertErrorThrown(error);
        toastManager.error(
          formatAddToCartErrorMessage(traderProfile.productName, error.message),
        );
      } finally {
        setIsAddingToCart(false);
      }
    };

    const handleAddToCart = (): void => {
      if (traderProfile.isOwned) {
        return;
      }
      if (traderProfile.multiselect) {
        setShowMultiselectModal(true);
        return;
      }
      const terminals = items.filter((item) => item.isTerminal);
      const addOns = items.filter((item) => !item.isTerminal);
      executeCartAction(async () => {
        await flowResult(cartStore.addOrderProfileItemsToCart(terminals, true));
        await flowResult(cartStore.addOrderProfileItemsToCart(addOns, true));
      }).catch(applicationStore.alertUnhandledError);
    };

    const handleMultiselectConfirm = (
      selectedTerminals: TraderProfileItem[],
    ): void => {
      setShowMultiselectModal(false);
      const selectedModel = selectedTerminals[0]?.model ?? null;
      const addOnItems = items.filter(
        (item) =>
          !item.isTerminal &&
          !item.isOwned &&
          (selectedModel === null || item.model === selectedModel),
      );
      executeCartAction(async () => {
        await flowResult(
          cartStore.addOrderProfileItemsToCart(selectedTerminals, true),
        );
        await flowResult(
          cartStore.addOrderProfileItemsToCart(addOnItems, true),
        );
      }).catch(applicationStore.alertUnhandledError);
    };

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
                  onClick={handleAddToCart}
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
                <Chip
                  label={formatCardPrice(displayPrice)}
                  className="legend-marketplace-terminal-card__price"
                />
              </>
            )}
          </CardActions>
        </Card>

        <OrderProfileDetailModal
          profile={traderProfile}
          open={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          {...(multiselectTotalPrice !== undefined
            ? { multiselectTotalPrice }
            : {})}
        />

        <OrderProfileMultiselectModal
          profile={traderProfile}
          open={showMultiselectModal}
          onClose={() => setShowMultiselectModal(false)}
          onConfirm={handleMultiselectConfirm}
        />
      </>
    );
  },
);

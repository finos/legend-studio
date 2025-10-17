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

import { clsx, PlusIcon } from '@finos/legend-art';
import type { TerminalResult } from '@finos/legend-server-marketplace';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Typography,
} from '@mui/material';
import { flowResult } from 'mobx';
import { useState } from 'react';
import { assertErrorThrown } from '@finos/legend-shared';
import { toastManager } from '../Toast/CartToast.js';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';

interface RecommendedItemsCardProps {
  vendorProfileId?: number;
  recommendedItem: TerminalResult;
}

export const RecommendedItemsCard = (props: RecommendedItemsCardProps) => {
  const { vendorProfileId, recommendedItem } = props;
  const legendMarketplaceBaseStore = useLegendMarketplaceBaseStore();
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [inCart, setInCart] = useState(false);

  const handleAddAddonToCart = (addon: TerminalResult) => {
    setIsAddingToCart(true);
    const cartItemRequest =
      legendMarketplaceBaseStore.cartStore.providerToCartRequest(addon);
    if (vendorProfileId) {
      cartItemRequest.vendorProfileId = vendorProfileId;
    }

    flowResult(
      legendMarketplaceBaseStore.cartStore.addToCartWithAPI(cartItemRequest),
    )
      .then((result) => {
        if (result.success) {
          setInCart(true);
        }
        setIsAddingToCart(false);
      })
      .catch((error) => {
        assertErrorThrown(error);
        toastManager.error(
          `Failed to add ${addon.productName} to cart: ${error.message}`,
        );
        setIsAddingToCart(false);
      });
  };

  return (
    <Card className="recommended-addons-modal__addon-card">
      <CardContent className="recommended-addons-modal__card-content">
        <Box className="recommended-addons-modal__card-header">
          <Typography
            variant="subtitle1"
            className="recommended-addons-modal__product-name"
          >
            {recommendedItem.productName}
          </Typography>
          <Chip
            label={recommendedItem.providerName}
            size="small"
            className="recommended-addons-modal__provider-chip"
          />
        </Box>

        <Typography
          variant="body2"
          className="recommended-addons-modal__description"
        >
          {recommendedItem.description || 'No description available'}
        </Typography>

        <Box className="recommended-addons-modal__card-footer">
          <Typography
            variant="body2"
            className={clsx('recommended-addons-modal__price', {
              'recommended-addons-modal__price__free':
                recommendedItem.price === 0,
            })}
          >
            {recommendedItem.price === 0
              ? 'Free'
              : recommendedItem.price.toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  maximumFractionDigits: 2,
                })}
          </Typography>
        </Box>
      </CardContent>

      <CardActions className="recommended-addons-modal__card-actions">
        <Button
          variant={inCart ? 'outlined' : 'contained'}
          onClick={() => handleAddAddonToCart(recommendedItem)}
          disabled={inCart || isAddingToCart}
          fullWidth={true}
          className={clsx('recommended-addons-modal__add-btn', {
            'recommended-addons-modal__add-btn__added': inCart,
          })}
        >
          {isAddingToCart ? (
            <>
              Adding... &nbsp;
              <CircularProgress size={16} />
            </>
          ) : inCart ? (
            'Added to Cart'
          ) : (
            <>
              Add to Cart &nbsp;
              <PlusIcon />
            </>
          )}
        </Button>
      </CardActions>
    </Card>
  );
};

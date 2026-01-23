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
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { flowResult } from 'mobx';
import { useState } from 'react';
import { assertErrorThrown } from '@finos/legend-shared';
import { toastManager } from '../Toast/CartToast.js';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';

interface RecommendedItemsCardProps {
  recommendedItem: TerminalResult;
}

export const RecommendedItemsCard = (props: RecommendedItemsCardProps) => {
  const { recommendedItem } = props;
  const legendMarketplaceBaseStore = useLegendMarketplaceBaseStore();
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [inCart, setInCart] = useState(() =>
    legendMarketplaceBaseStore.cartStore.isItemInCart(recommendedItem.id),
  );

  const handleAddAddonToCart = (addon: TerminalResult) => {
    setIsAddingToCart(true);
    const cartItemRequest =
      legendMarketplaceBaseStore.cartStore.providerToCartRequest(addon);

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
    <Box className="recommended-addons-modal__list-item">
      <Typography
        variant="body1"
        className="recommended-addons-modal__item-name"
      >
        {recommendedItem.productName}
      </Typography>
      <Typography
        variant="body2"
        className="recommended-addons-modal__item-provider"
      >
        {recommendedItem.providerName}
      </Typography>
      <Typography
        variant="body2"
        className="recommended-addons-modal__item-price"
      >
        {recommendedItem.price.toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </Typography>
      <Box className="recommended-addons-modal__item-action">
        <Button
          variant={inCart ? 'outlined' : 'contained'}
          onClick={() => handleAddAddonToCart(recommendedItem)}
          disabled={inCart || isAddingToCart}
          size="small"
          className={clsx('recommended-addons-modal__add-btn', {
            'recommended-addons-modal__add-btn--added': inCart,
          })}
        >
          {isAddingToCart ? (
            <>
              Adding... &nbsp;
              <CircularProgress size={14} />
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
      </Box>
    </Box>
  );
};

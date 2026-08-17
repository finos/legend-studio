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

import { clsx, CheckIcon, PlusIcon, CheckCircleIcon } from '@finos/legend-art';
import {
  RecommendationSource,
  type TerminalResult,
} from '@finos/legend-server-marketplace';
import {
  Box,
  Button,
  CircularProgress,
  Tooltip,
  Typography,
} from '@mui/material';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { type ReactNode, useState } from 'react';
import { assertErrorThrown } from '@finos/legend-shared';
import { toastManager } from '../Toast/CartToast.js';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';

interface RecommendedItemsCardProps {
  recommendedItem: TerminalResult;
  onSelect?: (item: TerminalResult) => Promise<boolean> | boolean;
  isSelecting?: boolean;
  selectedItemId?: number | undefined;
  permissionIdOverride?: number;
  modelOverride?: string | null | undefined;
}

export const RecommendedItemsCard = observer(
  (props: RecommendedItemsCardProps) => {
    const {
      recommendedItem,
      onSelect,
      isSelecting,
      selectedItemId,
      permissionIdOverride,
      modelOverride,
    } = props;
    const legendMarketplaceBaseStore = useLegendMarketplaceBaseStore();
    const [isAddingToCart, setIsAddingToCart] = useState(false);
    // Tracks a successful add within this component's lifetime so the button
    // transitions even when skipWorkflow=true causes the item to bypass the
    // normal cart and therefore not appear in isItemInCart.
    const [isAdded, setIsAdded] = useState(false);
    const inCart = legendMarketplaceBaseStore.cartStore.isItemInCart(
      recommendedItem.id,
    );
    const isInCartOrAdded = inCart || isAdded;

    const isAssociationFlow = onSelect !== undefined;
    const isMarketplaceItem =
      recommendedItem.source === RecommendationSource.MARKETPLACE;
    const isCurrentlySelecting =
      isAssociationFlow &&
      Boolean(isSelecting) &&
      selectedItemId === recommendedItem.id;

    const handleAddAddonToCart = (addon: TerminalResult) => {
      setIsAddingToCart(true);
      const cartItemRequest =
        legendMarketplaceBaseStore.cartStore.buildAddonCartRequest(addon, {
          ...(permissionIdOverride === undefined
            ? {}
            : { overridePermissionId: permissionIdOverride }),
          ...(modelOverride === undefined
            ? {}
            : { overrideModel: modelOverride }),
        });

      flowResult(
        legendMarketplaceBaseStore.cartStore.addToCartWithAPI(cartItemRequest),
      )
        .then((result) => {
          if (result.success) {
            setIsAdded(true);
          } else if (result.message) {
            toastManager.warning(result.message);
          }
        })
        .catch((error) => {
          assertErrorThrown(error);
          toastManager.error(
            `Failed to add ${addon.productName} to cart: ${error.message}`,
          );
        })
        .finally(() => {
          setIsAddingToCart(false);
        });
    };

    const renderAssociationButton = (
      isMarketplaceRecommendation: boolean,
      className: string,
    ): ReactNode => {
      const isLoading = isCurrentlySelecting || isAddingToCart;
      return (
        <Button
          variant="outlined"
          onClick={() => {
            setIsAddingToCart(true);
            // eslint-disable-next-line no-void
            void Promise.resolve(onSelect?.(recommendedItem))
              .then((wasAssociated) => {
                if (wasAssociated) {
                  setIsAdded(true);
                }
              })
              .finally(() => {
                setIsAddingToCart(false);
              });
          }}
          disabled={Boolean(isSelecting) || isAddingToCart}
          size="small"
          className={className}
        >
          {isLoading ? (
            <>
              Adding... &nbsp;
              <CircularProgress size={14} />
            </>
          ) : (
            <>
              Add to Cart &nbsp;
              {isMarketplaceRecommendation ? <PlusIcon /> : <CheckIcon />}
            </>
          )}
        </Button>
      );
    };

    const renderAssociationAction = (): ReactNode => {
      if (recommendedItem.isOwned) {
        return (
          <Box className="recommended-addons-modal__owned-badge">
            <CheckCircleIcon />
            <Typography variant="body2">Subscribed</Typography>
          </Box>
        );
      }
      if (isInCartOrAdded) {
        return (
          <Box className="recommended-addons-modal__in-cart-badge">
            <Typography variant="body2">In Cart</Typography>
            <CheckCircleIcon />
          </Box>
        );
      }
      return renderAssociationButton(
        isMarketplaceItem,
        isMarketplaceItem
          ? 'recommended-addons-modal__add-btn'
          : 'recommended-addons-modal__select-btn',
      );
    };

    const renderNonAssociationButtonLabel = () => {
      if (isAddingToCart) {
        return (
          <>
            Adding... &nbsp;
            <CircularProgress size={14} />
          </>
        );
      }
      if (isInCartOrAdded) {
        return 'Added to Cart';
      }
      return (
        <>
          Add to Cart &nbsp;
          <PlusIcon />
        </>
      );
    };

    const renderAction = () => {
      if (isAssociationFlow) {
        return renderAssociationAction();
      }

      const button = (
        <Button
          variant="outlined"
          onClick={() => handleAddAddonToCart(recommendedItem)}
          disabled={isInCartOrAdded || isAddingToCart}
          size="small"
          className={clsx('recommended-addons-modal__add-btn', {
            'recommended-addons-modal__add-btn--added': isInCartOrAdded,
          })}
        >
          {renderNonAssociationButtonLabel()}
        </Button>
      );

      if (isInCartOrAdded) {
        return (
          <Tooltip
            title={
              recommendedItem.isMandatory
                ? 'This is a mandatory item which needs to be associated with this order.'
                : 'This item is already in your cart.'
            }
            arrow={true}
            placement="top"
          >
            <span>{button}</span>
          </Tooltip>
        );
      }

      return button;
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
          {recommendedItem.category}
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
          {renderAction()}
        </Box>
      </Box>
    );
  },
);

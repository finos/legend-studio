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
} from '@mui/material';
import type { TerminalResult } from '@finos/legend-server-marketplace';
import { CheckCircleIcon, ShoppingCartIcon } from '@finos/legend-art';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';
import { observer } from 'mobx-react-lite';
import { flowResult } from 'mobx';
import { toastManager } from '../Toast/CartToast.js';
import { RecommendedAddOnsModal } from '../AddToCart/RecommendedAddOnsModal.js';
import { assertErrorThrown } from '@finos/legend-shared';

export const LegendMarketplaceTerminalCard = observer(
  (props: { terminalResult: TerminalResult }): JSX.Element => {
    const { terminalResult } = props;
    const [isAddingToCart, setIsAddingToCart] = useState(false);
    const [showRecommendationsModal, setShowRecommendationsModal] =
      useState(false);
    const [recommendedItems, setRecommendedItems] = useState<TerminalResult[]>(
      [],
    );

    const [modalMessage, setModalMessage] = useState<string>('');

    const legendMarketplaceBaseStore = useLegendMarketplaceBaseStore();
    const applicationStore = legendMarketplaceBaseStore.applicationStore;
    const assetUrl = applicationStore.config.assetsBaseUrl;

    const getImageUrl = (): string => {
      const maxImageCount = 7;
      const randomIndex = Math.floor(Math.random() * maxImageCount) + 1;
      const selectedImage = `${assetUrl}/images${randomIndex}.jpg`;
      return selectedImage;
    };

    const handleAddToCart = async () => {
      setIsAddingToCart(true);
      try {
        const result = await flowResult(
          legendMarketplaceBaseStore.cartStore.addToCartWithAPI(
            legendMarketplaceBaseStore.cartStore.providerToCartRequest(
              terminalResult,
            ),
          ),
        );
        if (
          result.success &&
          result.recommendations &&
          result.recommendations.length > 0
        ) {
          setRecommendedItems(result.recommendations);
          setModalMessage(result.message);
          setShowRecommendationsModal(true);
        }
      } catch (error) {
        assertErrorThrown(error);
        toastManager.error(
          `Failed to add ${terminalResult.productName} to cart: ${error.message}`,
        );
      } finally {
        setIsAddingToCart(false);
      }
    };

    const isInCart = (providerId: number): boolean =>
      providerId in legendMarketplaceBaseStore.cartStore.items;

    const handleViewCart = () => {
      legendMarketplaceBaseStore.cartStore.setOpen(true);
    };

    return (
      <Card className="legend-marketplace-terminal-card">
        <CardActionArea className="legend-marketplace-terminal-card__action">
          <CardMedia
            component="img"
            className="legend-marketplace-terminal-card__image"
            height="140"
            image={getImageUrl()}
            alt="data asset"
          />
          <CardContent className="legend-marketplace-terminal-card__content">
            <Box className="legend-marketplace-terminal-card__title">
              {terminalResult.productName}
            </Box>
          </CardContent>
        </CardActionArea>
        <CardActions className="legend-marketplace-terminal-card__action-buttons">
          {terminalResult.isOwned ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                color: '#077D55',
                fontWeight: 'bold',
              }}
            >
              Already have access &nbsp;
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
                disabled={isAddingToCart || isInCart(terminalResult.id)}
              >
                {isAddingToCart ? (
                  <>
                    Adding... &nbsp;
                    <CircularProgress size={16} />
                  </>
                ) : isInCart(terminalResult.id) ? (
                  <>
                    In Cart &nbsp;
                    <Box sx={{ color: '#077D55', display: 'inline-flex' }}>
                      <CheckCircleIcon />
                    </Box>
                  </>
                ) : (
                  <>
                    Add to cart &nbsp;
                    <ShoppingCartIcon />
                  </>
                )}
              </Button>
              {typeof terminalResult.price === 'number' && (
                <Chip
                  label={`${new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    roundingIncrement: 1,
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(terminalResult.price)}/access`}
                  className="legend-marketplace-terminal-card__price"
                  sx={{ color: 'white', backgroundColor: '#077d55' }}
                />
              )}
            </>
          )}
        </CardActions>

        <RecommendedAddOnsModal
          terminal={terminalResult}
          recommendedItems={recommendedItems}
          message={modalMessage}
          showModal={showRecommendationsModal}
          setShowModal={setShowRecommendationsModal}
          onViewCart={handleViewCart}
        />
      </Card>
    );
  },
);

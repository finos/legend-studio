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
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import type { TerminalResult } from '@finos/legend-server-marketplace';
import {
  CheckCircleIcon,
  InfoCircleIcon,
  ShoppingCartIcon,
} from '@finos/legend-art';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';
import { observer } from 'mobx-react-lite';
import { flowResult } from 'mobx';
import { toastManager } from '../Toast/CartToast.js';
import { RecommendedAddOnsModal } from '../AddToCart/RecommendedAddOnsModal.js';
import { assertErrorThrown } from '@finos/legend-shared';
import { MAX_PRODUCT_IMAGE_COUNT } from '../../stores/lakehouse/dataProducts/ProductCardState.js';
import {
  LegendMarketplaceTelemetryHelper,
  TERMINAL_SEARCH_LOCATION,
} from '../../__lib__/LegendMarketplaceTelemetryHelper.js';
import {
  calculateMandatoryAddonsTotalPrice,
  formatCardPrice,
} from './orderProfileUtils.js';
import { MandatoryAddOnsDetailModal } from './MandatoryAddOnsDetailModal.js';

export const LegendMarketplaceTerminalCard = observer(
  (props: { terminalResult: TerminalResult }): JSX.Element => {
    const { terminalResult } = props;
    const [isAddingToCart, setIsAddingToCart] = useState(false);
    const [showRecommendationsModal, setShowRecommendationsModal] =
      useState(false);
    const [showMandatoryAddonsModal, setShowMandatoryAddonsModal] =
      useState(false);
    const [recommendedItems, setRecommendedItems] = useState<TerminalResult[]>(
      [],
    );
    // Tracks which item the modal is currently showing add-ons/terminals for.
    // Defaults to the card's own item, but is updated to the newly selected
    // terminal when the user picks one from the "Available Terminals" list,
    // so the modal's title/section correctly switch to the terminal-added
    // variant instead of remaining on the original add-on's type.
    const [modalTerminal, setModalTerminal] =
      useState<TerminalResult>(terminalResult);

    const [modalMessage, setModalMessage] = useState<string>('');
    const [modalTotalCount, setModalTotalCount] = useState<
      number | null | undefined
    >(undefined);

    const legendMarketplaceBaseStore = useLegendMarketplaceBaseStore();
    const applicationStore = legendMarketplaceBaseStore.applicationStore;
    const assetUrl = applicationStore.config.assetsBaseUrl;
    const telemetryService = applicationStore.telemetryService;

    const [imageUrl] = useState(() => {
      const randomIndex =
        Math.floor(Math.random() * MAX_PRODUCT_IMAGE_COUNT) + 1;
      return `${assetUrl}/images${randomIndex}.jpg`;
    });

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
        if (result.success) {
          LegendMarketplaceTelemetryHelper.logEvent_AddTerminalAddonToCart(
            telemetryService,
            terminalResult.id,
            terminalResult.productName,
            terminalResult.providerName,
            terminalResult.terminalItemType,
            TERMINAL_SEARCH_LOCATION.MAIN_CATALOG,
            legendMarketplaceBaseStore.cartStore.cartUser !==
              applicationStore.identityService.currentUser,
          );
        }
        if (result.recommendations && result.recommendations.length > 0) {
          setModalTerminal(terminalResult);
          setRecommendedItems(result.recommendations);
          setModalMessage(result.message);
          setModalTotalCount(result.totalCount);
          setShowRecommendationsModal(true);
          LegendMarketplaceTelemetryHelper.logEvent_OpenAddonsPopup(
            telemetryService,
            terminalResult.productName,
            terminalResult.providerName,
            result.totalCount ?? null,
          );
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

    const isInCart = legendMarketplaceBaseStore.cartStore.isItemInCart(
      terminalResult.id,
    );
    const hasMandatoryAddons =
      (terminalResult.mandatoryAddons?.length ?? 0) > 0;
    const displayPrice = hasMandatoryAddons
      ? calculateMandatoryAddonsTotalPrice(terminalResult)
      : terminalResult.price;

    const handleViewCart = () => {
      legendMarketplaceBaseStore.cartStore.setOpen(true);
    };

    const handleTerminalSelected = useCallback(
      (
        _selectedTerminal: TerminalResult,
        recommendations: TerminalResult[],
        responseMessage: string,
        totalCount?: number | null,
      ) => {
        setModalTerminal(_selectedTerminal);
        setRecommendedItems(recommendations);
        setModalMessage(responseMessage);
        setModalTotalCount(totalCount);
        setShowRecommendationsModal(true);
        LegendMarketplaceTelemetryHelper.logEvent_OpenAddonsPopup(
          telemetryService,
          _selectedTerminal.productName,
          _selectedTerminal.providerName,
          totalCount ?? null,
        );
      },
      [telemetryService],
    );

    const handleCardClick = useCallback(() => {
      LegendMarketplaceTelemetryHelper.logEvent_ClickTerminalAddonCard(
        telemetryService,
        terminalResult.id,
        terminalResult.productName,
        terminalResult.providerName,
        terminalResult.terminalItemType,
        TERMINAL_SEARCH_LOCATION.MAIN_CATALOG,
      );
    }, [telemetryService, terminalResult]);

    return (
      <Card className="legend-marketplace-terminal-card">
        <CardActionArea
          className="legend-marketplace-terminal-card__action"
          onClick={handleCardClick}
        >
          <CardMedia
            component="img"
            className="legend-marketplace-terminal-card__image"
            height="140"
            image={imageUrl}
            alt="data asset"
          />
          {terminalResult.category && (
            <Chip
              label={terminalResult.category}
              className="legend-marketplace-terminal-card__category-chip"
            />
          )}
          <CardContent className="legend-marketplace-terminal-card__content">
            <Typography
              variant="subtitle2"
              className="legend-marketplace-terminal-card__provider"
              title={terminalResult.providerName}
            >
              {terminalResult.providerName}
            </Typography>
            <Box className="legend-marketplace-order-profile-card__title-row">
              <Typography
                variant="h6"
                className="legend-marketplace-terminal-card__title"
                title={terminalResult.productName}
              >
                {terminalResult.productName}
              </Typography>
              {hasMandatoryAddons && (
                <Tooltip title="View mandatory add-ons included with this terminal">
                  <IconButton
                    component="span"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMandatoryAddonsModal(true);
                    }}
                    className="legend-marketplace-order-profile-card__info-button"
                    aria-label="View mandatory add-ons details"
                  >
                    <InfoCircleIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </CardContent>
        </CardActionArea>
        <CardActions className="legend-marketplace-terminal-card__action-buttons">
          {terminalResult.isOwned ? (
            <Box className="legend-marketplace-terminal-card__owned-access">
              Already have access &nbsp;
              <CheckCircleIcon />
            </Box>
          ) : (
            <>
              <Button
                variant="outlined"
                className="legend-marketplace-terminal-card__add-to-cart-button"
                onClick={() => {
                  handleAddToCart().catch(applicationStore.alertUnhandledError);
                }}
                disabled={isAddingToCart || isInCart}
              >
                {isAddingToCart && (
                  <>
                    Adding... &nbsp;
                    <CircularProgress size={16} />
                  </>
                )}
                {!isAddingToCart && isInCart && (
                  <>
                    In Cart &nbsp;
                    <Box className="legend-marketplace-terminal-card__in-cart-check">
                      <CheckCircleIcon />
                    </Box>
                  </>
                )}
                {!isAddingToCart && !isInCart && (
                  <>
                    Add to cart &nbsp;
                    <ShoppingCartIcon />
                  </>
                )}
              </Button>
              {typeof displayPrice === 'number' &&
                Number.isFinite(displayPrice) && (
                  <Chip
                    label={formatCardPrice(displayPrice)}
                    className="legend-marketplace-terminal-card__price"
                  />
                )}
            </>
          )}
        </CardActions>

        <RecommendedAddOnsModal
          terminal={modalTerminal}
          recommendedItems={recommendedItems}
          message={modalMessage}
          showModal={showRecommendationsModal}
          setShowModal={setShowRecommendationsModal}
          onViewCart={handleViewCart}
          onTerminalSelected={handleTerminalSelected}
          totalCount={modalTotalCount}
        />

        <MandatoryAddOnsDetailModal
          terminal={terminalResult}
          open={showMandatoryAddonsModal}
          onClose={() => setShowMandatoryAddonsModal(false)}
        />
      </Card>
    );
  },
);

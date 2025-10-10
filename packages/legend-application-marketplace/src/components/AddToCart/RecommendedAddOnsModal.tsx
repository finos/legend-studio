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

import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Card,
  CardContent,
  CardActions,
  Grid,
  Box,
  IconButton,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  CloseIcon,
  CheckCircleIcon,
  PlusIcon,
  ArrowRightIcon,
} from '@finos/legend-art';
import type { TerminalResult } from '@finos/legend-server-marketplace';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';
import { flowResult } from 'mobx';

interface RecommendedAddOnsModalProps {
  terminal: TerminalResult | null;
  recommendedItems: TerminalResult[];
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  onViewCart?: () => void;
}

export const RecommendedAddOnsModal = observer(
  (props: RecommendedAddOnsModalProps) => {
    const { terminal, recommendedItems, showModal, setShowModal, onViewCart } =
      props;
    const legendMarketplaceBaseStore = useLegendMarketplaceBaseStore();
    const cartStore = legendMarketplaceBaseStore.cartStore;

    const [isAddingToCart, setIsAddingToCart] = useState(false);

    const closeModal = () => {
      setShowModal(false);
    };

    const handleAddAddonToCart = (addon: TerminalResult) => {
      setIsAddingToCart(true);
      flowResult(legendMarketplaceBaseStore.cartStore.addToCartWithAPI(addon))
        .then(() => {
          setIsAddingToCart(false);
        })
        .catch((error) => {
          setIsAddingToCart(false);
        });
    };

    const handleViewCart = () => {
      onViewCart?.();
      closeModal();
    };

    if (!showModal) {
      return null;
    }

    return (
      <Dialog
        open={showModal}
        onClose={closeModal}
        maxWidth="md"
        fullWidth={true}
        className="recommended-addons-modal"
      >
        <DialogTitle className="recommended-addons-modal__header">
          <CheckCircleIcon className="recommended-addons-modal__success-icon" />
          <Box className="recommended-addons-modal__header-content">
            <Typography
              variant="h6"
              className="recommended-addons-modal__title"
            >
              Item Added Successfully
            </Typography>
            {terminal && (
              <Typography
                variant="body2"
                className="recommended-addons-modal__subtitle"
              >
                {terminal.productName} added to cart
              </Typography>
            )}
          </Box>
          <IconButton
            onClick={closeModal}
            className="recommended-addons-modal__close-btn"
            size="large"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent className="recommended-addons-modal__content">
          <Box className="recommended-addons-modal__content-header">
            <Typography
              variant="h6"
              className="recommended-addons-modal__section-title"
            >
              Recommended Add-Ons
            </Typography>
            <Typography
              variant="body2"
              className="recommended-addons-modal__section-description"
            >
              Complete your setup with these recommended items
            </Typography>
          </Box>

          {recommendedItems.length === 0 ? (
            <Box className="recommended-addons-modal__empty-state">
              <Typography variant="body1">
                No recommended add-ons available for this terminal.
              </Typography>
            </Box>
          ) : (
            <Grid container={true} spacing={2}>
              {recommendedItems.map((addon) => (
                <Grid item={true} xs={12} sm={6} key={addon.id}>
                  <Card className="recommended-addons-modal__addon-card">
                    <CardContent className="recommended-addons-modal__card-content">
                      <Box className="recommended-addons-modal__card-header">
                        <Typography
                          variant="subtitle1"
                          className="recommended-addons-modal__product-name"
                        >
                          {addon.productName}
                        </Typography>
                        <Chip
                          label={addon.providerName}
                          size="small"
                          className="recommended-addons-modal__provider-chip"
                        />
                      </Box>

                      <Typography
                        variant="body2"
                        className="recommended-addons-modal__description"
                      >
                        {addon.description || 'No description available'}
                      </Typography>

                      <Box className="recommended-addons-modal__card-footer">
                        <Typography
                          variant="body2"
                          className={`recommended-addons-modal__price ${addon.price === 0 ? 'recommended-addons-modal__price--free' : ''}`}
                        >
                          {addon.price === 0
                            ? 'Free'
                            : addon.price.toLocaleString('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                maximumFractionDigits: 2,
                              })}
                        </Typography>
                      </Box>
                    </CardContent>

                    <CardActions className="recommended-addons-modal__card-actions">
                      <Button
                        variant={
                          cartStore.items.has(addon.id)
                            ? 'outlined'
                            : 'contained'
                        }
                        startIcon={
                          isAddingToCart ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : cartStore.items.has(addon.id) ? null : (
                            <PlusIcon />
                          )
                        }
                        onClick={() => handleAddAddonToCart(addon)}
                        disabled={cartStore.items.has(addon.id)}
                        fullWidth={true}
                        className={`recommended-addons-modal__add-btn ${cartStore.items.has(addon.id) ? 'recommended-addons-modal__add-btn--added' : ''}`}
                      >
                        {!cartStore.items.has(addon.id)
                          ? isAddingToCart
                            ? 'Adding...'
                            : 'Add to Cart'
                          : 'Added to Cart'}
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>

        <DialogActions className="recommended-addons-modal__footer">
          <Button
            variant="outlined"
            onClick={closeModal}
            className="recommended-addons-modal__close-button"
          >
            Close
          </Button>
          {onViewCart && (
            <Button
              variant="contained"
              endIcon={<ArrowRightIcon />}
              onClick={handleViewCart}
              className="recommended-addons-modal__view-cart-button"
            >
              View Cart
            </Button>
          )}
        </DialogActions>
      </Dialog>
    );
  },
);

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
  IconButton,
  Typography,
} from '@mui/material';
import {
  TerminalResult,
  type PermissionAddonsSearchResponse,
} from '@finos/legend-server-marketplace';
import { InfoCircleIcon, ShoppingCartIcon } from '@finos/legend-art';
import { assertErrorThrown } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';
import { toastManager } from '../Toast/CartToast.js';
import { RecommendedAddOnsModal } from '../AddToCart/RecommendedAddOnsModal.js';
import { OwnedTerminalDetailModal } from './OwnedTerminalDetailModal.js';
import { getRandomImageUrl, OrderProfileLabel } from './orderProfileUtils.js';

export const LegendMarketplaceOwnedTerminalCard = observer(
  (props: { terminalResult: TerminalResult }): JSX.Element => {
    const { terminalResult } = props;
    const legendMarketplaceBaseStore = useLegendMarketplaceBaseStore();
    const { applicationStore } = legendMarketplaceBaseStore;

    const [isAddingToCart, setIsAddingToCart] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showAddOnsModal, setShowAddOnsModal] = useState(false);
    const [recommendedItems, setRecommendedItems] = useState<TerminalResult[]>(
      [],
    );
    const [modalMessage, setModalMessage] = useState('');
    const [modalTotalCount, setModalTotalCount] = useState<
      number | null | undefined
    >(undefined);
    const [modalPermissionId, setModalPermissionId] = useState<
      number | undefined
    >(undefined);

    const [imageUrl] = useState(() =>
      getRandomImageUrl(applicationStore.config.assetsBaseUrl),
    );

    const handleBrowseAddOns = async (): Promise<void> => {
      setIsAddingToCart(true);
      try {
        const response =
          (await legendMarketplaceBaseStore.marketplaceServerClient.getPermissionAddons(
            legendMarketplaceBaseStore.cartStore.cartUser,
            terminalResult.providerName,
            {
              page: 1,
              page_size: 300,
              ...(terminalResult.permissionId === undefined
                ? {}
                : { permission_id: terminalResult.permissionId }),
            },
          )) as unknown as PermissionAddonsSearchResponse;
        const addons = response.marketplace_addons.map((item) =>
          TerminalResult.serialization.fromJson(item),
        );
        if (addons.length > 0) {
          setRecommendedItems(addons);
          setModalMessage(
            `Services available for ${terminalResult.providerName}`,
          );
          setModalTotalCount(response.total_count);
          setModalPermissionId(
            response.permissionId ?? terminalResult.permissionId,
          );
          setShowAddOnsModal(true);
        } else {
          toastManager.warning(
            `No services found for ${terminalResult.providerName}`,
          );
        }
      } catch (error) {
        assertErrorThrown(error);
        toastManager.error(
          `Failed to fetch services for ${terminalResult.productName}: ${error.message}`,
        );
      } finally {
        setIsAddingToCart(false);
      }
    };

    const permissionLabel =
      terminalResult.permissionId === undefined
        ? terminalResult.category
        : OrderProfileLabel.PERMISSION_ID;

    return (
      <>
        <Card className="legend-marketplace-terminal-card legend-marketplace-order-profile-card">
          <CardActionArea className="legend-marketplace-terminal-card__action">
            <CardMedia
              component="img"
              className="legend-marketplace-terminal-card__image"
              height="140"
              image={imageUrl}
              alt="owned terminal"
            />
            <Chip
              label={permissionLabel}
              className="legend-marketplace-terminal-card__category-chip"
            />
            <CardContent className="legend-marketplace-terminal-card__content">
              <Typography
                variant="subtitle2"
                className="legend-marketplace-terminal-card__provider legend-marketplace-order-profile-card__summary"
              >
                {terminalResult.providerName}
              </Typography>
              <Box className="legend-marketplace-order-profile-card__title-row">
                <Typography
                  variant="h6"
                  className="legend-marketplace-terminal-card__title"
                >
                  {terminalResult.productName.toUpperCase()}
                </Typography>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDetailModal(true);
                  }}
                  className="legend-marketplace-order-profile-card__info-button"
                  aria-label="View terminal details"
                >
                  <InfoCircleIcon />
                </IconButton>
              </Box>
            </CardContent>
          </CardActionArea>

          <CardActions className="legend-marketplace-terminal-card__action-buttons">
            <Button
              variant="outlined"
              className="legend-marketplace-terminal-card__add-to-cart-button"
              onClick={() => {
                handleBrowseAddOns().catch(
                  applicationStore.alertUnhandledError,
                );
              }}
              disabled={isAddingToCart}
            >
              {isAddingToCart ? (
                <>
                  {OrderProfileLabel.FETCHING} &nbsp;
                  <CircularProgress size={16} />
                </>
              ) : (
                <>
                  {OrderProfileLabel.BROWSE_ADD_ONS} &nbsp;
                  <ShoppingCartIcon />
                </>
              )}
            </Button>
          </CardActions>
        </Card>

        <OwnedTerminalDetailModal
          terminal={terminalResult}
          open={showDetailModal}
          onClose={() => setShowDetailModal(false)}
        />

        <RecommendedAddOnsModal
          terminal={terminalResult}
          recommendedItems={recommendedItems}
          message={modalMessage}
          showModal={showAddOnsModal}
          setShowModal={setShowAddOnsModal}
          onViewCart={() => legendMarketplaceBaseStore.cartStore.setOpen(true)}
          totalCount={modalTotalCount}
          overridePermissionId={modalPermissionId}
          overrideModel={terminalResult.model}
        />
      </>
    );
  },
);

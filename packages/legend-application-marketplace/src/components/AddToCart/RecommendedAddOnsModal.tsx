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
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Grid,
  Box,
  IconButton,
} from '@mui/material';
import {
  CloseIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  WarningIcon,
} from '@finos/legend-art';
import {
  TerminalItemType,
  type TerminalResult,
} from '@finos/legend-server-marketplace';
import { RecommendedItemsCard } from './RecommendedItemsCard.js';

interface RecommendedAddOnsModalProps {
  terminal: TerminalResult | null;
  recommendedItems: TerminalResult[];
  message: string;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  onViewCart?: () => void;
}

export const RecommendedAddOnsModal = observer(
  (props: RecommendedAddOnsModalProps) => {
    const {
      terminal,
      recommendedItems,
      message,
      showModal,
      setShowModal,
      onViewCart,
    } = props;

    const closeModal = () => {
      setShowModal(false);
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
          {terminal?.terminalItemType === TerminalItemType.TERMINAL ? (
            <CheckCircleIcon className="recommended-addons-modal__success-icon" />
          ) : (
            <WarningIcon className="recommended-addons-modal__warning-icon" />
          )}
          <Box className="recommended-addons-modal__header-content">
            <Typography
              variant="h6"
              className="recommended-addons-modal__title"
            >
              {terminal?.terminalItemType === TerminalItemType.TERMINAL
                ? 'Item Added Successfully'
                : 'Unable to Add Item'}
            </Typography>
            {terminal && (
              <Typography
                variant="body2"
                className="recommended-addons-modal__subtitle"
              >
                {message}
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
              {terminal?.terminalItemType === TerminalItemType.TERMINAL
                ? 'Recommended Add-Ons'
                : 'Recommended Terminals'}
            </Typography>
            <Typography
              variant="body2"
              className="recommended-addons-modal__section-description"
            >
              {terminal?.terminalItemType === TerminalItemType.TERMINAL
                ? 'Complete your setup with these recommended add-ons'
                : 'You must order a terminal license with this add-on'}
            </Typography>
          </Box>

          {recommendedItems.length === 0 ? (
            <Box className="recommended-addons-modal__empty-state">
              <Typography variant="body1">
                {terminal?.terminalItemType === TerminalItemType.TERMINAL
                  ? 'No recommended add-ons available for this terminal.'
                  : 'No recommended terminals available for this add-on.'}
              </Typography>
            </Box>
          ) : (
            <Grid container={true} spacing={2}>
              {recommendedItems.map((item) => (
                <Grid size={{ xs: 12, sm: 6 }} key={item.id}>
                  {terminal ? (
                    <RecommendedItemsCard
                      key={item.id}
                      vendorProfileId={terminal.id}
                      recommendedItem={item}
                    />
                  ) : (
                    <RecommendedItemsCard
                      key={item.id}
                      recommendedItem={item}
                    />
                  )}
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

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

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { flowResult } from 'mobx';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import { WarningIcon } from '@finos/legend-art';
import type { TerminalProductOrder } from '@finos/legend-server-marketplace';
import type { OrdersStore } from '../../stores/orders/OrderStore.js';
import { getProcessInstanceId } from '../../stores/orders/OrderHelpers.js';

interface CancelOrderDialogProps {
  open: boolean;
  onClose: () => void;
  order: TerminalProductOrder;
  orderStore: OrdersStore;
}

export const CancelOrderDialog: React.FC<CancelOrderDialogProps> = observer(
  ({ open, onClose, order, orderStore }) => {
    const [cancellationReason, setCancellationReason] = useState('');

    const isLoading = orderStore.cancelOrderState.isInProgress;
    const trimmedReason = cancellationReason.trim();
    const isReasonValid = trimmedReason.length > 0;

    const handleClose = (): void => {
      if (!isLoading) {
        setCancellationReason('');
        onClose();
      }
    };

    const handleConfirm = async (): Promise<void> => {
      if (!isReasonValid) {
        return;
      }

      const processInstanceId = getProcessInstanceId(order);
      if (!processInstanceId) {
        return;
      }

      const success = await flowResult(
        orderStore.cancelOrder(
          order.order_id,
          processInstanceId,
          trimmedReason,
        ),
      );
      if (success) {
        handleClose();
      }
    };

    return (
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth={true}
        className="legend-marketplace-cancel-order-dialog"
      >
        <DialogTitle>
          <Box className="legend-marketplace-cancel-order-dialog__title">
            <WarningIcon className="legend-marketplace-cancel-order-dialog__warning-icon" />
            <Typography variant="h6">Cancel Order</Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box className="legend-marketplace-cancel-order-dialog__content">
            <Typography className="legend-marketplace-cancel-order-dialog__message">
              Are you sure you want to cancel this order?
            </Typography>

            <Box className="legend-marketplace-cancel-order-dialog__order-info">
              <Typography variant="body2">
                <strong>Order ID:</strong> {order.order_id}
              </Typography>
              <Typography variant="body2">
                <strong>Vendor:</strong> {order.vendor_name}
              </Typography>
              <Typography variant="body2">
                <strong>Order Type:</strong> {order.order_type}
              </Typography>
            </Box>

            <TextField
              autoFocus={true}
              margin="dense"
              label="Cancellation Reason"
              placeholder="Please provide a reason for canceling this order..."
              fullWidth={true}
              multiline={true}
              rows={4}
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              disabled={isLoading}
              required={true}
              helperText="Required: Please explain why you are canceling this order"
              error={cancellationReason.length > 0 && !isReasonValid}
              className="legend-marketplace-cancel-order-dialog__text-field"
            />
          </Box>
        </DialogContent>

        <DialogActions className="legend-marketplace-cancel-order-dialog__actions">
          <Button
            onClick={handleClose}
            disabled={isLoading}
            variant="text"
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            // eslint-disable-next-line no-void
            onClick={() => {
              void handleConfirm();
            }}
            disabled={isLoading || !isReasonValid}
            variant="contained"
            color="error"
            startIcon={isLoading ? <CircularProgress size={16} /> : undefined}
          >
            {isLoading ? 'Canceling...' : 'Confirm Cancellation'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  },
);

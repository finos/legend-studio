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

import { type JSX } from 'react';
import { observer } from 'mobx-react-lite';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { clsx, CloseIcon, DocumentIcon } from '@finos/legend-art';
import { type TerminalResult } from '@finos/legend-server-marketplace';
import {
  formatItemPrice,
  OrderProfileLabel,
  OrderProfileTableHeader,
} from './orderProfileUtils.js';

const CategoryChip = (props: {
  category: string;
  isTerminal: boolean;
}): JSX.Element => {
  const { category, isTerminal } = props;
  return (
    <Chip
      label={category}
      size="small"
      className={clsx({
        'order-profile-modal__category-chip--terminal': isTerminal,
        'order-profile-modal__category-chip--addon': !isTerminal,
      })}
    />
  );
};

export const OwnedTerminalDetailModal = observer(
  (props: {
    terminal: TerminalResult;
    open: boolean;
    onClose: () => void;
  }): JSX.Element => {
    const { terminal, open, onClose } = props;

    const ownedAddons = terminal.items ?? [];
    const addOnCount = ownedAddons.length;
    const summaryLine = `1 Terminal · ${addOnCount} Add-On${addOnCount === 1 ? '' : 's'}`;
    const totalPrice =
      terminal.price + ownedAddons.reduce((sum, addon) => sum + addon.price, 0);

    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth={true}
        className="order-profile-modal"
        aria-labelledby="owned-terminal-modal-title"
      >
        <DialogTitle
          id="owned-terminal-modal-title"
          className="order-profile-modal__header"
        >
          <Box className="order-profile-modal__header-content">
            <Box className="order-profile-modal__header-title">
              <DocumentIcon className="order-profile-modal__header-icon" />
              <Typography
                variant="h6"
                className="order-profile-modal__profile-name"
              >
                {terminal.productName}
              </Typography>
            </Box>
            <IconButton
              onClick={onClose}
              size="small"
              aria-label="close"
              className="order-profile-modal__close-button"
            >
              <CloseIcon />
            </IconButton>
          </Box>
          <Typography
            variant="body2"
            className="order-profile-modal__header-summary"
          >
            {summaryLine}
            {OrderProfileLabel.PRICE_TOTAL_SEPARATOR}
            <strong>{formatItemPrice(totalPrice)}</strong>
          </Typography>
        </DialogTitle>

        <DialogContent className="order-profile-modal__content" dividers={true}>
          <TableContainer>
            <Table
              size="small"
              aria-label="owned terminal details"
              stickyHeader={true}
            >
              <TableHead>
                <TableRow className="order-profile-modal__table-head">
                  <TableCell className="order-profile-modal__table-header-cell">
                    {OrderProfileTableHeader.PRODUCT_NAME}
                  </TableCell>
                  <TableCell className="order-profile-modal__table-header-cell">
                    {OrderProfileTableHeader.PROVIDER}
                  </TableCell>
                  <TableCell className="order-profile-modal__table-header-cell">
                    {OrderProfileTableHeader.CATEGORY}
                  </TableCell>
                  <TableCell
                    align="center"
                    className="order-profile-modal__table-header-cell"
                  >
                    {OrderProfileTableHeader.COST_MONTHLY}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow
                  key={`terminal-${terminal.id}`}
                  className="order-profile-modal__table-row"
                >
                  <TableCell className="order-profile-modal__table-cell order-profile-modal__table-cell--name">
                    <Box className="order-profile-modal__product-name-wrapper">
                      <Box className="order-profile-modal__row-accent order-profile-modal__row-accent--vendor-profile" />
                      <span>{terminal.productName}</span>
                    </Box>
                  </TableCell>
                  <TableCell className="order-profile-modal__table-cell">
                    {terminal.providerName}
                  </TableCell>
                  <TableCell className="order-profile-modal__table-cell">
                    <CategoryChip
                      category={terminal.category}
                      isTerminal={true}
                    />
                  </TableCell>
                  <TableCell
                    align="center"
                    className="order-profile-modal__table-cell order-profile-modal__table-cell--price"
                  >
                    {formatItemPrice(terminal.price)}
                  </TableCell>
                </TableRow>
                {ownedAddons.map((addon) => (
                  <TableRow
                    key={`${addon.id}-${addon.model ?? ''}`}
                    className="order-profile-modal__table-row"
                  >
                    <TableCell className="order-profile-modal__table-cell order-profile-modal__table-cell--name">
                      <Box className="order-profile-modal__product-name-wrapper order-profile-modal__product-name-wrapper--sub">
                        <Box className="order-profile-modal__row-accent order-profile-modal__row-accent--addon" />
                        <span>{addon.productName}</span>
                      </Box>
                    </TableCell>
                    <TableCell className="order-profile-modal__table-cell">
                      {addon.providerName}
                    </TableCell>
                    <TableCell className="order-profile-modal__table-cell">
                      <CategoryChip
                        category={addon.category}
                        isTerminal={false}
                      />
                    </TableCell>
                    <TableCell
                      align="center"
                      className="order-profile-modal__table-cell order-profile-modal__table-cell--price"
                    >
                      {formatItemPrice(addon.price)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>

        <DialogActions className="order-profile-modal__actions">
          <Button
            variant="contained"
            onClick={onClose}
            className="order-profile-modal__close-btn"
          >
            {OrderProfileLabel.CLOSE}
          </Button>
        </DialogActions>
      </Dialog>
    );
  },
);

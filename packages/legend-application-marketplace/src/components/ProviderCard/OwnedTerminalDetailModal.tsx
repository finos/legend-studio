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

import { useMemo, useState, type JSX } from 'react';
import { observer } from 'mobx-react-lite';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { type TerminalResult } from '@finos/legend-server-marketplace';
import {
  formatItemPrice,
  formatProfileSummaryLine,
  OrderProfileLabel,
  OrderProfileTableHeader,
} from './orderProfileUtils.js';
import {
  CategoryChip,
  OrderProfileModalHeader,
} from './OrderProfileModalHeader.js';
import { ColumnFilterButton } from '../Filters/ColumnFilterButton.js';

export const OwnedTerminalDetailModal = observer(
  (props: {
    terminal: TerminalResult;
    open: boolean;
    onClose: () => void;
  }): JSX.Element => {
    const { terminal, open, onClose } = props;

    const ownedAddons = useMemo(() => terminal.items ?? [], [terminal.items]);
    const addOnCount = ownedAddons.length;
    const summaryLine = formatProfileSummaryLine(1, addOnCount);
    const totalPrice =
      terminal.price + ownedAddons.reduce((sum, addon) => sum + addon.price, 0);

    const [categoryFilter, setCategoryFilter] = useState<Set<string>>(
      () => new Set(),
    );
    const categoryOptions = useMemo(
      () =>
        Array.from(
          new Set([terminal, ...ownedAddons].map((item) => item.category)),
        ).sort((a, b) => a.localeCompare(b)),
      [terminal, ownedAddons],
    );
    const showTerminalRow =
      categoryFilter.size === 0 || categoryFilter.has(terminal.category);
    const filteredAddons =
      categoryFilter.size === 0
        ? ownedAddons
        : ownedAddons.filter((addon) => categoryFilter.has(addon.category));
    // When the terminal row is filtered out, add-on rows lose their visible
    // parent, so render them without sub-item indentation to avoid looking
    // like an orphaned child (see `showTerminalRow` usage below).

    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth={true}
        className="order-profile-modal"
        aria-labelledby="owned-terminal-modal-title"
      >
        <OrderProfileModalHeader
          titleId="owned-terminal-modal-title"
          productName={terminal.productName}
          summaryLine={summaryLine}
          totalPrice={totalPrice}
          onClose={onClose}
        />

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
                    <Box className="order-profile-modal__table-header-cell-content">
                      <span>{OrderProfileTableHeader.CATEGORY}</span>
                      <ColumnFilterButton
                        columnLabel="Category"
                        options={categoryOptions}
                        selected={categoryFilter}
                        onChange={setCategoryFilter}
                      />
                    </Box>
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
                {showTerminalRow && (
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
                )}
                {filteredAddons.map((addon) => (
                  <TableRow
                    key={`${addon.id}-${addon.model ?? ''}`}
                    className="order-profile-modal__table-row"
                  >
                    <TableCell className="order-profile-modal__table-cell order-profile-modal__table-cell--name">
                      <Box
                        className={`order-profile-modal__product-name-wrapper ${showTerminalRow ? 'order-profile-modal__product-name-wrapper--sub' : ''}`}
                      >
                        <Box className="order-profile-modal__row-accent order-profile-modal__row-accent--addon" />
                        <span>{addon.productName}</span>
                      </Box>
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

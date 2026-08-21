/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import type { JSX } from 'react';
import { observer } from 'mobx-react-lite';
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
} from '@mui/material';
import type { TraderProfile } from '@finos/legend-server-marketplace';
import {
  formatItemPrice,
  formatProfileSummaryLine,
  getItemSummary,
  groupOrderProfileItems,
  OrderProfileLabel,
  OrderProfileTableHeader,
} from './orderProfileUtils.js';
import {
  CategoryChip,
  OrderProfileModalHeader,
} from './OrderProfileModalHeader.js';

export const OrderProfileDetailModal = observer(
  (props: {
    profile: TraderProfile;
    open: boolean;
    onClose: () => void;
    multiselectTotalPrice?: number;
  }): JSX.Element => {
    const { profile, open, onClose, multiselectTotalPrice } = props;
    const { cartStore } = useLegendMarketplaceBaseStore();
    const items = profile.items;
    const { terminalCount, addOnCount } = getItemSummary(items);
    const groupedItems = groupOrderProfileItems(items);
    const displayPrice =
      profile.multiselect && multiselectTotalPrice !== undefined
        ? multiselectTotalPrice
        : profile.price;

    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth={true}
        className="order-profile-modal"
        aria-labelledby="order-profile-modal-title"
      >
        <OrderProfileModalHeader
          titleId="order-profile-modal-title"
          productName={profile.productName}
          summaryLine={formatProfileSummaryLine(terminalCount, addOnCount)}
          totalPrice={displayPrice}
          onClose={onClose}
        />

        <DialogContent className="order-profile-modal__content" dividers={true}>
          <TableContainer>
            <Table
              size="small"
              aria-label="order profile items"
              stickyHeader={true}
            >
              <TableHead>
                <TableRow className="order-profile-modal__table-head">
                  <TableCell className="order-profile-modal__table-header-cell">
                    {OrderProfileTableHeader.PRODUCT_NAME}
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
                {groupedItems.map(({ item, isSubItem }) => {
                  const isInCart =
                    !item.isOwned &&
                    (item.isTerminal
                      ? cartStore.isItemInCart(item.id)
                      : cartStore.isAddOnInCartForModel(item.id, item.model));
                  const rowModifierClass = (() => {
                    if (item.isOwned) {
                      return 'order-profile-modal__table-row--owned';
                    }
                    if (isInCart) {
                      return 'order-profile-modal__table-row--in-cart';
                    }
                    return '';
                  })();
                  return (
                    <TableRow
                      key={`${item.id}-${item.model ?? ''}`}
                      className={`order-profile-modal__table-row ${rowModifierClass}`}
                    >
                      <TableCell className="order-profile-modal__table-cell order-profile-modal__table-cell--name">
                        <Box
                          className={`order-profile-modal__product-name-wrapper ${isSubItem ? 'order-profile-modal__product-name-wrapper--sub' : ''}`}
                        >
                          <Box
                            className={`order-profile-modal__row-accent ${item.isTerminal ? 'order-profile-modal__row-accent--vendor-profile' : 'order-profile-modal__row-accent--addon'}`}
                          />
                          <span>
                            {item.productName}
                            {item.isOwned && (
                              <span className="order-profile-modal__owned-label">
                                {' '}
                                {OrderProfileLabel.OWNED_SUFFIX}
                              </span>
                            )}
                            {isInCart && (
                              <span className="order-profile-modal__in-cart-label">
                                {' '}
                                {OrderProfileLabel.IN_CART_SUFFIX}
                              </span>
                            )}
                          </span>
                        </Box>
                      </TableCell>
                      <TableCell className="order-profile-modal__table-cell">
                        <CategoryChip
                          category={item.category}
                          isTerminal={item.isTerminal}
                        />
                      </TableCell>
                      <TableCell
                        align="center"
                        className="order-profile-modal__table-cell order-profile-modal__table-cell--price"
                      >
                        {formatItemPrice(item.price)}
                      </TableCell>
                    </TableRow>
                  );
                })}
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

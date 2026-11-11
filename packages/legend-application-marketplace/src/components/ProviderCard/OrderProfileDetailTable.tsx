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

import { type JSX, type ReactNode } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { ColumnFilterButton } from '../Filters/ColumnFilterButton.js';
import { CategoryChip } from './OrderProfileModalHeader.js';
import {
  formatItemPrice,
  OrderProfileTableHeader,
} from './orderProfileUtils.js';

export const OrderProfileDetailTable = (props: {
  ariaLabel: string;
  categoryOptions: string[];
  categoryFilter: Set<string>;
  onCategoryFilterChange: (next: Set<string>) => void;
  children: ReactNode;
}): JSX.Element => {
  const {
    ariaLabel,
    categoryOptions,
    categoryFilter,
    onCategoryFilterChange,
    children,
  } = props;

  return (
    <TableContainer>
      <Table size="small" aria-label={ariaLabel} stickyHeader={true}>
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
                  onChange={onCategoryFilterChange}
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
        <TableBody>{children}</TableBody>
      </Table>
    </TableContainer>
  );
};

export const OrderProfileDetailTableRow = (props: {
  productName: string;
  category: string;
  price: number;
  isTerminal: boolean;
  isSubItem?: boolean;
  rowModifierClass?: string;
  nameMetadata?: ReactNode;
}): JSX.Element => {
  const {
    productName,
    category,
    price,
    isTerminal,
    isSubItem = false,
    rowModifierClass,
    nameMetadata,
  } = props;
  const rowAccentClass = isTerminal
    ? 'order-profile-modal__row-accent--vendor-profile'
    : 'order-profile-modal__row-accent--addon';
  const nameWrapperClass = `order-profile-modal__product-name-wrapper${isSubItem ? ' order-profile-modal__product-name-wrapper--sub' : ''}`;
  const tableRowClassName =
    `order-profile-modal__table-row ${rowModifierClass ?? ''}`.trim();

  return (
    <TableRow className={tableRowClassName}>
      <TableCell className="order-profile-modal__table-cell order-profile-modal__table-cell--name">
        <Box className={nameWrapperClass}>
          <Box
            className={`order-profile-modal__row-accent ${rowAccentClass}`}
          />
          <span>
            {productName}
            {nameMetadata}
          </span>
        </Box>
      </TableCell>
      <TableCell className="order-profile-modal__table-cell">
        <CategoryChip category={category} isTerminal={isTerminal} />
      </TableCell>
      <TableCell
        align="center"
        className="order-profile-modal__table-cell order-profile-modal__table-cell--price"
      >
        {formatItemPrice(price)}
      </TableCell>
    </TableRow>
  );
};

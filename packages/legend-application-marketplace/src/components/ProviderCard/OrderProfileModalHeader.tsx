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
import { Box, Chip, DialogTitle, IconButton, Typography } from '@mui/material';
import { clsx, CloseIcon, DocumentIcon } from '@finos/legend-art';
import { formatItemPrice, OrderProfileLabel } from './orderProfileUtils.js';

/**
 * Category chip shared by the order profile / owned terminal detail table rows.
 */
export const CategoryChip = (props: {
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

/**
 * Shared `DialogTitle` header for the order profile detail and owned terminal
 * detail modals: an icon + product name row with a close button, followed by
 * a summary line showing item counts and total price.
 */
export const OrderProfileModalHeader = (props: {
  titleId: string;
  productName: string;
  summaryLine: string;
  totalPrice: number;
  onClose: () => void;
}): JSX.Element => {
  const { titleId, productName, summaryLine, totalPrice, onClose } = props;
  return (
    <DialogTitle id={titleId} className="order-profile-modal__header">
      <Box className="order-profile-modal__header-content">
        <Box className="order-profile-modal__header-title">
          <DocumentIcon className="order-profile-modal__header-icon" />
          <Typography
            variant="h6"
            className="order-profile-modal__profile-name"
          >
            {productName}
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
  );
};

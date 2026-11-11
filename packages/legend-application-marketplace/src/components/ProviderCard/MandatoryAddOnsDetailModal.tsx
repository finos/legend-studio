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

import { useMemo, useState, type JSX } from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Dialog, DialogActions, DialogContent } from '@mui/material';
import { type TerminalResult } from '@finos/legend-server-marketplace';
import {
  calculateMandatoryAddonsTotalPrice,
  formatProfileSummaryLine,
  OrderProfileLabel,
} from './orderProfileUtils.js';
import { OrderProfileModalHeader } from './OrderProfileModalHeader.js';
import {
  OrderProfileDetailTable,
  OrderProfileDetailTableRow,
} from './OrderProfileDetailTable.js';

export const MandatoryAddOnsDetailModal = observer(
  (props: {
    terminal: TerminalResult;
    open: boolean;
    onClose: () => void;
  }): JSX.Element => {
    const { terminal, open, onClose } = props;

    const mandatoryAddons = useMemo(
      () => terminal.mandatoryAddons ?? [],
      [terminal.mandatoryAddons],
    );
    const summaryLine = formatProfileSummaryLine(1, mandatoryAddons.length);
    const totalPrice = calculateMandatoryAddonsTotalPrice(terminal);

    const [categoryFilter, setCategoryFilter] = useState<Set<string>>(
      () => new Set(),
    );
    const categoryOptions = useMemo(
      () =>
        Array.from(
          new Set([terminal, ...mandatoryAddons].map((item) => item.category)),
        ).sort((a, b) => a.localeCompare(b)),
      [terminal, mandatoryAddons],
    );
    const showTerminalRow =
      categoryFilter.size === 0 || categoryFilter.has(terminal.category);
    const filteredMandatoryAddons =
      categoryFilter.size === 0
        ? mandatoryAddons
        : mandatoryAddons.filter((addon) => categoryFilter.has(addon.category));

    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth={true}
        className="order-profile-modal"
        aria-labelledby="mandatory-addons-modal-title"
      >
        <OrderProfileModalHeader
          titleId="mandatory-addons-modal-title"
          productName={`Mandatory Add-Ons for ${terminal.productName}`}
          summaryLine={summaryLine}
          totalPrice={totalPrice}
          onClose={onClose}
        />

        <DialogContent className="order-profile-modal__content" dividers={true}>
          <OrderProfileDetailTable
            ariaLabel="mandatory add-ons details"
            categoryOptions={categoryOptions}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
          >
            {showTerminalRow && (
              <OrderProfileDetailTableRow
                key={`terminal-${terminal.id}`}
                productName={terminal.productName}
                category={terminal.category}
                price={terminal.price}
                isTerminal={true}
              />
            )}
            {filteredMandatoryAddons.map((addon) => (
              <OrderProfileDetailTableRow
                key={`${addon.id}-${addon.model ?? ''}`}
                productName={addon.productName}
                category={addon.category}
                price={addon.price}
                isTerminal={false}
                isSubItem={showTerminalRow}
              />
            ))}
          </OrderProfileDetailTable>
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

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

import type { TraderProfileItem } from '@finos/legend-server-marketplace';

// ─── Category constants ───────────────────────────────────────────────────────

/** Canonical lower-case value stored in TraderProfileItem.category for terminals. */
export const VENDOR_PROFILE_CATEGORY = 'vendor profile';

// ─── String labels ───────────────────────────────────────────────────────────

export enum OrderProfileLabel {
  CHIP_LABEL = 'Order Profile',
  ALREADY_HAVE_ACCESS = 'Already have access',
  ADD_TO_CART = 'Add to cart',
  IN_CART = 'In Cart',
  ADDING = 'Adding...',
  SELECT_TERMINAL_TITLE = 'Select Terminal',
  SELECT_TERMINAL_DESCRIPTION = 'All Add-Ons will be added automatically after the terminal is confirmed.',
  CANCEL = 'Cancel',
  CLOSE = 'Close',
  OWNED_SUFFIX = '(Owned)',
  IN_CART_SUFFIX = '(In Cart)',
  MODEL_PREFIX = 'Model: ',
  PRICE_TOTAL_SEPARATOR = ' · Total: ',
}

export enum OrderProfileTableHeader {
  PRODUCT_NAME = 'PRODUCT NAME',
  PROVIDER = 'PROVIDER',
  CATEGORY = 'CATEGORY',
  COST_MONTHLY = 'COST (Monthly)',
}

// ─── Price formatting ─────────────────────────────────────────────────────────

const USD_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formats a price as a plain USD string, e.g. "$1,234.56". Used in detail tables. */
export const formatItemPrice = (price: number): string =>
  USD_FORMATTER.format(price);

/** Formats a price with a "/month" suffix for display on cards. */
export const formatCardPrice = (price: number): string =>
  `${USD_FORMATTER.format(price)}/month`;

// ─── Item summary helpers ─────────────────────────────────────────────────────

export const getItemSummary = (
  items: TraderProfileItem[],
): { terminalCount: number; addOnCount: number } => {
  const terminalCount = items.filter((item) => item.isTerminal).length;
  return { terminalCount, addOnCount: items.length - terminalCount };
};

export const formatProfileSummaryLine = (
  terminalCount: number,
  addOnCount: number,
): string => {
  const terminalLabel =
    terminalCount === 1 ? '1 Terminal' : `${terminalCount} Terminals`;
  const addOnLabel = addOnCount === 1 ? '1 Add-On' : `${addOnCount} Add-Ons`;
  return `${terminalLabel} · ${addOnLabel}`;
};

// ─── Grouping ─────────────────────────────────────────────────────────────────

/**
 * Groups items so that each vendor-profile (terminal) is immediately followed
 * by its associated add-ons (matched by item.model).  Unmatched add-ons are
 * appended at the end.
 */
export const groupOrderProfileItems = (
  items: TraderProfileItem[],
): { item: TraderProfileItem; isSubItem: boolean }[] => {
  const result: { item: TraderProfileItem; isSubItem: boolean }[] = [];

  const terminals = items.filter((i) => i.isTerminal);
  const addOns = items.filter((i) => !i.isTerminal);
  const matchedAddonIds = new Set<number>();

  for (const terminal of terminals) {
    result.push({ item: terminal, isSubItem: false });
    if (terminal.model !== undefined && terminal.model !== null) {
      for (const addon of addOns.filter((a) => a.model === terminal.model)) {
        result.push({ item: addon, isSubItem: true });
        matchedAddonIds.add(addon.id);
      }
    }
  }

  for (const addon of addOns) {
    if (!matchedAddonIds.has(addon.id)) {
      result.push({ item: addon, isSubItem: false });
    }
  }

  return result;
};

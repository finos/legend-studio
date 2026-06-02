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

import { describe, expect, test } from '@jest/globals';
import { TraderProfileItem } from '@finos/legend-server-marketplace';
import {
  OrderProfileLabel,
  OrderProfileTableHeader,
  calculateMultiselectTotalPrice,
  formatAddToCartErrorMessage,
  formatAddToCartSuccessMessage,
  formatCardPrice,
  formatItemPrice,
  formatProfileSummaryLine,
  getItemSummary,
  getRandomImageUrl,
  groupOrderProfileItems,
} from '../orderProfileUtils.js';

// ─── Test helpers ─────────────────────────────────────────────────────────────

const makeItem = (overrides: {
  id: number;
  category?: string;
  providerName?: string;
  productName?: string;
  price?: number;
  isOwned?: boolean;
  model?: string | null;
}): TraderProfileItem => {
  const item = new TraderProfileItem();
  item.id = overrides.id;
  item.category = overrides.category ?? 'Vendor Profile';
  item.providerName = overrides.providerName ?? 'Test Provider';
  item.productName = overrides.productName ?? `Product ${overrides.id}`;
  item.price = overrides.price ?? 100;
  if (overrides.isOwned !== undefined) {
    item.isOwned = overrides.isOwned;
  }
  item.model = overrides.model ?? null;
  return item;
};

const makeTerminal = (
  id: number,
  price = 100,
  model: string | null = null,
  isOwned = false,
): TraderProfileItem =>
  makeItem({ id, category: 'Vendor Profile', price, model, isOwned });

const makeAddOn = (
  id: number,
  price = 50,
  model: string | null = null,
  isOwned = false,
): TraderProfileItem =>
  makeItem({ id, category: 'Market Data', price, model, isOwned });

// ─── OrderProfileLabel enum ───────────────────────────────────────────────────

describe('OrderProfileLabel', () => {
  test('has expected string values', () => {
    expect(OrderProfileLabel.CHIP_LABEL).toBe('Order Profile');
    expect(OrderProfileLabel.ALREADY_HAVE_ACCESS).toBe('Already have access');
    expect(OrderProfileLabel.ADD_TO_CART).toBe('Add to cart');
    expect(OrderProfileLabel.IN_CART).toBe('In Cart');
    expect(OrderProfileLabel.ADDING).toBe('Adding...');
    expect(OrderProfileLabel.SELECT_TERMINAL_TITLE).toBe('Select Terminal');
    expect(OrderProfileLabel.CANCEL).toBe('Cancel');
    expect(OrderProfileLabel.CLOSE).toBe('Close');
    expect(OrderProfileLabel.OWNED_SUFFIX).toBe('(Owned)');
    expect(OrderProfileLabel.IN_CART_SUFFIX).toBe('(In Cart)');
    expect(OrderProfileLabel.MODEL_PREFIX).toBe('Model: ');
    expect(OrderProfileLabel.VIEW_DETAILS).toBe('View details');
  });
});

// ─── OrderProfileTableHeader enum ─────────────────────────────────────────────

describe('OrderProfileTableHeader', () => {
  test('has expected string values', () => {
    expect(OrderProfileTableHeader.PRODUCT_NAME).toBe('PRODUCT NAME');
    expect(OrderProfileTableHeader.PROVIDER).toBe('PROVIDER');
    expect(OrderProfileTableHeader.CATEGORY).toBe('CATEGORY');
    expect(OrderProfileTableHeader.COST_MONTHLY).toBe('COST (Monthly)');
  });
});

// ─── getRandomImageUrl ────────────────────────────────────────────────────────

describe('getRandomImageUrl', () => {
  test('returns URL with assetUrl prefix and jpg extension', () => {
    const url = getRandomImageUrl('/assets');
    expect(url).toMatch(/^\/assets\/images\d+\.jpg$/);
  });

  test('index is within valid range (1 to 15)', () => {
    for (let i = 0; i < 30; i++) {
      const url = getRandomImageUrl('/assets');
      const match = url.match(/images(?<num>\d+)\.jpg/);
      expect(match).not.toBeNull();
      const index = parseInt(match?.groups?.num ?? '0', 10);
      expect(index).toBeGreaterThanOrEqual(1);
      expect(index).toBeLessThanOrEqual(15);
    }
  });

  test('handles different base URLs', () => {
    const url = getRandomImageUrl('https://cdn.example.com');
    expect(url).toMatch(/^https:\/\/cdn\.example\.com\/images\d+\.jpg$/);
  });
});

// ─── formatItemPrice ──────────────────────────────────────────────────────────

describe('formatItemPrice', () => {
  test('formats whole number as USD', () => {
    expect(formatItemPrice(1000)).toBe('$1,000.00');
  });

  test('formats price with cents', () => {
    expect(formatItemPrice(1234.56)).toBe('$1,234.56');
  });

  test('formats zero', () => {
    expect(formatItemPrice(0)).toBe('$0.00');
  });

  test('formats small price', () => {
    expect(formatItemPrice(9.99)).toBe('$9.99');
  });

  test('formats large price with commas', () => {
    expect(formatItemPrice(1000000)).toBe('$1,000,000.00');
  });

  test('rounds to 2 decimal places', () => {
    expect(formatItemPrice(1.999)).toBe('$2.00');
  });
});

// ─── formatCardPrice ──────────────────────────────────────────────────────────

describe('formatCardPrice', () => {
  test('appends /month suffix', () => {
    expect(formatCardPrice(500)).toBe('$500.00/month');
  });

  test('formats with commas', () => {
    expect(formatCardPrice(2500.5)).toBe('$2,500.50/month');
  });

  test('formats zero with /month', () => {
    expect(formatCardPrice(0)).toBe('$0.00/month');
  });
});

// ─── formatAddToCartSuccessMessage ────────────────────────────────────────────

describe('formatAddToCartSuccessMessage', () => {
  test('includes product name in success message', () => {
    const msg = formatAddToCartSuccessMessage('Bloomberg Terminal');
    expect(msg).toBe(
      'Order profile Bloomberg Terminal has been successfully added to cart.',
    );
  });

  test('works with empty string', () => {
    const msg = formatAddToCartSuccessMessage('');
    expect(msg).toBe('Order profile  has been successfully added to cart.');
  });
});

// ─── formatAddToCartErrorMessage ──────────────────────────────────────────────

describe('formatAddToCartErrorMessage', () => {
  test('includes product name and error message', () => {
    const msg = formatAddToCartErrorMessage(
      'Bloomberg Terminal',
      'Network error',
    );
    expect(msg).toBe('Failed to add Bloomberg Terminal to cart: Network error');
  });

  test('works with different product names and errors', () => {
    const msg = formatAddToCartErrorMessage('My Product', '404 Not Found');
    expect(msg).toBe('Failed to add My Product to cart: 404 Not Found');
  });
});

// ─── getItemSummary ───────────────────────────────────────────────────────────

describe('getItemSummary', () => {
  test('returns zero counts for empty list', () => {
    expect(getItemSummary([])).toEqual({ terminalCount: 0, addOnCount: 0 });
  });

  test('counts only terminals when all items are terminals', () => {
    const items = [makeTerminal(1), makeTerminal(2)];
    expect(getItemSummary(items)).toEqual({ terminalCount: 2, addOnCount: 0 });
  });

  test('counts only add-ons when all items are add-ons', () => {
    const items = [makeAddOn(1), makeAddOn(2), makeAddOn(3)];
    expect(getItemSummary(items)).toEqual({ terminalCount: 0, addOnCount: 3 });
  });

  test('counts mixed terminals and add-ons', () => {
    const items = [
      makeTerminal(1),
      makeAddOn(2),
      makeTerminal(3),
      makeAddOn(4),
    ];
    expect(getItemSummary(items)).toEqual({ terminalCount: 2, addOnCount: 2 });
  });

  test('counts single terminal', () => {
    expect(getItemSummary([makeTerminal(1)])).toEqual({
      terminalCount: 1,
      addOnCount: 0,
    });
  });
});

// ─── formatProfileSummaryLine ─────────────────────────────────────────────────

describe('formatProfileSummaryLine', () => {
  test('uses singular for 1 terminal', () => {
    expect(formatProfileSummaryLine(1, 0)).toBe('1 Terminal · 0 Add-Ons');
  });

  test('uses plural for multiple terminals', () => {
    expect(formatProfileSummaryLine(2, 0)).toBe('2 Terminals · 0 Add-Ons');
  });

  test('uses singular for 1 add-on', () => {
    expect(formatProfileSummaryLine(0, 1)).toBe('0 Terminals · 1 Add-On');
  });

  test('uses plural for multiple add-ons', () => {
    expect(formatProfileSummaryLine(0, 3)).toBe('0 Terminals · 3 Add-Ons');
  });

  test('combines terminals and add-ons with separator', () => {
    expect(formatProfileSummaryLine(1, 1)).toBe('1 Terminal · 1 Add-On');
  });

  test('works with large numbers', () => {
    expect(formatProfileSummaryLine(5, 10)).toBe('5 Terminals · 10 Add-Ons');
  });
});

// ─── calculateMultiselectTotalPrice ──────────────────────────────────────────

describe('calculateMultiselectTotalPrice', () => {
  test('returns undefined when there are no terminal items', () => {
    const items = [makeAddOn(1, 50)];
    expect(calculateMultiselectTotalPrice(items)).toBeUndefined();
  });

  test('returns undefined when all terminal items are owned', () => {
    const items = [makeTerminal(1, 200, null, true), makeAddOn(2, 50)];
    expect(calculateMultiselectTotalPrice(items)).toBeUndefined();
  });

  test('returns undefined for empty list', () => {
    expect(calculateMultiselectTotalPrice([])).toBeUndefined();
  });

  test('returns terminal price when there are no add-ons', () => {
    const items = [makeTerminal(1, 300)];
    expect(calculateMultiselectTotalPrice(items)).toBe(300);
  });

  test('sums highest terminal price with its matching add-ons', () => {
    const terminal = makeTerminal(1, 300, 'Model A');
    const addOn1 = makeAddOn(2, 50, 'Model A');
    const addOn2 = makeAddOn(3, 75, 'Model A');
    const items = [terminal, addOn1, addOn2];
    expect(calculateMultiselectTotalPrice(items)).toBe(425); // 300 + 50 + 75
  });

  test('selects highest-priced terminal when there are multiple', () => {
    const terminal1 = makeTerminal(1, 200, 'Model A');
    const terminal2 = makeTerminal(2, 500, 'Model B');
    const addOnA = makeAddOn(3, 50, 'Model A');
    const addOnB = makeAddOn(4, 100, 'Model B');
    // Highest terminal is terminal2 (500), so uses Model B add-ons
    const items = [terminal1, terminal2, addOnA, addOnB];
    expect(calculateMultiselectTotalPrice(items)).toBe(600); // 500 + 100
  });

  test('excludes owned add-ons from total', () => {
    const terminal = makeTerminal(1, 300, 'Model A');
    const addOn = makeAddOn(2, 50, 'Model A', true); // owned
    const items = [terminal, addOn];
    expect(calculateMultiselectTotalPrice(items)).toBe(300); // only terminal
  });

  test('excludes add-ons for different model', () => {
    const terminal = makeTerminal(1, 300, 'Model A');
    const addOnB = makeAddOn(2, 50, 'Model B'); // different model
    const items = [terminal, addOnB];
    expect(calculateMultiselectTotalPrice(items)).toBe(300);
  });

  test('includes add-ons with null model when terminal has null model', () => {
    const terminal = makeTerminal(1, 300, null); // null model
    const addOnNull = makeAddOn(2, 50, null);
    const items = [terminal, addOnNull];
    // add-on matches because terminal.model is null, but the filter checks item.model === highestTerminal.model
    // since terminal.model is null, addOns filter checks item.model === null which is true for addOnNull
    expect(calculateMultiselectTotalPrice(items)).toBe(350);
  });
});

// ─── groupOrderProfileItems ───────────────────────────────────────────────────

describe('groupOrderProfileItems', () => {
  test('returns empty array for empty input', () => {
    expect(groupOrderProfileItems([])).toEqual([]);
  });

  test('marks standalone terminals as non-sub-items', () => {
    const terminal = makeTerminal(1);
    const result = groupOrderProfileItems([terminal]);
    expect(result).toHaveLength(1);
    expect(result[0]?.isSubItem).toBe(false);
    expect(result[0]?.item).toBe(terminal);
  });

  test('places add-ons after their matching terminal as sub-items', () => {
    const terminal = makeTerminal(1, 100, 'Model A');
    const addOn = makeAddOn(2, 50, 'Model A');
    const result = groupOrderProfileItems([terminal, addOn]);
    expect(result).toHaveLength(2);
    expect(result[0]?.item).toBe(terminal);
    expect(result[0]?.isSubItem).toBe(false);
    expect(result[1]?.item).toBe(addOn);
    expect(result[1]?.isSubItem).toBe(true);
  });

  test('unmatched add-ons are appended at end as non-sub-items', () => {
    const terminal = makeTerminal(1, 100, 'Model A');
    const addOnA = makeAddOn(2, 50, 'Model A');
    const addOnB = makeAddOn(3, 50, 'Model B'); // no matching terminal
    const result = groupOrderProfileItems([terminal, addOnA, addOnB]);
    expect(result).toHaveLength(3);
    expect(result[0]?.item).toBe(terminal);
    expect(result[1]?.item).toBe(addOnA);
    expect(result[1]?.isSubItem).toBe(true);
    expect(result[2]?.item).toBe(addOnB);
    expect(result[2]?.isSubItem).toBe(false);
  });

  test('handles multiple terminals each with their own add-ons', () => {
    const t1 = makeTerminal(1, 100, 'Model A');
    const t2 = makeTerminal(2, 200, 'Model B');
    const addA = makeAddOn(3, 50, 'Model A');
    const addB = makeAddOn(4, 75, 'Model B');
    const result = groupOrderProfileItems([t1, t2, addA, addB]);
    expect(result).toHaveLength(4);
    expect(result[0]?.item).toBe(t1);
    expect(result[0]?.isSubItem).toBe(false);
    expect(result[1]?.item).toBe(addA);
    expect(result[1]?.isSubItem).toBe(true);
    expect(result[2]?.item).toBe(t2);
    expect(result[2]?.isSubItem).toBe(false);
    expect(result[3]?.item).toBe(addB);
    expect(result[3]?.isSubItem).toBe(true);
  });

  test('handles terminal with null model (no add-on matching)', () => {
    const terminal = makeTerminal(1, 100, null);
    const addOn = makeAddOn(2, 50, null);
    // terminal.model is null, so the add-on matching block is skipped
    const result = groupOrderProfileItems([terminal, addOn]);
    // terminal is added, but add-on with null model is unmatched (terminal.model is null skips matching)
    expect(result[0]?.item).toBe(terminal);
    // addOn should be in unmatched list
    expect(result[result.length - 1]?.item).toBe(addOn);
    expect(result[result.length - 1]?.isSubItem).toBe(false);
  });

  test('does not assign same add-on to multiple terminals', () => {
    const t1 = makeTerminal(1, 100, 'Model A');
    const t2 = makeTerminal(2, 200, 'Model A'); // same model
    const addOn = makeAddOn(3, 50, 'Model A');
    const result = groupOrderProfileItems([t1, t2, addOn]);
    // addOn should only appear once
    const addOnEntries = result.filter((r) => r.item === addOn);
    expect(addOnEntries).toHaveLength(1);
  });

  test('only add-ons (no terminals) are all appended as non-sub-items', () => {
    const addOn1 = makeAddOn(1, 50);
    const addOn2 = makeAddOn(2, 75);
    const result = groupOrderProfileItems([addOn1, addOn2]);
    expect(result).toHaveLength(2);
    expect(result[0]?.item).toBe(addOn1);
    expect(result[0]?.isSubItem).toBe(false);
    expect(result[1]?.item).toBe(addOn2);
    expect(result[1]?.isSubItem).toBe(false);
  });
});

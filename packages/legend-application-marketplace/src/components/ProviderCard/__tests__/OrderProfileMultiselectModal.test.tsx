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

import { describe, expect, jest, test } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  TraderProfile,
  TraderProfileItem,
} from '@finos/legend-server-marketplace';
import { OrderProfileMultiselectModal } from '../OrderProfileMultiselectModal.js';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeTerminalItem = (
  id: number,
  productName: string,
  price: number,
  model: string,
  multiselect: boolean,
  providerName = 'Test Provider',
  isOwned = false,
): TraderProfileItem => {
  const item = new TraderProfileItem();
  item.id = id;
  item.category = 'Vendor Profile';
  item.providerName = providerName;
  item.productName = productName;
  item.price = price;
  item.model = model;
  item.multiselect = multiselect;
  item.isOwned = isOwned;
  return item;
};

const makeAddOnItem = (
  id: number,
  productName: string,
  price: number,
  model: string,
  providerName = 'Test Provider',
  multiselect = false,
): TraderProfileItem => {
  const item = new TraderProfileItem();
  item.id = id;
  item.category = 'Market Data';
  item.providerName = providerName;
  item.productName = productName;
  item.price = price;
  item.model = model;
  item.multiselect = multiselect;
  return item;
};

const makeProfile = (items: TraderProfileItem[]): TraderProfile => {
  const profile = new TraderProfile();
  profile.id = 1;
  profile.productName = 'Test Profile';
  profile.providerName = 'Test Provider';
  profile.price = 200;
  profile.multiselect = true;
  profile.items = items;
  return profile;
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OrderProfileMultiselectModal', () => {
  test('renders nothing meaningful when open=false', () => {
    const profile = makeProfile([
      makeTerminalItem(1, 'Terminal A', 100, 'Model A', true),
    ]);
    render(
      <OrderProfileMultiselectModal
        profile={profile}
        open={false}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );
    // Dialog is closed - title should not be visible
    expect(screen.queryByText('Select Terminal')).toBeNull();
  });

  test('renders one section per model and selectable prompt per selectable model', () => {
    const profile = makeProfile([
      makeTerminalItem(1, 'A Vendor 1', 100, 'Model A', true, 'Vendor A'),
      makeTerminalItem(2, 'A Vendor 2', 120, 'Model A', true, 'Vendor B'),
      makeAddOnItem(3, 'A Basic Service', 25, 'Model A', 'Service A'),
      makeTerminalItem(4, 'B Vendor 1', 200, 'Model B', true, 'Vendor C'),
      makeTerminalItem(5, 'B Vendor 2', 220, 'Model B', true, 'Vendor D'),
      makeTerminalItem(
        6,
        'C Bundled Terminal',
        80,
        'Model C',
        false,
        'Vendor E',
      ),
    ]);
    render(
      <OrderProfileMultiselectModal
        profile={profile}
        open={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );
    expect(screen.getByText('Select Terminal')).toBeDefined();
    expect(screen.getByText('Test Profile')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Model A' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Model B' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Model C' })).toBeDefined();
    expect(
      screen.getAllByText('Select one preferred vendor profile.'),
    ).toHaveLength(2);
    expect(
      screen.getAllByText('Included with this model').length,
    ).toBeGreaterThan(0);
  });

  test('confirm button stays disabled until every selectable model has a selection', () => {
    const profile = makeProfile([
      makeTerminalItem(1, 'A Vendor 1', 100, 'Model A', true),
      makeTerminalItem(2, 'A Vendor 2', 120, 'Model A', true),
      makeTerminalItem(3, 'B Vendor 1', 200, 'Model B', true),
      makeTerminalItem(4, 'B Vendor 2', 220, 'Model B', true),
    ]);
    render(
      <OrderProfileMultiselectModal
        profile={profile}
        open={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );
    const confirmBtn = screen.getByText('Add to cart').closest('button');
    expect(confirmBtn).toBeDefined();
    expect(confirmBtn?.disabled).toBe(true);

    fireEvent.click(screen.getByText('A Vendor 1'));
    expect(confirmBtn?.disabled).toBe(true);

    fireEvent.click(screen.getByText('B Vendor 2'));
    expect(confirmBtn?.disabled).toBe(false);
  });

  test('calls onConfirm with selected multiselect items and bundled non-selectable items', () => {
    const selectableA1 = makeTerminalItem(
      1,
      'A Vendor 1',
      100,
      'Model A',
      true,
    );
    const selectableA2 = makeTerminalItem(
      2,
      'A Vendor 2',
      120,
      'Model A',
      true,
    );
    const bundledA = makeAddOnItem(3, 'A Basic Service', 25, 'Model A');

    const selectableB1 = makeTerminalItem(
      4,
      'B Vendor 1',
      200,
      'Model B',
      true,
    );
    const selectableB2 = makeTerminalItem(
      5,
      'B Vendor 2',
      220,
      'Model B',
      true,
    );
    const bundledB = makeAddOnItem(6, 'B Basic Service', 35, 'Model B');

    const nonSelectableC = makeTerminalItem(
      7,
      'C Bundled Terminal',
      80,
      'Model C',
      false,
    );

    const profile = makeProfile([
      selectableA1,
      selectableA2,
      bundledA,
      selectableB1,
      selectableB2,
      bundledB,
      nonSelectableC,
    ]);
    const onConfirm = jest.fn();
    render(
      <OrderProfileMultiselectModal
        profile={profile}
        open={true}
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />,
    );
    fireEvent.click(screen.getByText('A Vendor 2'));
    fireEvent.click(screen.getByText('B Vendor 1'));
    fireEvent.click(screen.getByText('Add to cart'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const payload = onConfirm.mock.calls[0]?.[0] as TraderProfileItem[];
    expect(payload.map((item) => item.id)).toEqual([2, 3, 4, 6, 7]);
  });

  test('auto-includes single multiselect=true model and only requires choices for selectable models', () => {
    const profile = makeProfile([
      makeTerminalItem(1, 'A Solo Vendor', 100, 'Model A', true),
      makeTerminalItem(2, 'B Vendor 1', 200, 'Model B', true),
      makeTerminalItem(3, 'B Vendor 2', 220, 'Model B', true),
    ]);
    const onConfirm = jest.fn();
    render(
      <OrderProfileMultiselectModal
        profile={profile}
        open={true}
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />,
    );

    const confirmBtn = screen
      .getByText('Add to cart')
      .closest('button') as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);

    fireEvent.click(screen.getByText('B Vendor 2'));
    expect(confirmBtn.disabled).toBe(false);

    fireEvent.click(confirmBtn);
    const payload = onConfirm.mock.calls[0]?.[0] as TraderProfileItem[];
    expect(payload.map((item) => item.id)).toEqual([1, 3]);
  });

  test('calls onClose when cancel button is clicked', () => {
    const profile = makeProfile([
      makeTerminalItem(1, 'A Vendor 1', 100, 'Model A', true),
      makeTerminalItem(2, 'A Vendor 2', 120, 'Model A', true),
    ]);
    const onClose = jest.fn();
    render(
      <OrderProfileMultiselectModal
        profile={profile}
        open={true}
        onClose={onClose}
        onConfirm={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('does not render owned items for selection or bundled inclusion', () => {
    const onConfirm = jest.fn();
    const profile = makeProfile([
      makeTerminalItem(1, 'Available Vendor 1', 100, 'Model A', true),
      makeTerminalItem(2, 'Available Vendor 2', 120, 'Model A', true),
      makeTerminalItem(3, 'Owned Vendor', 90, 'Model A', true, 'Owned', true),
    ]);

    render(
      <OrderProfileMultiselectModal
        profile={profile}
        open={true}
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.queryByText('Owned Vendor')).toBeNull();
    fireEvent.click(screen.getByText('Available Vendor 2'));
    fireEvent.click(screen.getByText('Add to cart'));
    const payload = onConfirm.mock.calls[0]?.[0] as TraderProfileItem[];
    expect(payload.map((item) => item.id)).toEqual([2]);
  });

  test('keeps non-terminal multiselect=true items bundled and not selectable', () => {
    const onConfirm = jest.fn();
    const profile = makeProfile([
      makeTerminalItem(1, 'Vendor Option 1', 100, 'Model A', true),
      makeTerminalItem(2, 'Vendor Option 2', 120, 'Model A', true),
      makeAddOnItem(3, 'Bundled Exchange Feed', 5, 'Model A', 'Feed', true),
    ]);

    render(
      <OrderProfileMultiselectModal
        profile={profile}
        open={true}
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />,
    );

    expect(
      screen.queryByRole('radio', { name: /Bundled Exchange Feed/i }),
    ).toBeNull();
    fireEvent.click(screen.getByText('Vendor Option 2'));
    fireEvent.click(screen.getByText('Add to cart'));

    const payload = onConfirm.mock.calls[0]?.[0] as TraderProfileItem[];
    expect(payload.map((item) => item.id)).toEqual([2, 3]);
  });

  test('does not include bundled items when selected terminal cannot be resolved after profile data changes', () => {
    const onConfirm = jest.fn();
    const initialProfile = makeProfile([
      makeTerminalItem(1, 'Vendor Option 1', 100, 'Model A', true),
      makeTerminalItem(2, 'Vendor Option 2', 120, 'Model A', true),
      makeAddOnItem(3, 'Bundled Exchange Feed', 5, 'Model A'),
    ]);

    const { rerender } = render(
      <OrderProfileMultiselectModal
        profile={initialProfile}
        open={true}
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByText('Vendor Option 1'));

    const updatedProfile = makeProfile([
      makeTerminalItem(11, 'Vendor Option 11', 100, 'Model A', true),
      makeTerminalItem(12, 'Vendor Option 12', 120, 'Model A', true),
      makeAddOnItem(13, 'Bundled Exchange Feed', 5, 'Model A'),
    ]);

    rerender(
      <OrderProfileMultiselectModal
        profile={updatedProfile}
        open={true}
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByText('Add to cart'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const payload = onConfirm.mock.calls[0]?.[0] as TraderProfileItem[];
    expect(payload.map((item) => item.id)).toEqual([]);
  });
});

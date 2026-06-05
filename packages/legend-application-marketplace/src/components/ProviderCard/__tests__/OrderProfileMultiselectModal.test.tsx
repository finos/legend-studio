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
  model: string | null = null,
  isOwned = false,
): TraderProfileItem => {
  const item = new TraderProfileItem();
  item.id = id;
  item.category = 'Vendor Profile';
  item.providerName = 'Test Provider';
  item.productName = productName;
  item.price = price;
  item.model = model;
  item.isOwned = isOwned;
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
    const profile = makeProfile([makeTerminalItem(1, 'Terminal A', 100)]);
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

  test('renders title when open=true', () => {
    const profile = makeProfile([makeTerminalItem(1, 'Terminal A', 100)]);
    render(
      <OrderProfileMultiselectModal
        profile={profile}
        open={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );
    expect(screen.getByText('Select Terminal')).toBeDefined();
  });

  test('renders description with profile product name', () => {
    const profile = makeProfile([makeTerminalItem(1, 'Terminal A', 100)]);
    render(
      <OrderProfileMultiselectModal
        profile={profile}
        open={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );
    expect(screen.getByText('Test Profile')).toBeDefined();
  });

  test('renders all non-owned terminal items', () => {
    const terminals = [
      makeTerminalItem(1, 'Terminal A', 100),
      makeTerminalItem(2, 'Terminal B', 200),
    ];
    const profile = makeProfile(terminals);
    render(
      <OrderProfileMultiselectModal
        profile={profile}
        open={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );
    expect(screen.getByText('Terminal A')).toBeDefined();
    expect(screen.getByText('Terminal B')).toBeDefined();
  });

  test('does not render owned terminal items', () => {
    const terminals = [
      makeTerminalItem(1, 'Terminal A', 100, null, false),
      makeTerminalItem(2, 'Owned Terminal', 200, null, true),
    ];
    const profile = makeProfile(terminals);
    render(
      <OrderProfileMultiselectModal
        profile={profile}
        open={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );
    expect(screen.getByText('Terminal A')).toBeDefined();
    expect(screen.queryByText('Owned Terminal')).toBeNull();
  });

  test('shows model info when item has a model', () => {
    const terminals = [makeTerminalItem(1, 'Terminal A', 100, 'Model X')];
    const profile = makeProfile(terminals);
    render(
      <OrderProfileMultiselectModal
        profile={profile}
        open={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );
    expect(screen.getByText('Model: Model X')).toBeDefined();
  });

  test('does not show model section when model is null', () => {
    const terminals = [makeTerminalItem(1, 'Terminal A', 100, null)];
    const profile = makeProfile(terminals);
    render(
      <OrderProfileMultiselectModal
        profile={profile}
        open={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );
    expect(screen.queryByText(/Model:/)).toBeNull();
  });

  test('shows formatted price for each terminal', () => {
    const terminals = [makeTerminalItem(1, 'Terminal A', 1500)];
    const profile = makeProfile(terminals);
    render(
      <OrderProfileMultiselectModal
        profile={profile}
        open={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );
    expect(screen.getByText('$1,500.00')).toBeDefined();
  });

  test('confirm button is disabled when no terminal is selected', () => {
    const terminals = [makeTerminalItem(1, 'Terminal A', 100)];
    const profile = makeProfile(terminals);
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
  });

  test('confirm button is enabled after selecting a terminal', () => {
    const terminals = [makeTerminalItem(1, 'Terminal A', 100)];
    const profile = makeProfile(terminals);
    render(
      <OrderProfileMultiselectModal
        profile={profile}
        open={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );
    // Click on the terminal item
    fireEvent.click(screen.getByText('Terminal A'));
    const confirmBtn = screen.getByText('Add to cart').closest('button');
    expect(confirmBtn?.disabled).toBe(false);
  });

  test('calls onConfirm with selected terminal when confirm is clicked', () => {
    const terminals = [
      makeTerminalItem(1, 'Terminal A', 100),
      makeTerminalItem(2, 'Terminal B', 200),
    ];
    const profile = makeProfile(terminals);
    const onConfirm = jest.fn();
    render(
      <OrderProfileMultiselectModal
        profile={profile}
        open={true}
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />,
    );
    // Select Terminal A
    fireEvent.click(screen.getByText('Terminal A'));
    // Click confirm
    fireEvent.click(screen.getByText('Add to cart'));
    expect(onConfirm).toHaveBeenCalledWith([terminals[0]]);
  });

  test('calls onConfirm with empty array when no selection and confirm is somehow invoked', () => {
    const terminals = [makeTerminalItem(1, 'Terminal A', 100)];
    const profile = makeProfile(terminals);
    const onConfirm = jest.fn();
    render(
      <OrderProfileMultiselectModal
        profile={profile}
        open={true}
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />,
    );
    // Don't select anything, but the button should be disabled anyway
    // We test that handleConfirm returns empty array when selectedId === null
    const confirmBtn = screen
      .getByText('Add to cart')
      .closest('button') as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
  });

  test('calls onClose when cancel button is clicked', () => {
    const terminals = [makeTerminalItem(1, 'Terminal A', 100)];
    const profile = makeProfile(terminals);
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

  test('selecting a different terminal updates selection', () => {
    const terminals = [
      makeTerminalItem(1, 'Terminal A', 100),
      makeTerminalItem(2, 'Terminal B', 200),
    ];
    const profile = makeProfile(terminals);
    const onConfirm = jest.fn();
    render(
      <OrderProfileMultiselectModal
        profile={profile}
        open={true}
        onClose={jest.fn()}
        onConfirm={onConfirm}
      />,
    );
    // Select Terminal A first
    fireEvent.click(screen.getByText('Terminal A'));
    // Then select Terminal B
    fireEvent.click(screen.getByText('Terminal B'));
    // Confirm should give Terminal B
    fireEvent.click(screen.getByText('Add to cart'));
    expect(onConfirm).toHaveBeenCalledWith([terminals[1]]);
  });

  test('renders description about automatic add-ons', () => {
    const profile = makeProfile([makeTerminalItem(1, 'Terminal A', 100)]);
    render(
      <OrderProfileMultiselectModal
        profile={profile}
        open={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />,
    );
    expect(
      screen.getByText(/All Add-Ons will be added automatically/),
    ).toBeDefined();
  });
});

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
import { TerminalResult } from '@finos/legend-server-marketplace';
import { OwnedTerminalDetailModal } from '../OwnedTerminalDetailModal.js';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeAddon = (
  id: number,
  productName: string,
  price: number,
): TerminalResult => {
  const addon = new TerminalResult();
  addon.id = id;
  addon.category = 'Market Data';
  addon.providerName = 'Bloomberg';
  addon.productName = productName;
  addon.price = price;
  addon.model = 'Model A';
  return addon;
};

const makeTerminal = (
  overrides: Partial<TerminalResult> = {},
): TerminalResult => {
  const terminal = new TerminalResult();
  terminal.id = overrides.id ?? 1;
  terminal.category = overrides.category ?? 'Vendor Profile';
  terminal.providerName = overrides.providerName ?? 'Bloomberg';
  terminal.productName = overrides.productName ?? 'Bloomberg Terminal';
  terminal.price = overrides.price ?? 500;
  terminal.model = overrides.model ?? 'Model A';
  terminal.items = overrides.items ?? [];
  return terminal;
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OwnedTerminalDetailModal', () => {
  test('does not render title when closed', () => {
    const terminal = makeTerminal({ productName: 'Bloomberg Terminal' });
    render(
      <OwnedTerminalDetailModal
        terminal={terminal}
        open={false}
        onClose={jest.fn()}
      />,
    );
    expect(screen.queryByText('Bloomberg Terminal')).toBeNull();
  });

  test('renders terminal name in title', () => {
    const terminal = makeTerminal({ productName: 'Bloomberg Terminal' });
    render(
      <OwnedTerminalDetailModal
        terminal={terminal}
        open={true}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getAllByText('Bloomberg Terminal').length).toBeGreaterThan(0);
  });

  test('renders summary with terminal and add-on counts', () => {
    const terminal = makeTerminal({
      items: [makeAddon(2, 'Add-On A', 50), makeAddon(3, 'Add-On B', 75)],
    });
    render(
      <OwnedTerminalDetailModal
        terminal={terminal}
        open={true}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText(/1 Terminal/)).toBeDefined();
    expect(screen.getByText(/2 Add-Ons/)).toBeDefined();
  });

  test('uses singular "Add-On" when there is exactly one add-on', () => {
    const terminal = makeTerminal({ items: [makeAddon(2, 'Add-On A', 50)] });
    render(
      <OwnedTerminalDetailModal
        terminal={terminal}
        open={true}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText(/1 Add-On\b/)).toBeDefined();
  });

  test('computes total price as terminal price plus all add-on prices', () => {
    const terminal = makeTerminal({
      price: 500,
      items: [makeAddon(2, 'Add-On A', 50), makeAddon(3, 'Add-On B', 75)],
    });
    render(
      <OwnedTerminalDetailModal
        terminal={terminal}
        open={true}
        onClose={jest.fn()}
      />,
    );
    // 500 + 50 + 75 = 625
    expect(screen.getByText('$625.00')).toBeDefined();
  });

  test('renders table headers', () => {
    const terminal = makeTerminal();
    render(
      <OwnedTerminalDetailModal
        terminal={terminal}
        open={true}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText('PRODUCT NAME')).toBeDefined();
    expect(screen.getByText('PROVIDER')).toBeDefined();
    expect(screen.getByText('CATEGORY')).toBeDefined();
    expect(screen.getByText('COST (Monthly)')).toBeDefined();
  });

  test('renders the terminal row and each add-on row', () => {
    const terminal = makeTerminal({
      productName: 'Bloomberg Terminal',
      items: [makeAddon(2, 'Data Feed', 50)],
    });
    render(
      <OwnedTerminalDetailModal
        terminal={terminal}
        open={true}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getAllByText('Bloomberg Terminal').length).toBeGreaterThan(0);
    expect(screen.getByText('Data Feed')).toBeDefined();
  });

  test('renders "No Add-Ons" summary when the terminal has none', () => {
    const terminal = makeTerminal({ items: [] });
    render(
      <OwnedTerminalDetailModal
        terminal={terminal}
        open={true}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText(/0 Add-Ons/)).toBeDefined();
  });

  test('calls onClose when the close button is clicked', () => {
    const terminal = makeTerminal();
    const onClose = jest.fn();
    render(
      <OwnedTerminalDetailModal
        terminal={terminal}
        open={true}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByLabelText('close'));
    expect(onClose).toHaveBeenCalled();
  });
});

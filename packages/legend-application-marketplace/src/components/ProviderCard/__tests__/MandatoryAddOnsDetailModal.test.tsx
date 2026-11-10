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
import { fireEvent, render, screen } from '@testing-library/react';
import { TerminalResult } from '@finos/legend-server-marketplace';
import { MandatoryAddOnsDetailModal } from '../MandatoryAddOnsDetailModal.js';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

const makeMandatoryAddon = (
  id: number,
  productName: string,
  price: number,
): TerminalResult => {
  const addon = new TerminalResult();
  addon.id = id;
  addon.category = 'Basic Service';
  addon.providerName = 'Bloomberg';
  addon.productName = productName;
  addon.price = price;
  addon.model = null;
  addon.isMandatory = true;
  addon.skipWorkflow = true;
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
  terminal.mandatoryAddons = overrides.mandatoryAddons ?? [];
  return terminal;
};

describe('MandatoryAddOnsDetailModal', () => {
  test('does not render title when closed', () => {
    const terminal = makeTerminal();
    render(
      <MandatoryAddOnsDetailModal
        terminal={terminal}
        open={false}
        onClose={jest.fn()}
      />,
    );

    expect(screen.queryByText('Bloomberg Terminal')).toBeNull();
  });

  test('renders header total as terminal price plus mandatory add-ons', () => {
    const terminal = makeTerminal({
      price: 500,
      mandatoryAddons: [
        makeMandatoryAddon(2, 'Exchange Feed', 50),
        makeMandatoryAddon(3, 'News Feed', 75),
      ],
    });

    render(
      <MandatoryAddOnsDetailModal
        terminal={terminal}
        open={true}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText('$625.00')).toBeDefined();
    expect(
      screen.getByText('Mandatory Add-Ons for Bloomberg Terminal'),
    ).toBeDefined();
  });

  test('renders terminal row and mandatory add-on rows', () => {
    const terminal = makeTerminal({
      mandatoryAddons: [
        makeMandatoryAddon(2, 'Exchange Feed', 50),
        makeMandatoryAddon(3, 'News Feed', 75),
      ],
    });

    render(
      <MandatoryAddOnsDetailModal
        terminal={terminal}
        open={true}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getAllByText('Bloomberg Terminal').length).toBeGreaterThan(0);
    expect(screen.getByText('Exchange Feed')).toBeDefined();
    expect(screen.getByText('News Feed')).toBeDefined();
  });

  test('calls onClose when close button is clicked', () => {
    const terminal = makeTerminal({
      mandatoryAddons: [makeMandatoryAddon(2, 'Exchange Feed', 50)],
    });
    const onClose = jest.fn();

    render(
      <MandatoryAddOnsDetailModal
        terminal={terminal}
        open={true}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByLabelText('close'));
    expect(onClose).toHaveBeenCalled();
  });
});

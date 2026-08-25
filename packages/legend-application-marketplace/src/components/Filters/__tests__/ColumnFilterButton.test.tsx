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
import { ColumnFilterButton } from '../ColumnFilterButton.js';

describe('ColumnFilterButton', () => {
  test('opens the popover and lists the provided options', () => {
    render(
      <ColumnFilterButton
        columnLabel="Category"
        options={['Market Data', 'Vendor Profile']}
        selected={new Set()}
        onChange={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText('Filter by Category'));
    expect(screen.getByText('Filter by Category')).toBeDefined();
    expect(screen.getByLabelText('Market Data')).toBeDefined();
    expect(screen.getByLabelText('Vendor Profile')).toBeDefined();
  });

  test('shows an empty-state message when there are no options', () => {
    render(
      <ColumnFilterButton
        columnLabel="Category"
        options={[]}
        selected={new Set()}
        onChange={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText('Filter by Category'));
    expect(screen.getByText('No values available')).toBeDefined();
  });

  test('toggling an unselected option calls onChange with it added to the set', () => {
    const onChange = jest.fn();
    render(
      <ColumnFilterButton
        columnLabel="Category"
        options={['Market Data', 'Vendor Profile']}
        selected={new Set(['Vendor Profile'])}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByLabelText('Filter by Category'));
    fireEvent.click(screen.getByLabelText('Market Data'));
    expect(onChange).toHaveBeenCalledWith(
      new Set(['Vendor Profile', 'Market Data']),
    );
  });

  test('toggling an already-selected option calls onChange with it removed from the set', () => {
    const onChange = jest.fn();
    render(
      <ColumnFilterButton
        columnLabel="Category"
        options={['Market Data', 'Vendor Profile']}
        selected={new Set(['Market Data', 'Vendor Profile'])}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByLabelText('Filter by Category'));
    fireEvent.click(screen.getByLabelText('Market Data'));
    expect(onChange).toHaveBeenCalledWith(new Set(['Vendor Profile']));
  });

  test('does not show "Clear filter" when no option is selected', () => {
    render(
      <ColumnFilterButton
        columnLabel="Category"
        options={['Market Data']}
        selected={new Set()}
        onChange={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText('Filter by Category'));
    expect(screen.queryByText('Clear filter')).toBeNull();
  });

  test('clicking "Clear filter" calls onChange with an empty set', () => {
    const onChange = jest.fn();
    render(
      <ColumnFilterButton
        columnLabel="Category"
        options={['Market Data']}
        selected={new Set(['Market Data'])}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByLabelText('Filter by Category'));
    fireEvent.click(screen.getByText('Clear filter'));
    expect(onChange).toHaveBeenCalledWith(new Set());
  });

  test('applies the active modifier class when a filter is selected', () => {
    render(
      <ColumnFilterButton
        columnLabel="Category"
        options={['Market Data']}
        selected={new Set(['Market Data'])}
        onChange={jest.fn()}
      />,
    );
    expect(screen.getByLabelText('Filter by Category').className).toContain(
      'column-filter-button--active',
    );
  });
});

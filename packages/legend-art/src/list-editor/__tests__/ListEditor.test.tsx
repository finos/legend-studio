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

import { describe, test, expect, afterEach, jest } from '@jest/globals';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { unitTest } from '@finos/legend-shared/test';
import { ListEditor } from '../ListEditor.js';

const ItemComponent = (props: { item: string }): React.ReactElement => (
  <div>{props.item}</div>
);

const NewItemComponent = (props: {
  onFinishEditing: () => void;
}): React.ReactElement => (
  <button onClick={props.onFinishEditing}>Save new item</button>
);

const renderListEditor = (options?: {
  items?: string[] | undefined;
  isReadOnly?: boolean;
  handleRemoveItem?: (item: string) => void;
  emptyMessage?: string;
  title?: string;
}): void => {
  render(
    <ListEditor
      items={options?.items ?? []}
      keySelector={(item: string): string => item}
      ItemComponent={ItemComponent}
      NewItemComponent={NewItemComponent}
      handleRemoveItem={options?.handleRemoveItem ?? jest.fn()}
      isReadOnly={options?.isReadOnly ?? false}
      {...(options?.title ? { title: options.title } : {})}
      {...(options?.emptyMessage ? { emptyMessage: options.emptyMessage } : {})}
    />,
  );
};

const addButton = (): HTMLButtonElement =>
  screen.getByRole('button', { name: 'Add Value' });

afterEach(() => cleanup());

describe('ListEditor', () => {
  describe(unitTest('listing'), () => {
    test(unitTest('renders each item'), () => {
      renderListEditor({ items: ['alpha', 'beta'] });
      expect(screen.getByText('alpha')).toBeDefined();
      expect(screen.getByText('beta')).toBeDefined();
    });

    test(unitTest('renders an optional title'), () => {
      renderListEditor({ items: ['alpha'], title: 'My values' });
      expect(screen.getByText('My values')).toBeDefined();
    });
  });

  describe(unitTest('empty state'), () => {
    test(unitTest('shows the default empty message'), () => {
      renderListEditor({ items: [] });
      expect(screen.getByText('No items specified')).toBeDefined();
    });

    test(unitTest('shows a custom empty message'), () => {
      renderListEditor({ items: [], emptyMessage: 'Nothing here yet' });
      expect(screen.getByText('Nothing here yet')).toBeDefined();
    });

    test(unitTest('shows the empty message for undefined items'), () => {
      render(
        <ListEditor
          items={undefined}
          keySelector={(item: string): string => item}
          ItemComponent={ItemComponent}
          NewItemComponent={NewItemComponent}
          handleRemoveItem={jest.fn()}
          isReadOnly={false}
        />,
      );
      expect(screen.getByText('No items specified')).toBeDefined();
    });

    test(unitTest('hides the empty message once there are items'), () => {
      renderListEditor({ items: ['alpha'] });
      expect(screen.queryByText('No items specified')).toBeNull();
    });
  });

  describe(unitTest('adding'), () => {
    test(unitTest('swaps the add button for the new-item editor'), () => {
      renderListEditor({ items: [] });
      expect(screen.queryByText('Save new item')).toBeNull();

      fireEvent.click(addButton());

      expect(screen.getByText('Save new item')).toBeDefined();
      expect(screen.queryByRole('button', { name: 'Add Value' })).toBeNull();
      // the empty message is hidden while editing, even with no items
      expect(screen.queryByText('No items specified')).toBeNull();
    });

    test(unitTest('restores the add button on cancel'), () => {
      renderListEditor({ items: [] });
      fireEvent.click(addButton());

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(addButton()).toBeDefined();
      expect(screen.queryByText('Save new item')).toBeNull();
    });

    test(unitTest('restores the add button when the editor finishes'), () => {
      renderListEditor({ items: [] });
      fireEvent.click(addButton());

      // the editor signals completion through `onFinishEditing`
      fireEvent.click(screen.getByRole('button', { name: 'Save new item' }));

      expect(addButton()).toBeDefined();
      expect(screen.queryByText('Save new item')).toBeNull();
    });

    test(unitTest('disables the add button when read-only'), () => {
      renderListEditor({ items: [], isReadOnly: true });
      expect(addButton().disabled).toBe(true);
    });
  });

  describe(unitTest('removing'), () => {
    test(unitTest('reports the removed item'), () => {
      const handleRemoveItem = jest.fn();
      renderListEditor({ items: ['alpha', 'beta'], handleRemoveItem });

      const removeButtons = screen.getAllByRole('button', {
        name: 'Remove item',
      });
      expect(removeButtons).toHaveLength(2);
      fireEvent.click(removeButtons[1] as HTMLElement);

      expect(handleRemoveItem).toHaveBeenCalledTimes(1);
      expect(handleRemoveItem).toHaveBeenCalledWith('beta');
    });

    test(unitTest('hides the remove buttons when read-only'), () => {
      renderListEditor({ items: ['alpha'], isReadOnly: true });
      expect(
        screen.queryAllByRole('button', { name: 'Remove item' }),
      ).toHaveLength(0);
    });
  });
});

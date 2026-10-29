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

import { test, expect, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react';
import { unitTest } from '@finos/legend-shared/test';
import {
  ElementEditorEmptyState,
  ElementEditorTabs,
} from '../ElementEditorLayout.js';

test(
  unitTest('Element editor tabs show their counts and select on click'),
  () => {
    const onSelect = jest.fn<(tab: string) => void>();
    const { getByRole, getByTitle, queryByText } = render(
      <ElementEditorTabs
        tabs={[
          { id: 'VALUES', label: 'Values', count: 3 },
          { id: 'TAGGED_VALUES', label: 'Tagged Values', count: 0 },
          { id: 'NOTES', label: 'Notes' },
        ]}
        selectedTab="VALUES"
        onSelect={onSelect}
        addTitle="Add enum value"
        onAdd={(): void => {}}
        disableAdd={true}
      />,
    );
    expect(
      getByRole('tab', { name: /^Values\s*3$/ }).getAttribute('aria-selected'),
    ).toBe('true');
    expect(
      getByRole('tab', { name: /^Tagged Values\s*0$/ }).getAttribute(
        'aria-selected',
      ),
    ).toBe('false');
    // no count when the tab doesn't say how many items it has
    getByRole('tab', { name: 'Notes' });
    expect(queryByText('undefined')).toBeNull();

    fireEvent.click(getByRole('tab', { name: /^Tagged Values/ }));
    expect(onSelect).toHaveBeenCalledWith('TAGGED_VALUES');
    expect((getByTitle('Add enum value') as HTMLButtonElement).disabled).toBe(
      true,
    );
  },
);

test(
  unitTest('Element editor empty state only offers its action when given one'),
  () => {
    const onAction = jest.fn<() => void>();
    const { getByText, queryByRole, rerender } = render(
      <ElementEditorEmptyState
        title="No values yet"
        description="The values are the names this enumeration can take."
        actionLabel="Add enum value"
        onAction={onAction}
      />,
    );
    getByText('No values yet');
    getByText('The values are the names this enumeration can take.');
    fireEvent.click(getByText('Add enum value'));
    expect(onAction).toHaveBeenCalledTimes(1);

    // read-only: the editor passes no action
    rerender(
      <ElementEditorEmptyState
        title="No values yet"
        actionLabel="Add enum value"
      />,
    );
    getByText('No values yet');
    expect(queryByRole('button')).toBeNull();
  },
);

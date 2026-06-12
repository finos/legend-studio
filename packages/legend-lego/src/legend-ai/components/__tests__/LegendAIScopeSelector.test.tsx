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
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { unitTest } from '@finos/legend-shared/test';
import { LegendAIScopeSelector } from '../LegendAIScopeSelector.js';
import type { LegendAIScopeItem } from '../../LegendAITypes.js';

afterEach(cleanup);

const TEST_SCOPES: LegendAIScopeItem[] = [
  { id: 'mcp', label: 'MCP', description: 'Model Context Protocol' },
  { id: 'sql', label: 'SQL', description: 'SQL Engine' },
  { id: 'pure', label: 'Pure', description: 'Pure Engine' },
];

const FIRST_SCOPE = TEST_SCOPES[0] as LegendAIScopeItem;

describe(unitTest('LegendAIScopeSelector'), () => {
  test('renders add scope button', () => {
    render(
      <LegendAIScopeSelector
        scopes={TEST_SCOPES}
        selectedScopes={[]}
        onToggleScope={jest.fn()}
        onRemoveScope={jest.fn()}
      />,
    );
    expect(screen.getByLabelText('Add scope')).toBeDefined();
  });

  test('renders scope pills when selected', () => {
    render(
      <LegendAIScopeSelector
        scopes={TEST_SCOPES}
        selectedScopes={[FIRST_SCOPE]}
        onToggleScope={jest.fn()}
        onRemoveScope={jest.fn()}
      />,
    );
    expect(screen.getByText('MCP')).toBeDefined();
    expect(screen.getByLabelText('Remove MCP')).toBeDefined();
  });

  test('remove button calls onRemoveScope', () => {
    const onRemoveScope = jest.fn();
    render(
      <LegendAIScopeSelector
        scopes={TEST_SCOPES}
        selectedScopes={[FIRST_SCOPE]}
        onToggleScope={jest.fn()}
        onRemoveScope={onRemoveScope}
      />,
    );
    fireEvent.click(screen.getByLabelText('Remove MCP'));
    expect(onRemoveScope).toHaveBeenCalledWith('mcp');
  });

  test('hidePills hides scope pills', () => {
    render(
      <LegendAIScopeSelector
        scopes={TEST_SCOPES}
        selectedScopes={[FIRST_SCOPE]}
        onToggleScope={jest.fn()}
        onRemoveScope={jest.fn()}
        hidePills={true}
      />,
    );
    expect(screen.queryByText('MCP')).toBeNull();
  });

  test('hideSelector hides the add scope button', () => {
    render(
      <LegendAIScopeSelector
        scopes={TEST_SCOPES}
        selectedScopes={[]}
        onToggleScope={jest.fn()}
        onRemoveScope={jest.fn()}
        hideSelector={true}
      />,
    );
    expect(screen.queryByLabelText('Add scope')).toBeNull();
  });

  test('clicking add scope button opens dropdown', () => {
    render(
      <LegendAIScopeSelector
        scopes={TEST_SCOPES}
        selectedScopes={[]}
        onToggleScope={jest.fn()}
        onRemoveScope={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText('Add scope'));
    expect(screen.getByPlaceholderText('Search scopes...')).toBeDefined();
    expect(screen.getByText('MCP')).toBeDefined();
    expect(screen.getByText('SQL')).toBeDefined();
    expect(screen.getByText('Pure')).toBeDefined();
  });

  test('clicking a scope item calls onToggleScope and closes dropdown', () => {
    const onToggleScope = jest.fn();
    render(
      <LegendAIScopeSelector
        scopes={TEST_SCOPES}
        selectedScopes={[]}
        onToggleScope={onToggleScope}
        onRemoveScope={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText('Add scope'));
    fireEvent.click(screen.getByText('SQL'));
    expect(onToggleScope).toHaveBeenCalledWith(TEST_SCOPES[1]);
  });

  test('search filters scopes', () => {
    render(
      <LegendAIScopeSelector
        scopes={TEST_SCOPES}
        selectedScopes={[]}
        onToggleScope={jest.fn()}
        onRemoveScope={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText('Add scope'));
    const searchInput = screen.getByPlaceholderText('Search scopes...');
    fireEvent.change(searchInput, { target: { value: 'pure' } });
    expect(screen.getByText('Pure')).toBeDefined();
    expect(screen.queryByText('MCP')).toBeNull();
    expect(screen.queryByText('SQL')).toBeNull();
  });

  test('search with no matches shows empty message', () => {
    render(
      <LegendAIScopeSelector
        scopes={TEST_SCOPES}
        selectedScopes={[]}
        onToggleScope={jest.fn()}
        onRemoveScope={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText('Add scope'));
    const searchInput = screen.getByPlaceholderText('Search scopes...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    expect(screen.getByText('No matching scopes')).toBeDefined();
  });

  test('search matches description too', () => {
    render(
      <LegendAIScopeSelector
        scopes={TEST_SCOPES}
        selectedScopes={[]}
        onToggleScope={jest.fn()}
        onRemoveScope={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText('Add scope'));
    const searchInput = screen.getByPlaceholderText('Search scopes...');
    fireEvent.change(searchInput, { target: { value: 'Model Context' } });
    expect(screen.getByText('MCP')).toBeDefined();
  });

  test('Escape in search input closes dropdown', () => {
    render(
      <LegendAIScopeSelector
        scopes={TEST_SCOPES}
        selectedScopes={[]}
        onToggleScope={jest.fn()}
        onRemoveScope={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText('Add scope'));
    expect(screen.getByPlaceholderText('Search scopes...')).toBeDefined();
    fireEvent.keyDown(screen.getByPlaceholderText('Search scopes...'), {
      key: 'Escape',
    });
    expect(screen.queryByPlaceholderText('Search scopes...')).toBeNull();
  });

  test('clicking add scope button again closes dropdown', () => {
    render(
      <LegendAIScopeSelector
        scopes={TEST_SCOPES}
        selectedScopes={[]}
        onToggleScope={jest.fn()}
        onRemoveScope={jest.fn()}
      />,
    );
    const btn = screen.getByLabelText('Add scope');
    fireEvent.click(btn);
    expect(screen.getByPlaceholderText('Search scopes...')).toBeDefined();
    fireEvent.click(btn);
    expect(screen.queryByPlaceholderText('Search scopes...')).toBeNull();
  });
});

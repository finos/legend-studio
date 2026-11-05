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
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ServiceDetail } from '@finos/legend-graph';
import { TEST__provideMockLegendMarketplaceBaseStore } from '../../__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { mockServices } from '../../__test-utils__/TEST_DATA__DataAPIs.js';
import {
  LegendMarketplaceDataAPIsStore,
  LegendServiceCardState,
} from '../../../stores/dataAPIs/LegendMarketplaceDataAPIsStore.js';
import { LegendServiceTreeView } from '../LegendServiceTreeView.js';

const SERVICE_COUNT = 20000;

const setup = async () => {
  const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
  const store = new LegendMarketplaceDataAPIsStore(baseStore);
  store.serviceCardStates = Array.from(
    { length: SERVICE_COUNT },
    (_, i) =>
      new LegendServiceCardState(
        ServiceDetail.fromJson({
          ...mockServices[0],
          pattern: `/g${i % 20}/s${i % 50}/svc${i}`,
        }),
      ),
  );
  return store;
};

describe('LegendServiceTreeView on a large service list', () => {
  test('only mounts the rows in the viewport, however much is expanded', async () => {
    const store = await setup();
    render(
      <LegendServiceTreeView
        store={store}
        onServiceClick={jest.fn()}
        onOpenGroup={jest.fn()}
      />,
    );
    expect(screen.getAllByRole('treeitem')).toHaveLength(20);

    await act(async () => {
      store.expandAllTreeGroups();
    });
    // 20 + 100 groups + 20000 leaves are visible, but only a window is mounted
    expect(store.visibleTreeRows).toHaveLength(20120);
    expect(screen.getAllByRole('treeitem').length).toBeLessThan(100);
  });

  test('still renders rows after the content shrinks past the scroll position', async () => {
    const store = await setup();
    render(
      <LegendServiceTreeView
        store={store}
        onServiceClick={jest.fn()}
        onOpenGroup={jest.fn()}
      />,
    );
    const tree = screen.getByRole('tree');
    await act(async () => {
      store.expandAllTreeGroups();
    });
    tree.scrollTop = 500000;
    fireEvent.scroll(tree);
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });
    await act(async () => {
      store.collapseAllTreeGroups();
    });
    expect(screen.getAllByRole('treeitem').length).toBeGreaterThan(0);
  });

  test('go-to-group button reports the full path of its group', async () => {
    const store = await setup();
    const onOpenGroup = jest.fn();
    render(
      <LegendServiceTreeView
        store={store}
        onServiceClick={jest.fn()}
        onOpenGroup={onOpenGroup}
      />,
    );
    fireEvent.click(screen.getByLabelText('Go to g3'));
    expect(onOpenGroup).toHaveBeenCalledWith('g3');
  });

  test('groups get a go-to-group button; leaves get favorite and launch', async () => {
    const store = await setup();
    const onLaunchService = jest.fn();
    render(
      <LegendServiceTreeView
        store={store}
        onServiceClick={jest.fn()}
        onOpenGroup={jest.fn()}
        onLaunchService={onLaunchService}
      />,
    );
    // collapsed: only groups are visible
    expect(screen.queryAllByLabelText(/^Go to /)).toHaveLength(20);
    expect(screen.queryAllByLabelText(/^Add to favorites/)).toHaveLength(0);
    expect(screen.queryAllByLabelText(/^Launch service/)).toHaveLength(0);

    await act(async () => {
      store.expandAllTreeGroups();
    });
    // leaves in the window have favorite + launch and no go-to-group button
    const launch = screen.getAllByLabelText(/^Launch service/);
    expect(launch.length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/^Add to favorites/)).toHaveLength(
      launch.length,
    );
    fireEvent.click(launch[0] as HTMLElement);
    expect(onLaunchService).toHaveBeenCalledTimes(1);
    expect(screen.getAllByLabelText(/^Go to /).length).toBeLessThan(
      screen.getAllByRole('treeitem').length,
    );
  });

  test('launch is hidden when no execution URL is available', async () => {
    const store = await setup();
    render(
      <LegendServiceTreeView
        store={store}
        onServiceClick={jest.fn()}
        onOpenGroup={jest.fn()}
      />,
    );
    await act(async () => {
      store.expandAllTreeGroups();
    });
    expect(screen.queryAllByLabelText(/^Launch service/)).toHaveLength(0);
    expect(
      screen.getAllByLabelText(/^Add to favorites/).length,
    ).toBeGreaterThan(0);
  });

  test('every service on a shared pattern can open its own details', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const store = new LegendMarketplaceDataAPIsStore(baseStore);
    store.serviceCardStates = ['first', 'second'].map(
      (name) =>
        new LegendServiceCardState(
          ServiceDetail.fromJson({
            ...mockServices[0],
            name,
            title: name,
            pattern: '/g/dup',
          }),
        ),
    );
    const onServiceClick = jest.fn();
    render(
      <LegendServiceTreeView
        store={store}
        onServiceClick={onServiceClick}
        onOpenGroup={jest.fn()}
      />,
    );
    await act(async () => {
      store.expandAllTreeGroups();
    });
    fireEvent.click(screen.getByLabelText('View details: second'));
    expect(onServiceClick).toHaveBeenCalledTimes(1);
    expect(
      (onServiceClick.mock.calls[0]?.[0] as LegendServiceCardState).title,
    ).toBe('second');
    fireEvent.click(screen.getByLabelText('View details: first'));
    expect(onServiceClick).toHaveBeenCalledTimes(2);
  });

  test('leaf rows show the full path with the favorite star right after it', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const store = new LegendMarketplaceDataAPIsStore(baseStore);
    store.serviceCardStates = [
      '/team/area/dataset/{id}',
      '/team/area/other',
    ].map(
      (pattern) =>
        new LegendServiceCardState(
          ServiceDetail.fromJson({
            ...mockServices[0],
            title: pattern,
            pattern,
          }),
        ),
    );
    render(
      <LegendServiceTreeView
        store={store}
        onServiceClick={jest.fn()}
        onOpenGroup={jest.fn()}
      />,
    );
    await act(async () => {
      store.expandAllTreeGroups();
    });
    const label = screen.getByText('team/area/dataset/{id}');
    expect(label.className).toContain('marketplace-legend-service-tree__label');
    const leaf = label.parentElement as HTMLElement;
    expect(leaf.className).toContain('marketplace-legend-service-tree__leaf');
    const star = screen.getByLabelText(
      /^Add to favorites: \/team\/area\/dataset/,
    );
    expect(leaf.contains(star)).toBe(true);
    expect(label.nextElementSibling).toBe(star);
  });

  test('a parent that is also a service is a pure group with its own service as a leaf', async () => {
    const baseStore = await TEST__provideMockLegendMarketplaceBaseStore();
    const store = new LegendMarketplaceDataAPIsStore(baseStore);
    store.serviceCardStates = ['/item-id', '/item-id/{date}'].map(
      (pattern) =>
        new LegendServiceCardState(
          ServiceDetail.fromJson({
            ...mockServices[0],
            title: pattern,
            pattern,
          }),
        ),
    );
    render(
      <LegendServiceTreeView
        store={store}
        onServiceClick={jest.fn()}
        onOpenGroup={jest.fn()}
        onLaunchService={jest.fn()}
      />,
    );
    await act(async () => {
      store.expandAllTreeGroups();
    });
    expect(screen.getAllByRole('treeitem')).toHaveLength(3);
    expect(screen.getAllByLabelText(/^Go to /)).toHaveLength(1);
    expect(screen.getAllByLabelText(/^Add to favorites/)).toHaveLength(2);
    expect(screen.getAllByLabelText(/^Launch service/)).toHaveLength(2);
    expect(screen.getAllByLabelText(/^View details/)).toHaveLength(2);

    const parent = screen.getByRole('button', { name: 'Collapse item-id' });
    const parentRow = parent.closest('[role="treeitem"]') as HTMLElement;
    expect(parentRow.querySelector('[aria-label^="Go to "]')).not.toBeNull();
    expect(
      parentRow.querySelector('[aria-label^="Add to favorites"]'),
    ).toBeNull();
    expect(
      parentRow.querySelector('[aria-label^="Launch service"]'),
    ).toBeNull();

    const ownLeaf = screen
      .getByLabelText('Add to favorites: /item-id')
      .closest('[role="treeitem"]') as HTMLElement;
    expect(ownLeaf.querySelector('[aria-label^="Go to "]')).toBeNull();
    expect(ownLeaf.textContent).toContain('item-id');

    const star = screen.getByLabelText('Add to favorites: /item-id');
    fireEvent.click(star);
    expect(store.isFavorite('/item-id')).toBe(true);
    expect(store.isFavorite('/item-id/{date}')).toBe(false);
  });
});
